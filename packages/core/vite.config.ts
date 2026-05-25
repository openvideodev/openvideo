import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "OpenVideoCore",
      fileName: (format) => (format === "es" ? "index.es.js" : "index.umd.cjs"),
      formats: ["es", "umd"],
    },
    rollupOptions: {
      external: ["events", "nanoid"],
      output: {
        globals: {
          events: "EventEmitter",
          nanoid: "nanoid",
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
});
