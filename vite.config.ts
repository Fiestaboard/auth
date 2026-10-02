import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ isSsrBuild }) => ({
  // Relative asset URLs: the site is served under /auth/ today and must keep
  // working unchanged if it ever moves to its own domain.
  base: "./",
  plugins: [react(), tailwindcss()],
  // The prerender bundle renders FiestaUI components in Node.
  ssr: { noExternal: ["@fiestaboard/ui"] },
  build: {
    // Every page's CSP is `default-src 'none'` with only 'self' allowed, so
    // nothing may be inlined: no data: URIs, no injected inline polyfill.
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    emptyOutDir: true,
    rollupOptions: isSsrBuild
      ? {}
      : {
          input: {
            index: resolve(import.meta.dirname, "index.html"),
            redirect: resolve(import.meta.dirname, "oauth/redirect.html"),
            boards: resolve(import.meta.dirname, "oauth/boards.html"),
          },
        },
  },
}));
