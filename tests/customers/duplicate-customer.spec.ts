import { test, expect } from '../../fixtures/test.fixture.js';

test('duplicate email is rejected and original customer is preserved @negative @api @database', async ({
  request,
  database,
  customerData,
}) => {
  // Create the original customer.
  const originalResponse = await request.post('/customers', {
    data: customerData,
  });

  expect(originalResponse.status()).toBe(201);

  const originalCustomer = await originalResponse.json();

  // Attempt to register the same email with a different name.
  const duplicateResponse = await request.post('/customers', {
    data: {
      ...customerData,
      name: 'Different Customer',
    },
  });

  expect(duplicateResponse.status()).toBe(409);

  expect(await duplicateResponse.json()).toEqual({
    error: 'A customer with this email already exists',
  });

  // Confirm that only one customer exists with this email.
  const countResult = await database.query(
    `
      SELECT COUNT(*)::integer AS customer_count
      FROM customers
      WHERE email = $1
    `,
    [customerData.email],
  );

  expect(countResult.rows[0].customer_count).toBe(1);

  // Confirm that the existing customer was not overwritten.
  const customerResult = await database.query(
    `
      SELECT id, name, email
      FROM customers
      WHERE email = $1
    `,
    [customerData.email],
  );

  expect(customerResult.rows).toEqual([
    {
      id: originalCustomer.id,
      name: customerData.name,
      email: customerData.email,
    },
  ]);
});
