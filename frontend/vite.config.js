import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Lets the frontend call "/api/..." in dev without hardcoding the backend host.
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
