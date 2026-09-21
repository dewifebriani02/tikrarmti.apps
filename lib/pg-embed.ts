/**
 * Dukungan relasi bersarang gaya PostgREST/Supabase untuk lib/pg-query-builder.ts, mis.
 *   .select('*, user:users!fk_name(id, full_name), batch:batches(name), students:halaqah_students(id)')
 *   .select('*, program:programs!inner(*, batch:batches(*))').eq('program.batch_id', id)
 *
 * Relasi diubah menjadi subquery berkorelasi (to_jsonb / jsonb_agg) berdasarkan foreign key
 * di database: many-to-one -> objek (atau null), one-to-many -> array.
 */
import { db } from '@/lib/db';

export interface EmbedNode {
  key: string; // alias atau nama relasi
  rel: string; // nama tabel
  hint?: string; // nama constraint FK atau nama kolom
  inner: boolean;
  cols: string[]; // kolom datar ('*' atau nama kolom)
  embeds: EmbedNode[];
}

export interface ParsedSelect {
  cols: string[];
  embeds: EmbedNode[];
}

export interface EmbedFilter {
  prefix: string;
  col: string;
  make: (colSql: string) => string;
}

interface FkInfo {
  name: string;
  srcTable: string;
  dstTable: string;
  srcCols: string[];
  dstCols: string[];
}

export interface DbMeta {
  fks: FkInfo[];
  columns: Map<string, Set<string>>;
}

const q = (name: string) => `"${name.replace(/"/g, '""')}"`;

function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur);
  return out.map(s => s.trim()).filter(Boolean);
}

export function hasEmbeds(select: string): boolean {
  return splitTopLevel(select).some(t => t.includes('('));
}

export function parseSelect(select: string): ParsedSelect {
  const cols: string[] = [];
  const embeds: EmbedNode[] = [];
  for (const token of splitTopLevel(select)) {
    const open = token.indexOf('(');
    if (open === -1) {
      cols.push(token);
      continue;
    }
    const header = token.slice(0, open).trim();
    const body = token.slice(open + 1, token.lastIndexOf(')'));
    let alias: string | undefined;
    let rest = header;
    const colon = header.indexOf(':');
    if (colon !== -1) {
      alias = header.slice(0, colon).trim();
      rest = header.slice(colon + 1).trim();
    }
    const [rel, ...mods] = rest.split('!').map(s => s.trim());
    let inner = false;
    let hint: string | undefined;
    for (const m of mods) {
      if (m === 'inner') inner = true;
      else if (m === 'left') inner = false;
      else if (m) hint = m;
    }
    const sub = parseSelect(body || '*');
    embeds.push({ key: alias || rel, rel, hint, inner, cols: sub.cols, embeds: sub.embeds });
  }
  return { cols, embeds };
}

// ─── Metadata (FK + kolom), di-cache per proses ────────────────────────────────

let metaPromise: Promise<DbMeta> | null = null;

