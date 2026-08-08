/**
 * Build satu berkas HTML untuk GitHub Pages.
 *
 * Bedanya dengan `npm run build` biasa (keluar ke `dist/`): seluruh JS, CSS,
 * dan gambar dijadikan satu `index.html`. Yang tersisa di sebelahnya hanya
 * `models/` — mesh 3D-nya 19 MB, terlalu besar untuk di-base64 ke dalam HTML
 * tanpa bikin tab berat saat dibuka.
 *
 * Berkas ini berdiri sendiri: tidak mengubah `package.json`, `vite.config.ts`,
 * atau apa pun yang sudah ada. Jalankan:
 *
 *     node scripts/build-gh-pages.mjs
 *
 * Hasil ada di `gh-pages/`. Isi folder itu yang diunggah ke GitHub Pages.
 */

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = 'gh-pages';

/**
 * Lipat chunk JS dan CSS hasil build ke dalam `index.html`, lalu buang berkas
 * aslinya dari bundle supaya tidak ikut ditulis ke disk.
 */
function inlineIntoHtml() {
  return {
    name: 'kneefit-inline-into-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') {
        throw new Error('index.html tidak ada di bundle — build dibatalkan.');
      }
      let source = String(html.source);

      // Inlining hanya sahih kalau JS-nya satu chunk; chunk terpisah akan saling
      // meng-import lewat berkas yang sudah tidak ada setelah dilipat ke HTML.
      const jsChunks = Object.keys(bundle).filter((f) => f.endsWith('.js'));
      if (jsChunks.length > 1) {
        throw new Error(`Build menghasilkan ${jsChunks.length} chunk JS (${jsChunks.join(', ')}); tidak bisa dijadikan satu HTML.`);
      }

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName === 'index.html') continue;
        const esc = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
          // `</script>` di dalam string JS akan menutup tag lebih awal kalau tidak di-escape
          const code = chunk.code.replace(/<\/script>/gi, '<\\/script>');
          const tag = new RegExp(`<script[^>]*src="[^"]*${esc}"[^>]*>\\s*</script>`);
          if (!tag.test(source)) throw new Error(`Tag <script> untuk ${fileName} tidak ditemukan.`);
          source = source.replace(tag, () => `<script type="module">\n${code}\n</script>`);
          delete bundle[fileName];
          continue;
        }

        if (chunk.type === 'asset' && fileName.endsWith('.css')) {
          const tag = new RegExp(`<link[^>]*href="[^"]*${esc}"[^>]*>`);
          if (!tag.test(source)) throw new Error(`Tag <link> untuk ${fileName} tidak ditemukan.`);
          source = source.replace(tag, () => `<style>\n${String(chunk.source)}\n</style>`);
          delete bundle[fileName];
        }
      }

      html.source = source;
    },
  };
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

await build({
  configFile: false,          // jangan pakai vite.config.ts — konfigurasi ini berdiri sendiri
  root,
  base: './',                 // path relatif: jalan di https://user.github.io/repo/
  plugins: [react(), inlineIntoHtml()],
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,        // hanya mengosongkan gh-pages/, tidak menyentuh dist/
    assetsInlineLimit: Number.MAX_SAFE_INTEGER, // gambar jadi data URI, bukan berkas terpisah
    cssCodeSplit: false,
    chunkSizeWarningLimit: Number.MAX_SAFE_INTEGER,
    // Aplikasi ini memang sudah ter-bundle jadi satu chunk JS, jadi tidak perlu
    // `inlineDynamicImports` — opsi itu menyusun ulang urutan modul dan bikin
    // loader three.js gagal dimuat. Plugin di atas yang memverifikasi jumlah chunk.
  },
});

// GitHub Pages menjalankan Jekyll secara default dan melewati berkas berawalan `_`.
writeFileSync(join(root, OUT_DIR, '.nojekyll'), '');

const outPath = join(root, OUT_DIR);
const htmlSize = statSync(join(outPath, 'index.html')).size;
let modelsSize = 0;
let modelCount = 0;
try {
  for (const f of readdirSync(join(outPath, 'models'))) {
    modelsSize += statSync(join(outPath, 'models', f)).size;
    modelCount += 1;
  }
} catch {
  console.warn('! folder models/ tidak ada di keluaran — cek public/models/');
}

const stray = readdirSync(outPath).filter((f) => !['index.html', '.nojekyll', 'models'].includes(f));

console.log(`\n✓ ${OUT_DIR}/index.html   ${mb(htmlSize)}   (JS + CSS + gambar ter-inline)`);
console.log(`  ${OUT_DIR}/models/      ${mb(modelsSize)}   (${modelCount} berkas)`);
if (stray.length) console.log(`  sisa berkas lain: ${stray.join(', ')}`);
console.log(`\nCoba lokal:  npx serve ${OUT_DIR}`);
console.log(`Unggah isi folder ${OUT_DIR}/ ke GitHub Pages. Detail: docs/DEPLOY_GITHUB_PAGES.md\n`);
