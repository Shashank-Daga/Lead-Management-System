import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static hosts (Vercel) return their own 404 for deep links such as /leads/123
// because no such file exists. Emitting a copy of index.html as 404.html makes the
// host serve the SPA shell for unknown paths, so React Router can resolve the URL.
// This avoids needing vercel.json.
function spaFallback404() {
  return {
    name: "spa-fallback-404",
    apply: "build",
    enforce: "post",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const index = bundle["index.html"];
        if (index && index.type === "asset") {
          this.emitFile({ type: "asset", fileName: "404.html", source: index.source });
        }
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), spaFallback404()],
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