export function loadMeta(): Promise<DbMeta> {
  if (!metaPromise) {
    metaPromise = (async () => {
      const fkRes = await db.query(`
        SELECT con.conname AS name, src.relname AS src_table, dst.relname AS dst_table,
          (SELECT array_agg(a.attname::text ORDER BY u.ord)
             FROM unnest(con.conkey) WITH ORDINALITY u(attnum, ord)
             JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = u.attnum) AS src_cols,
          (SELECT array_agg(a.attname::text ORDER BY u.ord)
             FROM unnest(con.confkey) WITH ORDINALITY u(attnum, ord)
             JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = u.attnum) AS dst_cols
        FROM pg_constraint con
        JOIN pg_class src ON src.oid = con.conrelid
        JOIN pg_class dst ON dst.oid = con.confrelid
        JOIN pg_namespace n ON n.oid = src.relnamespace
        WHERE con.contype = 'f' AND n.nspname = 'public'`);
      const colRes = await db.query(
        `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
      );
      const columns = new Map<string, Set<string>>();
      for (const r of colRes.rows) {
        if (!columns.has(r.table_name)) columns.set(r.table_name, new Set());
        columns.get(r.table_name)!.add(r.column_name);
      }
      return {
        fks: fkRes.rows.map((r: any) => ({
          name: r.name,
          srcTable: r.src_table,
          dstTable: r.dst_table,
          srcCols: r.src_cols,
          dstCols: r.dst_cols,
        })),
        columns,
      };
    })().catch(err => {
      metaPromise = null;
      throw err;
    });
  }
  return metaPromise;
}

const singular = (s: string) =>
  s.endsWith('ies') ? s.slice(0, -3) + 'y' : s.endsWith('es') && !s.endsWith('ses') ? s.slice(0, -2) : s.endsWith('s') ? s.slice(0, -1) : s;

interface Resolved {
  kind: 'one' | 'many';
  parentCols: string[];
  relCols: string[];
}

function resolveRel(meta: DbMeta, parent: string, rel: string, hint?: string): Resolved | null {
  let forward = meta.fks.filter(f => f.srcTable === parent && f.dstTable === rel);
  let reverse = meta.fks.filter(f => f.srcTable === rel && f.dstTable === parent);
  if (hint) {
    const match = (f: FkInfo) => f.name === hint || f.srcCols.includes(hint) || f.dstCols.includes(hint);
    const fh = forward.filter(match);
    const rh = reverse.filter(match);
    if (fh.length || rh.length) {
      forward = fh;
      reverse = rh;
    }
  }
  if (forward.length) return { kind: 'one', parentCols: forward[0].srcCols, relCols: forward[0].dstCols };
  if (reverse.length) return { kind: 'many', parentCols: reverse[0].dstCols, relCols: reverse[0].srcCols };

  // Fallback konvensi nama kolom bila FK tidak ada di database
  const parentCols = meta.columns.get(parent);
  const relCols = meta.columns.get(rel);
  if (parentCols && relCols) {
    const fwd = `${singular(rel)}_id`;
    if (parentCols.has(fwd) && relCols.has('id')) return { kind: 'one', parentCols: [fwd], relCols: ['id'] };
    const rev = `${singular(parent)}_id`;
    if (relCols.has(rev) && parentCols.has('id')) return { kind: 'many', parentCols: ['id'], relCols: [rev] };
  }
  return null;
}

interface BuildCtx {
  meta: DbMeta;
  filters: EmbedFilter[];
  used: Set<EmbedFilter>;
  counter: { n: number };
}

function joinCond(alias: string, parentRef: string, r: Resolved): string {
  return r.parentCols.map((pc, i) => `${alias}.${q(r.relCols[i])} = ${parentRef}.${q(pc)}`).join(' AND ');
}

function embedExprs(parentTable: string, parentRef: string, nodes: EmbedNode[], ctx: BuildCtx, topLevel: boolean): string[] {
  const exprs: string[] = [];
  for (const node of nodes) {
    const resolved = resolveRel(ctx.meta, parentTable, node.rel, node.hint);
    if (!resolved) {
      console.warn(`[pg-embed] relasi ${parentTable} -> ${node.rel} tidak ditemukan, diisi null`);
      exprs.push(`NULL::jsonb AS ${q(node.key)}`);
      continue;
    }
    const alias = `e${ctx.counter.n++}`;
    const flat = node.cols.length ? node.cols : ['*'];
    const innerCols = flat.map(c => (c === '*' ? `${alias}.*` : `${alias}.${q(c)}`));
    innerCols.push(...embedExprs(node.rel, alias, node.embeds, ctx, false));

    const where = [joinCond(alias, parentRef, resolved)];
    if (topLevel) {
      for (const f of ctx.filters) {
        if (f.prefix === node.key || f.prefix === node.rel) {
          where.push(f.make(`${alias}.${q(f.col)}`));
          ctx.used.add(f);
        }
      }
    }
    const inner = `SELECT ${innerCols.join(', ')} FROM ${q(node.rel)} ${alias} WHERE ${where.join(' AND ')}`;
    exprs.push(
      resolved.kind === 'one'
        ? `(SELECT to_jsonb(x) FROM (${inner} LIMIT 1) x) AS ${q(node.key)}`
        : `COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (${inner}) x), '[]'::jsonb) AS ${q(node.key)}`
    );
  }
  return exprs;
}

/** Klausa EXISTS untuk relasi bertanda !inner (baris induk tanpa relasi dibuang). */
function innerExists(parentTable: string, nodes: EmbedNode[], ctx: BuildCtx): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    if (!node.inner) continue;
    const resolved = resolveRel(ctx.meta, parentTable, node.rel, node.hint);
    if (!resolved) continue;
    const alias = `x${ctx.counter.n++}`;
    const where = [joinCond(alias, q(parentTable), resolved)];
    for (const f of ctx.filters) {
      if (f.prefix === node.key || f.prefix === node.rel) where.push(f.make(`${alias}.${q(f.col)}`));
    }
    out.push(`EXISTS (SELECT 1 FROM ${q(node.rel)} ${alias} WHERE ${where.join(' AND ')})`);
  }
  return out;
}

export interface EmbedSql {
  selectList: string;
  extraWhere: string[];
  unmatchedFilters: EmbedFilter[];
}

export function buildEmbedSql(table: string, parsed: ParsedSelect, filters: EmbedFilter[], meta: DbMeta): EmbedSql {
  const ctx: BuildCtx = { meta, filters, used: new Set(), counter: { n: 0 } };
  const base: string[] = [];
  const flat = parsed.cols.length ? parsed.cols : ['*'];
  for (const c of flat) {
    if (c === '*') base.push(`${q(table)}.*`);
    else if (c.toLowerCase().includes(' as ') || c.includes('::')) base.push(c);
    else base.push(`${q(table)}.${q(c)}`);
  }
  const exprs = embedExprs(table, q(table), parsed.embeds, ctx, true);
  const extraWhere = innerExists(table, parsed.embeds, ctx);
  return {
    selectList: [...base, ...exprs].join(', '),
    extraWhere,
    unmatchedFilters: filters.filter(f => !ctx.used.has(f)),
  };
}
