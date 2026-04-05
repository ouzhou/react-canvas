// @ts-check
import react from "@astrojs/react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

/** Rolldown 在部分环境下无法解析 pnpm workspace  symlink，显式指向源码入口。 */
const reactCanvasReact = fileURLToPath(
  new URL("../../packages/react/src/index.ts", import.meta.url),
);
const reactCanvasCore = fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url));

// https://astro.build/config
export default defineConfig({
  vite: {
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@react-canvas/react": reactCanvasReact,
        "@react-canvas/core": reactCanvasCore,
      },
    },
    optimizeDeps: {
      include: ["react", "react/jsx-runtime", "react-dom", "react-dom/client", "@astrojs/react"],
    },
    ssr: {
      noExternal: ["@react-canvas/react", "@react-canvas/core"],
    },
  },
  integrations: [
    react(),
    starlight({
      title: "My Docs",
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/withastro/starlight" }],
      sidebar: [
        {
          label: "Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Example Guide", slug: "guides/example" },
            { label: "Phase 1 playground", slug: "playground/phase-1" },
            { label: "Text playground", slug: "playground/text" },
            { label: "Button playground", slug: "playground/button" },
            { label: "Pointer playground", slug: "playground/pointer" },
            { label: "Image & SVG playground", slug: "playground/image-svg" },
          ],
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
      ],
    }),
  ],
});
