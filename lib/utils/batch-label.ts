/**
 * Extracts a concise batch badge label (e.g. "Batch 2", "Batch 3")
 * from stored batch names such as "Tikrar Tahfidz MTI Batch 2".
 */
export function formatBatchBadge(batchName?: string | null): string | null {
  if (!batchName) return null;
  const trimmed = batchName.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/batch\s*\d+/i);
  if (match) {
    return match[0].replace(/\s+/g, ' ').replace(/^batch/i, 'Batch');
  }

  return trimmed;
}
