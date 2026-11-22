export function calculateEstimatedEndDate(
  startDate?: string | null,
  durationInfo?: string | null
): string {
  if (!startDate) return '';
  const cleanDate = startDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return '';

  const dur = (durationInfo || '').trim();
  if (!dur || /berkelanjutan/i.test(dur)) return '';

  const [y, m, d] = cleanDate.split('-').map(Number);

  const weekMatch = dur.match(/(\d+)\s*(?:pekan|minggu)/i);
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1], 10);
    if (weeks > 0) {
      const end = new Date(Date.UTC(y, m - 1, d + weeks * 7 - 1));
      return end.toISOString().slice(0, 10);
    }
  }

  const monthMatch = dur.match(/(\d+)\s*bulan/i);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    if (months > 0) {
      const end = new Date(Date.UTC(y, m - 1 + months, d - 1));
      return end.toISOString().slice(0, 10);
    }
  }

  const dayMatch = dur.match(/(\d+)\s*hari/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    if (days > 0) {
      const end = new Date(Date.UTC(y, m - 1, d + Math.max(0, days - 1)));
      return end.toISOString().slice(0, 10);
    }
  }

  return '';
}

export function formatPaidClassDate(
  dateStr?: string | null,
  style: 'short' | 'long' = 'short'
): string {
  if (!dateStr) return '';
  const clean = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return String(dateStr);

  try {
    const [y, m, d] = clean.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    if (style === 'long') {
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      }).format(dt);
    }
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(dt);
  } catch {
    return clean;
  }
}

export function generateFlyerAIPrompt(data: {
  class_name: string;
  muallimah_name: string;
  subject_material: string;
  schedule_day: string;
  time_start: string;
  time_end: string;
  duration_info?: string | null;
  start_date?: string | null;
  estimated_end_date?: string | null;
  student_prerequisites?: string | null;
  fee_amount: number;
  max_students: number;
  facilities?: string;
}): string {
  const startFormatted = formatPaidClassDate(data.start_date, 'long');
  const endFormatted = formatPaidClassDate(data.estimated_end_date, 'long');
  const periodLine = startFormatted
    ? `\n- Periode Kelas: "Mulai ${startFormatted}${endFormatted ? ` s.d. Est. ${endFormatted}` : ''}"`
    : '';
  const durationLine = data.duration_info
    ? `\n- Durasi Program: "${data.duration_info}"`
    : '';
  const prereqLine = data.student_prerequisites
    ? `\n- Pra-Syarat Peserta: "${data.student_prerequisites}"`
    : '';

  return `Create an elegant, premium, modern Islamic course flyer poster for "Markaz Tikrar Indonesia (MTI)".
Aspect ratio: 4:5 portrait (Instagram feed / WhatsApp story / Canva design).
Theme & Aesthetic: Deep emerald green (#064e3b), warm gold accents (#d97706, #fef3c7), and pure white typography with subtle geometric Islamic arabesque background textures.

Key Typography & Hierarchy:
- Top Badge: "MARKAZ TIKRAR INDONESIA (MTI) • KELAS BERBAYAR RESMI"
- Headline: "${data.class_name}"
- Focus Material: "${data.subject_material}"
- Pengampu / Mu'allimah: "Bersama: Ustadzah ${data.muallimah_name}"
- Jadwal Bimbingan: "${data.schedule_day} • ${data.time_start} - ${data.time_end} WIB"${periodLine}${durationLine}${prereqLine}
- Kuota Peserta: "Eksklusif & Terbatas (${data.max_students} Thalibah)"
- Investasi Belajar: "Rp ${Number(data.fee_amount).toLocaleString('id-ID')}"
- Fasilitas: "${data.facilities || 'Ruang Zoom MTI, E-Sertifikat, Rekaman Kelas, Pendampingan Musyrifah'}"
- Call To Action: "Pendaftaran & Informasi Resmi: markaztikrar.id"

Style Guidelines: High readability, modern editorial layout, luxury Islamic branding, harmonious color harmony, vector elements, elegant Arabic motif border.`;
}
