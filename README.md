# API + SQL Test Automation

[![API and SQL Tests](https://github.com/LiviuBelibou/qa-automation-api-sql-playwright/actions/workflows/api-sql-tests.yml/badge.svg)](https://github.com/LiviuBelibou/qa-automation-api-sql-playwright/actions/workflows/api-sql-tests.yml)

A portfolio project combining API testing with SQL verification against a real PostgreSQL database. It includes a small Express practice API for customers and orders, plus a Playwright and TypeScript test suite.

The tests check API responses, persisted data, relationships between tables, order totals, validation, duplicate handling, and transaction rollback.

## Technology

| Tool                                | Role                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| Playwright Test                     | API requests, assertions, fixtures, test execution, and reports |
| TypeScript                          | Static type checking for the application and tests              |
| Express and Zod                     | Practice API and request validation                             |
| PostgreSQL and node-postgres (`pg`) | Persistent data and SQL access                                  |
| Docker Compose                      | Local and CI database environment                               |
| ESLint and Prettier                 | Code-quality and formatting checks                              |
| GitHub Actions                      | Automated checks on pull requests and pushes to `main`          |

## Requirements

- Node.js 24.x and npm.
- Git.
- Docker with Docker Compose v2. On macOS, start Docker Desktop before starting the database.

The current suite uses API requests and SQL connections; Playwright browser downloads are not required.

## Quick start

```bash
git clone https://github.com/LiviuBelibou/qa-automation-api-sql-playwright.git
cd qa-automation-api-sql-playwright
npm ci
cp .env.example .env
npm run db:up
npm run check
```

`npm ci` installs the dependency versions recorded in `package-lock.json`.

For a fresh database, PostgreSQL runs the numbered SQL initialization scripts and creates the three tables. Playwright starts the API, waits for `/health`, and runs the tests. It stops the API process it started when the run finishes.

The current suite contains **7 scenarios**. A successful `npm run check` passes TypeScript, ESLint, formatting, and all tests.

## Configuration

Local settings belong in `.env`, which is ignored by Git. `.env.example` contains local practice values for setting up the project.

| Variable     | Example value           | Purpose                                     |
| ------------ | ----------------------- | ------------------------------------------- |
| `PGHOST`     | `127.0.0.1`             | Database host for the application and tests |
| `PGPORT`     | `5433`                  | Database port exposed on the host           |
| `PGDATABASE` | `qa_orders`             | Database name                               |
| `PGUSER`     | `qa_user`               | Local database user                         |
| `PGPASSWORD` | `local_qa_password`     | Local practice database password            |
| `API_PORT`   | `3001`                  | Practice API port                           |
| `BASE_URL`   | `http://127.0.0.1:3001` | API address used by Playwright              |

Keep `BASE_URL` consistent with `API_PORT`. PostgreSQL uses port `5432` inside its container; Docker exposes it as `5433` on the host with the example settings.

## Project structure

| Path                                  | Responsibility                                                            |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `app/server.ts`                       | API startup, health endpoint, and customer creation                       |
| `app/orders.routes.ts`                | Order validation, creation, and total calculation                         |
| `app/transaction.ts`                  | Transaction management using one checked-out database connection          |
| `database/`                           | Numbered SQL initialization scripts                                       |
| `fixtures/test.fixture.ts`            | Per-test database pool, unique customer data, and cleanup                 |
| `tests/health/`                       | API and database connectivity checks                                      |
| `tests/customers/`                    | Customer creation, validation, and duplicate-email checks                 |
| `tests/orders/`                       | Order persistence, joins, totals, and transaction rollback                |
| `playwright.config.ts`                | Environment loading, API base URL, server lifecycle, and reporting        |
| `compose.yaml`                        | PostgreSQL service, health check, initialization scripts, and data volume |
| `.github/workflows/api-sql-tests.yml` | CI workflow                                                               |

## Test coverage

| Scenario             | Main checks                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Database health      | Connection uses the configured database and user                                                        |
| API health           | HTTP 200, JSON content type, and expected database-health response                                      |
| Create customer      | HTTP 201, response data, and matching persisted customer                                                |
| Blank customer name  | HTTP 400, validation field, and no saved customer                                                       |
| Duplicate email      | HTTP 409, exactly one saved customer, and original details preserved                                    |
| Create order         | HTTP 201, correct customer and items, and EUR 60.00 total verified through SQL                          |
| Transaction rollback | A failed second item insert removes the order and first item while preserving the pre-existing customer |

The order test joins `customers`, `orders`, and `order_items`, then independently calculates the stored total using `SUM` and `GROUP BY`.

The rollback scenario is a database integration test of `withTransaction`. It deliberately violates a PostgreSQL quantity constraint after a successful write and checks error `23514`. It exercises the helper directly against PostgreSQL; it does not inject a failure through the HTTP order endpoint.

## Data model and isolation

- Each order references an existing customer through a foreign key.
- Each order item references an existing order.
- Deleting an order cascades to its items. Customers with orders cannot be deleted until their orders are removed.
- Monetary values use integer EUR cents. The order total is calculated from its items.
- The API accepts 1–20 order items, quantities of 1–1,000, and unit prices of 1–1,000,000 cents.

Customer tests receive a fresh UUID-based email from the shared fixture. Assertions and cleanup target the data owned by that test, allowing the suite to run in parallel.

Fixture teardown removes orders for that customer, lets PostgreSQL cascade deletion to the items, removes the customer, and closes the test database pool. The tables may therefore be empty after a successful run.

Queries pass values separately through SQL placeholders such as `$1`. The transaction helper checks out one connection and uses it for `BEGIN`, the writes, and `COMMIT` or `ROLLBACK`.

## Commands

| Command                 | Purpose                                                                       |
| ----------------------- | ----------------------------------------------------------------------------- |
| `npm run db:up`         | Start PostgreSQL and wait until it is healthy                                 |
| `npm run db:down`       | Stop and remove the database container while preserving the named data volume |
| `npm start`             | Start the practice API manually                                               |
| `npm test`              | Run all seven tests                                                           |
| `npm run test:smoke`    | Run tests tagged `@smoke`                                                     |
| `npm run test:negative` | Run tests tagged `@negative`                                                  |
| `npm run test:api`      | Run tests tagged `@api`                                                       |
| `npm run test:database` | Run tests tagged `@database`                                                  |
| `npm run typecheck`     | Check TypeScript without generating JavaScript                                |
| `npm run lint`          | Run ESLint and fail on warnings                                               |
| `npm run lint:fix`      | Apply available automatic lint fixes                                          |
| `npm run format`        | Format supported source and configuration files                               |
| `npm run format:check`  | Check formatting                                                              |
| `npm run check`         | Run type checking, lint, formatting checks, and tests                         |
| `npm run report`        | Open the latest HTML test report                                              |

To run just the order-creation scenario:

```bash
npx playwright test tests/orders/create-order.spec.ts
```

SQL files are excluded from this Prettier setup. PostgreSQL validates and executes them during database initialization.

## Database initialization

Docker mounts `database/` read-only at `/docker-entrypoint-initdb.d`. On an empty data directory it runs:

1. `001-create-customers.sql`
2. `002-create-orders.sql`

Initialization scripts run only for an empty database directory. Restarting an existing database preserves its tables and data; it does not apply newly added schema scripts automatically. New scripts for an existing database must be applied explicitly in order.

## CI and branch protection

The `API and SQL Tests` workflow runs on pull requests targeting `main`, pushes to `main`, and manual dispatch.

It checks out the code, sets up Node.js 24, copies the example settings, installs locked dependencies, and starts a fresh PostgreSQL 17 database. It then runs `npm run check`.

The workflow uploads `playwright-report/` and `test-results/` as the `api-sql-test-results` artifact, retained for 14 days. It prints database logs on failure and removes the temporary CI database afterward.

On GitHub, open the workflow run to inspect step logs or download the artifact. To view a downloaded report, extract the artifact and run:

```bash
npx playwright show-report /path/to/extracted/artifact/playwright-report
```

`main` requires pull requests, an up-to-date branch, and the passing `API and SQL quality checks` status check. Force pushes and branch deletion are blocked.

## Troubleshooting

### Docker command not found on macOS

If Docker Desktop is installed at the standard location, this adds its bundled CLI to the current terminal session:

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
```

For future terminal sessions, configure Docker Desktop CLI installation and ensure its installation directory is on your shell search path.

### Database connection refused or API startup timeout

Start Docker Desktop, then run:

```bash
npm run db:up
docker compose ps
docker compose logs --no-color db
```

Check `.env`, the exposed database port, and database logs. The API health endpoint must succeed before Playwright starts the tests.

### Tables missing from an existing database

The initialization directory is processed only on first creation. Check which schema scripts have already been applied before applying any missing scripts to an existing database.
