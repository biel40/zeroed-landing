import { defineConfig, loadEnv } from 'vite';
import betaHandler from './api/beta.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['BETA_GMAIL_APP_PASSWORD', 'BETA_SITE_ORIGIN']) {
    if (env[key] !== undefined) process.env[key] = env[key];
  }
  return {
    build: {
      target: 'es2022',
      rollupOptions: { input: { main: 'index.html', agradecimientos: 'agradecimientos.html' } },
    },
    plugins: [{
      name: 'local-beta-api',
      configureServer(server) {
        process.env['BETA_SITE_ORIGIN'] ||= 'http://127.0.0.1:4174,http://localhost:4174';
        server.middlewares.use('/api/beta', async (req, res) => {
          let body = '';
          try {
            for await (const chunk of req) {
              body += chunk.toString();
              if (Buffer.byteLength(body) > 2048) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false }));
                return;
              }
            }
            /** @type {import('./server/beta-signup.mjs').BetaSignupResponse} */
            const response = {
              setHeader: (name, value) => res.setHeader(name, value),
              status(code) { res.statusCode = code; return this; },
              json(data) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
            };
            await betaHandler({ method: req.method, headers: req.headers, body }, response);
          } catch {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false }));
          }
        });
      },
    }],
  };
});
