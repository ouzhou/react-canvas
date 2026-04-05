import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30_000,
  },
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
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
