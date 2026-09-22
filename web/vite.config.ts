import { createServer } from 'node:http';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite accepts a single listen address. `host: '127.0.0.1'` misses
 * `localhost` when it resolves to ::1, which is common on Windows.
 * The same port can be bound on both loopbacks.
 */
function listenOnIpv6Loopback(): Plugin {
  return {
    name: 'listen-on-ipv6-loopback',
    configureServer(server) {
      return () => {
        const port = server.config.server.port;
        if (!port) return;
        const ipv6 = createServer(server.middlewares);
        ipv6.on('upgrade', (req, socket, head) => {
          server.httpServer?.emit('upgrade', req, socket, head);
        });
        ipv6.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') return;
          server.config.logger.warn(`Could not listen on [::1]:${port}: ${error.message}`);
        });
        ipv6.listen(port, '::1');
        server.httpServer?.on('close', () => {
          ipv6.close();
        });
      };
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  // Vite's `root` defaults to process.cwd(), not this file's directory.
  // Pinning it explicitly means dev and build behave identically
  // regardless of where a script happens to invoke Vite from - and it's
  // a second line of defence (after moving the repo's stale public/
  // folder to samples/legacy-render/, see the repo's plan) against
  // publicDir ever resolving outside this project.
  root: import.meta.dirname,

  // This app is a GitHub Pages *project* page
  // (https://<user>.github.io/cv-tailor-ts/), not a user/org page, so
  // every asset URL needs this prefix. Set unconditionally rather than
  // only in production, so dev and prod resolve assets identically and
  // there's no mode-conditional path bug to discover only after deploy.
  base: '/cv-tailor-ts/',

  plugins: [react(), tailwindcss(), listenOnIpv6Loopback()],

  // Prebundle cheerio explicitly for a deterministic dev server -
  // @core/html/cvStructure.ts (transitively pulled in by
  // @core/pipeline/postProcess.ts) is the reason it's a dependency here
  // at all.
  optimizeDeps: { include: ['cheerio'] },

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // The browser-safe core shared with the CLI and the worker -
      // prompts, the Keywords type, cvStructure helpers, the watermark
      // filter, filename helpers, the pipeline reducer.
      '@core': path.resolve(import.meta.dirname, '../src/core'),
      // original/MR_cv_base.html and shared.css. Only ever import
      // shared.css from here with Vite's `?raw` suffix - see
      // web/src/assets/baseCvs.ts once it exists - it contains a bare
      // `* { margin: 0 }` and a body background that would wreck this
      // app's own styling if imported normally.
      '@assets': path.resolve(import.meta.dirname, '../original'),
    },
  },

  server: {
    // IPv4 loopback. `listenOnIpv6Loopback` binds ::1 on this same port
    // so `localhost` works when it resolves to IPv6.
    host: '127.0.0.1',
    port: 5180,
    strictPort: true,
    // @core and @assets resolve outside Vite's project root (this
    // directory); without this, Vite's dev server refuses to serve
    // files it considers outside the project for security reasons.
    fs: { allow: [path.resolve(import.meta.dirname, '..')] },
    // No CORS at all in dev: requests to /api/* go to the local worker
    // (`npm run dev:worker`) as same-origin requests from the browser's
    // point of view. Production talks to the deployed worker's own
    // origin directly - see web/src/lib/env.ts once it exists.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
});
