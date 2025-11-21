import path from 'node:path';
import { reactRouter } from '@react-router/dev/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  envPrefix: 'NEXT_PUBLIC_',
  optimizeDeps: {
    include: ['lucide-react'],
    exclude: [
      '@hono/auth-js/react',
      '@hono/auth-js',
      '@auth/core',
      'hono/context-storage',
      '@auth/core/errors',
    ],
  },
  logLevel: 'info',
  plugins: [
    reactRouterHonoServer({
      serverEntryPoint: './src/server.ts',
      runtime: 'node',
    }),
    reactRouter(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  clearScreen: false,
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
});

