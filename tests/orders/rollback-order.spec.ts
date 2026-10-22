import { test, expect } from '../../fixtures/test.fixture.js';
import { withTransaction } from '../../app/transaction.js';

test('failed item insert rolls back the order and its items @negative @database @integration', async ({
  request,
  database,
  customerData,
}) => {
  // This customer is created before the transaction starts.
  const customerResponse = await request.post('/customers', {
    data: customerData,
  });

  expect(customerResponse.status()).toBe(201);

  const customer = await customerResponse.json();
  let attemptedOrderId: number | undefined;

  await expect(
    withTransaction(database, async (client) => {
      const orderResult = await client.query<{ id: number }>(
        `
          INSERT INTO orders (customer_id)
          VALUES ($1)
          RETURNING id
        `,
        [customer.id],
      );

      attemptedOrderId = orderResult.rows[0].id;

      // The first item is valid.
      await client.query(
        `
          INSERT INTO order_items (
            order_id, product_name, quantity, unit_price_cents
          )
          VALUES ($1, $2, $3, $4)
        `,
        [attemptedOrderId, 'Valid Cable', 1, 1250],
      );

      // Confirm that a write happened before triggering the failure.
      const savedItems = await client.query(
        'SELECT id FROM order_items WHERE order_id = $1',
        [attemptedOrderId],
      );

      expect(savedItems.rows).toHaveLength(1);

      // Quantity zero violates the database CHECK constraint.
      await client.query(
        `
          INSERT INTO order_items (
            order_id, product_name, quantity, unit_price_cents
          )
          VALUES ($1, $2, $3, $4)
        `,
        [attemptedOrderId, 'Invalid Item', 0, 500],
      );
    }),
  ).rejects.toMatchObject({
    code: '23514',
  });

  expect(attemptedOrderId).toBeGreaterThan(0);

  // Check the database after the transaction has rolled back.
  const result = await database.query(
    `
      SELECT
        (
          SELECT COUNT(*)::integer
          FROM orders
          WHERE id = $1
        ) AS order_count,
        (
          SELECT COUNT(*)::integer
          FROM order_items
          WHERE order_id = $1
        ) AS item_count,
        (
          SELECT COUNT(*)::integer
          FROM customers
          WHERE id = $2
        ) AS customer_count
    `,
    [attemptedOrderId, customer.id],
  );

  expect(result.rows[0]).toEqual({
    order_count: 0,
    item_count: 0,
    customer_count: 1,
  });
});
