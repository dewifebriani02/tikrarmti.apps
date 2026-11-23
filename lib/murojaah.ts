/**
 * Murojaah 40X Types, Constants, and Helper Utilities
 * Markaz Tikrar Indonesia (MTI)
 */

export interface MurojaahTimeSlot {
  id: string;
  label: string;
  period: string;
}

export const MUROJAAH_TIME_SLOTS: MurojaahTimeSlot[] = [
  { id: "04-06", label: "04.00 - 06.00 WIB", period: "Ba'da Subuh" },
  { id: "06-09", label: "06.00 - 09.00 WIB", period: "Pagi Dhuha" },
  { id: "09-12", label: "09.00 - 12.00 WIB", period: "Siang Jelang Dzuhur" },
  { id: "12-15", label: "12.00 - 15.00 WIB", period: "Ba'da Dzuhur" },
  { id: "15-18", label: "15.00 - 18.00 WIB", period: "Ba'da Ashar" },
  { id: "18-21", label: "18.00 - 21.00 WIB", period: "Ba'da Maghrib & Isya" },
  { id: "21-24", label: "21.00 - 24.00 WIB", period: "Malam" },
];

export const MUROJAAH_INFAQ_TIERS = [
  { amount: 25000, label: "Rp 25.000", desc: "Infaq komitmen 20 hari" },
  { amount: 50000, label: "Rp 50.000", desc: "Infaq komitmen berkah" },
  { amount: 75000, label: "Rp 75.000", desc: "Infaq komitmen + sedekah operasional" },
  { amount: 100000, label: "Rp 100.000", desc: "Infaq komitmen + beasiswa dhuafa" },
];

export const MTI_OFFICIAL_BANK = {
  bankName: "Bank Syariah Indonesia (BSI)",
  accountNumber: "7345608197",
  accountHolder: "Mara Martalena / Markaz Tikrar",
};

export function getTimeSlotLabel(slotId: string | null | undefined): string {
  if (!slotId) return "-";
  const match = MUROJAAH_TIME_SLOTS.find(s => s.id === slotId);
  return match ? `${match.label} (${match.period})` : slotId;
}

/**
 * Get date string formatted as YYYY-MM-DD in Indonesia Western Time (WIB / UTC+7)
 */
export function getWibDateString(date: Date | string = new Date()): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
  return new Date(wibMs).toISOString().split('T')[0];
}

export function buildMurojaahWhatsAppInvite(params: {
  senderName: string;
  partnerName: string;
  juzCode: string;
  timeSlotLabel: string;
}): string {
  const { senderName, partnerName, juzCode, timeSlotLabel } = params;
  return `Assalamu'alaikum warahmatullah wabarakaatuh Ukhti ${partnerName}...\n\nPerkenalkan saya *${senderName}* di komunitas Murojaah 40x MTI untuk porsi *Juz ${juzCode}*.\n\nSaya melihat jadwal Ukhti di direktori MTI sama-sama di slot *${timeSlotLabel}*. Apakah Ukhti berkenan untuk saling simak putaran murojaah kita hari ini via WA Call / Zoom?\n\nJazakillahu khayran wa baarakallahu fiiki. 🌸`;
}

export function buildMurojaahSelfReminder(params: {
  userName: string;
  juzCode: string;
  currentRound: number;
  daysRemaining: number;
}): string {
  const { userName, juzCode, currentRound, daysRemaining } = params;
  return `Bismillah... Pengingat Murojaah 40x MTI untuk Ukhti ${userName}:\nTarget: Juz ${juzCode}\nProgress Saat Ini: Putaran ke-${currentRound} / 40\nSisa Waktu Tantangan: ${daysRemaining} hari lagi.\n\n"Sesungguhnya Al-Qur'an itu lebih cepat lepasnya daripada unta dari ikatannya." (HR. Bukhari & Muslim)\nSemoga Allah mudahkan dan berkahi lisan kita senantiasa membasahi ayat-ayat-Nya. 🌿`;
}

export interface MurojaahDebtCalculation {
  todayCount: number;
  todayTarget: number;
  todayRemaining: number;
  daysElapsed: number;
  expectedCumulativeUntilYesterday: number;
  completedUntilYesterday: number;
  previousDebt: number;
  totalDebt: number;
  isTodayTargetMet: boolean;
  isDebtFree: boolean;
}

