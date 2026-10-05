import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { addDays, daySchema, itemSchema, occurrenceDates } from '../../src/agenda/model.js';

const MAX_REQUEST_BYTES = 1_500_000;
const READ_FAILED = 'Não foi possível carregar a agenda. Tente novamente.';
const WRITE_FAILED = 'Não foi possível salvar. Seus dados no formulário foram mantidos; tente novamente.';
const INVALID_DATA = 'Os dados enviados são inválidos. Revise os campos; seu formulário foi preservado.';
const ITEM_CONFLICT = 'Este item foi alterado ou arquivado por outra sessão. Seu formulário foi preservado. Feche, atualize e abra novamente.';
const SETTINGS_CONFLICT = 'A capacidade foi alterada em outra sessão. Atualize antes de salvar.';
const REPLAY_CONFLICT = 'Esta tentativa já foi salva com outro conteúdo ou responsável. Confira a agenda antes de tentar novamente.';
const initialSettings = () => ({ capacity: { fernando: null, jefferson: null, julio: null } });
const safeText = (value) => !value.includes('\0') && value.isWellFormed();
const textSchema = z.string().refine(safeText);
const idSchema = z.string().min(1).max(100).refine(safeText);
const revisionSchema = z.number().int().min(1).max(2_147_483_646);
const requestIdSchema = z.string().uuid().transform((value) => value.toLowerCase());
const userSchema = z.object({
  person: z.enum(['fernando', 'jefferson', 'julio']),
  email: z.string().email().max(254).optional(),
  actor: z.string().min(1).max(300).refine(safeText),
});
const boundedItemSchema = itemSchema.superRefine((item, context) => {
  const strings = [item.title, item.notes, item.location, item.source, item.seriesId ?? '', ...item.checklist.map((entry) => entry.text)];
  if (strings.some((value) => !textSchema.safeParse(value).success)) {
    context.addIssue({ code: 'custom', message: INVALID_DATA });
  }
});
const actionSchema = z.object({ action: z.enum(['initialize', 'save', 'archive', 'restore', 'import', 'settings']) });
const settingsSchema = z.object({
  settings: z.object({
    capacity: z.object({
      fernando: z.number().min(0).max(80).nullable(),
      jefferson: z.number().min(0).max(80).nullable(),
      julio: z.number().min(0).max(80).nullable(),
    }),
  }),
  revision: revisionSchema,
});
const editSchema = z.object({ id: idSchema, revision: revisionSchema, item: boundedItemSchema });
const stateSchema = z.object({ id: idSchema, revision: revisionSchema });
const createSchema = z.object({
  item: boundedItemSchema,
  requestId: requestIdSchema,
  repeat: z.enum(['none', 'daily', 'weekdays', 'weekly', 'monthly']).default('none'),
  until: daySchema.optional(),
});
const importSchema = z.object({ requestId: requestIdSchema, items: z.array(boundedItemSchema).min(1).max(500) });

class AgendaDataError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AgendaDataError';
    this.status = status;
  }
}

function authorizedUser(user) {
  const result = userSchema.safeParse(user);
  if (!result.success) throw new AgendaDataError(403, 'Acesso à agenda não autorizado.');
  return result.data;
}

function publicError(error, fallback) {
  if (error instanceof AgendaDataError) return error;
  // Zod's default messages can echo arbitrary input. Never expose those or database errors.
  if (error instanceof z.ZodError) return new AgendaDataError(400, INVALID_DATA);
  return new AgendaDataError(503, fallback);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value) {
  return createHash('sha256').update(stableJson(value), 'utf8').digest('hex');
}

function validateRequestSize(data) {
  let serialized;
  try {
    serialized = JSON.stringify(data);
  } catch {
    throw new AgendaDataError(400, INVALID_DATA);
  }
  if (serialized === undefined) throw new AgendaDataError(400, INVALID_DATA);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_REQUEST_BYTES) {
    throw new AgendaDataError(413, 'Arquivo grande demais. Limite de 1,5 MB. Seus dados no formulário foram mantidos.');
  }
}

