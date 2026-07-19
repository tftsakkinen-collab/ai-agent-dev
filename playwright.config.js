const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { headless: true },
  webServer: {
    command: 'node server/index.js',
    port: 3000,
    reuseExistingServer: true,
    timeout: 20_000
  }
});
