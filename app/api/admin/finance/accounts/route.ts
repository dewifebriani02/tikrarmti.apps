import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { rows: accounts } = await query(`
      SELECT 
        ba.id,
        ba.bank_name,
        ba.account_number,
        ba.account_holder,
        ba.program_name,
        ba.program_slug,
        ba.description,
        ba.initial_balance,
        ba.current_balance,
        ba.is_active,
        ba.display_order,
        ba.created_at,
        COALESCE(SUM(CASE WHEN ft.type = 'masuk' THEN ft.amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN ft.type = 'keluar' THEN ft.amount ELSE 0 END), 0) AS total_expense,
        COUNT(ft.id) AS total_transactions
      FROM public.bank_accounts ba
      LEFT JOIN public.financial_transactions ft ON ft.account_id = ba.id
      GROUP BY ba.id
      ORDER BY ba.display_order ASC, ba.created_at ASC
    `);

    const formatted = accounts.map((a: any) => ({
      ...a,
      initial_balance: parseInt(a.initial_balance || '0', 10),
      current_balance: parseInt(a.current_balance || '0', 10),
      total_income: parseInt(a.total_income || '0', 10),
      total_expense: parseInt(a.total_expense || '0', 10),
      total_transactions: parseInt(a.total_transactions || '0', 10),
      calculated_balance:
        parseInt(a.initial_balance || '0', 10) +
        parseInt(a.total_income || '0', 10) -
        parseInt(a.total_expense || '0', 10),
    }));

    return ApiResponses.success(formatted);
  } catch (err: any) {
    console.error('Error in GET /api/admin/finance/accounts:', err);
    return ApiResponses.serverError(err.message || 'Gagal memuat akun bank');
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const {
      bank_name = 'BSI (Bank Syariah Indonesia)',
      account_number,
      account_holder,
      program_name,
      program_slug,
      description = '',
      initial_balance = 0,
      display_order = 1,
    } = body;

    if (!account_number || !account_holder || !program_name || !program_slug) {
      return ApiResponses.badRequest('Nomor rekening, atas nama, nama program, dan slug program wajib diisi');
    }

    const { rows } = await query(
      `INSERT INTO public.bank_accounts 
         (bank_name, account_number, account_holder, program_name, program_slug, description, initial_balance, current_balance, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)
       RETURNING *`,
      [
        bank_name,
        account_number.trim(),
        account_holder.trim(),
        program_name.trim(),
        program_slug.trim().toLowerCase(),
        description.trim(),
        initial_balance,
        display_order,
      ]
    );

    return ApiResponses.success(rows[0], 'Akun rekening program berhasil ditambahkan');
  } catch (err: any) {
    console.error('Error in POST /api/admin/finance/accounts:', err);
    return ApiResponses.serverError(err.message || 'Gagal menambahkan akun rekening');
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { id, bank_name, account_number, account_holder, program_name, program_slug, description, is_active, display_order } = body;

    if (!id) return ApiResponses.badRequest('ID akun rekening diperlukan');

    const { rows } = await query(
      `UPDATE public.bank_accounts
       SET 
         bank_name = COALESCE($1, bank_name),
         account_number = COALESCE($2, account_number),
         account_holder = COALESCE($3, account_holder),
         program_name = COALESCE($4, program_name),
         program_slug = COALESCE($5, program_slug),
         description = COALESCE($6, description),
         is_active = COALESCE($7, is_active),
         display_order = COALESCE($8, display_order),
         updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [bank_name, account_number, account_holder, program_name, program_slug, description, is_active, display_order, id]
    );

    if (rows.length === 0) return ApiResponses.notFound('Akun rekening tidak ditemukan');

    return ApiResponses.success(rows[0], 'Akun rekening berhasil diperbarui');
  } catch (err: any) {
    console.error('Error in PUT /api/admin/finance/accounts:', err);
    return ApiResponses.serverError(err.message || 'Gagal memperbarui akun rekening');
  }
}
