import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import http from 'node:http';
import https from 'node:https';

/** Local CORS proxy — intercepts GET/POST/... to /proxy/<encoded-target-url>
 *  and forwards the request server-side, bypassing browser CORS restrictions.
 *  Only active during `vite dev`. */
function corsProxyPlugin(): Plugin {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use('/proxy', (req: IncomingMessage, res: ServerResponse) => {
        const corsHeaders = {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
          'access-control-allow-headers': '*',
          'access-control-max-age': '86400',
        };

        if (req.method === 'OPTIONS') {
          res.writeHead(204, corsHeaders);
          res.end();
          return;
        }

        // req.url has the '/proxy' prefix stripped by Connect
        const encodedUrl = req.url?.slice(1); // strip leading '/'
        if (!encodedUrl) {
          res.writeHead(400, corsHeaders); res.end('Missing target URL'); return;
        }

        let targetUrl: URL;
        try {
          targetUrl = new URL(decodeURIComponent(encodedUrl));
        } catch {
          res.writeHead(400, corsHeaders); res.end('Invalid target URL'); return;
        }

        const isHttps = targetUrl.protocol === 'https:';
        const transport = isHttps ? https : http;
        const port = targetUrl.port
          ? parseInt(targetUrl.port)
          : isHttps ? 443 : 80;

        const skipHeaders = new Set([
          'host', 'connection', 'transfer-encoding', 'upgrade',
          'proxy-connection', 'keep-alive',
        ]);

        const forwardHeaders: Record<string, string> = {
          host: targetUrl.host,
        };
        for (const [k, v] of Object.entries(req.headers)) {
          if (!skipHeaders.has(k.toLowerCase()) && typeof v === 'string') {
            forwardHeaders[k] = v;
          }
        }

        const options = {
          hostname: targetUrl.hostname,
          port,
          path: targetUrl.pathname + targetUrl.search,
          method: req.method,
          headers: forwardHeaders,
        };

        const proxyReq = transport.request(options, (proxyRes) => {
          const responseHeaders: Record<string, string | string[]> = { ...corsHeaders };
          for (const [k, v] of Object.entries(proxyRes.headers)) {
            if (!skipHeaders.has(k.toLowerCase()) && v !== undefined) {
              responseHeaders[k] = v as string | string[];
            }
          }
          res.writeHead(proxyRes.statusCode ?? 200, responseHeaders);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          if (!res.headersSent) {
            res.writeHead(502, corsHeaders);
          }
          res.end(`Proxy error: ${err.message}`);
        });

        req.pipe(proxyReq);
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