export function calculateMurojaahDebt(params: {
  startedAt: string | Date;
  totalCompleted: number;
  todayLogsCount?: number;
}): MurojaahDebtCalculation {
  const { startedAt, totalCompleted, todayLogsCount = 0 } = params;

  const todayTarget = 2;

  // If user completed 40+ rounds, target is fully met
  if (totalCompleted >= 40) {
    return {
      todayCount: todayTarget,
      todayTarget,
      todayRemaining: 0,
      daysElapsed: 20,
      expectedCumulativeUntilYesterday: 40,
      completedUntilYesterday: 40,
      previousDebt: 0,
      totalDebt: 0,
      isTodayTargetMet: true,
      isDebtFree: true,
    };
  }

  const startDayStr = getWibDateString(startedAt);
  const todayStr = getWibDateString(new Date());

  const startMs = new Date(startDayStr + 'T00:00:00Z').getTime();
  const todayMs = new Date(todayStr + 'T00:00:00Z').getTime();
  const diffDays = Math.max(0, Math.round((todayMs - startMs) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.min(20, Math.max(1, diffDays + 1));

  // Expected cumulative target by yesterday and today
  const expectedCumulativeUntilYesterday = Math.max(0, (daysElapsed - 1) * todayTarget);
  const cumulativeTargetToday = Math.min(40, daysElapsed * todayTarget);

  // Total debt across the entire challenge up to today
  // Every single round submitted reduces total debt immediately
  const totalDebt = Math.max(0, cumulativeTargetToday - Math.max(0, totalCompleted));

  // Debt from previous days (days before today).
  // If user completed rounds that cover yesterday's target, previousDebt is 0.
  // When a user has debt and submits a round, it pays off previous debt first!
  const previousDebt = Math.max(0, expectedCumulativeUntilYesterday - Math.max(0, totalCompleted));

  // Today's count represents rounds completed within today's target quota (after clearing previous debt)
  const todayCount = Math.min(todayTarget, Math.max(0, totalCompleted - expectedCumulativeUntilYesterday));
  const todayRemaining = Math.max(0, todayTarget - todayCount);

  const completedUntilYesterday = Math.min(expectedCumulativeUntilYesterday, Math.max(0, totalCompleted));

  return {
    todayCount,
    todayTarget,
    todayRemaining,
    daysElapsed,
    expectedCumulativeUntilYesterday,
    completedUntilYesterday,
    previousDebt,
    totalDebt,
    isTodayTargetMet: todayCount >= todayTarget,
    isDebtFree: totalDebt === 0,
  };
}

export function buildMurojaahAfternoonReminder(params: {
  userName: string;
  juzCode: string;
  todayCount: number;
  todayRemaining: number;
  previousDebt: number;
  totalDebt: number;
  currentRound: number;
  daysRemaining: number;
}): string {
  const {
    userName,
    juzCode,
    todayCount,
    todayRemaining,
    previousDebt,
    totalDebt,
    currentRound,
    daysRemaining,
  } = params;

  return [
    `Assalamu'alaikum Warahmatullahi Wabarakatuh Ukhti *${userName}* 🌸`,
    ``,
    `*Pengingat Sore Murojaah 40x MTI (Juz ${juzCode})*`,
    ``,
    `Waktu sore menjelang maghrib adalah momen terbaik menuntaskan target tilawah harian Ukhti:`,
    `• Target Hari Ini: *${todayCount} / 2 Putaran* (Sisa: *${todayRemaining} putaran*)`,
    `• Hutang Hari-hari Sebelumnya: *${previousDebt} putaran*`,
    `• *TOTAL HUTANG PUTARAN: ${totalDebt} putaran*`,
    ``,
    `📊 Akumulasi Saat Ini: *${currentRound} / 40 Putaran*`,
    `⏳ Sisa Waktu Tantangan Warrior: *${daysRemaining} hari lagi*`,
    ``,
    `Mari manfaatkan waktu sore ini untuk saling simak atau murojaah mandiri agar hafalan semakin mutqin dan hutang putaran tidak menumpuk. Semangat lillah! 💪🌿`,
    ``,
    `🔗 Buka lembar murojaah Ukhti di: https://markaztikrar.id/murojaah`,
    ``,
    `━━━━━━━━━━━━━━━`,
    `💡 *Opsi Pengingat:* Jika Ukhti ingin menonaktifkan pengingat sore WhatsApp ini, Ukhti dapat mematikannya melalui menu Muraja'ah 40x di aplikasi MTI (https://markaztikrar.id/murojaah) atau membalas pesan ini dengan *STOP*.`,
  ].join("\n");
}
