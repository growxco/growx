import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { createAgendaDataService, MAX_AGENDA_RESPONSE_BYTES } from '../../api/_lib/growx-agenda-data.js';

const PEOPLE = [
  { person: 'fernando', actor: 'Fernando (declarado)' },
  { person: 'jefferson', actor: 'Jefferson (declarado)' },
  { person: 'julio', actor: 'Júlio (declarado)' },
];
const fixtureItem = (overrides = {}) => ({
  title: 'Item sintético para teste', type: 'task', date: '2026-10-05', endDate: '2026-10-05',
  allDay: true, start: '', end: '', owners: ['fernando'], product: 'Corporativo', area: 'Estratégia',
  priority: 'medium', status: 'planned', notes: '', location: '', checklist: [], estimatedMinutes: 30,
  source: 'Teste automatizado local', ...overrides,
});
const createRequest = (overrides = {}) => ({ action: 'save', requestId: randomUUID(), item: fixtureItem(), ...overrides });
const expectStatus = (status, pattern) => (error) => {
  assert.equal(error.status, status);
  if (pattern) assert.match(error.message, pattern);
  assert.equal(error.cause, undefined);
  return true;
};

// PGlite is a real, local PostgreSQL engine with a single session. Serialize pool
// leases so overlapping service callers cannot accidentally share a transaction.
// These tests verify transaction/SQL/replay behavior, not multi-server lock timing.
function pglitePool(db) {
  let tail = Promise.resolve();
  let nextId = 0;
  let fault;
  const queries = [];
  const releases = [];
  return {
    queries,
    releases,
    failNext(predicate, when = 'before') { fault = { predicate, when }; },
    reset() { queries.length = 0; releases.length = 0; fault = undefined; },
    async connect() {
      const previous = tail;
      let unlock;
      tail = new Promise((resolve) => { unlock = resolve; });
      await previous;
      const lease = ++nextId;
      let released = false;
      return {
        async query(sql, parameters = []) {
          assert.equal(released, false, 'query after releasing the transaction connection');
          queries.push({ lease, sql, parameters });
          const match = fault?.predicate(sql, parameters);
          const when = match ? fault.when : null;
          if (match) fault = undefined;
          if (when === 'before') throw new Error('synthetic database fault with private input');
          const result = await db.query(sql, parameters);
          if (when === 'after') throw new Error('synthetic lost acknowledgement with private input');
          return { ...result, rowCount: result.affectedRows ?? result.rows.length };
        },
        release(discard) {
          assert.equal(released, false, 'connection released twice');
          released = true;
          releases.push({ lease, discard });
          unlock();
        },
      };
    },
  };
}

let db;
let pool;
let service;
before(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE SCHEMA growx_agenda;
    CREATE TABLE growx_agenda.items (
      id text PRIMARY KEY, payload jsonb NOT NULL, revision integer NOT NULL CHECK (revision > 0),
      archived boolean NOT NULL, updated_at timestamptz NOT NULL, updated_by text NOT NULL
    );
    CREATE TABLE growx_agenda.settings (
      id text PRIMARY KEY, payload jsonb NOT NULL, revision integer NOT NULL CHECK (revision > 0)
    );
    CREATE TABLE growx_agenda.history (
      id uuid PRIMARY KEY, item_id text NOT NULL, action text NOT NULL,
      title text NOT NULL, actor text NOT NULL, at timestamptz NOT NULL
    );
    CREATE TABLE growx_agenda.requests (
      id uuid PRIMARY KEY, fingerprint text NOT NULL, response jsonb NOT NULL,
      actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  pool = pglitePool(db);
  service = createAgendaDataService({ pool });
});
beforeEach(async () => {
  await db.exec('TRUNCATE growx_agenda.items, growx_agenda.settings, growx_agenda.history, growx_agenda.requests');
  pool.reset();
});
after(async () => { await db?.close(); });

async function counts() {
  const { rows } = await db.query(`SELECT
    (SELECT count(*)::int FROM growx_agenda.items) AS items,
    (SELECT count(*)::int FROM growx_agenda.history) AS history,
    (SELECT count(*)::int FROM growx_agenda.requests) AS requests,
    (SELECT count(*)::int FROM growx_agenda.settings) AS settings`);
  return rows[0];
}

