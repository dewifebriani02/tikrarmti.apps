// Reliable cross-browser Hijri date conversion
const HIJRI_MONTHS_ID = [
  'Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir',
  'Jumadilawal', 'Jumadilakhir', 'Rajab', 'Syakban',
  'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah'
];

export function toHijri(date: Date): { day: number; month: number; year: number } {
  const Y = date.getFullYear();
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const JD = Math.floor((1461 * (Y + 4800 + Math.floor((M - 14) / 12))) / 4) +
    Math.floor((367 * (M - 2 - 12 * Math.floor((M - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((Y + 4900 + Math.floor((M - 14) / 12)) / 100)) / 4) +
    D - 32075;

  const l = JD - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { day: hDay, month: hMonth, year: hYear };
}

export function formatHijriDate(date: Date): string {
  const h = toHijri(date);
  const monthName = HIJRI_MONTHS_ID[h.month - 1] || '';
  return `${h.day} ${monthName.toUpperCase()} ${h.year} H`;
}

export interface MurajaahScheduleItem {
  day: string;
  code: string;
  range: [number, number];
  parts: [string, string];
  target: string;
  blokA: string;
  blokB: string;
  desc: string;
}

export const MURAJAAH_SCHEDULE: MurajaahScheduleItem[] = [
  { 
    day: 'Senin', 
    code: 'M1', 
    range: [1, 3], 
    parts: ['A', 'B'], 
    target: '4×', 
    blokA: 'H1a–H3b', 
    blokB: 'H11a–H13b', 
    desc: 'H1a–H3b / H11a–H13b (Halaman 1 s.d. 3 / 2.5 Halaman Pertama)' 
  },
  { 
    day: 'Selasa', 
    code: 'M2', 
    range: [3, 5], 
    parts: ['C', 'D'], 
    target: '4×', 
    blokA: 'H3c–H5d', 
    blokB: 'H13c–H15d', 
    desc: 'H3c–H5d / H13c–H15d (Halaman 3 s.d. 5 / 2.5 Halaman Lanjutan)' 
  },
  { 
    day: 'Rabu', 
    code: 'M3', 
    range: [1, 5], 
    parts: ['A', 'D'], 
    target: '2×', 
    blokA: 'H1a–H5d', 
    blokB: 'H11a–H15d', 
    desc: 'H1a–H5d / H11a–H15d (Halaman 1 s.d. 5 / Total 5 Halaman Pertama)' 
  },
  { 
    day: 'Kamis', 
    code: 'M4', 
    range: [6, 8], 
    parts: ['A', 'B'], 
    target: '4×', 
    blokA: 'H6a–H8b', 
    blokB: 'H16a–H18b', 
    desc: 'H6a–H8b / H16a–H18b (Halaman 6 s.d. 8 / 2.5 Halaman Paruh Kedua)' 
  },
  { 
    day: 'Jumat', 
    code: 'M5', 
    range: [8, 10], 
    parts: ['C', 'D'], 
    target: '4×', 
    blokA: 'H8c–H10d', 
    blokB: 'H18c–H20d', 
    desc: 'H8c–H10d / H18c–H20d (Halaman 8 s.d. 10 / 2.5 Halaman Terakhir)' 
  },
  { 
    day: 'Sabtu', 
    code: 'M6', 
    range: [6, 10], 
    parts: ['A', 'D'], 
    target: '2×', 
    blokA: 'H6a–H10d', 
    blokB: 'H16a–H20d', 
    desc: 'H6a–H10d / H16a–H20d (Halaman 6 s.d. 10 / Total 5 Halaman Kedua)' 
  },
  { 
    day: 'Ahad', 
    code: 'M7', 
    range: [1, 10], 
    parts: ['A', 'D'], 
    target: '1×', 
    blokA: 'H1a–H10d', 
    blokB: 'H11a–H20d', 
    desc: 'H1a–H10d / H11a–H20d (Halaman 1 s.d. 10 / SELURUH 10 HALAMAN 1/2 JUZ LENGKAP)' 
  },
];

export interface JuzOptionLike {
  id?: string;
  name: string;
  part?: 'A' | 'B';
  start_page: number;
  end_page?: number;
}

/**
 * Generate daily text for a single day of Pekan Muraja'ah (M1 s.d. M7)
 */
export function generateMurajaahDailyText({
  item,
  date = new Date(),
  juzOptions = [],
}: {
  item: MurajaahScheduleItem;
  date?: Date;
  juzOptions?: JuzOptionLike[];
}): string {
  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const dateStr = date.toLocaleDateString('id-ID', dateOptions).toUpperCase();
  const hijriStr = formatHijriDate(date);
  const dateHeader = `${item.day.toUpperCase()}, ${dateStr} / ${hijriStr}`;

  let text = `*KURIKULUM HARI INI: PEKAN MURAJA'AH*\n`;
  text += `*PROGRAM TIKRAR TAHFIDZ MTI*\n`;
  text += `*${dateHeader}*\n\n`;

  text += `🎯 *TARGET HARI INI: ${item.code} (${item.day})*\n`;
  text += `📖 *Blok Target:* ${item.blokA} (Bagian A) / ${item.blokB} (Bagian B)\n`;
  text += `🔁 *Target Pengulangan:* Minimal ${item.target} lancar\n`;
  text += `💡 *Keterangan Porsi:* ${item.desc}\n\n`;

  text += `📋 *Panduan Muroja'ah Hari Ini:*\n`;
  text += `1. Membaca & mengulang porsi target hari ini sebanyak ${item.target} hingga lancar mengalir tanpa kendala.\n`;
  text += `2. Saling simak bersama pasangan tikrar atau cek kelancaran mandiri via Tarteel AI.\n`;
  text += `3. Catat di menu Jurnal Harian web Tikrar: centang target *Selesai Murajaah (${item.code})* lalu kirim jurnal.\n\n`;

  if (juzOptions && juzOptions.length > 0) {
    text += `📌 *Perkiraan Halaman Mushaf per Juz (Porsi ${item.code}):*\n`;
    juzOptions.forEach(j => {
      const codeOnly = j.name.replace(/Juz\s*/i, '').replace(/\s*\(.*?\)/, '').trim();
      const startP = j.start_page + (item.range[0] - 1);
      const endP = j.end_page ? Math.min(j.start_page + (item.range[1] - 1), j.end_page) : (j.start_page + (item.range[1] - 1));
      text += `• Juz ${codeOnly} : Hal ${startP} - ${endP}\n`;
    });
    text += `\n`;
  }

  text += `Yassarallah wa barakallahufiikunna.. 🌹\n\n`;
  text += `━━━━━━━━━━━━━━━━❁❁\n\n`;
  text += `𝗠𝗔𝗥𝗞𝗔𝗭 𝗧𝗜𝗞𝗥𝗔𝗥 𝗜𝗡𝗗𝗢𝗡𝗘𝗦𝗜𝗔\n\n`;
  text += `📱 *MTI OFFICIAL : 081330000784*\n`;
  text += `🪩 *Website MTI : markaztikrar.id*\n`;
  text += `🔗 *Tap Lynk : https://lynk.id/markaztikrar.id*`;

  return text.trim();
}

/**
 * Generate weekly announcement text covering all 7 days (M1 - M7)
 */
export function generateMurajaahWeeklyRecap({
  startDate = new Date(),
  juzOptions = [],
}: {
  startDate?: Date;
  juzOptions?: JuzOptionLike[];
}): string {
  let text = `╔❀◎📖◎❀════════════╗\n`;
  text += `  𝗠𝗔𝗥𝗞𝗔𝗭 𝗧𝗜𝗞𝗥𝗔𝗥 𝗜𝗡𝗗𝗢𝗡𝗘𝗦𝗜𝗔\n`;
  text += `  𝗞𝗨𝗥𝗜𝗞𝗨𝗟𝗨𝗠 𝗣𝗘𝗞𝗔𝗡 𝗠𝗨𝗥𝗔𝗝𝗔'𝗔𝗛\n`;
  text += `  (𝗣𝗘𝗞𝗔𝗡 𝟭𝟭: 𝗠𝟭 – 𝗠𝟳)\n`;
  text += `╚════════════❀◎📖◎❀╝\n\n`;

  text += `بِسْــــــــــــــــــمِ اللهِ الرَّحْمَنِ الرَّحِيْمِ\n\n`;
  text += `السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ\n\n`;

  text += `Ahlan wa sahlan Shalihah fillah, peserta Program Tikrar Tahfidz MTI 🌸\n\n`;
  text += `Alhamdulillah, 10 halaman hafalan baru (1/2 juz) telah tuntas dipelajari selama 10 pekan ziyadah (Pekan 1 s.d. 10).\n`;
  text += `Mulai pekan ini, kita resmi memasuki *PEKAN MURAJA'AH (Pekan ke-11)* untuk mengulang, mengikat, dan memutqinkan seluruh 10 halaman tersebut dari hari Senin hingga puncaknya di Ahad sebelum pelaksanaan Ujian Akhir.\n\n`;

  text += `🗓️ *JADWAL KURIKULUM MURAJA'AH SEPEKAN (M1 – M7):*\n`;
  MURAJAAH_SCHEDULE.forEach(m => {
    text += `• 🔹 *${m.day} (${m.code})* : ${m.blokA} / ${m.blokB} ➡️ *Target ${m.target}*\n`;
  });
  text += `\n`;

  text += `💡 *Struktur Pembagian 10 Halaman di Jurnal Harian:*\n`;
  text += `• *Senin – Rabu:* Mematangkan 5 Halaman Pertama (${MURAJAAH_SCHEDULE[0].blokA} s.d. ${MURAJAAH_SCHEDULE[1].blokA} lalu diikat di M3)\n`;
  text += `• *Kamis – Sabtu:* Mematangkan 5 Halaman Kedua (${MURAJAAH_SCHEDULE[3].blokA} s.d. ${MURAJAAH_SCHEDULE[4].blokA} lalu diikat di M6)\n`;
  text += `• *Ahad (Puncak):* Mengulang SELURUH 10 Halaman (${MURAJAAH_SCHEDULE[6].blokA} / ${MURAJAAH_SCHEDULE[6].blokB}) setara 1/2 juz lengkap (Target 1×)\n\n`;

  if (juzOptions && juzOptions.length > 0) {
    text += `📖 *Panduan Halaman Mulai per Juz (10 Halaman per Angkatan):*\n`;
    juzOptions.forEach(j => {
      const codeOnly = j.name.replace(/Juz\s*/i, '').replace(/\s*\(.*?\)/, '').trim();
      text += `• Juz ${codeOnly} : Hal ${j.start_page}${j.end_page ? ` s.d. ${j.end_page}` : ''} (Total 10 Hal)\n`;
    });
    text += `\n`;
  }

  text += `📲 *Panduan Teknis Thalibah di Web Apps:*\n`;
  text += `1. Pada pekan ini *tidak ada materi ziyadah baru*.\n`;
  text += `2. Silakan baca berulang-ulang porsi halaman hari ini hingga lancar mengalir.\n`;
  text += `3. Buka menu *Jurnal Harian* di web Tikrar, centang checklist *Selesai Murajaah* sesuai hari yang aktif (M1 s.d. M7).\n`;
  text += `4. Persiapkan hafalan dengan matang untuk menyongsong masa Ujian Akhir (Tasmi' Lisan & Ujian Tulis).\n\n`;

  text += `Semoga Allah ta'ala memudahkan lisan dan hafalan kita semua. Aamiin 🤲🤍\n\n`;
  text += `جزاكن الله خيرا وبارك الله فيكن 🌹\n\n`;
  text += `━━━━━━━━━━━━━━━━❁❁\n\n`;
  text += `𝗠𝗔𝗥𝗞𝗔𝗭 𝗧𝗜𝗞𝗥𝗔𝗥 𝗜𝗡𝗗𝗢𝗡𝗘𝗦𝗜𝗔\n\n`;
  text += `📱 *MTI OFFICIAL : 081330000784*\n`;
  text += `🪩 *Website MTI : markaztikrar.id*\n`;
  text += `🔗 *Tap Lynk : https://lynk.id/markaztikrar.id*`;

  return text.trim();
}
