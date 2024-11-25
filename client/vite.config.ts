import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import autoprefixer from 'autoprefixer'
import tailwind from 'tailwindcss'


export default defineConfig((env) => {
  const envars = loadEnv(env.mode, './');

  const serverURL = new URL(
    envars.VITE_SERVER_URL ?? 'http://localhost:3001'
  );
  const serverAPIPath = envars.VITE_SERVER_API_PATH ?? '/api';


  return {
    css: {
      postcss: {
        plugins: [tailwind(), autoprefixer()],
      },
    },
    envDir: './',
    define: {
      __API_PATH__: JSON.stringify(serverAPIPath),
    },
    plugins: [
      vue(),
      // vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      port: 5173,
      proxy: {
        // proxy requests with the API path to the server
        // <http://localhost:5173/api> -> <http://localhost:3001/api>
        [serverAPIPath]: serverURL.origin,
      },
    },
  }
})
