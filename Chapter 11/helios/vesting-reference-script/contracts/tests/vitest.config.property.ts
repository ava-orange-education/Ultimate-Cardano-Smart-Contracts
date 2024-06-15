import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: ['contracts/tests/*.property.test.ts'],
    exclude: ['contracts/tests/*.config.*'],
  }
});