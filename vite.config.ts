/// <reference types="vitest/config" />
// App toolchain config. Tooling CLIs under scripts/ stay dependency-free and are
// driven directly by node (MASTER_SPEC.md §8); vite config only covers src/.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    globals: false,
  },
});
