/**
 * PostgreSQL Query Builder — Drop-in replacement for @supabase/supabase-js
 *
 * Implements the Supabase chainable query API but executes directly against
 * PostgreSQL via the `pg` pool in lib/db.ts.
 *
 * Supported methods:
 *   from, select, insert, update, delete, upsert
 *   eq, neq, gt, gte, lt, lte, in, not, is, or, ilike, like, filter, contains
 *   order, limit, range, single, maybeSingle
 *
 * Return format: always `{ data, error }` to match Supabase conventions.
 */

import { db } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

type PgError = { message: string; code?: string; details?: string; hint?: string; [key: string]: any };
type PgResponse = { data: any; error: PgError | null; count?: number };
type SupabaseResponse<T> = Promise<{ data: T | null; error: PgError | null; count?: number }>;
type SupabaseListResponse<T> = Promise<{ data: T[] | null; error: PgError | null; count?: number }>;

type OrderOption = { ascending?: boolean; nullsFirst?: boolean };
type WhereClause = { sql: string; params: any[] };

type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

// ─── Helper Utilities ─────────────────────────────────────────────────────────

let _paramIdx = 0;
function nextParam(): string {
  _paramIdx++;
  return `$${_paramIdx}`;
}

function escapeIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Parse "col1, col2, col3" or "*" or "col1!inner(col2)" into safe SQL */
function buildSelectCols(cols: string): string {
  if (!cols || cols.trim() === '*') return '*';
  // For complex relational selects (joins/nested) — just pass through simplified
  // We only support flat column lists; nested relations are resolved to *
  const cleaned = cols
    .split(',')
    .map(c => {
      const col = c.trim();
      // Strip relation hints like "table!inner(col)" → just "*"
      if (col.includes('(') || col.includes('!')) return '*';
      if (col === '*') return '*';
      // Handle aliased: "col as alias"
      if (col.toLowerCase().includes(' as ')) return col;
      return escapeIdent(col);
    })
    .filter(Boolean);
  const hasWildcard = cleaned.includes('*');
  return hasWildcard ? '*' : cleaned.join(', ');
}

// ─── Query Builder Class ───────────────────────────────────────────────────────

class PgQueryBuilder<T = any> {
  private _table: string;
  private _operation: Operation = 'select';
  private _selectCols: string = '*';
  private _whereClauses: WhereClause[] = [];
  private _params: any[] = [];
  private _orderClauses: string[] = [];
  private _limitVal: number | null = null;
  private _rangeFrom: number | null = null;
  private _rangeTo: number | null = null;
  private _isSingle: boolean = false;
  private _isMaybeSingle: boolean = false;
  private _insertData: any | any[] | null = null;
  private _updateData: any | null = null;
  private _upsertData: any | any[] | null = null;
  private _upsertOnConflict: string | null = null;
  private _returningAll: boolean = false;
  private _paramOffset: number = 0;
  private _isCountOnly: boolean = false; // head: true — only return count

  constructor(table: string) {
    this._table = table;
    this._params = [];
  }

  // ── Cloning helper ──
  private _addParam(value: any): string {
    this._params.push(value);
    return `$${this._params.length}`;
  }

  // ── Column selection ──
  select(columns: string = '*', options?: { count?: 'exact' | 'estimated' | 'planned'; head?: boolean }): this {
    this._operation = 'select';
    this._selectCols = buildSelectCols(columns);
    if (options?.head === true) {
      this._isCountOnly = true;
    }
    return this;
  }

  // ── DML operations ──
  insert(data: any | any[]): this {
    this._operation = 'insert';
    this._insertData = data;
    this._returningAll = true;
    return this;
  }

  update(data: any): this {
    this._operation = 'update';
    this._updateData = data;
    this._returningAll = true;
    return this;
  }

  delete(): this {
    this._operation = 'delete';
    this._returningAll = true;
    return this;
  }

