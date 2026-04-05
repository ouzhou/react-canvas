import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
    deps: {
      neverBundle: ["react", "react/jsx-runtime", "@react-canvas/react", "@react-canvas/core"],
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
