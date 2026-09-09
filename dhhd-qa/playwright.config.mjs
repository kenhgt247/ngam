import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'qa.spec.mjs',
  timeout: 180000,
  expect: { timeout: 20000 },
  workers: 1,
  retries: 0,
  reporter: [['line']],
  use: {
    baseURL: 'https://dhhd-tools-v022.vercel.app',
    acceptDownloads: true,
    headless: true,
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: true
  },
  outputDir: 'test-results'
});
