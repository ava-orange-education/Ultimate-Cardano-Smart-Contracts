import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: ['contracts/tests/*.test.ts'],
    exclude: ['contracts/tests/*.config.*']
  }
});