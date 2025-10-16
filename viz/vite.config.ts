import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// Plugin to serve WASM files with correct MIME type
const wasmContentTypePlugin = {
  name: 'wasm-content-type-plugin',
  configureServer(server: any) {
    server.middlewares.use((_req: any, res: any, next: any) => {
      if (_req.url?.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm')
      }
      next()
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), wasmContentTypePlugin],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  optimizeDeps: {
    exclude: ['parquet-wasm'],
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
})
