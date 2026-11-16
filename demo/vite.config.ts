import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// The demo imports the library straight from ../src, so edits show up instantly.
export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: command === "build" ? "/snowfall-effect/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "react-snowfall-canvas": fileURLToPath(
        new URL("../src/index.ts", import.meta.url),
      ),
    },
  },
  server: { open: true },
}));
