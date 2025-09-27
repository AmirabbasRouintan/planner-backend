import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { getBackendUrl } from "./backend.config.js"

const backendUrl = getBackendUrl();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/tickets/api')
      },
      '/download': {
        target: backendUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/download/, '/tickets/api/download')
      }
    }
  }
})