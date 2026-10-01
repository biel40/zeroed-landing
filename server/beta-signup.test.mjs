import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BETA_INBOX, createBetaHandler } from './beta-signup.mjs';

/** @typedef {import('./beta-signup.mjs').BetaMailMessage} BetaMailMessage */
/**
 * @typedef {object} RequestOptions
 * @property {unknown} [body]
 * @property {string} [method]
 * @property {string} [origin]
 * @property {boolean} [configured]
 * @property {'ok' | 'error' | 'rejected'} [delivery]
 * @property {string} [contentType]
 */
/**
 * @typedef {object} TestResponse
 * @property {Record<string, string>} headers
 * @property {number} [code]
 * @property {unknown} [body]
 * @property {(key: string, value: string) => void} setHeader
 * @property {(value: number) => TestResponse} status
 * @property {(value: unknown) => void} json
 */

/** @param {RequestOptions} [options] */
async function request({ body = { email: 'tester@example.com', consent: true, website: '' }, method = 'POST', origin = 'https://zeroed.es', configured = true, delivery = 'ok', contentType = 'application/json' } = {}) {
  /** @type {BetaMailMessage[]} */
  const messages = [];
  const handler = createBetaHandler(async (message) => {
    messages.push(message);
    if (delivery === 'error') throw new Error('SMTP unavailable');
    return { accepted: delivery === 'rejected' ? [] : [BETA_INBOX] };
  }, () => configured);
  /** @type {TestResponse} */
  const res = {
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(value) { this.code = value; return this; },
    json(value) { this.body = value; },
  };
  await handler({ method, headers: { origin, 'content-type': contentType }, body }, res);
  return { res, messages };
}

test('sends a fixed-recipient notification with applicant reply-to after consent', async () => {
  const { res, messages } = await request();
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(messages.length, 1);
  const message = messages[0];
  assert.ok(message);
  assert.equal(message.to, BETA_INBOX);
  assert.equal(message.from.address, BETA_INBOX);
  assert.equal(message.replyTo, 'tester@example.com');
  assert.match(message.text, /tester@example.com/);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('rejects invalid input, header injection, missing consent and honeypot before email', async () => {
  for (const body of [null, [], '{', { email: 'tester@example.com', consent: false, website: '' }, { email: 'bad', consent: true, website: '' }, { email: 'tester@example.com\r\nBcc: victim@example.com', consent: true, website: '' }, { email: 'tester@example.com', consent: true, website: 'spam' }]) {
    const { res, messages } = await request({ body });
    assert.equal(res.code, 400);
    assert.equal(messages.length, 0);
  }
});

test('rejects foreign origin, non-POST requests, wrong content type and oversized payloads', async () => {
  /** @type {Array<[RequestOptions, number]>} */
  const cases = [[{ origin: 'https://evil.example' }, 403], [{ method: 'GET' }, 405], [{ contentType: 'text/plain' }, 415], [{ body: 'x'.repeat(2049) }, 413]];
  for (const [options, status] of cases) {
    const { res, messages } = await request(options);
    assert.equal(res.code, status);
    assert.equal(messages.length, 0);
  }
});

test('unconfigured email service does not claim registration or send mail', async () => {
  const { res, messages } = await request({ configured: false });
  assert.equal(res.code, 503);
  assert.equal(messages.length, 0);
});

test('mail errors and SMTP rejections never report success', async () => {
  /** @type {Array<'error' | 'rejected'>} */
  const failures = ['error', 'rejected'];
  for (const delivery of failures) {
    const { res } = await request({ delivery });
    assert.equal(res.code, 502);
    assert.deepEqual(res.body, { ok: false });
  }
});
