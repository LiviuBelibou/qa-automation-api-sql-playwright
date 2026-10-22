import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { withTransaction } from './transaction.js';

const createOrderSchema = z.strictObject({
  customer_id: z.number().int().positive().max(2_147_483_647),
  items: z
    .array(
      z.strictObject({
        product_name: z.string().trim().min(1).max(100),
        quantity: z.number().int().min(1).max(1000),
        unit_price_cents: z.number().int().min(1).max(1_000_000),
      }),
    )
    .min(1)
    .max(20),
});

type OrderRow = {
  id: number;
  customer_id: number;
  status: 'pending' | 'paid' | 'cancelled';
  currency: 'EUR';
  created_at: Date;
};

type OrderItemRow = {
  id: number;
  order_id: number;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
};

export function createOrdersRouter(database: Pool) {
  const router = Router();

  router.post('/', async (request, response) => {
    const validation = createOrderSchema.safeParse(request.body);

    if (!validation.success) {
      response.status(400).json({
        error: 'Invalid order data',
        details: validation.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const orderData = validation.data;

    try {
      const createdOrder = await withTransaction(
        database,
        async (client) => {
          const orderResult = await client.query<OrderRow>(
            `
              INSERT INTO orders (customer_id)
              VALUES ($1)
              RETURNING id, customer_id, status, currency, created_at
            `,
            [orderData.customer_id],
          );

          const order = orderResult.rows[0];
          const savedItems: OrderItemRow[] = [];
          let totalCents = 0;

          for (const item of orderData.items) {
            const itemResult = await client.query<OrderItemRow>(
              `
                INSERT INTO order_items (
                  order_id,
                  product_name,
                  quantity,
                  unit_price_cents
                )
                VALUES ($1, $2, $3, $4)
                RETURNING
                  id, order_id, product_name, quantity, unit_price_cents
              `,
              [
                order.id,
                item.product_name,
                item.quantity,
                item.unit_price_cents,
              ],
            );

            savedItems.push(itemResult.rows[0]);
            totalCents += item.quantity * item.unit_price_cents;
          }

          return {
            ...order,
            items: savedItems,
            total_cents: totalCents,
          };
        },
      );

      response.status(201).json(createdOrder);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === '23503' &&
        'constraint' in error &&
        error.constraint === 'orders_customer_id_fkey'
      ) {
        response.status(404).json({
          error: 'Customer not found',
        });
        return;
      }

      console.error(
        'Order creation failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );

      response.status(500).json({
        error: 'Unable to create order',
      });
    }
  });

  return router;
}