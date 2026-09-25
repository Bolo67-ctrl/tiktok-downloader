import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";

const codespaceHost = process.env.CODESPACE_NAME
  ? `${process.env.CODESPACE_NAME}-5173.${
      process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ||
      "app.github.dev"
    }`
  : null;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: codespaceHost ? [codespaceHost] : [],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});