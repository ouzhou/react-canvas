// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  vite: {
    resolve: {
      dedupe: ["react", "react-dom"],
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
