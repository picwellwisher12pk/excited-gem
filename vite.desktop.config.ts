import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

function plasmoSvgPlugin() {
  return {
    name: 'plasmo-svg-resolver',
    resolveId(id: string) {
      if (id.startsWith('react:/')) {
        return '\0' + id
      }
    },
    load(id: string) {
      if (id.startsWith('\0react:/')) {
        const relativePath = id.replace('\0react:/', '')
        const filePath = path.resolve(__dirname, relativePath)
        const svg = fs.readFileSync(filePath, 'utf-8')
        return `
          import React from 'react'
          export default function SvgComponent({ className, style, ...props }) {
            return React.createElement('span', {
              className: 'inline-flex items-center justify-center ' + (className || ''),
              style,
              ...props,
              dangerouslySetInnerHTML: { __html: ${JSON.stringify(svg)} }
            })
          }
        `
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), plasmoSvgPlugin()],
  root: path.resolve(__dirname, 'desktop'),
  publicDir: path.resolve(__dirname, 'desktop/public'),
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    outDir: path.resolve(__dirname, 'dist-desktop'),
    emptyOutDir: true,
    target: 'es2022',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
