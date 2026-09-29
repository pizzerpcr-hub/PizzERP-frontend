import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { cwd } from "node:process";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), "");

  const backendUrl = env.BACKEND_URL || "http://localhost:8000";

  return {
    plugins: [react()],

    server: {
      host: "0.0.0.0",

      proxy: {
        "/broadcasting": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },

        "/sanctum": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
