import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { Pool } from 'pg';

type CustomerData = {
  name: string;
  email: string;
};

type TestFixtures = {
  database: Pool;
  customerData: CustomerData;
};

export const test = base.extend<TestFixtures>({
  database: async ({}, use) => {
    const database = new Pool({
      max: 1,
      connectionTimeoutMillis: 5_000,
      query_timeout: 5_000,
    });

    try {
      await use(database);
    } finally {
      await database.end();
    }
  },

  customerData: async ({ database }, use) => {
    const customerData = {
      name: 'Test Customer',
      email: `customer-${randomUUID()}@example.test`,
    };

    try {
      await use(customerData);
    } finally {
      await database.query(
        `
          DELETE FROM orders
          WHERE customer_id IN (
            SELECT id FROM customers WHERE email = $1
          )
        `,
        [customerData.email],
      );

      await database.query('DELETE FROM customers WHERE email = $1', [
        customerData.email,
      ]);
    }
  },
});

export { expect };
