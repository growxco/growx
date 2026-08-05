import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import {
  createPedidoHandler,
  PEDIDO_PROVIDER_DEADLINE_MS,
} from '../../api/pedido.js';
import {
  PEDIDO_CODE_MAX_ATTEMPTS,
  PEDIDO_CODE_TTL_SECONDS,
  PEDIDO_REQUEST_IDENTITY_LIMIT,
} from '../../api/_lib/pedido-auth.js';

const TABLE = 'growx-prevenda-pedido-auth-test';
const SECRET = 'pedido-auth-test-secret-with-at-least-32-bytes';
const CPF = '52998224725';

const clone = (value) => JSON.parse(JSON.stringify(value));
const attr = (item, name) => item?.[name]?.S ?? item?.[name]?.N ?? item?.[name]?.BOOL;

const conditional = () => {
  const error = new Error('conditional_check_failed');
  error.name = 'ConditionalCheckFailedException';
  return error;
};

class PedidoAuthMemoryDynamo {
  constructor() {
    this.items = new Map();
  }

  async send(command) {
    if (command.constructor.name === 'TransactWriteItemsCommand') {
      return this.#transact(command.input);
    }
    throw new Error(`unsupported_fake_command:${command.constructor.name}`);
  }

  #transact(input) {
    const next = new Map([...this.items].map(([key, item]) => [key, clone(item)]));
    const reasons = input.TransactItems.map(() => ({ Code: 'None' }));
    try {
      input.TransactItems.forEach((operation, index) => {
        try {
          if (operation.Update?.UpdateExpression.includes('if_not_exists')) {
            this.#rateUpdate(next, operation.Update);
          } else if (operation.Update) {
            this.#authUpdate(next, operation.Update);
          }
          else if (operation.Put) this.#put(next, operation.Put);
          else throw new Error('unsupported_fake_operation');
        } catch (error) {
          reasons[index] = { Code: 'ConditionalCheckFailed' };
          throw error;
        }
      });
    } catch {
      const error = new Error('transaction_cancelled');
      error.name = 'TransactionCanceledException';
      error.CancellationReasons = reasons;
      throw error;
    }
    this.items = next;
    return {};
  }

  #rateUpdate(items, update) {
    const pk = attr(update.Key, 'pk');
    const current = items.get(pk) || clone(update.Key);
    const attempts = Number(attr(current, 'attempts') || 0);
    const limit = Number(attr(update.ExpressionAttributeValues, ':limit'));
    if (attempts >= limit) throw conditional();
    current.attempts = { N: String(attempts + 1) };
    current.updated_at = clone(update.ExpressionAttributeValues[':now']);
    current.ttl = clone(update.ExpressionAttributeValues[':ttl']);
    items.set(pk, current);
  }

  #put(items, put) {
    const pk = attr(put.Item, 'pk');
    if (items.has(pk)) throw conditional();
    items.set(pk, clone(put.Item));
  }

  #authUpdate(items, input) {
    const pk = attr(input.Key, 'pk');
    const current = items.get(pk);
    const values = input.ExpressionAttributeValues;
    const attempts = Number(attr(current, 'attempts') || 0);
    const nowSeconds = Number(attr(values, ':nowSeconds'));
    const max = Number(attr(values, ':max'));
    const active = current
      && Number(attr(current, 'expires_at')) > nowSeconds
      && !current.consumed_at
      && attempts < max;

    if (input.UpdateExpression.includes('consumed_at')) {
      const matches = active
        && attr(current, 'code_hash') === attr(values, ':codeHash')
        && attr(current, 'email_hash') === attr(values, ':emailHash')
        && attr(current, 'document_hash') === attr(values, ':documentHash')
        && attr(current, 'identity_valid') === true;
      if (!matches) throw conditional();
      current.consumed_at = clone(values[':now']);
      current.verified_at = clone(values[':now']);
      items.set(pk, current);
      return {};
    }

    if (!active) throw conditional();
    current.attempts = { N: String(attempts + 1) };
    current.updated_at = clone(values[':now']);
    items.set(pk, current);
    return {};
  }
}

