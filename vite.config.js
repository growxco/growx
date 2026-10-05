import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        agenda: path.resolve(import.meta.dirname, 'socios-agenda.html'),
        // Entrada dedicada pro /prevenda: mesmas bundles, mas com Open Graph
        // próprio (crawlers de WhatsApp/Meta não executam JS).
        prevenda: path.resolve(import.meta.dirname, 'prevenda.html'),
      },
    },
  },
})
