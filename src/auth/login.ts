import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import open from 'open';
import { brand, logo } from '../output/theme.js';

interface LoginResult {
  token: string;
  scope: 'read' | 'full';
}

const TIMEOUT_MS = 120_000;

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>FeedbackBasket CLI</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex; align-items: center; justify-content: center; min-height: 100vh;
    margin: 0; background: #0a0a0a; color: #fafafa; }
  .card { text-align: center; max-width: 400px; padding: 3rem; }
  h1 { color: #22c55e; font-size: 1.5rem; }
  p { color: #a1a1aa; line-height: 1.6; }
</style></head>
<body><div class="card">
  <h1>Authenticated!</h1>
  <p>You can close this window and return to your terminal.</p>
</div></body></html>`;

const ERROR_HTML = (message: string) => `<!DOCTYPE html>
<html><head><title>FeedbackBasket CLI</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex; align-items: center; justify-content: center; min-height: 100vh;
    margin: 0; background: #0a0a0a; color: #fafafa; }
  .card { text-align: center; max-width: 400px; padding: 3rem; }
  h1 { color: #ef4444; font-size: 1.5rem; }
  p { color: #a1a1aa; line-height: 1.6; }
</style></head>
<body><div class="card">
  <h1>Authentication Failed</h1>
  <p>${message}</p>
</div></body></html>`;

export async function browserLogin(baseUrl: string, scope: 'read' | 'full' = 'read'): Promise<LoginResult> {
  const state = randomUUID();

  return new Promise<LoginResult>((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const receivedState = url.searchParams.get('state');
      const token = url.searchParams.get('token');
      const error = url.searchParams.get('error');

      // CSRF validation
      if (receivedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML('State mismatch — possible CSRF attack. Please try again.'));
        cleanup();
        reject(new Error('State mismatch during authentication'));
        return;
      }

      // User denied
      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML(`Authorization was denied: ${error}`));
        cleanup();
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }

      // Missing token
      if (!token) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML('No token received. Please try again.'));
        cleanup();
        reject(new Error('No token received in callback'));
        return;
      }

      // Success
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(SUCCESS_HTML);
      cleanup();
      resolve({ token, scope });
    });

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Authentication timed out after 2 minutes'));
    }, TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeout);
      server.close();
    }

    // Listen on random port on loopback
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        cleanup();
        reject(new Error('Failed to start local auth server'));
        return;
      }

      const port = addr.port;
      const authorizeUrl = `${baseUrl}/cli/authorize?callback_port=${port}&state=${state}&scope=${scope}`;

      console.log();
      console.log(`  ${logo()} CLI`);
      console.log();
      console.log(`  ${brand.primary('Opening browser for authentication...')}`);
      console.log();
      console.log(`  ${brand.muted('If the browser doesn\'t open, visit:')}`);
      console.log(`  ${brand.primary(authorizeUrl)}`);
      console.log();
      console.log(`  ${brand.muted('Waiting for authentication...')}`);
      console.log();

      open(authorizeUrl).catch(() => {
        // Browser open failed — user will use the URL manually
      });
    });
  });
}
