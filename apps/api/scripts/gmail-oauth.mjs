// Obtiene el GMAIL_REFRESH_TOKEN para el adapter de la API de Gmail (ADR-006).
// Uso (desde la raíz del repo):  node apps/api/scripts/gmail-oauth.mjs
// Requiere GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET en .env (cliente OAuth tipo "App de escritorio").
// Abrí la URL que imprime, autorizá con TU cuenta de Gmail, y copiá el refresh token al .env + Render.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const PORT = 5175;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/gmail.send';

function leerEnv() {
  try {
    const raw = readFileSync(new URL('../../../.env', import.meta.url), 'utf8');
    return Object.fromEntries(
      raw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => {
          const i = l.indexOf('=');
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const env = leerEnv();
const clientId = process.env.GMAIL_CLIENT_ID ?? env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET ?? env.GMAIL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Faltan GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET en .env (cliente OAuth de escritorio).');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent', // fuerza que Google devuelva refresh_token
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', REDIRECT);
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('Sin code');
    return;
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code',
      }),
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok || !data.refresh_token) {
      console.error('No se obtuvo refresh_token:', JSON.stringify(data));
      res.writeHead(500).end('Error: revisá la terminal.');
      server.close();
      process.exit(1);
    }
    console.log('\n=========================================================');
    console.log('GMAIL_REFRESH_TOKEN=' + data.refresh_token);
    console.log('=========================================================\n');
    console.log('Pegá esa línea en .env y en Render. Listo.');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
      '<h2>Autorización lista ✅</h2><p>Volvé a la terminal: ahí está tu refresh token.</p>',
    );
  } catch (e) {
    console.error('Error:', e.message);
    res.writeHead(500).end('Error');
  } finally {
    setTimeout(() => server.close(), 500);
  }
});

server.listen(PORT, () => {
  console.log('\n1) Abrí esta URL en el navegador (logueado con la cuenta que enviará los mails):\n');
  console.log(authUrl.toString());
  console.log(`\n2) Autorizá. Google te redirige a ${REDIRECT} y acá aparece el refresh token.\n`);
});
