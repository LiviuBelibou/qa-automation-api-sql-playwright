import { test, expect } from '../../fixtures/test.fixture.js';

test('customer created through API is saved correctly in database @smoke @api @database', async ({
  request,
  database,
  customerData,
}) => {
  const response = await request.post('/customers', {
    data: customerData,
  });

  expect(response.status()).toBe(201);
  expect(response.headers()['content-type']).toContain('application/json');

  const createdCustomer = await response.json();

  expect(createdCustomer).toEqual({
    id: expect.any(Number),
    name: customerData.name,
    email: customerData.email,
    created_at: expect.any(String),
  });

  expect(createdCustomer.id).toBeGreaterThan(0);
  expect(Number.isNaN(Date.parse(createdCustomer.created_at))).toBe(false);

  const result = await database.query(
    `
      SELECT id, name, email
      FROM customers
      WHERE email = $1
    `,
    [customerData.email],
  );

  expect(result.rows).toHaveLength(1);

  expect(result.rows[0]).toEqual({
    id: createdCustomer.id,
    name: customerData.name,
    email: customerData.email,
  });
});