  upsert(data: any | any[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this._operation = 'upsert';
    this._upsertData = data;
    this._upsertOnConflict = options?.onConflict || null;
    this._returningAll = true;
    return this;
  }

  // ── WHERE filters ──
  eq(column: string, value: any): this {
    const p = this._addParam(value);
    this._whereClauses.push({ sql: `${escapeIdent(column)} = ${p}`, params: [] });
    return this;
  }

  neq(column: string, value: any): this {
    const p = this._addParam(value);
    this._whereClauses.push({ sql: `${escapeIdent(column)} != ${p}`, params: [] });
    return this;
  }

  gt(column: string, value: any): this {
    const p = this._addParam(value);
    this._whereClauses.push({ sql: `${escapeIdent(column)} > ${p}`, params: [] });
    return this;
  }

  gte(column: string, value: any): this {
    const p = this._addParam(value);
    this._whereClauses.push({ sql: `${escapeIdent(column)} >= ${p}`, params: [] });
    return this;
  }

  lt(column: string, value: any): this {
    const p = this._addParam(value);
    this._whereClauses.push({ sql: `${escapeIdent(column)} < ${p}`, params: [] });
    return this;
  }

  lte(column: string, value: any): this {
    const p = this._addParam(value);
    this._whereClauses.push({ sql: `${escapeIdent(column)} <= ${p}`, params: [] });
    return this;
  }

  is(column: string, value: null | boolean): this {
    if (value === null) {
      this._whereClauses.push({ sql: `${escapeIdent(column)} IS NULL`, params: [] });
    } else {
      const p = this._addParam(value);
      this._whereClauses.push({ sql: `${escapeIdent(column)} IS ${p}`, params: [] });
    }
    return this;
  }

  not(column: string, operator: string, value: any): this {
    const op = operator.toUpperCase();
    if (op === 'IS' && value === null) {
      this._whereClauses.push({ sql: `${escapeIdent(column)} IS NOT NULL`, params: [] });
    } else if (op === 'IN') {
      const vals = Array.isArray(value) ? value : [value];
      const placeholders = vals.map((v: any) => this._addParam(v)).join(', ');
      this._whereClauses.push({ sql: `${escapeIdent(column)} NOT IN (${placeholders})`, params: [] });
    } else if (op === 'EQ') {
      const p = this._addParam(value);
      this._whereClauses.push({ sql: `${escapeIdent(column)} != ${p}`, params: [] });
    } else {
      const p = this._addParam(value);
      this._whereClauses.push({ sql: `NOT (${escapeIdent(column)} ${op} ${p})`, params: [] });
    }
    return this;
  }

  in(column: string, values: any[]): this {
    if (!values || values.length === 0) {
      // No match — add impossible condition
      this._whereClauses.push({ sql: `FALSE`, params: [] });
      return this;
    }
    const placeholders = values.map((v: any) => this._addParam(v)).join(', ');
    this._whereClauses.push({ sql: `${escapeIdent(column)} IN (${placeholders})`, params: [] });
    return this;
  }

  ilike(column: string, pattern: string): this {
    const p = this._addParam(pattern);
    this._whereClauses.push({ sql: `${escapeIdent(column)} ILIKE ${p}`, params: [] });
    return this;
  }

  like(column: string, pattern: string): this {
    const p = this._addParam(pattern);
    this._whereClauses.push({ sql: `${escapeIdent(column)} LIKE ${p}`, params: [] });
    return this;
  }

  contains(column: string, value: any): this {
    // For jsonb arrays use @>
    const p = this._addParam(JSON.stringify(value));
    this._whereClauses.push({ sql: `${escapeIdent(column)} @> ${p}::jsonb`, params: [] });
    return this;
  }

  filter(column: string, operator: string, value: any): this {
    const opMap: Record<string, string> = {
      eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=',
      like: 'LIKE', ilike: 'ILIKE', is: 'IS', in: 'IN',
      cs: '@>', cd: '<@',
    };
    const sqlOp = opMap[operator] || operator;
    if (sqlOp === 'IN') {
      const vals = Array.isArray(value) ? value : [value];
      const placeholders = vals.map((v: any) => this._addParam(v)).join(', ');
      this._whereClauses.push({ sql: `${escapeIdent(column)} IN (${placeholders})`, params: [] });
    } else {
      const p = this._addParam(value);
      this._whereClauses.push({ sql: `${escapeIdent(column)} ${sqlOp} ${p}`, params: [] });
    }
    return this;
  }

  /**
   * OR conditions — accepts Supabase-style string: "col.op.val,col2.op2.val2"
   * or a simple raw SQL fragment.
   * Example: .or("status.eq.active,status.eq.pending")
   */
  or(conditions: string, _options?: { foreignTable?: string }): this {
    // Parse "col.op.val" format
    const parts = conditions.split(',').map(part => {
      const segments = part.trim().split('.');
      if (segments.length < 3) {
        // Assume raw SQL fragment
        return part.trim();
      }
      const [col, op, ...rest] = segments;
      const val = rest.join('.');
      const opMap: Record<string, string> = {
        eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=',
        like: 'LIKE', ilike: 'ILIKE', is: 'IS',
      };
      const sqlOp = opMap[op] || op.toUpperCase();
      if (val === 'null') {
        return `${escapeIdent(col)} IS ${sqlOp === '=' ? '' : 'NOT '}NULL`;
      }
      const p = this._addParam(val);
      return `${escapeIdent(col)} ${sqlOp} ${p}`;
    });
    this._whereClauses.push({ sql: `(${parts.join(' OR ')})`, params: [] });
    return this;
  }

  // ── Ordering and pagination ──
  order(column: string, options?: OrderOption): this {
    const dir = options?.ascending === false ? 'DESC' : 'ASC';
    const nulls = options?.nullsFirst ? 'NULLS FIRST' : '';
    this._orderClauses.push(`${escapeIdent(column)} ${dir} ${nulls}`.trim());
    return this;
  }

  limit(count: number): this {
    this._limitVal = count;
    return this;
  }

  range(from: number, to: number): this {
    this._rangeFrom = from;
    this._rangeTo = to;
    return this;
  }

  // ── Single row modifiers ──
  single(): this {
    this._isSingle = true;
    this._limitVal = 1;
    return this;
  }

  maybeSingle(): this {
    this._isMaybeSingle = true;
    this._limitVal = 1;
    return this;
  }

  // ── SQL building ──
  private _buildWhere(): string {
    if (this._whereClauses.length === 0) return '';
    return 'WHERE ' + this._whereClauses.map(c => c.sql).join(' AND ');
  }

  private _buildInsertSQL(data: any | any[]): string {
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) throw new Error('insert: no data provided');
    const keys = Object.keys(rows[0]);
    const cols = keys.map(escapeIdent).join(', ');
    const valueSets = rows.map(row => {
      const placeholders = keys.map(k => this._addParam(row[k])).join(', ');
      return `(${placeholders})`;
    }).join(', ');
    return `INSERT INTO ${escapeIdent(this._table)} (${cols}) VALUES ${valueSets} RETURNING *`;
  }

