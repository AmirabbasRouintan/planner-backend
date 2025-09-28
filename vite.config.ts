import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(async () => {
  // Import the backend config using dynamic import to avoid TypeScript issues
  // @ts-expect-error - backend.config.cjs is a CommonJS module without type declarations
  const backendConfig: { getBackendUrl: () => string } = await import("./backend.config.cjs");
  const backendUrl = backendConfig.getBackendUrl();

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, '/tickets/api')
        },
        '/download': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/download/, '/tickets/api/download')
        }
      }
    }
  };
});