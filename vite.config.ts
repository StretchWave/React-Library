/// <reference types="vitest/config" />
// App toolchain config. Tooling CLIs under scripts/ stay dependency-free and are
// driven directly by node (MASTER_SPEC.md §8); vite config only covers src/.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// M6.6 alias table for the vendored shadcn/Magic UI sources (they keep their
// official import specifiers verbatim; the app maps them onto owned shims).
const cnShim = fileURLToPath(new URL("./src/lib/cn.ts", import.meta.url));
const shadcnBase = fileURLToPath(new URL("./catalog/components/shadcn/", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^cn$/, replacement: cnShim },
      { find: /^@\/lib\/utils$/, replacement: cnShim },
      { find: /^@\/registry\/new-york-v4\/ui\/([\w-]+)$/, replacement: `${shadcnBase}$1/$1.tsx` },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    globals: false,
  },
});