function responseMock() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

const publicShape = (body) => ({ ...body, challenge_id: '<opaque>' });

function harness({
  client = new PedidoAuthMemoryDynamo(),
  lookupProviders,
  useNativeLookup = false,
  fetchImpl,
  stripeKey,
  mpToken,
  providerDeadlineMs,
} = {}) {
  let currentMs = Date.parse('2026-08-05T12:00:00.000Z');
  let nextCode = 123450;
  const deliveries = [];
  let lookups = 0;
  const defaultLookup = async () => {
    lookups += 1;
    return [
      { ok: true, ledgerOk: true, pedidos: [] },
      { ok: true, ledgerOk: true, pedidos: [] },
    ];
  };
  const handler = createPedidoHandler({
    client,
    tableName: TABLE,
    secret: SECRET,
    emailConfigured: true,
    now: () => new Date(currentMs),
    clockMs: () => currentMs,
    challengeId: () => randomUUID(),
    code: () => String(nextCode++).padStart(6, '0'),
    sendCode: async (message) => { deliveries.push(message); return true; },
    lookupProviders: useNativeLookup
      ? undefined
      : (lookupProviders
        ? async (args) => { lookups += 1; return lookupProviders(args); }
        : defaultLookup),
    fetchImpl,
    stripeKey,
    mpToken,
    providerDeadlineMs,
  });
  return {
    client,
    handler,
    deliveries,
    get lookups() { return lookups; },
    advance(ms) { currentMs += ms; },
  };
}

async function call(handler, body, ip = '203.0.113.10') {
  const res = responseMock();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': ip }, body }, res);
  return res;
}

async function requestCode(h, email = 'cliente@example.com', cpf = CPF, ip) {
  return call(h.handler, { action: 'request_code', email, cpf }, ip);
}

async function verifyCode(h, request, code, email = 'cliente@example.com', cpf = CPF, ip) {
  return call(h.handler, {
    action: 'verify_code',
    challengeId: request.body.challenge_id,
    code,
    email,
    cpf,
  }, ip);
}

test('solicitação resiste a enumeração com resposta constante para identidade válida e inválida', async () => {
  const h = harness();
  const valid = await requestCode(h);
  const unknown = await requestCode(h, 'sem-pedido@example.com', CPF, '203.0.113.12');
  const malformed = await requestCode(h, 'nao-e-email', '111', '203.0.113.11');

  assert.equal(valid.statusCode, 202);
  assert.equal(unknown.statusCode, 202);
  assert.equal(malformed.statusCode, 202);
  assert.deepEqual(publicShape(valid.body), publicShape(unknown.body));
  assert.deepEqual(publicShape(valid.body), publicShape(malformed.body));
  assert.match(valid.body.challenge_id, /^[0-9a-f-]{36}$/i);
  assert.match(malformed.body.challenge_id, /^[0-9a-f-]{36}$/i);
  assert.equal(h.deliveries.length, 2, 'toda identidade sintaticamente válida recebe código, exista pedido ou não');
  assert.equal(h.lookups, 0, 'provedores não são consultados antes do código');
  for (const item of h.client.items.values()) {
    const serialized = JSON.stringify(item);
    assert.equal(serialized.includes('cliente@example.com'), false);
    assert.equal(serialized.includes(CPF), false);
    for (const delivery of h.deliveries) {
      assert.equal(serialized.includes(delivery.codigo), false);
    }
  }
});

test('código expira, não consulta provedores e não revela pedido', async () => {
  const h = harness();
  const request = await requestCode(h);
  const code = h.deliveries[0].codigo;
  h.advance(PEDIDO_CODE_TTL_SECONDS * 1000);

  const response = await verifyCode(h, request, code);
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { error: 'codigo_invalido' });
  assert.equal(h.lookups, 0);
  assert.equal(JSON.stringify(response.body).includes('referencia'), false);
  assert.equal(JSON.stringify(response.body).includes('valor'), false);
});

