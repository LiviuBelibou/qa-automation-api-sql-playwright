import { test, expect } from '@playwright/test';

test('API health check confirms database connectivity @smoke @api', async ({
  request,
}) => {
  const response = await request.get('/health');

  expect(response.status()).toBe(200);

  expect(response.headers()['content-type']).toContain('application/json');

  expect(await response.json()).toEqual({
    status: 'ok',
    database: 'connected',
  });
});
