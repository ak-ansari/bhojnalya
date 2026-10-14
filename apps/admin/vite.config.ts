// Owner portal and super admin, bundled by Vite (TRD §4.3).
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' },
  },
});
