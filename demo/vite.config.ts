import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The demo imports the library straight from ../src, so edits show up instantly.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      'react-snowfall-effect': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
  server: { open: true },
});
