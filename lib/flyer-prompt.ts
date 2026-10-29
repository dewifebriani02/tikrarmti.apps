export function generateFlyerAIPrompt(data: {
  class_name: string;
  muallimah_name: string;
  subject_material: string;
  schedule_day: string;
  time_start: string;
  time_end: string;
  fee_amount: number;
  max_students: number;
  facilities?: string;
}): string {
  return `Create an elegant, premium, modern Islamic course flyer poster for "Markaz Tikrar Indonesia (MTI)".
Aspect ratio: 4:5 portrait (Instagram feed / WhatsApp story / Canva design).
Theme & Aesthetic: Deep emerald green (#064e3b), warm gold accents (#d97706, #fef3c7), and pure white typography with subtle geometric Islamic arabesque background textures.

Key Typography & Hierarchy:
- Top Badge: "MARKAZ TIKRAR INDONESIA (MTI) • KELAS BERBAYAR RESMI"
- Headline: "${data.class_name}"
- Focus Material: "${data.subject_material}"
- Pengampu / Mu'allimah: "Bersama: Ustadzah ${data.muallimah_name}"
- Jadwal Bimbingan: "${data.schedule_day} • ${data.time_start} - ${data.time_end} WIB"
- Kuota Peserta: "Eksklusif & Terbatas (${data.max_students} Thalibah)"
- Investasi Belajar: "Rp ${Number(data.fee_amount).toLocaleString('id-ID')}"
- Fasilitas: "${data.facilities || 'Ruang Zoom MTI, E-Sertifikat, Rekaman Kelas, Pendampingan Musyrifah'}"
- Call To Action: "Pendaftaran & Informasi Resmi: markaztikrar.id"

Style Guidelines: High readability, modern editorial layout, luxury Islamic branding, harmonious color harmony, vector elements, elegant Arabic motif border.`;
}
