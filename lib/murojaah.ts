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

export function buildMurojaahWhatsAppInvite(params: {
  senderName: string;
  partnerName: string;
  juzCode: string;
  timeSlotLabel: string;
}): string {
  const { senderName, partnerName, juzCode, timeSlotLabel } = params;
  return `Assalamu'alaikum warahmatullah wabarakaatuh Ukhti ${partnerName}...

Perkenalkan saya *${senderName}* di komunitas Murojaah 40x MTI untuk porsi *Juz ${juzCode}*.

Saya melihat jadwal Ukhti di direktori MTI sama-sama di slot *${timeSlotLabel}*. Apakah Ukhti berkenan untuk saling simak putaran murojaah kita hari ini via WA Call / Zoom?

Jazakillahu khayran wa baarakallahu fiiki. 🌸`;
}

export function buildMurojaahSelfReminder(params: {
  userName: string;
  juzCode: string;
  currentRound: number;
  daysRemaining: number;
}): string {
  const { userName, juzCode, currentRound, daysRemaining } = params;
  return `Bismillah... Pengingat Murojaah 40x MTI untuk Ukhti ${userName}:
Target: Juz ${juzCode}
Progress Saat Ini: Putaran ke-${currentRound} / 40
Sisa Waktu Tantangan: ${daysRemaining} hari lagi.

"Sesungguhnya Al-Qur'an itu lebih cepat lepasnya daripada unta dari ikatannya." (HR. Bukhari & Muslim)
Semoga Allah mudahkan dan berkahi lisan kita senantiasa membasahi ayat-ayat-Nya. 🌿`;
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
  todayLogsCount: number;
}): MurojaahDebtCalculation {
  const { startedAt, totalCompleted, todayLogsCount } = params;

  const todayTarget = 2;
  const todayCount = Math.max(0, todayLogsCount);
  const todayRemaining = Math.max(0, todayTarget - todayCount);

  // If user hasn't completed any round yet, they have zero previous debt
  if (!totalCompleted || totalCompleted <= 0) {
    return {
      todayCount,
      todayTarget,
      todayRemaining,
      daysElapsed: 1,
      expectedCumulativeUntilYesterday: 0,
      completedUntilYesterday: 0,
      previousDebt: 0,
      totalDebt: todayRemaining,
      isTodayTargetMet: todayCount >= todayTarget,
      isDebtFree: todayRemaining === 0,
    };
  }
  
  // Calculate date difference using WIB (UTC+7)
  const toWibDate = (d: string | Date) => {
    const dateObj = new Date(d);
    const wibMs = dateObj.getTime() + 7 * 60 * 60 * 1000;
    const wibDate = new Date(wibMs);
    return wibDate.toISOString().split('T')[0];
  };

  const startDayStr = toWibDate(startedAt);
  const todayStr = toWibDate(new Date());

  const startMs = new Date(startDayStr).getTime();
  const todayMs = new Date(todayStr).getTime();
  const diffDays = Math.max(0, Math.round((todayMs - startMs) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.min(20, Math.max(1, diffDays + 1));

  const expectedCumulativeUntilYesterday = Math.max(0, (daysElapsed - 1) * 2);
  const completedUntilYesterday = Math.max(0, totalCompleted - todayCount);
  const previousDebt = Math.max(0, expectedCumulativeUntilYesterday - completedUntilYesterday);
  const totalDebt = previousDebt + todayRemaining;

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
    `━━━━━━━━━━━━━━`,
    `💡 *Opsi Pengingat:* Jika Ukhti ingin menonaktifkan pengingat sore WhatsApp ini, Ukhti dapat mematikannya melalui menu Muraja'ah 40x di aplikasi MTI (https://markaztikrar.id/murojaah) atau membalas pesan ini dengan *STOP*.`,
  ].join("\n");
}
