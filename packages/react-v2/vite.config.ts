import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
    deps: {
      neverBundle: ["react", "react/jsx-runtime", "@react-canvas/core-v2"],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
