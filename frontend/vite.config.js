import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During local `npm run dev`, proxy API calls to the backend so the frontend
// can use relative URLs (no CORS headaches). In production the app talks to
// VITE_API_URL directly (see src/api.js).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
