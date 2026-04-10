import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    conditions: ["development", "module", "browser", "import", "default"],
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
    fromVite: true,
    deps: {
      alwaysBundle: [/^yoga-layout(\/|$)/],
      onlyBundle: false,
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
