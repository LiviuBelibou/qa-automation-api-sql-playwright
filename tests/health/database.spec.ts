import { test, expect } from '../../fixtures/test.fixture.js';

test('database connection uses the expected database and user @smoke @database', async ({
  database,
}) => {
  const result = await database.query(`
    SELECT
      current_database() AS database_name,
      current_user AS user_name
  `);

  expect(result.rows).toHaveLength(1);

  expect(result.rows[0]).toEqual({
    database_name: process.env.PGDATABASE,
    user_name: process.env.PGUSER,
  });
});
