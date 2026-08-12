import { defineConfig } from "vite";
import { resolve } from "node:path";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 8080,
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        // The blackjack table is the default page; the earlier Dragon Tiger
        // prototype stays reachable at /dragon-tiger.html.
        main: resolve(__dirname, "index.html"),
        dragonTiger: resolve(__dirname, "dragon-tiger.html"),
      },
    },
  },
});
