import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4175',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: 'npm run preview -- --port 4175 --strictPort',
    url: 'http://localhost:4175/',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
