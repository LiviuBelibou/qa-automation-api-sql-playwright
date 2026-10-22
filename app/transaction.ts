import type { Pool, PoolClient } from 'pg';

export async function withTransaction<T>(
  database: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await database.connect();
  let discardConnection = false;

  try {
    await client.query('BEGIN');

    const result = await operation(client);

    await client.query('COMMIT');

    return result;
  } catch (error: unknown) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError: unknown) {
      discardConnection = true;
      console.error('Transaction rollback failed:', rollbackError);
    }

    throw error;
  } finally {
    client.release(discardConnection);
  }
}