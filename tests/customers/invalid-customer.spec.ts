import { test, expect } from '../../fixtures/test.fixture.js';

test('blank customer name is rejected without saving a record @negative @api @database', async ({
  request,
  database,
  customerData,
}) => {
  const response = await request.post('/customers', {
    data: {
      ...customerData,
      name: '   ',
    },
  });

  expect(response.status()).toBe(400);

  expect(await response.json()).toMatchObject({
    error: 'Invalid customer data',
    details: expect.arrayContaining([
      expect.objectContaining({
        field: 'name',
      }),
    ]),
  });

  const result = await database.query(
    `
      SELECT id
      FROM customers
      WHERE email = $1
    `,
    [customerData.email],
  );

  expect(result.rows).toHaveLength(0);
});
