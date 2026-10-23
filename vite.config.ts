import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { createApi } from "#server/api.ts";
import { defaultConfigDir } from "#server/store.ts";

function memoriesApi(): Plugin {
  const api = createApi({ configDir: defaultConfigDir() });
  return {
    name: "claude-memories-api",
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        if (!api(req, res)) next();
      });
    },
  };
}

export default defineConfig({
  root: "src/app",
  plugins: [react(), memoriesApi()],
  build: { outDir: "../../dist/app", emptyOutDir: true },
  server: { host: "127.0.0.1", port: 5190 },
});