// Synthetic fixtures only: fill a precise conservative response budget without
// hundreds of service round trips. Match documented allowances, but ask
// PostgreSQL for the serialized payload size rather than estimating characters.
async function seedCapacity(headroom) {
  const payload = fixtureItem();
  const size = await db.query('SELECT octet_length($1::jsonb::text)::int AS bytes', [JSON.stringify(payload)]);
  const base = size.rows[0].bytes + 38 + 2048; // Quoted UUID plus metadata reserve.
  const available = MAX_AGENDA_RESPONSE_BYTES - 262144 - headroom;
  const count = Math.ceil(available / (base + 6000));
  let notes = available - count * base;
  const entries = Array.from({ length: count }, () => {
    const length = Math.min(6000, notes);
    notes -= length;
    return { id: randomUUID(), payload: { ...payload, notes: 'x'.repeat(length) } };
  });
  assert.equal(notes, 0);
  await db.query(`INSERT INTO growx_agenda.items (id,payload,revision,archived,updated_at,updated_by)
    SELECT entry.id,entry.payload,1,false,now(),$2 FROM jsonb_to_recordset($1::jsonb) AS entry(id text,payload jsonb)`,
  [JSON.stringify(entries), PEOPLE[0].actor]);
  return entries;
}

test('agenda starts empty and concurrent initialize creates only empty settings', async () => {
  const empty = await service.read(PEOPLE[0]);
  assert.deepEqual(Object.keys(empty).sort(), ['history', 'initialized', 'items', 'serverTime', 'settings', 'user']);
  assert.deepEqual(empty.items, []);
  assert.deepEqual(empty.history, []);
  assert.equal(empty.initialized, false);
  assert.deepEqual(empty.settings, { capacity: { fernando: null, jefferson: null, julio: null }, revision: 0 });
  assert.deepEqual(empty.user, PEOPLE[0]);
  assert.ok(Number.isFinite(Date.parse(empty.serverTime)));
  const initialized = await Promise.all(PEOPLE.map((user) => service.mutate({ action: 'initialize' }, user)));
  assert.deepEqual(initialized, PEOPLE.map(() => ({ ok: true, count: 0 })));
  assert.deepEqual(await counts(), { items: 0, history: 0, requests: 0, settings: 1 });
  const ready = await service.read(PEOPLE[1]);
  assert.equal(ready.initialized, true);
  assert.equal(ready.settings.revision, 1);
  assert.ok(pool.queries.some(({ sql }) => sql === 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'));
});

test('create preserves the model contract and all authorized people read the shared agenda', async () => {
  const request = createRequest({ actor: 'untrusted request actor', item: fixtureItem({
    title: "Teste com aspas '); DROP TABLE growx_agenda.items; --",
    owners: ['fernando', 'jefferson'], allDay: false, start: '09:00', end: '10:00',
    notes: 'Anotação sintética com ç e emoji 🌱', checklist: [{ text: 'Conferir item', done: false }],
    id: 'ignored-body-id', archived: true, revision: 99, updatedBy: 'untrusted',
  }) });
  const untouched = globalThis.structuredClone(request);
  const result = await service.mutate(request, PEOPLE[0]);
  assert.equal(result.ok, true);
  assert.equal(result.count, 1);
  assert.match(result.id, /^[0-9a-f-]{36}$/);
  for (const user of PEOPLE) {
    const read = await service.read(user);
    assert.equal(read.items.length, 1);
    const item = read.items[0];
    assert.equal(item.id, result.id);
    assert.equal(item.revision, 1);
    assert.equal(item.archived, false);
    assert.equal(item.updatedBy, PEOPLE[0].actor);
    assert.equal(item.notes, request.item.notes);
    assert.deepEqual(item.checklist, request.item.checklist);
    assert.ok(Number.isFinite(Date.parse(item.updatedAt)));
    assert.equal(read.history[0].action, 'create');
    assert.equal(read.history[0].actor, PEOPLE[0].actor);
    assert.equal(read.history[0].item_id, result.id);
    assert.deepEqual(read.user, user);
  }
  assert.deepEqual(request, untouched);
  assert.deepEqual(await counts(), { items: 1, history: 1, requests: 1, settings: 0 });
  assert.ok(pool.queries.some(({ parameters }) => parameters.some((value) => typeof value === 'string' && value.includes('DROP TABLE'))));
  assert.ok(pool.queries.every(({ sql }) => !sql.includes('DROP TABLE')));
});

test('concurrent create retries share one stored response, item set, and audit', async () => {
  const request = createRequest({ repeat: 'daily', until: '2026-10-07' });
  const results = await Promise.all(Array.from({ length: 8 }, () => service.mutate(request, PEOPLE[0])));
  results.forEach((result) => assert.deepEqual(result, results[0]));
  assert.equal(results[0].count, 3);
  assert.deepEqual(await counts(), { items: 3, history: 1, requests: 1, settings: 0 });
  const reservationQueries = pool.queries.filter(({ sql }) => sql.startsWith('INSERT INTO growx_agenda.requests'));
  assert.equal(reservationQueries.length, 8);
  assert.ok(reservationQueries.every(({ sql }) => sql.includes('ON CONFLICT (id) DO NOTHING RETURNING id')));
  assert.equal(new Set(pool.releases.map(({ lease }) => lease)).size, 8);
  for (const { lease } of pool.releases) {
    const queries = pool.queries.filter((query) => query.lease === lease);
    assert.equal(queries[0].sql, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    assert.equal(queries.at(-1).sql, 'COMMIT');
  }
});

test('request fingerprint rejects changed content, recurrence, action, and actor without changes', async () => {
  const request = createRequest();
  const result = await service.mutate(request, PEOPLE[0]);
  const reordered = { ...request, item: Object.fromEntries(Object.entries(request.item).reverse()) };
  assert.deepEqual(await service.mutate(reordered, PEOPLE[0]), result);
  assert.deepEqual(await service.mutate({ ...request, requestId: request.requestId.toUpperCase() }, PEOPLE[0]), result);
  const variants = [
    [{ ...request, item: { ...request.item, notes: 'Conteúdo diferente' } }, PEOPLE[0]],
    [{ ...request, repeat: 'weekly', until: '2026-10-12' }, PEOPLE[0]],
    [{ action: 'import', requestId: request.requestId, items: [request.item] }, PEOPLE[0]],
    [request, PEOPLE[1]],
  ];
  for (const [data, user] of variants) await assert.rejects(service.mutate(data, user), expectStatus(409, /outro conteúdo ou responsável/));
  assert.deepEqual(await counts(), { items: 1, history: 1, requests: 1, settings: 0 });
});

test('atomic edit increments revision, records the actor, and rejects a stale draft', async () => {
  const created = await service.mutate(createRequest(), PEOPLE[0]);
  const edit = { action: 'save', id: created.id, revision: 1, item: fixtureItem({ title: 'Título atualizado', status: 'done' }) };
  assert.deepEqual(await service.mutate(edit, PEOPLE[1]), { ok: true, id: created.id });
  const stale = { ...edit, item: fixtureItem({ title: 'Rascunho desatualizado' }) };
  const preserved = globalThis.structuredClone(stale);
  await assert.rejects(service.mutate(stale, PEOPLE[2]), expectStatus(409, /formulário foi preservado/));
  assert.deepEqual(stale, preserved);
  const read = await service.read(PEOPLE[2]);
  assert.equal(read.items[0].title, 'Título atualizado');
  assert.equal(read.items[0].revision, 2);
  assert.equal(read.items[0].status, 'done');
  assert.equal(read.items[0].updatedBy, PEOPLE[1].actor);
  assert.equal(read.history.filter((entry) => entry.action === 'edit').length, 1);
  assert.ok(pool.queries.some(({ sql }) => sql === 'SELECT * FROM growx_agenda.items WHERE id = $1 FOR UPDATE'));
});

test('two simultaneous editors cannot overwrite each other or leave a stale audit', async () => {
  const created = await service.mutate(createRequest(), PEOPLE[0]);
  const settled = await Promise.allSettled([1, 2].map((n) => service.mutate({
    action: 'save', id: created.id, revision: 1, item: fixtureItem({ title: `Revisão concorrente ${n}` }),
  }, PEOPLE[n])));
  assert.equal(settled.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = settled.find((result) => result.status === 'rejected');
  assert.equal(rejected.reason.status, 409);
  const read = await service.read(PEOPLE[0]);
  assert.equal(read.items[0].revision, 2);
  assert.equal(read.history.length, 2);
  const edit = read.history.find((entry) => entry.action === 'edit');
  assert.equal(edit.title, read.items[0].title);
  assert.equal(edit.actor, read.items[0].updatedBy);
});

test('archive and restore are reversible revisioned mutations without physical deletion', async () => {
  const created = await service.mutate(createRequest(), PEOPLE[0]);
  await service.mutate({ action: 'archive', id: created.id, revision: 1 }, PEOPLE[1]);
  let read = await service.read(PEOPLE[0]);
  assert.equal(read.items[0].archived, true);
  assert.equal(read.items[0].revision, 2);
  await assert.rejects(service.mutate({ action: 'save', id: created.id, revision: 2, item: fixtureItem() }, PEOPLE[0]), expectStatus(409));
  await assert.rejects(service.mutate({ action: 'restore', id: created.id, revision: 1 }, PEOPLE[0]), expectStatus(409));
  await service.mutate({ action: 'restore', id: created.id, revision: 2 }, PEOPLE[2]);
  read = await service.read(PEOPLE[0]);
  assert.equal(read.items.length, 1);
  assert.equal(read.items[0].archived, false);
  assert.equal(read.items[0].revision, 3);
  assert.equal(read.items[0].updatedBy, PEOPLE[2].actor);
  assert.deepEqual(read.history.map((entry) => entry.action).sort(), ['archive', 'create', 'restore']);
  assert.ok(pool.queries.every(({ sql }) => !/\bDELETE\b|\bTRUNCATE\b/i.test(sql)));
});

test('missing and malformed item references never become accidental creates', async () => {
  for (const action of ['save', 'archive', 'restore']) {
    await assert.rejects(service.mutate({ action, id: 'missing-id', revision: 1, item: fixtureItem() }, PEOPLE[0]), expectStatus(404));
    for (const revision of [undefined, 0, 1.5, '1', 2_147_483_647]) {
      await assert.rejects(service.mutate({ action, id: 'missing-id', revision, item: fixtureItem() }, PEOPLE[0]), expectStatus(400));
    }
  }
  for (const id of ['', null, 'x'.repeat(101), '\0']) {
    await assert.rejects(service.mutate(createRequest({ id, revision: 1 }), PEOPLE[0]), expectStatus(400));
  }
  assert.deepEqual(await counts(), { items: 0, history: 0, requests: 0, settings: 0 });
});

test('capacity has locked revision checks, allows zero/null, and rejects stale or invalid changes', async () => {
  const settings = { capacity: { fernando: 0, jefferson: 12.5, julio: null } };
  await assert.rejects(service.mutate({ action: 'settings', settings, revision: 1 }, PEOPLE[0]), expectStatus(409));
  await service.mutate({ action: 'initialize' }, PEOPLE[0]);
  const changes = await Promise.allSettled(PEOPLE.slice(0, 2).map((user) => service.mutate({ action: 'settings', settings, revision: 1 }, user)));
  assert.equal(changes.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(changes.find((result) => result.status === 'rejected').reason.status, 409);
  for (const invalid of [-1, 81, '40', Number.NaN, Number.POSITIVE_INFINITY]) {
    await assert.rejects(service.mutate({ action: 'settings', settings: { capacity: { ...settings.capacity, fernando: invalid } }, revision: 2 }, PEOPLE[0]), expectStatus(400));
  }
  await service.mutate({ action: 'initialize' }, PEOPLE[2]);
  const read = await service.read(PEOPLE[1]);
  assert.deepEqual(read.settings, { ...settings, revision: 2 });
  assert.equal(read.history.length, 1);
  assert.equal(read.history[0].title, 'Capacidade semanal');
  assert.ok(pool.queries.some(({ sql }) => sql.includes("settings WHERE id = 'main' FOR UPDATE")));
});

test('recurrence maintains multi-day duration and a generated shared series ID', async () => {
  const created = await service.mutate(createRequest({
    item: fixtureItem({ endDate: '2026-10-07', seriesId: 'untrusted-series' }),
    repeat: 'weekly', until: '2026-10-19',
  }), PEOPLE[0]);
  assert.equal(created.count, 3);
  const read = await service.read(PEOPLE[0]);
  const items = read.items.sort((a, b) => a.date.localeCompare(b.date));
  assert.deepEqual(items.map((item) => [item.date, item.endDate]), [
    ['2026-10-05', '2026-10-07'], ['2026-10-12', '2026-10-14'], ['2026-10-19', '2026-10-21'],
  ]);
  assert.equal(new Set(items.map((item) => item.seriesId)).size, 1);
  assert.notEqual(items[0].seriesId, 'untrusted-series');
  assert.match(read.history[0].title, /3 ocorrências/);
});

test('weekday and monthly recurrence have calendar-correct inclusive boundaries', async () => {
  await service.mutate(createRequest({ item: fixtureItem({ date: '2026-10-03', endDate: '2026-10-03' }), repeat: 'weekdays', until: '2026-10-06' }), PEOPLE[0]);
  await service.mutate(createRequest({ item: fixtureItem({ date: '2028-01-31', endDate: '2028-01-31' }), repeat: 'monthly', until: '2028-05-31' }), PEOPLE[0]);
  const read = await service.read(PEOPLE[0]);
  assert.deepEqual(read.items.map((item) => item.date).sort(), ['2026-10-05', '2026-10-06', '2028-01-31', '2028-03-31', '2028-05-31']);
});

test('recurrence enforces 100 occurrences and a maximum 365-day window', async () => {
  const accepted = await service.mutate(createRequest({ repeat: 'daily', until: '2027-01-12' }), PEOPLE[0]);
  assert.equal(accepted.count, 100);
  await assert.rejects(service.mutate(createRequest({ repeat: 'daily', until: '2027-01-13' }), PEOPLE[0]), expectStatus(400, /100 ocorrências/));
  await assert.rejects(service.mutate(createRequest({ repeat: 'weekly', until: '2027-10-06' }), PEOPLE[0]), expectStatus(400, /até um ano/));
  await assert.rejects(service.mutate(createRequest({ repeat: 'weekly', until: '2026-10-04' }), PEOPLE[0]), expectStatus(400));
  await assert.rejects(service.mutate(createRequest({ item: fixtureItem({ date: '2026-10-03', endDate: '2026-10-03' }), repeat: 'weekdays', until: '2026-10-04' }), PEOPLE[0]), expectStatus(400, /Nenhuma ocorrência/));
  const yearly = await service.mutate(createRequest({ repeat: 'weekly', until: '2027-10-05' }), PEOPLE[0]);
  assert.equal(yearly.count, 53);
  assert.deepEqual(await counts(), { items: 153, history: 2, requests: 2, settings: 0 });
});

test('validates real dates, times, generated dates, owners, enums, and bounded fields before writes', async () => {
  const invalidItems = [
    { date: '2026-02-30', endDate: '2026-02-30' }, { date: '2100-01-01', endDate: '2100-01-01' },
    { endDate: '2026-10-04' }, { allDay: false, start: '', end: '' },
    { allDay: false, start: '10:00', end: '09:00' }, { start: '24:00' },
    { owners: [] }, { owners: ['fernando', 'fernando'] }, { owners: ['unknown'] },
    { status: 'private-invalid-value' }, { title: 'x' }, { title: 'x'.repeat(181) },
    { notes: 'x'.repeat(6001) }, { notes: '\0' }, { notes: '\ud800' },
    { location: 'x'.repeat(301) }, { source: 'x'.repeat(401) }, { seriesId: 'x'.repeat(101) },
    { estimatedMinutes: -1 }, { estimatedMinutes: 1441 }, { estimatedMinutes: 0.5 },
    { checklist: Array.from({ length: 31 }, () => ({ text: 'Teste', done: false })) },
  ];
  for (const invalid of invalidItems) {
    const request = createRequest({ item: fixtureItem(invalid) });
    const preserved = globalThis.structuredClone(request);
    await assert.rejects(service.mutate(request, PEOPLE[0]), (error) => {
      expectStatus(400, /formulário foi preservado/)(error);
      assert.doesNotMatch(error.message, /private-invalid-value/);
      return true;
    });
    assert.deepEqual(request, preserved);
  }
  await assert.rejects(service.mutate(createRequest({
    item: fixtureItem({ date: '2099-12-30', endDate: '2099-12-31' }), repeat: 'daily', until: '2099-12-31',
  }), PEOPLE[0]), expectStatus(400));
  assert.equal(pool.queries.length, 0);
  assert.deepEqual(await counts(), { items: 0, history: 0, requests: 0, settings: 0 });
});

test('import adds only drafts with new IDs, never overwrites existing items, and replays exactly', async () => {
  const existing = await service.mutate(createRequest(), PEOPLE[0]);
  const items = [fixtureItem({ id: existing.id, status: 'done', revision: 10, archived: true }), fixtureItem({ title: 'Segundo item sintético', status: 'doing' })];
  const request = { action: 'import', requestId: randomUUID(), items };
  const preserved = globalThis.structuredClone(request);
  const results = await Promise.all(Array.from({ length: 5 }, () => service.mutate(request, PEOPLE[1])));
  results.forEach((result) => assert.deepEqual(result, { ok: true, count: 2 }));
  assert.deepEqual(request, preserved);
  const read = await service.read(PEOPLE[2]);
  const imported = read.items.filter((item) => item.id !== existing.id);
  assert.equal(imported.length, 2);
  assert.ok(imported.every((item) => item.status === 'draft' && !item.archived && item.revision === 1 && item.updatedBy === PEOPLE[1].actor));
  assert.ok(imported.every((item) => item.source === 'Importado de backup • revisar antes de agendar'));
  assert.equal(read.items.find((item) => item.id === existing.id).status, 'planned');
  assert.equal(read.history.filter((entry) => entry.action === 'import').length, 1);
  await assert.rejects(service.mutate({ ...request, items: [fixtureItem()] }, PEOPLE[1]), expectStatus(409));
  assert.deepEqual(await counts(), { items: 3, history: 2, requests: 2, settings: 0 });
});

test('import accepts 500 items but rejects empty, oversized, and partially invalid batches atomically', async () => {
  for (const items of [[], Array.from({ length: 501 }, () => fixtureItem()), [fixtureItem(), fixtureItem({ title: '' })]]) {
    await assert.rejects(service.mutate({ action: 'import', requestId: randomUUID(), items }, PEOPLE[0]), expectStatus(400));
  }
  assert.deepEqual(await counts(), { items: 0, history: 0, requests: 0, settings: 0 });
  assert.deepEqual(await service.mutate({ action: 'import', requestId: randomUUID(), items: Array.from({ length: 500 }, () => fixtureItem()) }, PEOPLE[0]), { ok: true, count: 500 });
  assert.deepEqual(await counts(), { items: 500, history: 1, requests: 1, settings: 0 });
});

test('cumulative imports stop below the response ceiling and roll back the entire rejected batch', async () => {
  const items = Array.from({ length: 100 }, () => fixtureItem({ notes: 'x'.repeat(6000) }));
  for (let i = 0; i < 3; i += 1) {
    await service.mutate({ action: 'import', requestId: randomUUID(), items }, PEOPLE[0]);
  }
  const request = { action: 'import', requestId: randomUUID(), items };
  const before = await counts();
  await assert.rejects(service.mutate(request, PEOPLE[0]), expectStatus(413, /limite seguro.*Arquivar não libera espaço/));
  assert.deepEqual(await counts(), before);
  const response = await service.read(PEOPLE[0]);
  assert.equal(response.items.length, 300);
  assert.ok(Buffer.byteLength(JSON.stringify(response)) < MAX_AGENDA_RESPONSE_BYTES);
  // A rejected reservation is rolled back, so a smaller retry can use its ID.
  assert.deepEqual(await service.mutate({ ...request, items: [fixtureItem()] }, PEOPLE[0]), { ok: true, count: 1 });
});

test('archived items count toward capacity while archive, restore and shrinking edits remain usable', async () => {
  const seeded = await seedCapacity(6000);
  const item = seeded[0];
  await service.mutate({ action: 'archive', id: item.id, revision: 1 }, PEOPLE[1]);
  const request = createRequest({ item: fixtureItem({ notes: 'x'.repeat(5000) }) });
  await assert.rejects(service.mutate(request, PEOPLE[0]), expectStatus(413));
  await service.mutate({ action: 'restore', id: item.id, revision: 2 }, PEOPLE[2]);
  await service.mutate({ action: 'save', id: item.id, revision: 3, item: { ...item.payload, notes: '' } }, PEOPLE[0]);
  assert.equal((await service.mutate(request, PEOPLE[0])).ok, true);
  assert.ok(Buffer.byteLength(JSON.stringify(await service.read(PEOPLE[0]))) < MAX_AGENDA_RESPONSE_BYTES);
});

test('concurrent creates acquire the write lock before budget checks and cannot share the same remaining capacity', async () => {
  const seeded = await seedCapacity(6000);
  pool.reset();
  const results = await Promise.allSettled(PEOPLE.slice(0, 2).map((user) => service.mutate(
    createRequest({ item: fixtureItem({ notes: 'x'.repeat(2000) }) }), user,
  )));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.find((result) => result.status === 'rejected').reason.status, 413);
  assert.deepEqual(await counts(), { items: seeded.length + 1, history: 1, requests: 1, settings: 0 });
  for (const { lease } of pool.releases) {
    const queries = pool.queries.filter((query) => query.lease === lease);
    assert.equal(queries[0].sql, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    assert.equal(queries[1].sql, 'LOCK TABLE growx_agenda.items IN SHARE ROW EXCLUSIVE MODE');
    assert.match(queries[2].sql, /SUM\(octet_length\(payload::text\)/);
  }
});

test('growing edits and recurrences fail atomically; existing oversized data can still be reduced', async () => {
  const seeded = await seedCapacity(-10000);
  const item = seeded[0];
  const before = await counts();
  await assert.rejects(service.mutate({ action: 'save', id: item.id, revision: 1,
    item: { ...item.payload, checklist: [{ text: 'x'.repeat(300), done: false }] },
  }, PEOPLE[0]), expectStatus(413));
  await assert.rejects(service.mutate(createRequest({ repeat: 'daily', until: '2026-10-07' }), PEOPLE[0]), expectStatus(413));
  assert.deepEqual(await counts(), before);
  const prior = (await service.read(PEOPLE[0])).items.find((row) => row.id === item.id);
  assert.equal(prior.revision, 1);
  assert.deepEqual(prior.checklist, []);
  // This edit frees 6,000 bytes but remains above the cap; it must be allowed.
  await service.mutate({ action: 'save', id: item.id, revision: 1, item: { ...item.payload, notes: '' } }, PEOPLE[0]);
  await service.mutate({ action: 'archive', id: item.id, revision: 2 }, PEOPLE[1]);
  await service.mutate({ action: 'restore', id: item.id, revision: 3 }, PEOPLE[2]);
  const current = (await service.read(PEOPLE[0])).items.find((row) => row.id === item.id);
  assert.equal(current.notes, '');
  assert.equal(current.revision, 4);
  assert.equal(current.archived, false);
});

test('reserved metadata keeps exact-capacity reads safe after large actors and full history', async () => {
  const seeded = await seedCapacity(0);
  const escapedActor = { person: 'fernando', actor: '\u0001'.repeat(300) };
  await service.mutate({ action: 'initialize' }, escapedActor);
  for (let revision = 1; revision <= 31; revision += 1) {
    await service.mutate({ action: 'settings', revision,
      settings: { capacity: { fernando: 80, jefferson: 0, julio: null } },
    }, escapedActor);
  }
  await service.mutate({ action: 'archive', id: seeded[0].id, revision: 1 }, escapedActor);
  await service.mutate({ action: 'restore', id: seeded[0].id, revision: 2 }, escapedActor);
  const response = await service.read(escapedActor);
  assert.equal(response.history.length, 30);
  assert.ok(Buffer.byteLength(JSON.stringify(response)) < MAX_AGENDA_RESPONSE_BYTES);
  assert.equal(response.settings.revision, 32);
  assert.equal(response.items.find((row) => row.id === seeded[0].id).updatedBy, escapedActor.actor);
});

test('an item insertion acknowledgement failure rolls back the import and leaves the request retryable', async () => {
  const request = { action: 'import', requestId: randomUUID(), items: [fixtureItem(), fixtureItem({ title: 'Segundo item sintético' })] };
  const preserved = globalThis.structuredClone(request);
  pool.failNext((sql) => sql.startsWith('INSERT INTO growx_agenda.items'), 'after');
  await assert.rejects(service.mutate(request, PEOPLE[0]), expectStatus(503, /formulário foram mantidos/));
  assert.deepEqual(request, preserved);
  assert.deepEqual(await counts(), { items: 0, history: 0, requests: 0, settings: 0 });
  assert.ok(pool.queries.some(({ sql }) => sql === 'ROLLBACK'));
  assert.deepEqual(await service.mutate(request, PEOPLE[0]), { ok: true, count: 2 });
  assert.deepEqual(await counts(), { items: 2, history: 1, requests: 1, settings: 0 });
});

test('audit failure rolls back a create including its request reservation', async () => {
  const request = createRequest({ repeat: 'daily', until: '2026-10-07' });
  pool.failNext((sql) => sql.startsWith('INSERT INTO growx_agenda.history'));
  await assert.rejects(service.mutate(request, PEOPLE[0]), expectStatus(503));
  assert.deepEqual(await counts(), { items: 0, history: 0, requests: 0, settings: 0 });
  const retried = await service.mutate(request, PEOPLE[0]);
  assert.equal(retried.count, 3);
  assert.deepEqual(await counts(), { items: 3, history: 1, requests: 1, settings: 0 });
});

test('audit failure rolls back edits, archive, restore, and capacity along with their revisions', async () => {
  await service.mutate({ action: 'initialize' }, PEOPLE[0]);
  const created = await service.mutate(createRequest(), PEOPLE[0]);
  const mutations = [
    { action: 'save', id: created.id, revision: 1, item: fixtureItem({ title: 'Não pode persistir' }) },
    { action: 'archive', id: created.id, revision: 1 },
    { action: 'settings', revision: 1, settings: { capacity: { fernando: 40, jefferson: 0, julio: null } } },
  ];
  for (const mutation of mutations) {
    pool.failNext((sql) => sql.startsWith('INSERT INTO growx_agenda.history'));
    await assert.rejects(service.mutate(mutation, PEOPLE[1]), expectStatus(503));
    const read = await service.read(PEOPLE[0]);
    assert.equal(read.items[0].revision, 1);
    assert.equal(read.items[0].title, fixtureItem().title);
    assert.equal(read.items[0].archived, false);
    assert.equal(read.settings.revision, 1);
    assert.equal(read.settings.capacity.fernando, null);
    assert.equal(read.history.length, 1);
  }
  await service.mutate({ action: 'archive', id: created.id, revision: 1 }, PEOPLE[0]);
  pool.failNext((sql) => sql.startsWith('INSERT INTO growx_agenda.history'));
  await assert.rejects(service.mutate({ action: 'restore', id: created.id, revision: 2 }, PEOPLE[1]), expectStatus(503));
  const read = await service.read(PEOPLE[0]);
  assert.equal(read.items[0].revision, 2);
  assert.equal(read.items[0].archived, true);
  assert.equal(read.history.length, 2);
});

test('a lost commit acknowledgement recovers the saved response without duplicate writes', async () => {
  const request = createRequest();
  pool.failNext((sql) => sql === 'COMMIT', 'after');
  const recovered = await service.mutate(request, PEOPLE[0]);
  assert.equal(recovered.ok, true);
  assert.deepEqual(await service.mutate(request, PEOPLE[0]), recovered);
  assert.deepEqual(await counts(), { items: 1, history: 1, requests: 1, settings: 0 });
  assert.ok(pool.releases.length >= 3);
});

test('history returns the latest 30 entries and server timestamps are ISO strings', async () => {
  for (let i = 0; i < 33; i += 1) await service.mutate(createRequest({ item: fixtureItem({ title: `Item sintético ${i}` }) }), PEOPLE[i % PEOPLE.length]);
  const read = await service.read(PEOPLE[0]);
  assert.equal(read.items.length, 33);
  assert.equal(read.history.length, 30);
  assert.ok(read.history.every((entry) => typeof entry.at === 'string' && entry.at.endsWith('Z')));
  assert.ok(read.items.every((item) => typeof item.updatedAt === 'string' && item.updatedAt.endsWith('Z')));
  for (let i = 1; i < read.history.length; i += 1) assert.ok(read.history[i - 1].at >= read.history[i].at);
});

test('malformed requests and UTF-8 byte overflow are bounded without touching the database', async () => {
  for (const request of [undefined, null, [], 'invalid', {}, { action: 'drop' }, createRequest({ requestId: 'not-a-uuid' }), createRequest({ repeat: 'yearly' })]) {
    await assert.rejects(service.mutate(request, PEOPLE[0]), expectStatus(400));
  }
  const cycle = { action: 'initialize' };
  cycle.self = cycle;
  await assert.rejects(service.mutate(cycle, PEOPLE[0]), expectStatus(400));
  await assert.rejects(service.mutate({ action: 'initialize', extra: 'é'.repeat(760_000) }, PEOPLE[0]), expectStatus(413));
  assert.equal(pool.queries.length, 0);
});

test('invalid caller identities fail closed, and database failures never expose raw details or logs', async () => {
  for (const user of [undefined, null, {}, { person: 'other', actor: 'Someone' }, { person: 'fernando', actor: '' }]) {
    await assert.rejects(service.read(user), expectStatus(403));
    await assert.rejects(service.mutate({ action: 'initialize' }, user), expectStatus(403));
  }
  assert.equal(pool.queries.length, 0);
  const rawError = new Error('database connection with test-secret and private row');
  const broken = createAgendaDataService({ pool: { async connect() { throw rawError; } } });
  const logged = [];
  const oldError = globalThis.console.error;
  const oldLog = globalThis.console.log;
  globalThis.console.error = (...args) => { logged.push(args); };
  globalThis.console.log = (...args) => { logged.push(args); };
  try {
    for (const attempt of [() => broken.read(PEOPLE[0]), () => broken.mutate(createRequest(), PEOPLE[0])]) {
      await assert.rejects(attempt, (error) => {
        expectStatus(503)(error);
        assert.doesNotMatch(String(error), /test-secret|private row|database connection/);
        return true;
      });
    }
    assert.deepEqual(logged, []);
  } finally {
    globalThis.console.error = oldError;
    globalThis.console.log = oldLog;
  }
});

test('an actual PostgreSQL constraint failure rolls back all earlier batch writes', async () => {
  await db.exec("ALTER TABLE growx_agenda.items ADD CONSTRAINT synthetic_rejection CHECK (payload ->> 'title' <> 'Bloqueio sintético')");
  const request = { action: 'import', requestId: randomUUID(), items: [fixtureItem(), fixtureItem({ title: 'Bloqueio sintético' })] };
  try {
    await assert.rejects(service.mutate(request, PEOPLE[0]), (error) => {
      expectStatus(503)(error);
      assert.doesNotMatch(error.message, /constraint|synthetic_rejection|Bloqueio sintético/);
      return true;
    });
    assert.deepEqual(await counts(), { items: 0, history: 0, requests: 0, settings: 0 });
  } finally {
    await db.exec('ALTER TABLE growx_agenda.items DROP CONSTRAINT synthetic_rejection');
  }
  assert.deepEqual(await service.mutate(request, PEOPLE[0]), { ok: true, count: 2 });
});
