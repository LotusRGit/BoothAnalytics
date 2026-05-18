import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Electron の file:// でも相対パスが解決できるように
  base: './',

  server: {
    // ブラウザ開発時のみ Vite がプロキシ担当
    proxy: {
      '/booth-page': {
        target:          'https://booth.pm',
        changeOrigin:    true,
        followRedirects: true,
        rewrite: path => path.replace(/^\/booth-page/, '/ja/items'),
      },
    },
  },
})
