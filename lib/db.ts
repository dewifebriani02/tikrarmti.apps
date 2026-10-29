import { Pool, PoolClient, QueryResult, QueryResultRow, types } from 'pg';

// Parse DATE columns (OID 1082) as 'YYYY-MM-DD' strings instead of JavaScript Date objects.
// Without this parser, pg creates a Date at midnight UTC which serializes to ISO string with
// timezone offset (e.g. UTC+7 shifts to 17:00 of the previous day, moving birth_date back a day).
types.setTypeParser(1082, (val: string) => val);

/**
 * PostgreSQL Database Singleton Pool
 * Direct connection to local/VPS PostgreSQL (mti_db)
 */

declare global {
  // eslint-disable-next-line no-var
  var __postgresPool: Pool | undefined;
}

export function getPool(): Pool {
  if (global.__postgresPool) {
    return global.__postgresPool;
  }

  const connectionString = process.env.DATABASE_URL;

  const pool = new Pool(
    connectionString
      ? {
          connectionString,
          max: 10,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 5000,
        }
      : {
          host: process.env.DB_HOST || '127.0.0.1',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME || 'mti_db',
          user: process.env.DB_USER || 'mti_user',
          password: process.env.DB_PASSWORD,
          max: 10,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 5000,
        }
  );

  pool.on('error', (err) => {
    console.error('[DB Pool Error] Unexpected error on idle PostgreSQL client:', err);
  });

  // Always store singleton on global so both development and production reuse the exact same pool
  global.__postgresPool = pool;

  return pool;
}

// Lazy proxy so that getPool() is only called when first accessed (after dotenv / Next.js env init)
export const db = new Proxy({} as Pool, {
  get(_target, prop) {
    const pool = getPool();
    const val = (pool as any)[prop];
    return typeof val === 'function' ? val.bind(pool) : val;
  },
});

/**
 * Executes a parameterized SQL query with type safety
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const pool = getPool();
    const res: QueryResult<T> = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL ${duration}ms]`, { text, rowCount: res.rowCount });
    }
    return {
      rows: res.rows,
      rowCount: res.rowCount ?? 0,
    };
  } catch (error: any) {
    console.error('[SQL Error]', { text, params, error: error.message });
    throw error;
  }
}

/**
 * Executes a query and returns the first row or null
 */
export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] || null;
}

/**
 * Executes operations within a database transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
