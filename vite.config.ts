import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Local CORS proxy — intercepts GET/POST/... to /proxy/<encoded-target-url>
 *  and forwards the request server-side, bypassing browser CORS restrictions.
 *  Only active during `vite dev`. */
function corsProxyPlugin(): Plugin {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use('/proxy', async (req: IncomingMessage, res: ServerResponse) => {
        // Handle preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
            'access-control-allow-headers': '*',
            'access-control-max-age': '86400',
          });
          res.end();
          return;
        }

        const encodedUrl = req.url?.slice(1); // strip leading '/'
        if (!encodedUrl) {
          res.writeHead(400); res.end('Missing target URL'); return;
        }

        let targetUrl: string;
        try {
          targetUrl = decodeURIComponent(encodedUrl);
          new URL(targetUrl); // validate
        } catch {
          res.writeHead(400); res.end('Invalid target URL'); return;
        }

        // Collect request body
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        await new Promise<void>((resolve) => req.on('end', resolve));
        const bodyBuf = chunks.length ? Buffer.concat(chunks) : undefined;

        // Forward headers, skip hop-by-hop
        const skipHeaders = new Set([
          'host', 'connection', 'transfer-encoding', 'upgrade',
          'proxy-connection', 'keep-alive',
        ]);
        const forwardHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) {
          if (!skipHeaders.has(k.toLowerCase()) && typeof v === 'string') {
            forwardHeaders[k] = v;
          }
        }

        try {
          const upstream = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: bodyBuf?.length ? bodyBuf : undefined,
              duplex: 'half',
          });

          const responseBody = Buffer.from(await upstream.arrayBuffer());

          const responseHeaders: Record<string, string> = {
            'access-control-allow-origin': '*',
          };
          upstream.headers.forEach((val, key) => {
            if (!skipHeaders.has(key)) responseHeaders[key] = val;
          });

          res.writeHead(upstream.status, responseHeaders);
          res.end(responseBody);
        } catch (err) {
          res.writeHead(502);
          res.end(`Proxy error: ${(err as Error).message}`);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), corsProxyPlugin()],
  base: '/flow-chart-tester/',
  server: {
    port: 5173,
  },
});
