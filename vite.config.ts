import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.RENTFLEX_API_PORT ?? env.PORT ?? "5185";
  const webPort = Number(env.RENTFLEX_WEB_PORT ?? env.VITE_PORT ?? 5184);
  const apiTarget = env.VITE_API_PROXY_TARGET ?? `http://127.0.0.1:${apiPort}`;
  const publicEnv = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? env.VITE_CLERK_PUBLISHABLE_KEY ?? "",
    VITE_CLERK_PUBLISHABLE_KEY: env.VITE_CLERK_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
    APP_NAME: env.APP_NAME ?? ""
  };
  const envScript = `window.__PUBLIC_ENV__ = ${JSON.stringify(publicEnv)};`;

  const publicEnvPlugin = {
    name: "public-env-script",
    configureServer(server: { middlewares: { use: (handler: (req: { url?: string }, res: { statusCode?: number; setHeader: (name: string, value: string) => void; end: (content: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/env.js") {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cache-Control", "no-store");
          res.end(envScript);
          return;
        }
        next();
      });
    }
  };

  return {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [
      react(),
      publicEnvPlugin,
      legacy({
        modernPolyfills: true,
        targets: ["> 0.5%", "last 2 versions", "Firefox ESR", "not dead"]
      })
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    },
    server: {
      port: webPort,
      proxy: {
        "/env.js": apiTarget,
        "/api": apiTarget
      },
      strictPort: true
    }
  };
});
