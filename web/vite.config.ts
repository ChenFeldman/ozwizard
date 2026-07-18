import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Thin dev setup: serve the React app on :5173 and proxy /api/* to the
// OzWizard API on :3000 (stripping the /api prefix), so the browser talks to a
// single origin and there is no CORS to configure.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
