import pg from 'pg';
import 'dotenv/config';

/**
 * Creates the target database if it does not exist yet.
 * Connects to the maintenance database ("postgres") using the same
 * credentials as DATABASE_URL, then issues CREATE DATABASE.
 */
async function main() {
  const url = new URL(
    process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/kneefit3d',
  );
  const target = url.pathname.replace(/^\//, '') || 'kneefit3d';

  const admin = new URL(url.toString());
  admin.pathname = '/postgres'; // connect to maintenance DB

  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [target]);
    if (rows.length) {
      console.log(`✓ database "${target}" already exists`);
    } else {
      // db name comes from our own env, not user input
      await client.query(`CREATE DATABASE "${target.replace(/"/g, '')}"`);
      console.log(`✓ database "${target}" created`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('✗ createdb failed:', e.message);
  console.error('  Cek password di server/.env cocok dengan superuser PostgreSQL kamu.');
  process.exit(1);
});
