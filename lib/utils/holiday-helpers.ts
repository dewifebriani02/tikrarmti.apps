/**
 * Helper utility for parsing and normalizing holiday dates
 */

export function parseHolidayDates(val: any): string[] {
  if (!val) return [];
  
  if (Array.isArray(val)) {
    return Array.from(
      new Set(
        val
          .map(d => (typeof d === 'string' ? d.split('T')[0].trim() : ''))
          .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      )
    ).sort();
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '{}' || trimmed === '[]' || trimmed === '""') return [];

    // Try parsing as JSON array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parseHolidayDates(parsed);
        }
      } catch {
        // Continue to other formats
      }
    }

    // Postgres array format "{2026-03-01,2026-03-02}"
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      const parts = inner
        .split(',')
        .map(s => s.replace(/["'{}]/g, '').trim().split('T')[0])
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      return Array.from(new Set(parts)).sort();
    }

    // Comma-separated format
    if (trimmed.includes(',')) {
      const parts = trimmed
        .split(',')
        .map(s => s.replace(/["'{}[\]]/g, '').trim().split('T')[0])
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      return Array.from(new Set(parts)).sort();
    }

    // Single date string
    const single = trimmed.replace(/["'{}[\]]/g, '').trim().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(single)) {
      return [single];
    }
  }

  return [];
}
