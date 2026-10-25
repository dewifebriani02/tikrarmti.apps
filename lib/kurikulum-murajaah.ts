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
  desc: string;
}

export const MURAJAAH_SCHEDULE: MurajaahScheduleItem[] = [
  { day: 'Senin', code: 'M1', range: [1, 3], parts: ['A', 'B'], target: '4×', desc: 'Blok 1 s.d. 3 (Bagian A - B)' },
  { day: 'Selasa', code: 'M2', range: [3, 5], parts: ['C', 'D'], target: '4×', desc: 'Blok 3 s.d. 5 (Bagian C - D)' },
  { day: 'Rabu', code: 'M3', range: [1, 5], parts: ['A', 'D'], target: '2×', desc: 'Blok 1 s.d. 5 (Bagian A - D)' },
  { day: 'Kamis', code: 'M4', range: [6, 8], parts: ['A', 'B'], target: '4×', desc: 'Blok 6 s.d. 8 (Bagian A - B)' },
  { day: 'Jumat', code: 'M5', range: [8, 10], parts: ['C', 'D'], target: '4×', desc: 'Blok 8 s.d. 10 (Bagian C - D)' },
  { day: 'Sabtu', code: 'M6', range: [6, 10], parts: ['A', 'D'], target: '2×', desc: 'Blok 6 s.d. 10 (Bagian A - D)' },
  { day: 'Ahad', code: 'M7', range: [1, 10], parts: ['A', 'D'], target: '1×', desc: 'Blok 1 s.d. 10 (Setara 1 Juz Utuh)' },
];

export interface JuzOptionLike {
  id?: string;
  name: string;
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
  text += `📖 *Porsi Hafalan:* ${item.desc}\n`;
  text += `🔁 *Target Pengulangan:* Minimal ${item.target} bacaan lancar\n\n`;

  text += `📋 *Panduan Muroja'ah Hari Ini:*\n`;
  text += `1. Membaca & mengulang porsi target hari ini sebanyak ${item.target} hingga lancar mengalir tanpa kendala.\n`;
  text += `2. Saling simak bersama pasangan tikrar atau cek kelancaran mandiri via Tarteel AI.\n`;
  text += `3. Catat di menu Jurnal Harian web Tikrar: centang target *Selesai Murajaah (${item.code})* lalu kirim jurnal.\n\n`;

  if (juzOptions && juzOptions.length > 0) {
    text += `📌 *Perkiraan Halaman per Juz (Porsi ${item.code}):*\n`;
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
  text += `Alhamdulillah, kita telah menyelesaikan 10 pekan penambahan hafalan (ziyadah). Mulai pekan ini, kita resmi memasuki *PEKAN MURAJA'AH (Pekan ke-11)* untuk memutqinkan seluruh hafalan sebelum pelaksanaan Ujian Akhir.\n\n`;

  text += `🗓️ *JADWAL KURIKULUM MURAJA'AH SEPEKAN (M1 – M7):*\n`;
  MURAJAAH_SCHEDULE.forEach(m => {
    text += `• 🔹 *${m.day} (${m.code})* : ${m.desc} ➡️ *Target ${m.target}*\n`;
  });
  text += `\n`;

  if (juzOptions && juzOptions.length > 0) {
    text += `📖 *Panduan Halaman Mulai per Juz:*\n`;
    juzOptions.forEach(j => {
      const codeOnly = j.name.replace(/Juz\s*/i, '').replace(/\s*\(.*?\)/, '').trim();
      text += `• Juz ${codeOnly} mulai dari hal ${j.start_page}${j.end_page ? ` s.d. ${j.end_page}` : ''}\n`;
    });
    text += `\n`;
  }

  text += `📲 *Panduan Teknis Thalibah:*\n`;
  text += `1. Pada pekan ini *tidak ada materi ziyadah baru*.\n`;
  text += `2. Silakan baca berulang-ulang porsi halaman hari ini hingga lancar mengalir.\n`;
  text += `3. Jangan lupa mengisi checklist *Selesai Murajaah* di menu *Jurnal Harian* web Tikrar setiap harinya.\n`;
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
