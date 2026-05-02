import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import path from 'path';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'core',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format}.js`,
    },
  },
  resolve: { alias: { src: resolve('src/') } },
  plugins: [peerDepsExternal(), dts()],
});
