import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import svgrPlugin from "vite-plugin-svgr";
import viteTsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  const analyze = process.env.ANALYZE === "true";
  const plugins: PluginOption[] = [
    react(),
    viteTsconfigPaths(),
    svgrPlugin(),
  ];

  if (analyze) {
    plugins.push(
      visualizer({
        filename: fileURLToPath(
          new URL("./bundle-report.html", import.meta.url),
        ),
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    );
  }

  return {
    server: {
      host: "0.0.0.0",
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
    plugins,
  };
});
