import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiPort = Number(process.env.PORT) || 3001;

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    // Fail loudly instead of silently moving to 5174 when a dev server is
    // already running - a stray second instance has no working HMR client.
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
    },
  },
});
