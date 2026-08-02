import pg from 'pg';
import 'dotenv/config';

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/kneefit3d',
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[],
) {
  return pool.query<T>(text, params);
}
