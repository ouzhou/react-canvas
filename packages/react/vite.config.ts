import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const __dirname = dirname(fileURLToPath(import.meta.url));
const yogaRoot = join(__dirname, "node_modules/yoga-layout");

export default defineConfig({
  resolve: {
    alias: {
      "@react-canvas/core": resolve(__dirname, "../core/src/index.ts"),
      // Match core: deep paths are not in yoga-layout `exports` (Vitest resolves via src alias).
      "yoga-layout/dist/binaries/yoga-wasm-base64-esm.js": join(
        yogaRoot,
        "dist/binaries/yoga-wasm-base64-esm.js",
      ),
      "yoga-layout/dist/src/wrapAssembly.js": join(yogaRoot, "dist/src/wrapAssembly.js"),
    },
  },
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
    deps: {
      neverBundle: [
        "react",
        "react/jsx-runtime",
        "react-reconciler",
        "scheduler",
        "@react-canvas/core",
      ],
    },
  },
  lint: {
    ignorePatterns: ["dist/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: ["dist/**"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
