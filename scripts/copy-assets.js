import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const OCR_ASSETS = new Map([
  ['worker.min.js', 'node_modules/tesseract.js/dist/worker.min.js'],
  ['core/tesseract-core-lstm.wasm.js', 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js'],
  ['core/tesseract-core-lstm.wasm', 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm'],
  ['core/tesseract-core-simd-lstm.wasm.js', 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js'],
  ['core/tesseract-core-simd-lstm.wasm', 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm'],
  ['core/tesseract-core-relaxedsimd-lstm.wasm.js', 'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['core/tesseract-core-relaxedsimd-lstm.wasm', 'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm'],
  ['lang/eng.traineddata.gz', 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'],
]);

const PDF_WORKER_ASSET = 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs';

async function copyAssets() {
  const root = process.cwd();
  const publicDir = resolve(root, 'public');

  // Copy Tesseract assets
  await Promise.all(
    [...OCR_ASSETS].map(async ([target, source]) => {
      const destination = join(publicDir, 'ocr', target);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(resolve(root, source), destination);
    })
  );
  
  // Copy PDF.js worker
  const pdfDestination = join(publicDir, 'pdf.worker.min.mjs');
  await mkdir(dirname(pdfDestination), { recursive: true });
  await copyFile(resolve(root, PDF_WORKER_ASSET), pdfDestination);
  
  console.log('Copied OCR and PDF assets to public/');
}

copyAssets().catch(console.error);
