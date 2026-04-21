import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import neon from './neon-vite-plugin.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = (env.VITE_PUBLIC_API_URL || 'http://127.0.0.1:3000').replace(
    /\/+$/,
    '',
  )

  return {
    resolve: { tsconfigPaths: true },
    server: {
      port: Number(env.VITE_DEV_SERVER_PORT || 5173),
      host: env.VITE_DEV_SERVER_HOST || '127.0.0.1',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [devtools(), neon, tailwindcss(), tanstackStart(), viteReact()],
  }
})