function prepareMutation(data) {
  validateRequestSize(data);
  const { action } = actionSchema.parse(data);
  if (action === 'initialize') return { action };
  if (action === 'settings') return { action, ...settingsSchema.parse(data) };
  if (action === 'archive' || action === 'restore') return { action, ...stateSchema.parse(data) };
  if (action === 'save' && data.id !== undefined) return { action, ...editSchema.parse(data) };
  if (action === 'import') {
    const { items, requestId } = importSchema.parse(data);
    return {
      action,
      requestId,
      fingerprint: fingerprint({ action, items }),
      items: items.map((item) => ({
        id: randomUUID(),
        item: { ...item, status: 'draft', source: 'Importado de backup • revisar antes de agendar' },
      })),
      result: { ok: true, count: items.length },
    };
  }
  const { item, requestId, repeat, until: providedUntil } = createSchema.parse(data);
  const until = providedUntil ?? item.date;
  if (repeat !== 'none' && (until < item.date || until > addDays(item.date, 365))) {
    throw new AgendaDataError(400, 'A repetição precisa terminar em até um ano e depois da data inicial.');
  }
  let dates;
  try {
    dates = occurrenceDates(item.date, repeat, until);
  } catch {
    throw new AgendaDataError(400, 'Limite de 100 ocorrências por vez.');
  }
  if (!dates.length) throw new AgendaDataError(400, 'Nenhuma ocorrência neste intervalo.');
  const duration = Math.round((Date.parse(item.endDate) - Date.parse(item.date)) / 86_400_000);
  const seriesId = dates.length > 1 ? randomUUID() : undefined;
  const items = dates.map((date) => ({
    id: randomUUID(),
    // Validate generated end dates too, including the supported calendar-year boundary.
    item: boundedItemSchema.parse({ ...item, date, endDate: addDays(date, duration), seriesId }),
  }));
  return {
    action,
    requestId,
    fingerprint: fingerprint({ action, item, repeat, until }),
    items,
    result: { ok: true, id: items[0].id, count: items.length },
  };
}

function replayResult(saved, command, user) {
  if (!saved) return undefined;
  if (saved.fingerprint !== command.fingerprint || saved.actor !== user.actor) {
    throw new AgendaDataError(409, REPLAY_CONFLICT);
  }
  return saved.response;
}

const isoDate = (value) => new Date(value).toISOString();
const itemFromRow = (row) => ({
  ...row.payload,
  id: row.id,
  revision: row.revision,
  archived: row.archived,
  updatedAt: isoDate(row.updated_at),
  updatedBy: row.updated_by,
});

/**
 * All sessions share one private agenda. The caller owns HTTP/session/origin checks;
 * `user` must come from that verified session, never from a request-body identity.
 * The injected pool follows pg.Pool's connect/query/release contract.
 */