  private _buildUpdateSQL(data: any): string {
    const keys = Object.keys(data);
    if (keys.length === 0) throw new Error('update: no data provided');
    const setClauses = keys.map(k => `${escapeIdent(k)} = ${this._addParam(data[k])}`).join(', ');
    const where = this._buildWhere();
    return `UPDATE ${escapeIdent(this._table)} SET ${setClauses} ${where} RETURNING *`;
  }

  private _buildDeleteSQL(): string {
    const where = this._buildWhere();
    return `DELETE FROM ${escapeIdent(this._table)} ${where} RETURNING *`;
  }

  private _buildUpsertSQL(data: any | any[]): string {
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) throw new Error('upsert: no data provided');
    const keys = Object.keys(rows[0]);
    const cols = keys.map(escapeIdent).join(', ');
    const valueSets = rows.map(row => {
      const placeholders = keys.map(k => this._addParam(row[k])).join(', ');
      return `(${placeholders})`;
    }).join(', ');
    const conflictCol = this._upsertOnConflict
      ? escapeIdent(this._upsertOnConflict)
      : `"id"`;
    const updateClauses = keys
      .filter(k => k !== 'id' && k !== this._upsertOnConflict)
      .map(k => `${escapeIdent(k)} = EXCLUDED.${escapeIdent(k)}`)
      .join(', ');
    const onConflict = updateClauses
      ? `ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateClauses}`
      : `ON CONFLICT (${conflictCol}) DO NOTHING`;
    return `INSERT INTO ${escapeIdent(this._table)} (${cols}) VALUES ${valueSets} ${onConflict} RETURNING *`;
  }

  private _buildSelectSQL(): string {
    const where = this._buildWhere();
    const order = this._orderClauses.length > 0
      ? `ORDER BY ${this._orderClauses.join(', ')}`
      : '';
    let pagination = '';
    if (this._rangeFrom !== null && this._rangeTo !== null) {
      const count = this._rangeTo - this._rangeFrom + 1;
      const offsetP = this._addParam(this._rangeFrom);
      pagination = `LIMIT ${count} OFFSET ${offsetP}`;
    } else if (this._limitVal !== null) {
      const limitP = this._addParam(this._limitVal);
      pagination = `LIMIT ${limitP}`;
    }
    return `SELECT ${this._selectCols} FROM ${escapeIdent(this._table)} ${where} ${order} ${pagination}`.trim().replace(/\s+/g, ' ');
  }

  // ── Execution — resolves Promise via `.then()` / `await` ──
  then<TResult1 = PgResponse, TResult2 = never>(
    onfulfilled?: ((value: PgResponse) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
  ): Promise<TResult1 | TResult2> {
    return this._execute().then(onfulfilled, onrejected);
  }

  private async _execute(): Promise<PgResponse> {
    try {
      let sql: string;
      switch (this._operation) {
        case 'insert':
          sql = this._buildInsertSQL(this._insertData);
          break;
        case 'update':
          sql = this._buildUpdateSQL(this._updateData);
          break;
        case 'delete':
          sql = this._buildDeleteSQL();
          break;
        case 'upsert':
          sql = this._buildUpsertSQL(this._upsertData);
          break;
        default:
          // head: true → COUNT(*) only (Supabase pattern for stats)
          if (this._isCountOnly) {
            const where = this._buildWhere();
            sql = `SELECT COUNT(*) AS _count FROM ${escapeIdent(this._table)} ${where}`.trim().replace(/\s+/g, ' ');
            const countResult = await db.query(sql, this._params);
            const count = parseInt(countResult.rows[0]?._count ?? '0', 10);
            return { data: null, count, error: null };
          }
          sql = this._buildSelectSQL();
      }

      const result = await db.query(sql, this._params);
      const rows = result.rows;

      // DML operations that modify data
      if (this._operation !== 'select') {
        // If single insert/update, return single object; else return array
        const isMultiRow = Array.isArray(
          this._operation === 'insert' ? this._insertData :
          this._operation === 'upsert' ? this._upsertData : null
        );
        const returnData = isMultiRow ? rows : (rows[0] || null);
        return { data: returnData, error: null };
      }

      // SELECT
      if (this._isSingle) {
        if (rows.length === 0) {
          return {
            data: null,
            error: { message: 'No rows found', code: 'PGRST116', details: 'The result contains 0 rows' }
          };
        }
        return { data: rows[0], error: null };
      }

      if (this._isMaybeSingle) {
        return { data: rows[0] || null, error: null };
      }

      return { data: rows, count: rows.length, error: null };
    } catch (err: any) {
      const pgCode = err.code || 'DB_ERROR';
      return {
        data: null,
        error: {
          message: err.message || 'Database error',
          code: pgCode,
          details: err.detail || undefined,
        }
      };
    }
  }
}

