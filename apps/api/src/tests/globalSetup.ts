import { execSync } from 'node:child_process';
import postgres from 'postgres';

export async function setup() {
  const testDbUrl =
    process.env['DATABASE_URL_TEST'] ??
    'postgresql://taskflow:taskflow@localhost:5432/taskflow_test';

  process.env['DATABASE_URL'] = testDbUrl;

  // Ensure the test database exists
  const [base, dbName] = testDbUrl.rsplit
    ? [testDbUrl, 'taskflow_test']
    : (() => {
        const url = new URL(testDbUrl);
        const name = url.pathname.slice(1);
        url.pathname = '/postgres';
        return [url.toString(), name];
      })();

  const adminUrl = (() => {
    const url = new URL(testDbUrl);
    url.pathname = '/postgres';
    return url.toString();
  })();

  const adminSql = postgres(adminUrl, { max: 1 });
  try {
    await adminSql`CREATE DATABASE ${adminSql(dbName)}`.catch(() => {
      // Ignore "already exists" error
    });
  } finally {
    await adminSql.end();
  }

  // Run migrations against the test database
  execSync('npx drizzle-kit push:pg', {
    cwd: new URL('../../../../', import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'pipe',
  });
}

export async function teardown() {
  // Nothing to teardown globally — individual suites close their app instances
}
