import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
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

function handleAiStudioMock(req, res) {
  const url = req.url || ''
  if (url.includes('/reading-lens')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })
    res.write('event: start\ndata: {"status":"streaming","candidates":["ai-studio-mock"]}\n\n')
    res.write('event: message\ndata: {"text":"[Google AI Studio Mock] Reading Lens simulated response. Passage analyzed in frontend-first development mode."}\n\n')
    res.write('event: completed\ndata: {"status":"complete","provider":"AI Studio Mock Engine","fallbackUsed":false}\n\n')
    res.end()
    return true
  }
  if (url.includes('/ocr/scan')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ job_id: 'mock-ocr-1', stream_url: '/api/ocr/progress/mock-ocr-1' }))
    return true
  }
  if (url.includes('/ocr/progress')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })
    res.write('event: progress\ndata: {"page":1,"total_pages":1,"percent":100,"velocity_pages_per_sec":5.0,"text":"[Google AI Studio Mock] Document extracted successfully."}\n\n')
    res.write('event: done\ndata: {"job_id":"mock-ocr-1","status":"completed"}\n\n')
    res.end()
    return true
  }
  if (url.includes('/ocr/result')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ job_id: 'mock-ocr-1', markdown: '# Scanned Document\n\nSample page text extracted via AI Studio Mock Gate.' }))
    return true
  }
  if (url.includes('/social/events')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, status: 'recorded_mock' }))
    return true
  }
  if (url.includes('/social/resonance')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ count: 42, readers: 12 }))
    return true
  }
  if (url.includes('/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'healthy', mode: 'ai-studio-gate', backend: 'mock-fallback' }))
    return true
  }
  return false
}

function aiStudioMockGate() {
  const isMockMode = process.env.VITE_AI_STUDIO_MODE === 'true' || process.env.VITE_MOCK_BACKEND === 'true'
  return {
    name: 'bookflow-ai-studio-gate',
    configureServer(server) {
      if (isMockMode) {
        server.middlewares.use('/api', (req, res, next) => {
          if (handleAiStudioMock(req, res)) return
          next()
        })
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), localOcrAssets(), aiStudioMockGate()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    watch: {
      ignored: [
        '**/*.pdf',
        '**/dist/**',
        '**/backend/.venv/**',
        '**/**/__pycache__/**',
        '**/.pytest_cache/**',
        '**/node_modules/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if ((err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') && !res.headersSent) {
              const handled = handleAiStudioMock(req, res)
              if (handled) return
            }
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Proxy error', detail: err.message }))
            }
          })
        },
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
            if (id.includes('three')) return 'vendor-three'
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
