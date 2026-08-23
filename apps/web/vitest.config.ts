import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: "./tests/global-setup.mjs",
    setupFiles: ["./tests/setup.ts"],
    // Los archivos comparten la MISMA DB de test: sin paralelismo entre
    // archivos para evitar carreras con los deleteMany de limpieza.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
