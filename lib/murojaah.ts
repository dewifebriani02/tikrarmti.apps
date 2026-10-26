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
  { id: '04-06', label: '04.00 - 06.00 WIB', period: "Ba'da Subuh" },
  { id: '06-09', label: '06.00 - 09.00 WIB', period: 'Pagi Dhuha' },
  { id: '09-12', label: '09.00 - 12.00 WIB', period: 'Siang Jelang Dzuhur' },
  { id: '12-15', label: '12.00 - 15.00 WIB', period: "Ba'da Dzuhur" },
  { id: '15-18', label: '15.00 - 18.00 WIB', period: "Ba'da Ashar" },
  { id: '18-21', label: '18.00 - 21.00 WIB', period: "Ba'da Maghrib & Isya" },
  { id: '21-24', label: '21.00 - 24.00 WIB', period: 'Malam' },
];

export const MUROJAAH_INFAQ_TIERS = [
  { amount: 25000, label: 'Rp 25.000', desc: 'Infaq komitmen 20 hari' },
  { amount: 50000, label: 'Rp 50.000', desc: 'Infaq komitmen berkah' },
  { amount: 75000, label: 'Rp 75.000', desc: 'Infaq komitmen + sedekah operasional' },
  { amount: 100000, label: 'Rp 100.000', desc: 'Infaq komitmen + beasiswa dhuafa' },
];

export const MTI_OFFICIAL_BANK = {
  bankName: 'Bank Syariah Indonesia (BSI)',
  accountNumber: '7345608197',
  accountHolder: 'Mara Martalena / Markaz Tikrar',
};

export function getTimeSlotLabel(slotId: string | null | undefined): string {
  if (!slotId) return '-';
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
