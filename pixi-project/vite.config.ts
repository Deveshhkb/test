import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 8080,
    open: true,
    // Reachable from a phone or tablet on the same network for real-device
    // testing: `npm run dev -- --host` prints the LAN URL.
    host: true,
  },
  preview: {
    // Used by the automated responsive sweep; never pop a browser window.
    open: false,
  },
});
