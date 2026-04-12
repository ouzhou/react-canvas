import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-po";

export default defineConfig({
  sourceLocale: "zh-cn",
  locales: ["en", "zh-cn"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["<rootDir>/src"],
      exclude: ["**/node_modules/**", "<rootDir>/src/routeTree.gen.ts"],
    },
  ],
  format: formatter({ lineNumbers: false }),
});
