export const BETA_INBOX = 'biel40aws@gmail.com';

/**
 * @param {import('./beta-signup.mjs').MailSender} sendMail
 * @param {() => boolean} isConfigured
 */
export function createBetaHandler(sendMail, isConfigured) {
  /**
   * @param {import('./beta-signup.mjs').BetaSignupRequest} req
   * @param {import('./beta-signup.mjs').BetaSignupResponse} res
   */
  return async function betaSignup(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    /**
     * @param {number} status
     * @param {{ ok: boolean }} body
     */
    const reply = (status, body) => res.status(status).json(body);
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return reply(405, { ok: false });
    }
    // Browsers must submit from this site. This is not an authentication check.
    const origin = req.headers['origin'];
    const expectedOrigin = process.env['BETA_SITE_ORIGIN'] || 'https://zeroed.es';
    if (typeof origin !== 'string') return reply(403, { ok: false });
    if (origin !== expectedOrigin) return reply(403, { ok: false });
    const contentType = req.headers['content-type'];
    if (typeof contentType !== 'string' || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
      return reply(415, { ok: false });
    }
    const contentLength = req.headers['content-length'];
    if (typeof contentLength === 'string' && Number(contentLength) > 2048) return reply(413, { ok: false });
    /** @type {unknown} */
    let body;
    try {
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (!raw || Buffer.byteLength(raw) > 2048) return reply(413, { ok: false });
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch { return reply(400, { ok: false }); }
    if (!isRecord(body)) return reply(400, { ok: false });
    if (typeof body['website'] !== 'string' || body['website'] !== '') return reply(400, { ok: false });
    const email = typeof body['email'] === 'string' ? body['email'].trim() : '';
    if (body['consent'] !== true || email.length > 254
      || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(email)) {
      return reply(400, { ok: false });
    }
    if (!isConfigured()) return reply(503, { ok: false });
    try {
      const result = await sendMail({
        from: { name: 'Zeroed · Beta', address: BETA_INBOX },
        to: BETA_INBOX,
        replyTo: email,
        subject: 'Zeroed · Nueva solicitud para la beta cerrada',
        text: `Nueva solicitud desde la landing de Zeroed\n\nEmail: ${email}\nFecha: ${new Date().toISOString()}\n\nHa aceptado recibir la invitación y comunicaciones sobre esta beta y ha indicado que ha leído la política de privacidad.\n\nPuedes responder a este correo para contactar con el solicitante.`,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (!result.accepted?.includes(BETA_INBOX)) throw new Error('Recipient not accepted');
      return reply(200, { ok: true });
    } catch {
      // Avoid logging the applicant's email or SMTP credentials.
      console.error('Beta notification delivery failed.');
      return reply(502, { ok: false });
    }
  };
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