test('código é de uso único e replay não repete divulgação', async () => {
  const fakeOrder = {
    provedor: 'stripe',
    referencia: 'cs_test_only_after_otp',
    criado_em: '2026-08-05T11:00:00.000Z',
    status: 'pago',
    valor_centavos: 89900,
    fulfillment_ativo: true,
  };
  const h = harness({
    lookupProviders: async () => [
      { ok: true, ledgerOk: true, pedidos: [fakeOrder] },
      { ok: true, ledgerOk: true, pedidos: [] },
    ],
  });
  const request = await requestCode(h);
  const code = h.deliveries[0].codigo;

  const first = await verifyCode(h, request, code);
  const replay = await verifyCode(h, request, code);
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.pedidos[0].referencia, fakeOrder.referencia);
  assert.equal(first.body.pedidos[0].valor_centavos, fakeOrder.valor_centavos);
  assert.equal(replay.statusCode, 401);
  assert.deepEqual(replay.body, { error: 'codigo_invalido' });
  assert.equal(h.lookups, 1);
});

test('limite distribuído de tentativas bloqueia até o código correto', async () => {
  const h = harness();
  const request = await requestCode(h);
  const correct = h.deliveries[0].codigo;

  for (let attempt = 0; attempt < PEDIDO_CODE_MAX_ATTEMPTS; attempt += 1) {
    const response = await verifyCode(h, request, '999999');
    assert.equal(response.statusCode, 401);
  }
  const blocked = await verifyCode(h, request, correct);
  assert.equal(blocked.statusCode, 401);
  assert.equal(h.lookups, 0);
});

test('força bruta concorrente entre instâncias para exatamente no limite atômico', async () => {
  const client = new PedidoAuthMemoryDynamo();
  const a = harness({ client });
  const b = harness({ client });
  const request = await requestCode(a);
  const correct = a.deliveries[0].codigo;

  const attempts = await Promise.all(Array.from({ length: 20 }, (_, index) => (
    verifyCode(index % 2 ? b : a, request, String(index).padStart(6, '0'))
  )));
  assert.ok(attempts.every((response) => response.statusCode === 401));
  const challenge = [...client.items.values()]
    .find((item) => attr(item, 'record_type') === 'pedido_auth_challenge');
  assert.equal(Number(attr(challenge, 'attempts')), PEDIDO_CODE_MAX_ATTEMPTS);
  assert.equal((await verifyCode(a, request, correct)).statusCode, 401);
  assert.equal(a.lookups + b.lookups, 0);
});

test('duas instâncias compartilham limites e consumo atômico pelo cliente Dynamo injetado', async () => {
  const client = new PedidoAuthMemoryDynamo();
  const a = harness({ client });
  const b = harness({ client });
  const requests = [];
  for (let index = 0; index < PEDIDO_REQUEST_IDENTITY_LIMIT + 1; index += 1) {
    requests.push(await requestCode(index % 2 ? b : a, 'rate@example.com', CPF, '203.0.113.30'));
  }
  assert.ok(requests.every((response) => response.statusCode === 202));
  assert.equal(a.deliveries.length + b.deliveries.length, PEDIDO_REQUEST_IDENTITY_LIMIT);

  const concurrentClient = new PedidoAuthMemoryDynamo();
  const c = harness({ client: concurrentClient });
  const d = harness({ client: concurrentClient });
  const request = await requestCode(c, 'atomic@example.com', CPF, '203.0.113.31');
  const code = c.deliveries[0].codigo;
  const results = await Promise.all([
    verifyCode(c, request, code, 'atomic@example.com', CPF, '203.0.113.31'),
    verifyCode(d, request, code, 'atomic@example.com', CPF, '203.0.113.31'),
  ]);
  assert.deepEqual(results.map((response) => response.statusCode).sort(), [200, 401]);
  assert.equal(c.lookups + d.lookups, 1);
});

