import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'

const OCR_ASSETS = new Map([
  ['worker.min.js', 'node_modules/tesseract.js/dist/worker.min.js'],
  [
    'core/tesseract-core-lstm.wasm.js',
    'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
  ],
  [
    'core/tesseract-core-lstm.wasm',
    'node_modules/tesseract.js-core/tesseract-core-lstm.wasm',
  ],
  [
    'core/tesseract-core-simd-lstm.wasm.js',
    'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  ],
  [
    'core/tesseract-core-simd-lstm.wasm',
    'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm',
  ],
  [
    'core/tesseract-core-relaxedsimd-lstm.wasm.js',
    'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  ],
  [
    'core/tesseract-core-relaxedsimd-lstm.wasm',
    'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm',
  ],
  [
    'lang/eng.traineddata.gz',
    'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
  ],
])

const contentTypes = {
  '.gz': 'application/gzip',
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
}

function localOcrAssets() {
  const root = process.cwd()
  return {
    name: 'bookflow-local-ocr-assets',
    configureServer(server) {
      server.middlewares.use('/ocr', (request, response, next) => {
        const requestPath = decodeURIComponent(request.url?.split('?')[0] ?? '')
          .replace(/^\/+/, '')
        const source = OCR_ASSETS.get(requestPath)
        if (!source) {
          next()
          return
        }
        response.setHeader(
          'Content-Type',
          contentTypes[extname(source)] ?? 'application/octet-stream',
        )
        createReadStream(resolve(root, source)).pipe(response)
      })
    },
    async writeBundle(options) {
      const outputDirectory = resolve(root, options.dir ?? 'dist')
      await Promise.all(
        [...OCR_ASSETS].map(async ([target, source]) => {
          const destination = join(outputDirectory, 'ocr', target)
          await mkdir(dirname(destination), { recursive: true })
          await copyFile(resolve(root, source), destination)
        }),
      )
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), localOcrAssets()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-motion'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
            if (id.includes('zustand') || id.includes('swr')) return 'vendor-state'
          }
        },
      },
    },
  },
})
