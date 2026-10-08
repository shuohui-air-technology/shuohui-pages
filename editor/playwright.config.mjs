import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  workers: 1,
  timeout: 45000,
  use: { channel: 'chrome', viewport: { width: 1440, height: 900 }, locale: 'zh-CN', baseURL: 'http://127.0.0.1:8765' },
  webServer: { command: 'python3 -m http.server 8765 --bind 127.0.0.1 --directory ../static', url: 'http://127.0.0.1:8765/admin/', reuseExistingServer: false },
});