// ─── Client Factory ───────────────────────────────────────────────────────────

class PgClient {
  from(table: string): PgQueryBuilder {
    return new PgQueryBuilder(table);
  }

  async rpc(fnName: string, args?: Record<string, any>): Promise<{ data: any; error: any }> {
    try {
      if (fnName === 'admin_exec_sql' || fnName === 'exec_sql') {
        const queryText = args?.sql || args?.query || '';
        const result = await db.query(queryText);
        return { data: result.rows, error: null };
      }
      if (fnName === 'query') {
        const queryText = args?.query_text || args?.query || '';
        const result = await db.query(queryText);
        return { data: result.rows, error: null };
      }
      if (!args || Object.keys(args).length === 0) {
        const result = await db.query(`SELECT * FROM "${fnName}"()`);
        return { data: result.rows, error: null };
      }
      const keys = Object.keys(args);
      const paramPlaceholders = keys.map((k, i) => `"${k}" := $${i + 1}`).join(', ');
      const values = keys.map(k => args[k]);
      const result = await db.query(`SELECT * FROM "${fnName}"(${paramPlaceholders})`, values);
      return {
        data: result.rows.length === 1 && result.rows[0][fnName] !== undefined
          ? result.rows[0][fnName]
          : result.rows,
        error: null,
      };
    } catch (err: any) {
      console.error(`[RPC ${fnName}] Error:`, err);
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }
}

/**
 * auth.admin — Native PostgreSQL implementations of Supabase Auth Admin API.
 * Operates on the `users` table directly instead of Supabase's auth.users.
 */
const pgAuthAdmin = {
  /** Update a user's fields (email, password, metadata) by ID */
  updateUserById: async (userId: string, updates: {
    email?: string;
    password?: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, any>;
    [key: string]: any;
  }) => {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (updates.email) {
        params.push(updates.email.toLowerCase().trim());
        fields.push(`"email" = $${params.length}`);
      }
      if (updates.password) {
        // Hash password using bcrypt (same as lib/auth.ts)
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash(updates.password, 12);
        params.push(hash);
        fields.push(`"password_hash" = $${params.length}`);
      }
      if (updates.user_metadata) {
        params.push(JSON.stringify(updates.user_metadata));
        fields.push(`"user_metadata" = $${params.length}`);
      }

      params.push(new Date().toISOString());
      fields.push(`"updated_at" = $${params.length}`);

      if (fields.length === 0) return { data: null, error: null };

      params.push(userId);
      const sql = `UPDATE "users" SET ${fields.join(', ')} WHERE "id" = $${params.length} RETURNING *`;
      const result = await db.query(sql, params);
      return { data: { user: result.rows[0] || null }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
  },

  /** Get a user by ID */
  getUserById: async (userId: string) => {
    try {
      const result = await db.query('SELECT * FROM "users" WHERE "id" = $1 LIMIT 1', [userId]);
      if (result.rows.length === 0) {
        return { data: null, error: { message: 'User not found', code: 'USER_NOT_FOUND' } };
      }
      return { data: { user: result.rows[0] }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  },

  /** List all users (paginated) */
  listUsers: async (opts?: { perPage?: number; page?: number }) => {
    try {
      const perPage = opts?.perPage || 1000;
      const offset = ((opts?.page || 1) - 1) * perPage;
      const result = await db.query(
        'SELECT * FROM "users" ORDER BY "created_at" DESC LIMIT $1 OFFSET $2',
        [perPage, offset]
      );
      return { data: { users: result.rows }, error: null };
    } catch (err: any) {
      return { data: { users: [] }, error: { message: err.message } };
    }
  },

  /** Create a new user */
  createUser: async (attrs: {
    email: string;
    password?: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, any>;
    [key: string]: any;
  }) => {
    try {
      const { v4: uuidv4 } = await import('uuid');
      let passwordHash: string | null = null;
      if (attrs.password) {
        const bcrypt = await import('bcryptjs');
        passwordHash = await bcrypt.hash(attrs.password, 12);
      }
      const result = await db.query(
        `INSERT INTO "users" ("id","email","password_hash","full_name","role","roles","is_active","created_at","updated_at")
         VALUES ($1,$2,$3,$4,$5,$6,true,NOW(),NOW()) RETURNING *`,
        [
          uuidv4(),
          attrs.email.toLowerCase().trim(),
          passwordHash,
          attrs.user_metadata?.full_name || attrs.email.split('@')[0],
          'thalibah',
          JSON.stringify(['thalibah']),
        ]
      );
      return { data: { user: result.rows[0] }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
  },

  /** Delete a user by ID */
  deleteUser: async (userId: string) => {
    try {
      await db.query('DELETE FROM "users" WHERE "id" = $1', [userId]);
      return { data: null, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  },
};

/**
 * Creates a PostgreSQL-backed client that is API-compatible with
 * `@supabase/supabase-js`'s `createClient()` return value.
 *
 * Auth methods are stubs — real auth is handled by lib/auth.ts.
 * auth.admin methods are implemented via direct pg queries.
 */
export function createPgClient() {
  const client = new PgClient();
  return {
    from: (table: string) => client.from(table),
    rpc: (fnName: string, args?: Record<string, any>) => client.rpc(fnName, args),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      // Supabase Auth Admin API — implemented via direct PostgreSQL
      admin: pgAuthAdmin,
    },
    // Storage stub — Supabase Storage is not available.
    // File uploads must be migrated to local filesystem (lib/upload.ts).
    storage: {
      from: (_bucket: string) => ({
        upload: async (_path: string, _file: any, _opts?: any) => {
          console.warn('[storage stub] upload() called — migrate to local filesystem');
          return { data: null, error: { message: 'Supabase Storage removed. Use local file upload.' } };
        },
        remove: async (_paths: string[]) => {
          console.warn('[storage stub] remove() called — file cleanup is now manual');
          return { data: null, error: null };
        },
        getPublicUrl: (_path: string) => ({
          data: { publicUrl: '' },
        }),
        download: async (_path: string) => {
          return { data: null, error: { message: 'Storage not available' } };
        },
        list: async (_prefix?: string) => {
          return { data: [], error: null };
        },
      }),
    },
  };
}

export { PgQueryBuilder, PgClient };
