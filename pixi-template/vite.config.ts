import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  base: "./", // relative paths -> the build works from any folder / CDN / subpath
  server: { port: 8080, open: true, host: true },
  build: { target: "es2022", assetsInlineLimit: 0 },
});
