import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts()],
  build: {
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: {
        index: 'src/index.ts',
        parser: 'src/parser/index.ts',
      },
      name: 'EmlParseJs',
      formats: ['cjs', 'es'],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {},
  },
});
