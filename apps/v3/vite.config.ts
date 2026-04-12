import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { lingui } from "@lingui/vite-plugin";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(appDir, "../..");

const workspaceSrc = {
  "@react-canvas/core-v2": path.resolve(monorepoRoot, "packages/core-v2/src/index.ts"),
  "@react-canvas/react-v2": path.resolve(monorepoRoot, "packages/react-v2/src/index.ts"),
} as const;

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["@lingui/babel-plugin-lingui-macro"],
      },
    }),
    lingui(),
  ],
  resolve: {
    conditions: ["development", "module", "browser", "import", "default"],
    alias: { ...workspaceSrc },
  },
  server: {
    fs: {
      allow: [monorepoRoot],
    },
  },
  optimizeDeps: {
    exclude: ["@react-canvas/core-v2", "@react-canvas/react-v2"],
  },
});
