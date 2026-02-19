import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/shared/lib/utils.ts",
        "src/shared/config/constants.ts",
        "src/shared/ui/tag-badge.tsx",
        "src/shared/ui/opportunity-score.tsx",
        "src/shared/ui/sparkline.tsx",
        "src/shared/ui/empty-state.tsx",
      ],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
