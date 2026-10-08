import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  workers: 1,
  timeout: 45000,
  use: { channel: 'chrome', viewport: { width: 1440, height: 900 }, locale: 'zh-CN' },
});
