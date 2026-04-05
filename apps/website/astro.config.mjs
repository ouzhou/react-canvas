// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

// Monorepo packages publish `dist/`; local static build uses `import` condition → dist.
// Alias to `src` so `astro build` works without pre-running `vp pack` in each package.
// https://astro.build/config
export default defineConfig({
  vite: {
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
            { label: "@react-canvas/ui", slug: "playground/ui" },
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
