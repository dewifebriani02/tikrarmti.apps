import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { parseBsiPdfBuffer } from '@/lib/bsi-parser';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      return ApiResponses.badRequest('File PDF e-statement rekening koran BSI diperlukan');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Parse statement with our dedicated parser
    const parsed = await parseBsiPdfBuffer(buffer);

    if (!parsed.transactions || parsed.transactions.length === 0) {
      return ApiResponses.badRequest(
        'Tidak ditemukan transaksi pada file PDF ini. Pastikan file merupakan e-Statement BSI yang valid.'
      );
    }

    // 2. Find matching bank account in database
    const { rows: matchedAccounts } = await query(
      `SELECT id, bank_name, account_number, account_holder, program_name, program_slug
       FROM public.bank_accounts
       WHERE account_number = $1`,
      [parsed.accountNumber]
    );

    const matchedAccount = matchedAccounts[0] || null;

    // 3. Check for duplicates against existing transactions
    // Extract non-empty reference numbers
    const refNumbers = parsed.transactions
      .map((t) => t.referenceNumber)
      .filter((ref) => ref && ref.trim().length > 3);

    const existingRefSet = new Set<string>();
    if (refNumbers.length > 0 && matchedAccount) {
      const { rows: existingRows } = await query(
        `SELECT reference_number 
         FROM public.financial_transactions 
         WHERE account_id = $1 AND reference_number = ANY($2::text[])`,
        [matchedAccount.id, refNumbers]
      );
      existingRows.forEach((r: any) => existingRefSet.add(r.reference_number));
    }

    // 4. Enrich transactions with match & duplicate status
    const enrichedTransactions = parsed.transactions.map((tx, idx) => {
      const isDuplicate = tx.referenceNumber ? existingRefSet.has(tx.referenceNumber) : false;
      return {
        id: `draft_${Date.now()}_${idx}`,
        ...tx,
        isDuplicate,
        isPublic: true,
        selected: !isDuplicate, // Auto-select only non-duplicates
      };
    });

    const duplicateCount = enrichedTransactions.filter((t) => t.isDuplicate).length;

    return ApiResponses.success({
      fileName: file.name,
      fileSize: file.size,
      accountNumber: parsed.accountNumber,
      accountHolder: parsed.accountHolder,
      period: parsed.period,
      matchedAccount,
      totalParsed: parsed.totalTransactions,
      totalIncome: parsed.totalIncome,
      totalExpense: parsed.totalExpense,
      duplicateCount,
      transactions: enrichedTransactions,
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/finance/parse-pdf:', err);
    return ApiResponses.serverError(err.message || 'Gagal memproses file PDF rekening koran');
  }
}
