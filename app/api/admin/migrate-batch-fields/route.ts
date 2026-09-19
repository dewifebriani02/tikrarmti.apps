import { NextResponse } from 'next/server';

/**
 * RETIRED: this was a one-off migration (add is_free/price/total_quota columns
 * to batches, then hardcode-update "Tikrar MTI Batch 2") that shipped as a live,
 * UNAUTHENTICATED POST route running arbitrary ALTER TABLE DDL via exec_sql —
 * anyone could hit this with no login at all. The migration it existed for is
 * done (see supabase/migrations/ for the real column additions), so disabling
 * rather than deleting (keeps git history/context). Do not re-enable this
 * without a requireAdmin() check, and preferably without raw exec_sql DDL.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'This one-off migration endpoint has been retired.' },
    { status: 410 }
  );
}
