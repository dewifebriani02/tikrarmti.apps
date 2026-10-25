/**
 * lib/nit.ts - Utilitas Standardisasi Nomor Induk Tholibah (NIT) MTI
 * Format Baku: MTI-YYBB-NNNN (Contoh: MTI-2603-0042)
 * Sifat: Permanen seumur hidup santriwati di Markaz Tikrar Indonesia.
 */

export interface ParsedNit {
  raw: string;
  prefix: string;
  year: number;     // e.g. 26
  batch: number;    // e.g. 3
  sequence: number; // e.g. 42
}

/**
 * Validasi apakah string merupakan format NIT resmi MTI
 */
export function isValidNit(nit?: string | null): boolean {
  if (!nit) return false;
  return /^MTI-\d{4}-\d{4}$/.test(nit.trim());
}

/**
 * Parsing komponen NIT menjadi objek terstruktur
 */
export function parseNit(nit?: string | null): ParsedNit | null {
  if (!nit || !isValidNit(nit)) return null;

  const clean = nit.trim();
  const parts = clean.split('-');
  if (parts.length !== 3) return null;

  const yybb = parts[1]; // e.g. "2603"
  const nnnn = parts[2]; // e.g. "0042"

  const year = parseInt(yybb.substring(0, 2), 10);
  const batch = parseInt(yybb.substring(2, 4), 10);
  const sequence = parseInt(nnnn, 10);

  return {
    raw: clean,
    prefix: parts[0],
    year,
    batch,
    sequence,
  };
}

/**
 * Format NIT dari komponen angka
 */
export function formatNit(year: number, batch: number, sequence: number): string {
  const yy = String(year).slice(-2).padStart(2, '0');
  const bb = String(batch).padStart(2, '0');
  const nnnn = String(sequence).padStart(4, '0');
  return `MTI-${yy}${bb}-${nnnn}`;
}
