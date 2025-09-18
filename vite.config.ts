import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import fs from "fs"

// Read dynamic proxy configuration
let proxyTarget = 'http://localhost:8000'; // default

try {
  const config = JSON.parse(fs.readFileSync('./proxy-config.json', 'utf8'));
  proxyTarget = config.target || proxyTarget;
  console.log(`Using proxy target: ${proxyTarget}`);
} catch (error) {
  console.log('Using default proxy target: http://localhost:8000');
}

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
        target: proxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/tickets/api')
      },
      '/download': {
        target: proxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/download/, '/tickets/api/download')
      }
    }
  }
})