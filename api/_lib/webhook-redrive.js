import { createHash } from 'node:crypto';

import { sendWebhookDeadLetterAlert } from './webhook-delivery.js';
import {
  claimWebhookOutboxRecord,
  completeClaimedDeadLetterAlert,
  completeClaimedWebhookEffect,
  failClaimedDeadLetterAlert,
  failClaimedWebhookEffect,
  listDueWebhookEffects,
  webhookOutboxIdempotencyKey,
} from './webhook-outbox.js';
import {
  dispatchWebhookRedrive,
  WebhookRedriveUnsafeError,
} from './webhook-redrive-dispatch.js';

const alertIdempotencyKey = (pk) => `growx-prevenda/dead-letter/${createHash('sha256')
  .update(pk)
  .digest('hex')
  .slice(0, 32)}`;

const deliveryRejected = (result) => result === false || result?.ok === false;

async function deliverDeadLetterAlert({
  claim,
  alert,
  client,
  tableName,
  now,
  fetchImpl,
}) {
  try {
    const result = await alert(claim.record, {
      idempotencyKey: alertIdempotencyKey(claim.record.pk),
      fetchImpl,
    });
    if (deliveryRejected(result)) throw new Error('mandatory_alert_rejected');
    await completeClaimedDeadLetterAlert({
      pk: claim.record.pk,
      owner: claim.owner,
      externalRef: typeof result === 'object' ? result?.id : null,
      client,
      tableName,
      now,
    });
    return true;
  } catch (error) {
    await failClaimedDeadLetterAlert({
      pk: claim.record.pk,
      owner: claim.owner,
      alertAttempts: claim.record.alertAttempts,
      error,
      client,
      tableName,
      now,
    });
    return false;
  }
}

/**
 * Drena um lote pequeno. Query no GSI é eventual, mas cada efeito é relido com
 * consistência forte e recebe lease condicional antes de qualquer chamada
 * externa.
 */
export async function drainWebhookOutbox({
  client,
  tableName,
  now = new Date(),
  deadlineAt = Date.now() + 22_000,
  limit = 8,
  dispatch = dispatchWebhookRedrive,
  alert = sendWebhookDeadLetterAlert,
  fetchImpl = globalThis.fetch,
} = {}) {
  const due = await listDueWebhookEffects({ client, tableName, now, limit });
  const result = {
    scanned: due.length,
    claimed: 0,
    delivered: 0,
    retried: 0,
    deadLettered: 0,
    alerted: 0,
    mandatoryAlertFailures: 0,
    skipped: 0,
    deadlineReached: false,
  };

  for (const pk of due) {
    if (Date.now() >= deadlineAt) {
      result.deadlineReached = true;
      break;
    }
    const claim = await claimWebhookOutboxRecord({ pk, client, tableName, now });
    if (!claim) {
      result.skipped += 1;
      continue;
    }
    result.claimed += 1;
    if (claim.kind === 'alert') {
      const alerted = await deliverDeadLetterAlert({
        claim, alert, client, tableName, now, fetchImpl,
      });
      if (alerted) result.alerted += 1;
      else result.mandatoryAlertFailures += 1;
      continue;
    }

    try {
      const delivery = await dispatch({
        record: claim.record,
        idempotencyKey: webhookOutboxIdempotencyKey(claim.record),
        deadlineAt,
      });
      if (deliveryRejected(delivery)) throw new Error('redrive_delivery_rejected');
      await completeClaimedWebhookEffect({
        pk,
        owner: claim.owner,
        externalRef: typeof delivery === 'object' ? delivery?.id : null,
        client,
        tableName,
        now,
      });
      result.delivered += 1;
    } catch (error) {
      const failed = await failClaimedWebhookEffect({
        pk,
        owner: claim.owner,
        attempts: claim.record.attempts,
        error,
        forceDeadLetter: error instanceof WebhookRedriveUnsafeError,
        client,
        tableName,
        now,
      });
      if (!failed.deadLetter) {
        result.retried += 1;
        continue;
      }
      result.deadLettered += 1;
      const alertClaim = await claimWebhookOutboxRecord({ pk, client, tableName, now });
      if (!alertClaim || alertClaim.kind !== 'alert') {
        result.mandatoryAlertFailures += 1;
        continue;
      }
      const alerted = await deliverDeadLetterAlert({
        claim: alertClaim, alert, client, tableName, now, fetchImpl,
      });
      if (alerted) result.alerted += 1;
      else result.mandatoryAlertFailures += 1;
    }
  }

  return result;
}
