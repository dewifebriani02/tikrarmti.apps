import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || undefined;
    const type = searchParams.get('type') || undefined;
    const search = searchParams.get('search') || undefined;
    const isPublic = searchParams.get('isPublic') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    let sql = `
      SELECT 
        ft.id,
        ft.account_id,
        ba.program_name,
        ba.program_slug,
        ba.account_number,
        ft.transaction_date,
        ft.date_time_raw,
        ft.type,
        ft.amount,
        ft.donor_name,
        ft.description,
        ft.category,
        ft.reference_number,
        ft.balance_after,
        ft.is_public,
        ft.created_at
      FROM public.financial_transactions ft
      JOIN public.bank_accounts ba ON ba.id = ft.account_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (accountId && accountId !== 'all') {
      params.push(accountId);
      sql += ` AND ft.account_id = $${params.length}`;
    }

    if (type && (type === 'masuk' || type === 'keluar')) {
      params.push(type);
      sql += ` AND ft.type = $${params.length}`;
    }

    if (isPublic !== undefined && isPublic !== '') {
      params.push(isPublic === 'true');
      sql += ` AND ft.is_public = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (ft.donor_name ILIKE $${params.length} OR ft.description ILIKE $${params.length} OR ft.reference_number ILIKE $${params.length})`;
    }

    // Count query
    const countSql = sql.replace(/SELECT[\s\S]*?FROM/i, 'SELECT COUNT(ft.id) as total FROM');
    const { rows: countRows } = await query(countSql, params);
    const total = parseInt(countRows[0]?.total || '0', 10);

    sql += ` ORDER BY ft.transaction_date DESC, ft.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows: transactions } = await query(sql, params);

    const formatted = transactions.map((t: any) => ({
      ...t,
      amount: parseInt(t.amount, 10),
      balance_after: t.balance_after ? parseInt(t.balance_after, 10) : null,
    }));

    return ApiResponses.success({
      total,
      limit,
      offset,
      transactions: formatted,
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/finance/transactions:', err);
    return ApiResponses.serverError(err.message || 'Gagal memuat daftar transaksi');
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const {
      account_id,
      transaction_date,
      date_time_raw,
      type,
      amount,
      donor_name = 'Hamba Allah',
      description = '',
      category = 'Infaq & Donasi',
      reference_number = null,
      is_public = true,
    } = body;

    if (!account_id || !transaction_date || !type || !amount) {
      return ApiResponses.badRequest('Rekening, tanggal, tipe (masuk/keluar), dan nominal wajib diisi');
    }

    const { rows } = await query(
      `INSERT INTO public.financial_transactions (
         account_id, transaction_date, date_time_raw, type, amount,
         donor_name, description, category, reference_number, is_public
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        account_id,
        transaction_date,
        date_time_raw || transaction_date,
        type,
        amount,
        donor_name.trim(),
        description.trim(),
        category.trim(),
        reference_number ? reference_number.trim() : null,
        is_public !== false,
      ]
    );

    // Update account balance
    await query(
      `UPDATE public.bank_accounts
       SET current_balance = current_balance + $1, updated_at = NOW()
       WHERE id = $2`,
      [type === 'masuk' ? amount : -amount, account_id]
    );

    return ApiResponses.success(rows[0], 'Transaksi berhasil dicatat');
  } catch (err: any) {
    console.error('Error in POST /api/admin/finance/transactions:', err);
    return ApiResponses.serverError(err.message || 'Gagal mencatat transaksi');
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { id, donor_name, description, category, is_public } = body;

    if (!id) return ApiResponses.badRequest('ID transaksi diperlukan');

    const { rows } = await query(
      `UPDATE public.financial_transactions
       SET 
         donor_name = COALESCE($1, donor_name),
         description = COALESCE($2, description),
         category = COALESCE($3, category),
         is_public = COALESCE($4, is_public),
         updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [donor_name, description, category, is_public, id]
    );

    if (rows.length === 0) return ApiResponses.notFound('Transaksi tidak ditemukan');

    return ApiResponses.success(rows[0], 'Transaksi berhasil diperbarui');
  } catch (err: any) {
    console.error('Error in PUT /api/admin/finance/transactions:', err);
    return ApiResponses.serverError(err.message || 'Gagal memperbarui transaksi');
  }
}

export async function DELETE(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return ApiResponses.badRequest('ID transaksi diperlukan');

    const { rows: existing } = await query(`SELECT account_id, type, amount FROM public.financial_transactions WHERE id = $1`, [id]);
    if (existing.length === 0) return ApiResponses.notFound('Transaksi tidak ditemukan');

    const { account_id, type, amount } = existing[0];

    await query(`DELETE FROM public.financial_transactions WHERE id = $1`, [id]);

    // Revert balance
    await query(
      `UPDATE public.bank_accounts
       SET current_balance = current_balance + $1, updated_at = NOW()
       WHERE id = $2`,
      [type === 'masuk' ? -parseInt(amount, 10) : parseInt(amount, 10), account_id]
    );

    return ApiResponses.success(null, 'Transaksi berhasil dihapus');
  } catch (err: any) {
    console.error('Error in DELETE /api/admin/finance/transactions:', err);
    return ApiResponses.serverError(err.message || 'Gagal menghapus transaksi');
  }
}
