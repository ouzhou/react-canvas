import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

// Monorepo packages publish `dist/`; local static build uses `import` condition → dist.
// Alias to `src` so `astro build` works without pre-running `vp pack` in each package.
// https://astro.build/config
export default defineConfig({
  vite: {
    // tailwindcss() returns Plugin[] — spread into Vite's plugins array
    plugins: [...tailwindcss()],
    resolve: {
      alias: {
        "@react-canvas/react": path.join(repoRoot, "packages/react/src/index.ts"),
        "@react-canvas/core": path.join(repoRoot, "packages/core/src/index.ts"),
        "@react-canvas/ui": path.join(repoRoot, "packages/ui/src/index.ts"),
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react/jsx-runtime", "react-dom", "react-dom/client", "@astrojs/react"],
    },
    ssr: {
      noExternal: ["@react-canvas/react", "@react-canvas/core", "@react-canvas/ui"],
    },
  },
  integrations: [
    react(),
    starlight({
      title: "React Canvas",
      customCss: ["./src/styles/global.css", "./src/styles/custom.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/ouzhou/react-canvas",
        },
      ],
      sidebar: [
        {
          label: "入门",
          items: [
            { label: "安装与开发", slug: "intro/installation" },
            { label: "路线图导读", slug: "intro/roadmap" },
            { label: "文档撰写指南", slug: "intro/authoring" },
          ],
        },
        {
          label: "Core（原生 TS）",
          items: [{ label: "概览", slug: "core" }],
        },
        {
          label: "React",
          items: [{ label: "概览", slug: "react" }],
        },
        {
          label: "UI 组件库",
          items: [
            { label: "概览", slug: "ui" },
            { label: "Button", slug: "ui/button" },
          ],
        },
        {
          label: "Playground",
          collapsed: false,
          items: [
            { label: "Phase 1", slug: "playground/phase-1" },
            { label: "Text", slug: "playground/text" },
            { label: "Button", slug: "playground/button" },
            { label: "@react-canvas/ui", slug: "playground/ui" },
            { label: "Pointer", slug: "playground/pointer" },
            { label: "Image & SVG", slug: "playground/image-svg" },
          ],
        },
        {
          label: "参考",
          autogenerate: { directory: "reference" },
        },
      ],
    }),
  ],
});
