import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    globalSetup: ['./tests/globalSetup.js'],
    include: ['tests/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: [
        'config/**/*.js',
        'services/**/*.js',
        'utils/**/*.js',
        'middlewares/validate.js',
        'controllers/orderCtrl.js',
      ],
      exclude: ['**/*.types.js', 'tests/**', 'config/fileUpload.js', 'config/categoryUpload.js'],
    },
  },
})
