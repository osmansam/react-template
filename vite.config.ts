import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgrPlugin from "vite-plugin-svgr";
import viteTsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3005,
  },
  build: {
    outDir: "dist",
  },
  esbuild:
    process.env.NODE_ENV === "production"
      ? {
          drop: ["console", "debugger"],
        }
      : undefined,
  plugins: [react(), viteTsconfigPaths(), svgrPlugin()],
});
