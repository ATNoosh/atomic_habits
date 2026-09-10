import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Atomic Habits",
        short_name: "Habits",
        description: "A tiny personal habit tracker inspired by Atomic Habits.",
        theme_color: "#111827",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "./",
        scope: "./"
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,ico,png,webmanifest}"] }
    })
  ]
});
