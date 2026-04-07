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
        "@react-canvas/plugin-viewport": path.join(
          repoRoot,
          "packages/plugin-viewport/src/index.ts",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react/jsx-runtime", "react-dom", "react-dom/client", "@astrojs/react"],
    },
    ssr: {
      noExternal: [
        "@react-canvas/react",
        "@react-canvas/core",
        "@react-canvas/ui",
        "@react-canvas/plugin-viewport",
      ],
    },
  },
  integrations: [
    react(),
    starlight({
      title: "React Canvas",
      description: "基于 CanvasKit（Skia WASM）与 Yoga 的 React 画布：布局、文字、交互与多媒体。",
      logo: {
        src: "./src/assets/logo.svg",
        alt: "React Canvas",
      },
      favicon: "/favicon.svg",
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
            { label: "快速上手", slug: "intro/quickstart" },
          ],
        },
        {
          label: "教程",
          items: [
            { label: "运行时与布局", slug: "guides/runtime-layout" },
            { label: "文字", slug: "guides/text" },
            { label: "指针与事件", slug: "guides/pointer" },
            { label: "zIndex 与叠放", slug: "guides/z-index" },
            { label: "图片与 SVG", slug: "guides/image-svg" },
          ],
        },
        {
          label: "UI 组件库",
          items: [
            { label: "概览", slug: "ui" },
            { label: "主题与密度", slug: "ui/theme" },
            { label: "Button", slug: "ui/button" },
            { label: "Checkbox", slug: "ui/checkbox" },
            { label: "Switch", slug: "ui/switch" },
            { label: "Avatar", slug: "ui/avatar" },
            { label: "Divider", slug: "ui/divider" },
            { label: "Loading", slug: "ui/loading" },
            { label: "Select", slug: "ui/select" },
            { label: "Icon", slug: "ui/icon" },
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
            { label: "ScrollView", slug: "playground/scroll-view" },
            { label: "Transform", slug: "playground/transform" },
            { label: "Image & SVG", slug: "playground/image-svg" },
            { label: "Icon", slug: "playground/icon" },
            { label: "Two-factor card", slug: "playground/two-factor-card" },
            { label: "Multi-canvas", slug: "playground/multi-canvas" },
            { label: "Mobile app lab", link: "/mobile-app-lab" },
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
