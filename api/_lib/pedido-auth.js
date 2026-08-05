/**
 * Autentica a consulta de pedido sem persistir e-mail, CPF ou o código em
 * claro. Todos os limites e tentativas vivem no mesmo DynamoDB do inventário,
 * portanto continuam válidos entre instâncias serverless concorrentes.
 */
import {
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { createHmac, randomInt, randomUUID } from 'node:crypto';

import { getDynamoClient } from './dynamo-client.js';

export const PEDIDO_CODE_TTL_SECONDS = 10 * 60;
export const PEDIDO_CODE_MAX_ATTEMPTS = 5;
export const PEDIDO_REQUEST_WINDOW_SECONDS = 15 * 60;
export const PEDIDO_REQUEST_IDENTITY_LIMIT = 3;
export const PEDIDO_REQUEST_IP_LIMIT = 10;
const RATE_RETENTION_SECONDS = 2 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE = /^\d{6}$/;

const s = (value) => ({ S: String(value) });
const n = (value) => ({ N: String(value) });

const configured = ({ client, tableName, secret } = {}) => {
  const table = tableName || process.env.PREVENDA_INVENTORY_TABLE || '';
  const guardSecret = secret || process.env.PREVENDA_RESERVATION_SECRET || '';
  if (!table || Buffer.byteLength(guardSecret, 'utf8') < 32) {
    throw new PedidoAuthUnavailableError('pedido_auth_not_configured');
  }
  return { client: client || getDynamoClient(), table, secret: guardSecret };
};

const digest = (secret, purpose, value) => createHmac('sha256', secret)
  .update(`growx-prevenda:pedido:${purpose}\0${String(value)}`, 'utf8')
  .digest('hex');

const challengePk = (challengeId) => `AUTH#PEDIDO#${challengeId}`;
const bucketFor = (nowMs) => Math.floor(nowMs / (PEDIDO_REQUEST_WINDOW_SECONDS * 1000));

const rateUpdate = ({ table, pk, nowIso, ttl, limit }) => ({
  Update: {
    TableName: table,
    Key: { pk: s(pk) },
    UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :one, updated_at = :now, #ttl = :ttl',
    ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
    ExpressionAttributeNames: { '#count': 'attempts', '#ttl': 'ttl' },
    ExpressionAttributeValues: {
      ':zero': n(0),
      ':one': n(1),
      ':limit': n(limit),
      ':now': s(nowIso),
      ':ttl': n(ttl),
    },
  },
});

const conditionalTransaction = (error) => {
  if (error?.name !== 'TransactionCanceledException') return false;
  // A transação contém somente condições nossas. Alguns adaptadores omitem
  // CancellationReasons; códigos explícitos não condicionais continuam 503.
  if (!Array.isArray(error.CancellationReasons)) return true;
  return error.CancellationReasons.some((reason) => reason?.Code === 'ConditionalCheckFailed')
    && error.CancellationReasons.every((reason) => ['None', 'ConditionalCheckFailed'].includes(reason?.Code));
};

export class PedidoAuthUnavailableError extends Error {
  constructor(message = 'pedido_auth_unavailable', cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'PedidoAuthUnavailableError';
  }
}

export const generatePedidoCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/**
 * Cria o desafio e os dois guardas de frequência na mesma transação. Quando
 * um limite é alcançado, devolve a mesma forma pública sem criar/enviar outro
 * código, evitando que o endpoint vire um oráculo de cadastro.
 */
export async function createPedidoChallenge({
  email,
  document,
  ip,
  identityValid,
  now = new Date(),
  challengeId = randomUUID(),
  code = generatePedidoCode(),
  client,
  tableName,
  secret,
} = {}) {
  const config = configured({ client, tableName, secret });
  if (!UUID.test(challengeId) || !CODE.test(code)) {
    throw new PedidoAuthUnavailableError('pedido_auth_randomness_invalid');
  }
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new PedidoAuthUnavailableError('pedido_auth_clock_invalid');
  const nowSeconds = Math.floor(nowMs / 1000);
  const expiresAt = nowSeconds + PEDIDO_CODE_TTL_SECONDS;
  const rateTtl = nowSeconds + RATE_RETENTION_SECONDS;
  const bucket = bucketFor(nowMs);
  const emailHash = digest(config.secret, 'email', email);
  const documentHash = digest(config.secret, 'document', document);
  const identityHash = digest(config.secret, 'identity', `${email}\0${document}`);
  const ipHash = digest(config.secret, 'ip', ip || 'unknown');
  const codeHash = digest(config.secret, 'code', `${challengeId}\0${code}`);
  const createdAt = now.toISOString();

  try {
    await config.client.send(new TransactWriteItemsCommand({
      ClientRequestToken: challengeId,
      TransactItems: [
        rateUpdate({
          table: config.table,
          pk: `RATE#PEDIDO#IDENTITY#${identityHash}#${bucket}`,
          nowIso: createdAt,
          ttl: rateTtl,
          limit: PEDIDO_REQUEST_IDENTITY_LIMIT,
        }),
        rateUpdate({
          table: config.table,
          pk: `RATE#PEDIDO#IP#${ipHash}#${bucket}`,
          nowIso: createdAt,
          ttl: rateTtl,
          limit: PEDIDO_REQUEST_IP_LIMIT,
        }),
        {
          Put: {
            TableName: config.table,
            Item: {
              pk: s(challengePk(challengeId)),
              record_type: s('pedido_auth_challenge'),
              code_hash: s(codeHash),
              email_hash: s(emailHash),
              document_hash: s(documentHash),
              identity_hash: s(identityHash),
              identity_valid: { BOOL: Boolean(identityValid) },
              attempts: n(0),
              created_at: s(createdAt),
              expires_at: n(expiresAt),
              ttl: n(expiresAt),
            },
            ConditionExpression: 'attribute_not_exists(pk)',
          },
        },
      ],
    }));
    return { accepted: true, deliver: Boolean(identityValid), challengeId, code };
  } catch (error) {
    if (conditionalTransaction(error)) {
      return { accepted: false, deliver: false, challengeId, code: null };
    }
    throw new PedidoAuthUnavailableError('pedido_auth_write_failed', error);
  }
}

/**
 * Consome o código em uma escrita condicional. Apenas uma instância consegue
 * vencer a condição; erros incrementam o contador de tentativas no Dynamo.
 */
export async function consumePedidoChallenge({
  challengeId,
  code,
  email,
  document,
  now = new Date(),
  client,
  tableName,
  secret,
} = {}) {
  const config = configured({ client, tableName, secret });
  if (!UUID.test(String(challengeId || '')) || !CODE.test(String(code || ''))) {
    return { verified: false };
  }
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new PedidoAuthUnavailableError('pedido_auth_clock_invalid');
  const nowSeconds = Math.floor(nowMs / 1000);
  const nowIso = now.toISOString();
  const values = {
    ':codeHash': s(digest(config.secret, 'code', `${challengeId}\0${code}`)),
    ':emailHash': s(digest(config.secret, 'email', email)),
    ':documentHash': s(digest(config.secret, 'document', document)),
    ':nowSeconds': n(nowSeconds),
    ':now': s(nowIso),
    ':max': n(PEDIDO_CODE_MAX_ATTEMPTS),
  };

  try {
    await config.client.send(new TransactWriteItemsCommand({
      ClientRequestToken: randomUUID(),
      TransactItems: [{
        Update: {
          TableName: config.table,
          Key: { pk: s(challengePk(challengeId)) },
          UpdateExpression: 'SET consumed_at = :now, verified_at = :now',
          ConditionExpression: [
            'attribute_exists(pk)',
            'code_hash = :codeHash',
            'email_hash = :emailHash',
            'document_hash = :documentHash',
            'identity_valid = :valid',
            'expires_at > :nowSeconds',
            'attribute_not_exists(consumed_at)',
            'attempts < :max',
          ].join(' AND '),
          ExpressionAttributeValues: { ...values, ':valid': { BOOL: true } },
        },
      }],
    }));
    return { verified: true };
  } catch (error) {
    if (!conditionalTransaction(error)) {
      throw new PedidoAuthUnavailableError('pedido_auth_verify_failed', error);
    }
  }

  // A atualização também é condicional: expirado, consumido ou bloqueado não
  // ressuscita e nenhuma resposta revela qual condição falhou.
  try {
    await config.client.send(new TransactWriteItemsCommand({
      ClientRequestToken: randomUUID(),
      TransactItems: [{
        Update: {
          TableName: config.table,
          Key: { pk: s(challengePk(challengeId)) },
          UpdateExpression: 'SET attempts = attempts + :one, updated_at = :now',
          ConditionExpression: [
            'attribute_exists(pk)',
            'expires_at > :nowSeconds',
            'attribute_not_exists(consumed_at)',
            'attempts < :max',
          ].join(' AND '),
          ExpressionAttributeValues: {
            ':one': n(1),
            ':now': s(nowIso),
            ':nowSeconds': n(nowSeconds),
            ':max': n(PEDIDO_CODE_MAX_ATTEMPTS),
          },
        },
      }],
    }));
  } catch (error) {
    if (!conditionalTransaction(error)) {
      throw new PedidoAuthUnavailableError('pedido_auth_attempt_failed', error);
    }
  }
  return { verified: false };
}
