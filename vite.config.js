import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",

    proxy: {
      "/api": {
        target: "http://192.168.0.30:8000",
        changeOrigin: true,
      },

      "/sanctum": {
        target: "http://192.168.0.30:8000",
        changeOrigin: true,
      },
    },
  },
});