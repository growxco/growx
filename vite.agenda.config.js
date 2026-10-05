import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins:[react(),tailwindcss()],
  publicDir:false,
  resolve:{alias:{'@':path.resolve(import.meta.dirname,'src')}},
  build:{
    target:'es2020', outDir:'dist', emptyOutDir:false, assetsDir:'agenda-assets',
    cssCodeSplit:true, chunkSizeWarningLimit:650,
    rollupOptions:{input:path.resolve(import.meta.dirname,'socios-agenda.html')},
  },
});
