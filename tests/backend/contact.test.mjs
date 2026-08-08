import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import test from 'node:test';

import contactHandler from '../../api/contact.js';
import { buildInterestConsent, INTEREST_CONSENT } from '../../shared/interest-consent.js';

const responseMock = () => ({
  headers: {},
  statusCode: 200,
  body: null,
  setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  end() { return this; },
});

const ENV_NAMES = [
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'LEAD_INBOX_EMAIL',
  'PREVENDA_ALERT_EMAIL',
  'CRM_WEBHOOK_URL',
  'SLACK_WEBHOOK_URL',
  'SPI_BACKEND_URL',
];

const withCleanContactEnv = async (execute) => {
  const previous = Object.fromEntries(ENV_NAMES.map((name) => [name, process.env[name]]));
  ENV_NAMES.forEach((name) => { delete process.env[name]; });
  try { await execute(); }
  finally {
    ENV_NAMES.forEach((name) => {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    });
  }
};

const interestRequest = (consent = buildInterestConsent()) => ({
  method: 'POST',
  headers: { 'x-forwarded-for': `contact-test-${randomUUID()}` },
  body: {
    name: 'Pessoa Teste',
    email: 'pessoa@example.com',
    phone: '+5541999999999',
    message: 'Interesse na pré-venda.',
    _form: 'prevenda-lista',
    _segment: 'cultivo',
    _source: 'prevenda',
    _path: '/prevenda',
    consent,
  },
});

test('interesse exige consentimento específico e não encaminha payload inválido', async () => {
  await withCleanContactEnv(async () => {
    const previousFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => { calls += 1; return { ok: true, status: 200 }; };
    try {
      const res = responseMock();
      await contactHandler(interestRequest({ ...buildInterestConsent(), scope: 'marketing_amplo' }), res);
      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { error: 'invalid_interest_consent' });
      assert.equal(calls, 0);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test('Resend aceito captura interesse com consentimento específico sem alegar persistência', async () => {
  await withCleanContactEnv(async () => {
    const previousFetch = globalThis.fetch;
    const requests = [];
    process.env.RESEND_API_KEY = 're_test_contact_capture_key';
    process.env.LEAD_INBOX_EMAIL = 'inbox@growx.com.br';
    globalThis.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (url === 'https://api.resend.com/emails') {
        return { ok: true, status: 200, json: async () => ({ id: 'email_test' }) };
      }
      return { ok: false, status: 503, json: async () => ({ success: false }) };
    };
    try {
      const res = responseMock();
      await contactHandler(interestRequest(), res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.accepted, true);
      assert.equal(res.body.persistence_verified, false);
      assert.equal(res.body.forwarded_to, 1);
      assert.equal(res.body.channels.resend_inbox, true);
      assert.equal(res.body.channels.formsubmit, false);
      assert.equal(res.body.channels.spi_backend, false);
      assert.equal('received' in res.body, false);

      const resend = requests.find((request) => request.url === 'https://api.resend.com/emails');
      assert.ok(resend);
      const body = JSON.parse(resend.options.body);
      assert.deepEqual(body.to, ['inbox@growx.com.br']);
      assert.equal(body.reply_to, 'pessoa@example.com');
      assert.match(body.text, new RegExp(`Consentimento: granted \\| ${INTEREST_CONSENT.purpose}`));
      assert.match(body.text, new RegExp(INTEREST_CONSENT.scope));
      assert.match(body.text, /email\+whatsapp/);
      assert.match(body.text, new RegExp(INTEREST_CONSENT.notice_version));
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test('rota continua fail-closed quando nenhum destino aceita', async () => {
  await withCleanContactEnv(async () => {
    const previousFetch = globalThis.fetch;
    const previousConsoleError = globalThis.console.error;
    globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({ success: false }) });
    globalThis.console.error = () => {};
    try {
      const res = responseMock();
      await contactHandler(interestRequest(), res);
      assert.equal(res.statusCode, 502);
      assert.equal(res.body.ok, false);
      assert.equal(res.body.accepted, false);
      assert.equal(res.body.persistence_verified, false);
      assert.equal(res.body.forwarded_to, 0);
    } finally {
      globalThis.fetch = previousFetch;
      globalThis.console.error = previousConsoleError;
    }
  });
});
