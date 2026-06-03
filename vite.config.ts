import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.RENTFLEX_API_PORT ?? env.PORT ?? "5185";
  const webPort = Number(env.RENTFLEX_WEB_PORT ?? env.VITE_PORT ?? 5184);
  const apiTarget = env.VITE_API_PROXY_TARGET ?? `http://127.0.0.1:${apiPort}`;

  return {
    plugins: [react()],
    server: {
      port: webPort,
      proxy: {
        "/api": apiTarget
      },
      strictPort: true
    }
  };
});
