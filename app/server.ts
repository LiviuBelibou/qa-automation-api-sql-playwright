import express from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { z } from 'zod';
import { createOrdersRouter } from './orders.routes.js';

dotenv.config({ quiet: true });

const app = express();
const port = Number(process.env.API_PORT ?? 3001);

const database = new Pool({
  connectionTimeoutMillis: 5_000,
  query_timeout: 5_000,
});

const createCustomerSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

app.use(express.json());
app.use('/orders', createOrdersRouter(database));

app.get('/health', async (_request, response) => {
  try {
    await database.query('SELECT 1');

    response.status(200).json({
      status: 'ok',
      database: 'connected',
    });
  } catch {
    response.status(503).json({
      status: 'unavailable',
      database: 'disconnected',
    });
  }
});

app.post('/customers', async (request, response) => {
  const validation = createCustomerSchema.safeParse(request.body);

  if (!validation.success) {
    response.status(400).json({
      error: 'Invalid customer data',
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  const { name, email } = validation.data;

  try {
    const result = await database.query(
      `
        INSERT INTO customers (name, email)
        VALUES ($1, $2)
        RETURNING id, name, email, created_at
      `,
      [name, email],
    );

    response.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      response.status(409).json({
        error: 'A customer with this email already exists',
      });
      return;
    }

    console.error(
      'Customer creation failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    response.status(500).json({
      error: 'Unable to create customer',
    });
  }
});

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Practice API running at http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => {
    void database.end().catch((error: unknown) => {
      console.error('Failed to close database connections:', error);
      process.exitCode = 1;
    });
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
