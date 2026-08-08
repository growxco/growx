import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import test from 'node:test';

import contactHandler from '../../api/contact.js';
import enrichLeadHandler from '../../api/enrich-lead.js';
import {
  AiProviderError,
  callGemini,
  callOpenAI,
} from '../../api/_lib/ai.js';
import { notifySale } from '../../api/_lib/notify.js';

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

const restoreEnv = (name, value) => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

test('cliente de IA nunca incorpora corpo externo em erro propagado', async () => {
  const previousFetch = globalThis.fetch;
  const sensitive = 'lead-secreto@example.com CPF 52998224725';
  let textCalls = 0;
  let cancelCalls = 0;
  globalThis.fetch = async () => ({
    ok: false,
    status: 422,
    body: { cancel: async () => { cancelCalls += 1; } },
    text: async () => { textCalls += 1; return sensitive; },
  });
  try {
    for (const execute of [
      () => callGemini({ messages: [], apiKey: 'test-gemini-key' }),
      () => callOpenAI({ messages: [], apiKey: 'test-openai-key' }),
    ]) {
      await assert.rejects(execute, (error) => {
        assert.ok(error instanceof AiProviderError);
        assert.equal(error.status, 422);
        assert.equal(error.code, 'http_error');
        assert.equal(String(error).includes(sensitive), false);
        return true;
      });
    }
    assert.equal(textCalls, 0);
    assert.equal(cancelCalls, 2);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('cliente de IA fecha mensagens de rede e JSON inválido', async () => {
  const previousFetch = globalThis.fetch;
  const sensitive = 'resposta com lead-repetido@example.com';
  try {
    globalThis.fetch = async () => { throw new Error(sensitive); };
    await assert.rejects(
      () => callOpenAI({ messages: [], apiKey: 'test-openai-key' }),
      (error) => error instanceof AiProviderError
        && error.code === 'network_error'
        && !String(error).includes(sensitive),
    );

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => { throw new Error(sensitive); },
    });
    await assert.rejects(
      () => callGemini({ messages: [], apiKey: 'test-gemini-key' }),
      (error) => error instanceof AiProviderError
        && error.code === 'invalid_response'
        && !String(error).includes(sensitive),
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('contact registra somente form conhecido, correlation id e status fixo', async () => {
  const previousFetch = globalThis.fetch;
  const previousConsoleError = globalThis.console.error;
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousCrm = process.env.CRM_WEBHOOK_URL;
  const previousSlack = process.env.SLACK_WEBHOOK_URL;
  const sensitiveEmail = 'lead-secreto@example.com';
  const sensitivePhone = '+55 41 99999-0000';
  const logs = [];
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.CRM_WEBHOOK_URL;
  delete process.env.SLACK_WEBHOOK_URL;
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  globalThis.console.error = (...args) => { logs.push(args); };
  try {
    const res = responseMock();
    await contactHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': `privacy-${randomUUID()}` },
      body: {
        name: 'Pessoa Teste',
        email: sensitiveEmail,
        phone: sensitivePhone,
        message: `Mensagem privada de ${sensitiveEmail}`,
        _form: sensitiveEmail,
      },
    }, res);

    assert.equal(res.statusCode, 502);
    assert.equal(logs.length, 1);
    assert.equal(logs[0][0], '[contact] nenhum destino aceitou:');
    assert.deepEqual(logs[0][1], {
      form: 'unknown',
      correlation_id: res.headers['X-Correlation-Id'],
      status: 'all_destinations_failed',
    });
    assert.match(res.headers['X-Correlation-Id'], /^[0-9a-f-]{36}$/i);
    const serialized = JSON.stringify(logs);
    assert.equal(serialized.includes(sensitiveEmail), false);
    assert.equal(serialized.includes(sensitivePhone), false);
    assert.equal(serialized.includes('Mensagem privada'), false);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.console.error = previousConsoleError;
    restoreEnv('GEMINI_API_KEY', previousGeminiKey);
    restoreEnv('OPENAI_API_KEY', previousOpenAiKey);
    restoreEnv('CRM_WEBHOOK_URL', previousCrm);
    restoreEnv('SLACK_WEBHOOK_URL', previousSlack);
  }
});

test('enrich-lead converte falha externa em log fechado sem PII', async () => {
  const previousFetch = globalThis.fetch;
  const previousConsoleError = globalThis.console.error;
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.AI_CHAT_MODEL;
  const sensitiveEmail = 'enrichment-secreto@example.com';
  const sensitiveBody = `provider repetiu ${sensitiveEmail}`;
  const logs = [];
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.OPENAI_API_KEY;
  process.env.AI_CHAT_MODEL = 'gemini-2.5-flash';
  globalThis.fetch = async () => ({
    ok: false,
    status: 429,
    text: async () => sensitiveBody,
  });
  globalThis.console.error = (...args) => { logs.push(args); };
  try {
    const res = responseMock();
    await enrichLeadHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': `privacy-${randomUUID()}` },
      body: {
        name: 'Pessoa Teste',
        email: sensitiveEmail,
        message: 'Conteúdo pessoal que não pode ir ao log',
      },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      ok: false,
      score: 0,
      priority: 'warm',
      reason: 'enrichment_unavailable',
    });
    assert.deepEqual(logs, [[
      '[/api/enrich-lead] indisponível:',
      { provider: 'gemini', status: 429, code: 'http_error' },
    ]]);
    const serialized = JSON.stringify(logs);
    assert.equal(serialized.includes(sensitiveEmail), false);
    assert.equal(serialized.includes(sensitiveBody), false);
    assert.equal(serialized.includes('Conteúdo pessoal'), false);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.console.error = previousConsoleError;
    restoreEnv('GEMINI_API_KEY', previousGeminiKey);
    restoreEnv('OPENAI_API_KEY', previousOpenAiKey);
    restoreEnv('AI_CHAT_MODEL', previousModel);
  }
});

test('notificação de venda não registra resposta externa nem PII', async () => {
  const previousFetch = globalThis.fetch;
  const previousConsoleError = globalThis.console.error;
  const previousSlack = process.env.SLACK_WEBHOOK_URL;
  const sensitiveEmail = 'comprador-secreto@example.com';
  const sensitivePhone = '+5541999990000';
  const logs = [];
  delete process.env.SLACK_WEBHOOK_URL;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: false, detail: `${sensitiveEmail} ${sensitivePhone}` }),
  });
  globalThis.console.error = (...args) => { logs.push(args); };
  try {
    const delivered = await notifySale({
      provider: 'stripe',
      method: 'cartao',
      amountCents: 300000,
      currency: 'BRL',
      email: sensitiveEmail,
      name: 'Pessoa Teste',
      phone: sensitivePhone,
      cpf: '52998224725',
      reference: 'cs_test_privacy',
      status: 'paid',
    });

    assert.equal(delivered, false);
    assert.deepEqual(logs, [[
      '[notify] formsubmit recusou:',
      { status: 200, code: 'invalid_ack' },
    ]]);
    const serialized = JSON.stringify(logs);
    assert.equal(serialized.includes(sensitiveEmail), false);
    assert.equal(serialized.includes(sensitivePhone), false);
    assert.equal(serialized.includes('52998224725'), false);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.console.error = previousConsoleError;
    restoreEnv('SLACK_WEBHOOK_URL', previousSlack);
  }
});
