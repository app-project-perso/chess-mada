import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "Échecs App",
        short_name: "Échecs",
        description:
          "Jeu d'échecs offline avec Stockfish",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",

        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },

      workbox: {
        maximumFileSizeToCacheInBytes:
          120 * 1024 * 1024,

        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,wasm}",
        ],
      },
    }),
  ],
});