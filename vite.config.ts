import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(async () => {
  // Import the backend config using dynamic import to avoid TypeScript issues
  // @ts-expect-error - backend.config.cjs is a CommonJS module without type declarations
  const backendConfig: { getBackendUrl: () => string } = await import("./backend.config.cjs");
  const backendUrl = backendConfig.getBackendUrl();

  const cspDirectives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    "connect-src": ["'self'", "localhost:*", "ws://localhost:*"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"]
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, "/tickets/api"),
        },
        "/download": {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/download/, "/tickets/api/download"),
        },
      },
      cors: true,
      fs: {
        strict: false
      },
      middlewares: [
        (_req: any, res: any, next: () => void) => {
          const cspString = Object.entries(cspDirectives)
            .map(([key, values]) => `${key} ${values.join(" ")}`)
            .join("; ");

          res.setHeader("Content-Security-Policy", cspString);
          next();
        },
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
          },
        },
      },
    },
  };
});