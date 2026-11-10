import { defineConfig, devices } from '@playwright/test';

const SERVER_PORT = 4100;
const CLIENT_PORT = 5180;

/**
 * End-to-end tests run the real server (in-memory store) and the Vite client.
 * WebGL runs through SwiftShader in headless CI, so timeouts are generous.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'off',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1366, height: 768 } }, testIgnore: /responsive/ },
    { name: 'mobile', use: { ...devices['iPhone 12'], browserName: 'chromium' }, testMatch: /responsive/ },
  ],
  webServer: [
    {
      command: `npx tsx ../server/src/index.ts`,
      port: SERVER_PORT,
      env: { PORT: String(SERVER_PORT), CLIENT_DIST: '/nonexistent' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${CLIENT_PORT} --strictPort`,
      port: CLIENT_PORT,
      env: { VITE_SERVER_URL: `http://localhost:${SERVER_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
