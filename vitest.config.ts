import { defineConfig } from "vitest/config";

// Standalone vitest config: the app's vite.config.ts is driven by
// @lovable.dev/vite-tanstack-config, which pulls in the full TanStack Start /
// nitro pipeline (and a build-only nitro target). Tests only need the `@/`
// alias to resolve, which Vite now does natively from tsconfig.json.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
