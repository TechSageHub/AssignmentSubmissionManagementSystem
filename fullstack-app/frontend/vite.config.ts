import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)/,
              priority: 20,
            },
            {
              name: 'recharts',
              test: /node_modules[\\/](recharts|d3-|victory-vendor)/,
              priority: 10,
            },
            {
              name: 'ui-vendor',
              test: /node_modules[\\/](@radix-ui|sonner|class-variance-authority|clsx|tailwind-merge|axios)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
