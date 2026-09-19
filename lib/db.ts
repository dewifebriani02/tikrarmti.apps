import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * PostgreSQL Database Singleton Pool
 * Direct connection to local/VPS PostgreSQL (mti_db)
 */

declare global {
  // eslint-disable-next-line no-var
  var __postgresPool: Pool | undefined;
}

function getPool(): Pool {
  if (global.__postgresPool) {
    return global.__postgresPool;
  }

  const connectionString = process.env.DATABASE_URL;

  const pool = new Pool(
    connectionString
      ? {
          connectionString,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        }
      : {
          host: process.env.DB_HOST || '127.0.0.1',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME || 'mti_db',
          user: process.env.DB_USER || 'mti_user',
          password: process.env.DB_PASSWORD || 'Dewifebri123@',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        }
  );

  pool.on('error', (err) => {
    console.error('[DB Pool Error] Unexpected error on idle PostgreSQL client:', err);
  });

  if (process.env.NODE_ENV !== 'production') {
    global.__postgresPool = pool;
  }

  return pool;
}

export const db = getPool();

/**
 * Executes a parameterized SQL query with type safety
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const res: QueryResult<T> = await db.query<T>(text, params);
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
  const client = await db.connect();
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
