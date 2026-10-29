/**
 * BSI (Bank Syariah Indonesia) e-Statement Parser
 * Parses multi-page BSI PDF statements into structured account info and transaction rows.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

export interface ParsedBsiTransaction {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  dateTimeRaw: string;
  type: 'masuk' | 'keluar';
  amount: number;
  donorName: string;
  description: string;
  category: string;
  referenceNumber: string;
  balanceAfter: number;
}

export interface ParsedBsiStatement {
  accountNumber: string;
  accountHolder: string;
  period: string;
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  transactions: ParsedBsiTransaction[];
}

const MONTH_MAP: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  Mei: '05',
  May: '05',
  Jun: '06',
  Jul: '07',
  Agu: '08',
  Aug: '08',
  Sep: '09',
  Okt: '10',
  Oct: '10',
  Nov: '11',
  Des: '12',
  Dec: '12',
};

export async function parseBsiPdfBuffer(buffer: Buffer): Promise<ParsedBsiStatement> {
  const data = await pdfParse(buffer);
  const text: string = data.text;

  // 1. Account Number
  const accountMatch =
    text.match(/(?:EASY WADIAH|TABUNGAN|GIRO)[^\d]*(\d{10})/i) ||
    text.match(/REKENING\s*:\s*[^\n]*?\n.*?(\d{10})/i) ||
    text.match(/(\d{10})/);
  const accountNumber = accountMatch ? accountMatch[1] : '';

  // 2. Account Holder
  let accountHolder = 'Markaz Tikrar Indonesia';
  if (text.includes('MARA MARTALENA')) {
    accountHolder = 'Mara Martalena / Markaz Tikrar';
  } else {
    const holderMatch = text.match(/LAPORAN REKENING[\s\S]*?([A-Z\s]{4,30})\nBLOK/i);
    if (holderMatch && holderMatch[1].trim()) {
      accountHolder = holderMatch[1].trim();
    }
  }

  // 3. Statement Period
  const periodMatch = text.match(/(\d{1,2}\s+[A-Za-z]{3}\s*-\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/);
  const period = periodMatch ? periodMatch[1].trim() : '';

  // 4. Split and extract transactions by date pattern
  const dateRegex = /(\d{2}\s+[A-Za-z]{3}\s+\d{4}\n\d{2}:\d{2})/g;
  const parts = text.split(dateRegex);

  const transactions: ParsedBsiTransaction[] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (let i = 1; i < parts.length; i += 2) {
    const rawDateTime = parts[i].trim();
    const [dateStr, timeStr = ''] = rawDateTime.split('\n').map((s) => s.trim());
    let rawBody = parts[i + 1] || '';

    // Strip page headers/footers in this chunk first so numbers like "SALDO BULAN LALU Rp 500.000,00" won't pollute transactions
    rawBody = rawBody
      .replace(/RINGKASAN TRANSAKSI[\s\S]*$/gi, '')
      .replace(/SALDO BULAN LALU[\s\S]*$/gi, '')
      .replace(/Selalu gunakan BYOND[\s\S]*$/gi, '');

    // Extract currency figures: Debit, Kredit, Saldo
    const currencyMatches = rawBody.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/g) || [];
    let debitStr = '0,00';
    let creditStr = '0,00';
    let saldoStr = '0,00';

    if (currencyMatches.length >= 3) {
      debitStr = currencyMatches[currencyMatches.length - 3];
      creditStr = currencyMatches[currencyMatches.length - 2];
      saldoStr = currencyMatches[currencyMatches.length - 1];
    }

    // Cut rawBody before the first currency match to get details & reference
    const firstCurIndex = rawBody.search(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    const beforeCur = (firstCurIndex !== -1 ? rawBody.substring(0, firstCurIndex) : rawBody).trim();

    // Reff code is usually an FT... or transaction code at the end
    let reff = '';
    let descRaw = beforeCur;
    const ftMatch = beforeCur.match(/(FT[A-Z0-9\\/\n\r -]+)$/i);
    if (ftMatch) {
      reff = ftMatch[1].replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
      descRaw = beforeCur.substring(0, ftMatch.index).trim();
    }

    // Clean description text
    let desc = descRaw
      .replace(/RINGKASAN TRANSAKSI[\s\S]*?Date & TimeDetail TransaksiNo ReffDebitKreditSaldo/g, '')
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const debit = parseInt(debitStr.replace(/\./g, '').split(',')[0], 10) || 0;
    const credit = parseInt(creditStr.replace(/\./g, '').split(',')[0], 10) || 0;
    const saldo = parseInt(saldoStr.replace(/\./g, '').split(',')[0], 10) || 0;

    const isCredit = credit > 0;
    const type: 'masuk' | 'keluar' = isCredit ? 'masuk' : 'keluar';
    const amount = isCredit ? credit : debit;

    if (type === 'masuk') totalIncome += amount;
    else totalExpense += amount;

    // Detect counterpart / donor name cleanly
    let donorName = '';
    const keMatch = desc.match(/Ke\s*-\s*([A-Za-z0-9. ']+?)(?:\s*-\s*|$)/i);
    const dariMatch = desc.match(/Dari\s*-\s*(?:[A-Za-z0-9 ]+\s*-\s*)?([A-Za-z0-9. ']+?)(?:\s*-\s*|$)/i);

    if (keMatch) {
      donorName = keMatch[1].trim();
    } else if (dariMatch) {
      donorName = dariMatch[1].trim();
    } else {
      const firstPart = desc.split(/Dana\s+(?:Masuk|Keluar)|TRF|BIFAST/i)[0].trim();
      if (firstPart && firstPart.length < 50) {
        donorName = firstPart;
      }
    }

    if (!donorName || donorName.length < 2) {
      donorName = type === 'masuk' ? 'Hamba Allah' : 'Penerima Operasional';
    }

    // Suggest appropriate category
    let category = 'Infaq & Donasi';
    const lowerDesc = desc.toLowerCase();
    if (type === 'keluar') {
      if (
        lowerDesc.includes('domain') ||
        lowerDesc.includes('server') ||
        lowerDesc.includes('zoom') ||
        lowerDesc.includes('hosting') ||
        lowerDesc.includes('it')
      ) {
        category = 'Operasional Server & IT';
      } else if (
        lowerDesc.includes('spp') ||
        lowerDesc.includes('beasiswa') ||
        lowerDesc.includes('santri') ||
        lowerDesc.includes('dhuafa')
      ) {
        category = 'Beasiswa Santriwati & Dhuafa';
      } else if (
        lowerDesc.includes('ustadzah') ||
        lowerDesc.includes('muallimah') ||
        lowerDesc.includes('musyrifah') ||
        lowerDesc.includes('guru') ||
        lowerDesc.includes('kafalah')
      ) {
        category = 'Kafalah Muallimah & Pengajar';
      } else {
        category = 'Operasional & Fasilitas Dakwah';
      }
    } else {
      if (lowerDesc.includes('murojaah') || lowerDesc.includes('murajaah')) {
        category = 'Infaq Murojaah 40x';
      } else if (lowerDesc.includes('pra-tikrar') || lowerDesc.includes('pra tikrar')) {
        category = 'Infaq Pra-Tikrar';
      } else if (lowerDesc.includes('tikrar') || lowerDesc.includes('daftar') || lowerDesc.includes('tahfidz')) {
        category = 'Infaq Tikrar Tahfidz';
      } else if (lowerDesc.includes('wakaf')) {
        category = 'Wakaf Al-Quran & Fasilitas';
      } else {
        category = 'Infaq & Donasi Program';
      }
    }

    // Parse standard ISO Date YYYY-MM-DD
    const dateMatch = dateStr.match(/(\d{2})\s+([A-Za-z]{3})\s+(\d{4})/);
    let isoDate = dateStr;
    if (dateMatch) {
      const day = dateMatch[1];
      const monthStr = dateMatch[2];
      const year = dateMatch[3];
      const month = MONTH_MAP[monthStr] || '01';
      isoDate = `${year}-${month}-${day}`;
    }

    transactions.push({
      date: isoDate,
      time: timeStr,
      dateTimeRaw: `${dateStr} ${timeStr}`.trim(),
      type,
      amount,
      donorName,
      description: desc,
      category,
      referenceNumber: reff,
      balanceAfter: saldo,
    });
  }

  return {
    accountNumber,
    accountHolder,
    period,
    totalTransactions: transactions.length,
    totalIncome,
    totalExpense,
    transactions,
  };
}
