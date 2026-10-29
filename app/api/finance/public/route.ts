import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ApiResponses } from '@/lib/api-responses';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programSlug = searchParams.get('program') || undefined;
    const year = searchParams.get('year') || undefined;
    const month = searchParams.get('month') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // 1. Fetch active bank accounts
    const { rows: accounts } = await query(
      `SELECT 
         id, bank_name, account_number, account_holder, 
         program_name, program_slug, description, 
         initial_balance, current_balance, display_order
       FROM public.bank_accounts
       WHERE is_active = true
       ORDER BY display_order ASC, created_at ASC`
    );

    // Filter by program if specified
    const targetAccount = programSlug && programSlug !== 'all' ? accounts.find((a: any) => a.program_slug === programSlug) : null;
    const accountFilter = targetAccount ? targetAccount.id : null;

    // 2. Aggregate summary
    let summarySql = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0) AS total_expense,
        COUNT(id) AS total_transactions
      FROM public.financial_transactions
      WHERE is_public = true
    `;
    const summaryParams: any[] = [];

    if (accountFilter) {
      summaryParams.push(accountFilter);
      summarySql += ` AND account_id = $${summaryParams.length}`;
    }

    if (year) {
      summaryParams.push(`${year}%`);
      summarySql += ` AND TO_CHAR(transaction_date, 'YYYY') LIKE $${summaryParams.length}`;
    }

    const { rows: summaryRows } = await query(summarySql, summaryParams);
    const totalIncome = parseInt(summaryRows[0]?.total_income || '0', 10);
    const totalExpense = parseInt(summaryRows[0]?.total_expense || '0', 10);
    const totalTransactions = parseInt(summaryRows[0]?.total_transactions || '0', 10);
    const netBalance = totalIncome - totalExpense;

    // 3. Category Breakdown (Alokasi Pengeluaran)
    let categorySql = `
      SELECT 
        category,
        COALESCE(SUM(amount), 0) AS total_amount,
        COUNT(id) AS count
      FROM public.financial_transactions
      WHERE is_public = true AND type = 'keluar'
    `;
    const categoryParams: any[] = [];
    if (accountFilter) {
      categoryParams.push(accountFilter);
      categorySql += ` AND account_id = $${categoryParams.length}`;
    }
    categorySql += ` GROUP BY category ORDER BY total_amount DESC`;

    const { rows: categoryRows } = await query(categorySql, categoryParams);
    const allocation = categoryRows.map((r: any) => ({
      category: r.category,
      amount: parseInt(r.total_amount, 10),
      count: parseInt(r.count, 10),
      percentage: totalExpense > 0 ? Math.round((parseInt(r.total_amount, 10) / totalExpense) * 100) : 0,
    }));

    // 4. Public transactions list
    let txSql = `
      SELECT 
        t.id,
        t.account_id,
        ba.program_name,
        ba.program_slug,
        ba.account_number,
        t.transaction_date,
        t.date_time_raw,
        t.type,
        t.amount,
        t.donor_name,
        t.description,
        t.category,
        t.balance_after
      FROM public.financial_transactions t
      JOIN public.bank_accounts ba ON ba.id = t.account_id
      WHERE t.is_public = true
    `;
    const txParams: any[] = [];

    if (accountFilter) {
      txParams.push(accountFilter);
      txSql += ` AND t.account_id = $${txParams.length}`;
    }

    if (year && month) {
      txParams.push(`${year}-${month.padStart(2, '0')}%`);
      txSql += ` AND TO_CHAR(t.transaction_date, 'YYYY-MM') LIKE $${txParams.length}`;
    } else if (year) {
      txParams.push(`${year}%`);
      txSql += ` AND TO_CHAR(t.transaction_date, 'YYYY') LIKE $${txParams.length}`;
    }

    txSql += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $${txParams.length + 1} OFFSET $${txParams.length + 2}`;
    txParams.push(limit, offset);

    const { rows: transactions } = await query(txSql, txParams);

    const formattedTransactions = transactions.map((t: any) => ({
      id: t.id,
      accountId: t.account_id,
      programName: t.program_name,
      programSlug: t.program_slug,
      accountNumber: t.account_number,
      date: t.transaction_date,
      dateTimeRaw: t.date_time_raw,
      type: t.type,
      amount: parseInt(t.amount, 10),
      donorName: t.donor_name,
      description: t.description,
      category: t.category,
      balanceAfter: t.balance_after ? parseInt(t.balance_after, 10) : null,
    }));

    return ApiResponses.success({
      accounts,
      selectedProgram: targetAccount,
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        totalTransactions,
      },
      allocation,
      transactions: formattedTransactions,
      pagination: {
        limit,
        offset,
        total: totalTransactions,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/finance/public:', err);
    return ApiResponses.serverError(err.message || 'Gagal memuat data transparansi donasi');
  }
}
