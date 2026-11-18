import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './server/auth.ts'

function betterAuthDevPlugin(): Plugin {
  return {
    name: 'better-auth-dev-plugin',
    configureServer(server) {
      const handler = toNodeHandler(auth);
      server.middlewares.use((req, res, next) => {
        if (
          req.url?.startsWith('/api/auth/sign-in') ||
          req.url?.startsWith('/api/auth/sign-up') ||
          req.url?.startsWith('/api/auth/email-otp') ||
          req.url?.startsWith('/api/auth/callback') ||
          req.url?.startsWith('/api/auth/get-session') ||
          req.url?.startsWith('/api/auth/sign-out') ||
          req.url?.startsWith('/api/auth/token')
        ) {
          return handler(req, res);
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    betterAuthDevPlugin(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
