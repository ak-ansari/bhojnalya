// The guest QR menu (TRD §10). Every build checks the gzipped JS budget.
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { jsBudget } from './scripts/jsBudget.js';

export const SRC_ALIAS = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
  plugins: [react(), tailwindcss(), jsBudget()],
  resolve: { alias: SRC_ALIAS },
  build: {
    reportCompressedSize: false,
  },
});
