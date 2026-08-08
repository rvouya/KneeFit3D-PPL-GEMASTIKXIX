import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Path aset relatif: hasil `npm run build` bisa dihosting di root, di subpath
  // (mis. GitHub Pages), atau dibuka langsung dari berkas tanpa server.
  base: './',
});
