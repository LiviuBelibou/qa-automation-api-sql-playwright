import { test, expect } from '../../fixtures/test.fixture.js';

test('order is saved with the correct customer, items and total @smoke @api @database', async ({
  request,
  database,
  customerData,
}) => {
  const customerResponse = await request.post('/customers', {
    data: customerData,
  });

  expect(customerResponse.status()).toBe(201);

  const customer = await customerResponse.json();

  const items = [
    {
      product_name: 'USB-C Cable',
      quantity: 2,
      unit_price_cents: 1250,
    },
    {
      product_name: 'Wireless Mouse',
      quantity: 1,
      unit_price_cents: 3500,
    },
  ];

  const orderResponse = await request.post('/orders', {
    data: {
      customer_id: customer.id,
      items,
    },
  });

  expect(orderResponse.status()).toBe(201);

  const order = await orderResponse.json();

  expect(order).toMatchObject({
    id: expect.any(Number),
    customer_id: customer.id,
    status: 'pending',
    currency: 'EUR',
    created_at: expect.any(String),
    total_cents: 6000,
  });

  expect(order.id).toBeGreaterThan(0);
  expect(order.items).toHaveLength(items.length);

  expect(order.items).toEqual(
    expect.arrayContaining(
      items.map((item) =>
        expect.objectContaining({
          ...item,
          id: expect.any(Number),
          order_id: order.id,
        }),
      ),
    ),
  );

  // Join all three tables to check ownership and saved item details.
  const detailsResult = await database.query(
    `
      SELECT
        o.id AS order_id,
        c.email AS customer_email,
        i.product_name,
        i.quantity,
        i.unit_price_cents
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN order_items i ON i.order_id = o.id
      WHERE o.id = $1
    `,
    [order.id],
  );

  expect(detailsResult.rows).toHaveLength(items.length);

  expect(detailsResult.rows).toEqual(
    expect.arrayContaining(
      items.map((item) => ({
        order_id: order.id,
        customer_email: customerData.email,
        ...item,
      })),
    ),
  );

  // Independently calculate the total from the saved items.
  const totalsResult = await database.query(
    `
      SELECT
        o.id AS order_id,
        COUNT(i.id)::integer AS item_count,
        SUM(i.quantity * i.unit_price_cents) AS total_cents
      FROM orders o
      JOIN order_items i ON i.order_id = o.id
      WHERE o.id = $1
      GROUP BY o.id
    `,
    [order.id],
  );

  expect(totalsResult.rows).toHaveLength(1);
  expect(totalsResult.rows[0].item_count).toBe(2);
  expect(Number(totalsResult.rows[0].total_cents)).toBe(6000);
});