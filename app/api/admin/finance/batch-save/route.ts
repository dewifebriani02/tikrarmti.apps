import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { accountId, transactions = [] } = body;

    if (!accountId) {
      return ApiResponses.badRequest('ID rekening bank tujuan diperlukan');
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return ApiResponses.badRequest('Daftar transaksi yang akan disimpan kosong');
    }

    // Verify account existence
    const { rows: accountRows } = await query(`SELECT id, program_name FROM public.bank_accounts WHERE id = $1`, [
      accountId,
    ]);
    if (accountRows.length === 0) {
      return ApiResponses.notFound('Rekening tujuan tidak ditemukan');
    }

    let savedCount = 0;
    let skippedCount = 0;

    for (const tx of transactions) {
      const {
        date,
        dateTimeRaw,
        type,
        amount,
        donorName = 'Hamba Allah',
        description = '',
        category = 'Infaq & Donasi',
        referenceNumber = '',
        balanceAfter = null,
        isPublic = true,
      } = tx;

      if (!date || !type || typeof amount !== 'number') {
        skippedCount++;
        continue;
      }

      try {
        if (referenceNumber && referenceNumber.trim() !== '') {
          // Insert with on conflict do update (to allow admin edit updates)
          await query(
            `INSERT INTO public.financial_transactions (
               account_id, transaction_date, date_time_raw, type, amount,
               donor_name, description, category, reference_number, balance_after, is_public
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (account_id, reference_number) 
             WHERE reference_number IS NOT NULL AND reference_number <> ''
             DO UPDATE SET 
               donor_name = EXCLUDED.donor_name,
               category = EXCLUDED.category,
               description = EXCLUDED.description,
               is_public = EXCLUDED.is_public,
               updated_at = NOW()`,
            [
              accountId,
              date,
              dateTimeRaw || date,
              type,
              amount,
              donorName.trim(),
              description.trim(),
              category.trim(),
              referenceNumber.trim(),
              balanceAfter,
              isPublic !== false,
            ]
          );
        } else {
          // Insert regular row
          await query(
            `INSERT INTO public.financial_transactions (
               account_id, transaction_date, date_time_raw, type, amount,
               donor_name, description, category, reference_number, balance_after, is_public
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              accountId,
              date,
              dateTimeRaw || date,
              type,
              amount,
              donorName.trim(),
              description.trim(),
              category.trim(),
              null,
              balanceAfter,
              isPublic !== false,
            ]
          );
        }
        savedCount++;
      } catch (insertErr: any) {
        console.error('Error saving transaction row:', insertErr);
        skippedCount++;
      }
    }

    // Recalculate account balance based on transactions
    const { rows: balanceAgg } = await query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE -amount END), 0) AS net_tx
       FROM public.financial_transactions
       WHERE account_id = $1`,
      [accountId]
    );

    const netTx = parseInt(balanceAgg[0]?.net_tx || '0', 10);
    await query(
      `UPDATE public.bank_accounts 
       SET current_balance = initial_balance + $1, updated_at = NOW() 
       WHERE id = $2`,
      [netTx, accountId]
    );

    return ApiResponses.success({
      savedCount,
      skippedCount,
      totalRequested: transactions.length,
      programName: accountRows[0].program_name,
    }, `${savedCount} transaksi berhasil disimpan ke pembukuan.`);
  } catch (err: any) {
    console.error('Error in POST /api/admin/finance/batch-save:', err);
    return ApiResponses.serverError(err.message || 'Gagal menyimpan transaksi');
  }
}
