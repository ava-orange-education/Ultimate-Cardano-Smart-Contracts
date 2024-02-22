import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: ['contracts/tests/*.test.ts'],
    exclude: ['contracts/tests/*.property.test.*',
              'contracts/tests/*.config.*']
  }
});