test('contrato antigo de e-mail+CPF é negado antes de Dynamo, e-mail ou provedor', async () => {
  const h = harness();
  const response = await call(h.handler, { email: 'cliente@example.com', cpf: CPF });
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: 'acao_invalida' });
  assert.equal(h.client.items.size, 0);
  assert.equal(h.deliveries.length, 0);
  assert.equal(h.lookups, 0);
});

test('tabela ou entrega de e-mail sem configuração falham fechado', async () => {
  const client = new PedidoAuthMemoryDynamo();
  const withoutTable = createPedidoHandler({
    client,
    tableName: '',
    secret: SECRET,
    emailConfigured: true,
  });
  const withoutEmail = createPedidoHandler({
    client,
    tableName: TABLE,
    secret: SECRET,
    emailConfigured: false,
  });
  const first = await call(withoutTable, { action: 'request_code', email: 'cliente@example.com', cpf: CPF });
  const second = await call(withoutEmail, { action: 'request_code', email: 'cliente@example.com', cpf: CPF });
  assert.equal(first.statusCode, 503);
  assert.equal(second.statusCode, 503);
  assert.deepEqual(first.body, { error: 'consulta_indisponivel' });
  assert.deepEqual(second.body, { error: 'consulta_indisponivel' });
  assert.equal(client.items.size, 0);
});

test('falha interna não ecoa e-mail, documento, código ou erro do SDK em log/resposta', async () => {
  const sensitiveEmail = 'segredo-pessoal@example.com';
  const sensitiveCpf = CPF;
  const sensitiveCode = '654321';
  const client = {
    async send() {
      throw new Error(`sdk failure ${sensitiveEmail} ${sensitiveCpf} ${sensitiveCode}`);
    },
  };
  const logs = [];
  const previousError = globalThis.console.error;
  globalThis.console.error = (...args) => { logs.push(args.join(' ')); };
  try {
    const handler = createPedidoHandler({
      client,
      tableName: TABLE,
      secret: SECRET,
      emailConfigured: true,
      challengeId: () => randomUUID(),
      code: () => sensitiveCode,
      sendCode: async () => true,
    });
    const response = await call(handler, {
      action: 'request_code',
      email: sensitiveEmail,
      cpf: sensitiveCpf,
    });
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.body, { error: 'consulta_indisponivel' });
  } finally {
    globalThis.console.error = previousError;
  }
  const output = logs.join('\n');
  assert.equal(output.includes(sensitiveEmail), false);
  assert.equal(output.includes(sensitiveCpf), false);
  assert.equal(output.includes(sensitiveCode), false);
  assert.equal(output.includes('sdk failure'), false);
});

test('prazo global de consulta aos provedores é explícito no contrato do handler', async () => {
  const h = harness({
    lookupProviders: async ({ context }) => {
      assert.equal(context.deadlineAt - context.clockMs(), PEDIDO_PROVIDER_DEADLINE_MS);
      return [
        { ok: true, ledgerOk: true, pedidos: [] },
        { ok: true, ledgerOk: true, pedidos: [] },
      ];
    },
  });
  const request = await requestCode(h);
  const response = await verifyCode(h, request, h.deliveries[0].codigo);
  assert.equal(response.statusCode, 200);
});

test('prazo também interrompe corpo JSON que trava depois dos headers', async () => {
  let bodyCancelled = false;
  const h = harness({
    useNativeLookup: true,
    providerDeadlineMs: 25,
    stripeKey: 'sk_test_deadline',
    mpToken: '',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      body: { cancel: async () => { bodyCancelled = true; } },
      json: async () => new Promise(() => {}),
    }),
  });
  const request = await requestCode(h);
  const started = Date.now();
  const response = await verifyCode(h, request, h.deliveries[0].codigo);
  const elapsed = Date.now() - started;

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.busca_parcial, true);
  assert.equal(response.body.fontes.cartao, false);
  assert.equal(bodyCancelled, true);
  assert.ok(elapsed < 500, `deadline excedeu margem de teste: ${elapsed}ms`);
});
