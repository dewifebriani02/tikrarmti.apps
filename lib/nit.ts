/**
 * lib/nit.ts - Utilitas Standardisasi Nomor Induk Tholibah (NIT) MTI
 * Format Baku Pokok: MTI-YYBB-NNNN (Contoh: MTI-2603-0042)
 * Format Dinamis: MTI-YYBB-NNNN-JXX (Contoh: MTI-2603-0042-J30A)
 * Sifat: Pokok NIT permanen seumur hidup, kode juz di belakangnya dinamis mengikuti juz aktif santriwati.
 */

export interface ParsedNit {
  raw: string;
  prefix: string;
  year: number;     // e.g. 26
  batch: number;    // e.g. 3
  sequence: number; // e.g. 42
  juzCode?: string; // e.g. "J30A"
}

/**
 * Validasi apakah string merupakan format NIT resmi MTI (mendukung format pokok maupun format dinamis ber-juz)
 */
export function isValidNit(nit?: string | null): boolean {
  if (!nit) return false;
  return /^MTI-\d{4}-\d{4}(?:-[A-Za-z0-9]+)?$/.test(nit.trim());
}

/**
 * Parsing komponen NIT menjadi objek terstruktur
 */
export function parseNit(nit?: string | null): ParsedNit | null {
  if (!nit || !isValidNit(nit)) return null;

  const clean = nit.trim();
  const parts = clean.split('-');
  if (parts.length < 3) return null;

  const yybb = parts[1]; // e.g. "2603"
  const nnnn = parts[2]; // e.g. "0042"
  const juzCode = parts.length >= 4 ? parts.slice(3).join('-') : undefined;

  const year = parseInt(yybb.substring(0, 2), 10);
  const batch = parseInt(yybb.substring(2, 4), 10);
  const sequence = parseInt(nnnn, 10);

  return {
    raw: clean,
    prefix: parts[0],
    year,
    batch,
    sequence,
    juzCode,
  };
}

/**
 * Format NIT pokok dari komponen angka
 */
export function formatNit(year: number, batch: number, sequence: number): string {
  const yy = String(year).slice(-2).padStart(2, '0');
  const bb = String(batch).padStart(2, '0');
  const nnnn = String(sequence).padStart(4, '0');
  return `MTI-${yy}${bb}-${nnnn}`;
}

/**
 * Format NIT dinamis dengan penambahan kode juz aktif di belakangnya
 * Format: MTI-YYBB-NNNN-JXX (Contoh: MTI-2603-0042-J30 atau MTI-2603-0042-J30A)
 * Jika tholibah belum memiliki juz aktif, mengembalikan NIT pokok (MTI-YYBB-NNNN).
 */
export function formatDynamicNit(nit?: string | null, currentJuz?: string | null): string {
  if (!nit) return '';
  const cleanNit = nit.trim();
  if (!currentJuz || !currentJuz.trim()) return cleanNit;

  // Bersihkan input juz: misal "Juz 30", "30A", "J30A", "1, 2"
  const rawJuz = currentJuz.trim().replace(/^Juz\s+/i, '');
  const primaryJuz = rawJuz.split(',')[0].trim().replace(/\s+/g, '');
  if (!primaryJuz) return cleanNit;

  const juzCode = primaryJuz.toUpperCase().startsWith('J')
    ? primaryJuz.toUpperCase()
    : `J${primaryJuz.toUpperCase()}`;

  return `${cleanNit}-${juzCode}`;
}
