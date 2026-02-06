import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "tests/**/*.spec.{ts,tsx}", "tests/**/*.test.{js,jsx}", "tests/**/*.spec.{js,jsx}", "tests/**/*.test.mjs", "tests/**/*.spec.mjs"],
    exclude: ["tests/e2e/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
