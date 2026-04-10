import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    conditions: ["development", "module", "browser", "import", "default"],
  },
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
