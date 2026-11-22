import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    typecheck: {
      enabled: true,
      include: ["src/**/*.test.ts"],
    },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/**/*.stories.*",
        "src/visual-engine/effects/providers/reactbits/**",
      ],
      // Ratchet: baseline measured 55.75 / 76.16 / 61.23 / 55.75
      // (visual-engine: 57.11% lines). Raise these as coverage grows; never lower them.
      thresholds: {
        statements: 55,
        branches: 75,
        functions: 60,
        lines: 55,
        "src/visual-engine/**": {
          statements: 55,
          lines: 55,
        },
      },
    },
  },
});
