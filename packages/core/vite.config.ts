import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const yogaRoot = path.join(__dirname, "node_modules/yoga-layout");

export default defineConfig({
  resolve: {
    alias: {
      // yoga-layout only exports "." and "./load"; deep paths are valid on disk.
      "yoga-layout/dist/binaries/yoga-wasm-base64-esm.js": path.join(
        yogaRoot,
        "dist/binaries/yoga-wasm-base64-esm.js",
      ),
      "yoga-layout/dist/src/wrapAssembly.js": path.join(yogaRoot, "dist/src/wrapAssembly.js"),
    },
  },
  test: {
    environment: "node",
    testTimeout: 30_000,
  },
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
    // Reuse `resolve.alias` so deep `yoga-layout/dist/...` paths resolve (not in package exports).
    fromVite: true,
    deps: {
      // Production deps are externalized by default; bundle all `yoga-layout/*` (incl. base64 WASM).
      alwaysBundle: [/^yoga-layout(\/|$)/],
      onlyBundle: false,
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
});
