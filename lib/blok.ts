/**
 * Blok field parser — kanonikal untuk semua endpoint yang membaca kolom
 * `blok` dari `jurnal_records` / `tashih_records`.
 *
 * Kolom `blok` bertipe VARCHAR di DB, tapi secara historis pernah disimpan
 * dalam beberapa format berbeda:
 *   - String tunggal: 'H4A'
 *   - CSV: 'H1A,H1B,H1C,H1D'
 *   - JSON array string (legacy): '["H4A"]'
 *   - PostgreSQL array text: '{H4A,H4B}'
 *   - JS array asli (jika driver auto-parse): ['H4A']
 *
 * Fungsi ini menormalkan semuanya menjadi array of trimmed uppercase strings,
 * dan menambahkan awalan 'H' jika kode hanya angka+huruf (misal '4A' → 'H4A').
 */
export function normalizeBlokCode(code: any): string {
  if (code === null || code === undefined) return ''
  const clean = String(code).trim().toUpperCase()
  if (!clean) return ''
  if (clean.startsWith('H') || clean.startsWith('M')) return clean
  if (/^\d+[A-D]$/.test(clean)) return `H${clean}`
  return clean
}

export function parseBlokField(raw: any): string[] {
  if (raw === null || raw === undefined) return []

  const collect = (items: any[]): string[] =>
    items.map(normalizeBlokCode).filter(Boolean)

  if (Array.isArray(raw)) {
    return collect(raw)
  }

  if (typeof raw !== 'string') return []

  const trimmed = raw.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return collect(parsed)
      }
    } catch {
      // fall through ke CSV split
    }
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return collect(trimmed.slice(1, -1).split(','))
  }

  return collect(trimmed.split(','))
}
