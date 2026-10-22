import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const requiredVariables = [
  'PGHOST',
  'PGPORT',
  'PGDATABASE',
  'PGUSER',
  'PGPASSWORD',
];

for (const name of requiredVariables) {
  if (!process.env[name]?.trim()) {
    throw new Error(`${name} is missing. Check your .env file.`);
  }
}

const baseURL = process.env.BASE_URL;

if (!baseURL) {
  throw new Error('BASE_URL is missing. Check your .env file.');
}

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
  },

  webServer: {
    command: 'npx tsx app/server.ts',
    url: new URL('/health', baseURL).toString(),
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    gracefulShutdown: {
      signal: 'SIGTERM',
      timeout: 5_000,
    },
  },
});