export function createAgendaDataService({ pool } = {}) {
  if (!pool || typeof pool.connect !== 'function') throw new AgendaDataError(503, READ_FAILED);

  async function transaction(work, readOnly = false) {
    let client;
    let started = false;
    let discard = false;
    try {
      client = await pool.connect();
      // Use one leased connection for the complete transaction, never pool.query().
      await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN ISOLATION LEVEL READ COMMITTED');
      started = true;
      const result = await work(client);
      await client.query('COMMIT');
      started = false;
      return result;
    } catch (error) {
      if (client && started) {
        try {
          await client.query('ROLLBACK');
        } catch {
          discard = true;
        }
      } else {
        discard = true;
      }
      throw error;
    } finally {
      if (client) client.release(discard);
    }
  }

  async function audit(client, itemId, action, title, user, at) {
    await client.query(
      'INSERT INTO growx_agenda.history (id, item_id, action, title, actor, at) VALUES ($1, $2, $3, $4, $5, $6)',
      [randomUUID(), itemId, action, title, user.actor, at],
    );
  }

  async function findReplay(client, command, user) {
    const { rows } = await client.query(
      'SELECT fingerprint, response, actor FROM growx_agenda.requests WHERE id = $1',
      [command.requestId],
    );
    return replayResult(rows[0], command, user);
  }

  async function applyMutation(client, command, user) {
    const at = new Date().toISOString();
    if (command.action === 'initialize') {
      await client.query(
        "INSERT INTO growx_agenda.settings (id, payload, revision) VALUES ('main', $1::jsonb, 1) ON CONFLICT (id) DO NOTHING",
        [JSON.stringify(initialSettings())],
      );
      return { ok: true, count: 0 };
    }
    if (command.action === 'settings') {
      const { rows } = await client.query("SELECT revision FROM growx_agenda.settings WHERE id = 'main' FOR UPDATE");
      if (!rows[0] || rows[0].revision !== command.revision) throw new AgendaDataError(409, SETTINGS_CONFLICT);
      const updated = await client.query(
        "UPDATE growx_agenda.settings SET payload = $1::jsonb, revision = revision + 1 WHERE id = 'main' AND revision = $2 RETURNING id",
        [JSON.stringify(command.settings), command.revision],
      );
      if (!updated.rows.length) throw new AgendaDataError(409, SETTINGS_CONFLICT);
      await audit(client, 'settings', 'edit', 'Capacidade semanal', user, at);
      return { ok: true };
    }
    if (command.id !== undefined) {
      const { rows } = await client.query('SELECT * FROM growx_agenda.items WHERE id = $1 FOR UPDATE', [command.id]);
      const existing = rows[0];
      if (!existing) throw new AgendaDataError(404, 'Item não encontrado.');
      if (existing.revision !== command.revision || (command.action === 'save' && existing.archived)) {
        throw new AgendaDataError(409, ITEM_CONFLICT);
      }
      const editing = command.action === 'save';
      const updated = editing
        ? await client.query(
          'UPDATE growx_agenda.items SET payload = $1::jsonb, revision = revision + 1, updated_at = $2, updated_by = $3 WHERE id = $4 AND revision = $5 AND archived = false RETURNING id',
          [JSON.stringify(command.item), at, user.actor, command.id, command.revision],
        )
        : await client.query(
          'UPDATE growx_agenda.items SET archived = $1, revision = revision + 1, updated_at = $2, updated_by = $3 WHERE id = $4 AND revision = $5 RETURNING id',
          [command.action === 'archive', at, user.actor, command.id, command.revision],
        );
      if (!updated.rows.length) throw new AgendaDataError(409, ITEM_CONFLICT);
      await audit(client, command.id, editing ? 'edit' : command.action, editing ? command.item.title : existing.payload.title, user, at);
      return editing ? { ok: true, id: command.id } : { ok: true };
    }

    // The unique request ID is reserved inside the same transaction as items/audit.
    // PostgreSQL waits on an uncommitted conflicting insert. Once it finishes,
    // this INSERT either owns the request (including after rollback) or replays
    // the committed response. There is no read-then-write race or stale audit.
    const reserved = await client.query(
      'INSERT INTO growx_agenda.requests (id, fingerprint, response, actor) VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (id) DO NOTHING RETURNING id',
      [command.requestId, command.fingerprint, JSON.stringify(command.result), user.actor],
    );
    if (!reserved.rows.length) {
      const saved = await findReplay(client, command, user);
      if (!saved) throw new AgendaDataError(503, WRITE_FAILED);
      return saved;
    }
    // One parameterized bulk insert keeps large imports/recurrences from taking
    // one network round trip per item, without changing the atomic boundary.
    await client.query(
      `INSERT INTO growx_agenda.items (id, payload, revision, archived, updated_at, updated_by)
       SELECT entry.id, entry.payload, 1, false, $2::timestamptz, $3::text
       FROM jsonb_to_recordset($1::jsonb) AS entry(id text, payload jsonb)`,
      [JSON.stringify(command.items.map(({ id, item }) => ({ id, payload: item }))), at, user.actor],
    );
    const importing = command.action === 'import';
    const title = importing
      ? `Importação de ${command.items.length} rascunhos`
      : command.items[0].item.title + (command.items.length > 1 ? ` (${command.items.length} ocorrências)` : '');
    await audit(client, importing ? 'import' : command.items[0].id, importing ? 'import' : 'create', title, user, at);
    return command.result;
  }

  return {
    async read(user) {
      try {
        const identity = authorizedUser(user);
        return await transaction(async (client) => {
          const all = await client.query('SELECT * FROM growx_agenda.items ORDER BY updated_at DESC, id DESC');
          const settings = await client.query("SELECT payload, revision FROM growx_agenda.settings WHERE id = 'main'");
          const history = await client.query('SELECT id, item_id, action, title, actor, at FROM growx_agenda.history ORDER BY at DESC, id DESC LIMIT 30');
          return {
            items: all.rows.map(itemFromRow),
            settings: settings.rows.length ? { ...settings.rows[0].payload, revision: settings.rows[0].revision } : { ...initialSettings(), revision: 0 },
            history: history.rows.map((row) => ({ ...row, at: isoDate(row.at) })),
            initialized: settings.rows.length > 0,
            user: identity,
            serverTime: new Date().toISOString(),
          };
        }, true);
      } catch (error) {
        throw publicError(error, READ_FAILED);
      }
    },

    async mutate(data, user) {
      let command;
      let identity;
      try {
        identity = authorizedUser(user);
        command = prepareMutation(data);
        return await transaction((client) => applyMutation(client, command, identity));
      } catch (error) {
        // A COMMIT may succeed even when its acknowledgement is lost. Look up
        // the persisted request on a fresh connection, without repeating work.
        if (command?.requestId && !(error instanceof AgendaDataError) && !(error instanceof z.ZodError)) {
          try {
            const saved = await transaction((client) => findReplay(client, command, identity), true);
            if (saved) return saved;
          } catch (recoveryError) {
            if (recoveryError instanceof AgendaDataError && recoveryError.status === 409) throw recoveryError;
          }
        }
        throw publicError(error, WRITE_FAILED);
      }
    },
  };
}
