import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const API_URL = env.VITE_API_URL || "http://localhost:8000";

    return {
        plugins: [react()],

        server: {
            host: "0.0.0.0",

            proxy: {
                "/api": {
                    target: API_URL,
                    changeOrigin: true,
                },

                "/sanctum": {
                    target: API_URL,
                    changeOrigin: true,
                },
            },
        },
    };
});