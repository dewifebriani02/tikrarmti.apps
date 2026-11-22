'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Download, Check, Sparkles, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatPaidClassDate } from '@/lib/flyer-prompt';

export interface FlyerClassData {
  class_name: string;
  muallimah_name: string;
  subject_material: string;
  schedule_day: string;
  time_start: string;
  time_end: string;
  duration_info?: string;
  start_date?: string | null;
  estimated_end_date?: string | null;
  student_prerequisites?: string;
  fee_amount: number;
  max_students: number;
  facilities?: string;
  flyer_prompt_ai?: string;
  whatsapp_group_link?: string;
}

interface AutoFlyerCanvasProps {
  data: FlyerClassData;
  className?: string;
}

export function AutoFlyerCanvas({ data, className = '' }: AutoFlyerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedWA, setCopiedWA] = useState(false);
  const [isRendering, setIsRendering] = useState(true);

  const startShort = formatPaidClassDate(data.start_date, 'short');
  const endShort = formatPaidClassDate(data.estimated_end_date, 'short');

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions: 1080 x 1350 (4:5 ratio)
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient: Deep Islamic Emerald
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#022c22'); // 950
    bgGradient.addColorStop(0.4, '#064e3b'); // 900
    bgGradient.addColorStop(0.85, '#065f46'); // 800
    bgGradient.addColorStop(1, '#047857'); // 700
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle Geometric Star / Arabesque Accent
    ctx.save();
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.15)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 + 50, 260 + i * 45, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Elegant Outer Double Border
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(48, 48, width - 96, height - 96);

    // Decorative Gold Corners
    const drawCorner = (x: number, y: number, dirX: number, dirY: number) => {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, y + dirY * 30);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dirX * 30, y);
      ctx.stroke();
    };
    drawCorner(40, 40, 1, 1);
    drawCorner(width - 40, 40, -1, 1);
    drawCorner(40, height - 40, 1, -1);
    drawCorner(width - 40, height - 40, -1, -1);
    ctx.restore();

    // Header Badge: MTI
    ctx.save();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 240, 80, 480, 50, 25);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('MARKAZ TIKRAR INDONESIA', width / 2, 112);
    ctx.restore();

    // Small Tagline
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '600 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PROGRAM BIMBINGAN KHUSUS & INTENSIF', width / 2, 165);

    // Bismillah Calligraphy Placeholder or Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 24px serif';
    ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, 212);

    // Main Title Box
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(80, 245, width - 160, 200, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Class Name (Headline)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';

    const classNameText = data.class_name || 'Kelas Bimbingan Al-Quran';
    if (classNameText.length > 30) {
      const words = classNameText.split(' ');
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(' ');
      const line2 = words.slice(mid).join(' ');
      ctx.fillText(line1, width / 2, 315);
      ctx.fillText(line2, width / 2, 368);
    } else {
      ctx.fillText(classNameText, width / 2, 338);
    }

    // Subject Material Badge
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'italic 600 22px sans-serif';
    const materialLine = `Materi: ${data.subject_material || 'Tahsin & Talaqqi'}`;
    ctx.fillText(
      materialLine.length > 62 ? materialLine.slice(0, 59) + '...' : materialLine,
      width / 2,
      416
    );
    ctx.restore();

    // Pengajar / Mu'allimah Section
    ctx.save();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    ctx.beginPath();
    ctx.roundRect(140, 470, width - 280, 102, 20);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fcd34d';
    ctx.font = '600 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DIBIMBING LANGSUNG OLEH:', width / 2, 506);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`Ustadzah ${data.muallimah_name || 'Muallimah MTI'}`, width / 2, 548);
    ctx.restore();

    // Schedule & Details Grid (2 Columns)
    const cardY = 594;
    const cardH = 224;
    const cardW = 445;

    // Left Card: Jadwal, Periode & Durasi Bimbingan
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.beginPath();
    ctx.roundRect(80, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🗓️ JADWAL & PERIODE', 106, cardY + 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 23px sans-serif';
    const dayText = data.schedule_day || 'Senin & Kamis';
    ctx.fillText(dayText.length > 26 ? dayText.slice(0, 24) + '...' : dayText, 106, cardY + 78);

    ctx.fillStyle = '#fef3c7';
    ctx.font = '600 20px sans-serif';
    ctx.fillText(`Pukul ${data.time_start || '05:30'} - ${data.time_end || '06:30'} WIB`, 106, cardY + 114);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 17px sans-serif';
    const durText = data.duration_info?.trim()
      ? `Durasi: ${data.duration_info.trim()}`
      : 'Ruang Belajar: Zoom Meeting MTI';
    ctx.fillText(durText.length > 34 ? durText.slice(0, 31) + '...' : durText, 106, cardY + 152);

    if (startShort) {
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 16px sans-serif';
      const periodLabel = endShort ? `Mulai ${startShort} • Est. ${endShort}` : `Mulai: ${startShort}`;
      ctx.fillText(periodLabel.length > 36 ? periodLabel.slice(0, 33) + '...' : periodLabel, 106, cardY + 188);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '15px sans-serif';
      ctx.fillText('Live Zoom Meeting Resmi MTI', 106, cardY + 188);
    }
    ctx.restore();

    // Right Card: Kuota & Biaya SPP
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.beginPath();
    ctx.roundRect(width - 80 - cardW, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💎 INFAQ / SPP & KUOTA', width - 80 - cardW + 26, cardY + 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    const feeFormatted = Number(data.fee_amount || 0).toLocaleString('id-ID');
    ctx.fillText(`Rp ${feeFormatted}`, width - 80 - cardW + 26, cardY + 86);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`Kuota: Terbatas (${data.max_students || 10} Thalibah)`, width - 80 - cardW + 26, cardY + 132);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '16px sans-serif';
    ctx.fillText('Eksklusif & Fokus Bimbingan', width - 80 - cardW + 26, cardY + 174);
    ctx.restore();

    // Prerequisites & Facilities Sections
    const hasPrereq = Boolean(data.student_prerequisites?.trim());
    if (hasPrereq) {
      const prereqY = 836;
      ctx.save();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.beginPath();
      ctx.roundRect(80, prereqY, width - 160, 92, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fcd34d';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🎯 PRA-SYARAT THALIBAH:', 110, prereqY + 33);

      ctx.fillStyle = '#ffffff';
      ctx.font = '500 18px sans-serif';
      const prereqText = data.student_prerequisites!.trim();
      ctx.fillText(
        prereqText.length > 78 ? prereqText.slice(0, 75) + '...' : prereqText,
        110,
        prereqY + 67
      );
      ctx.restore();
    }

    const facY = hasPrereq ? 948 : 842;
    const facH = hasPrereq ? 194 : 265;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.roundRect(80, facY, width - 160, facH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fcd34d';
    ctx.font = 'bold 21px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ FASILITAS & BENEFIT KELAS', width / 2, facY + 38);

    const defaultFacs = [
      '✅ Bimbingan Interaktif Live Zoom Tatap Muka',
      '✅ Rekaman Video Setiap Sesi (Akses Kapan Saja)',
      '✅ E-Sertifikat Kelulusan Resmi Markaz Tikrar',
      '✅ Modul Pembelajaran PDF & Bahan Bacaan Lengkap',
    ];
    const userFacs = data.facilities
      ? data.facilities.split(',').map(f => `✅ ${f.trim()}`).filter(Boolean)
      : defaultFacs;

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 19px sans-serif';
    ctx.textAlign = 'left';
    const displayedFacs = userFacs.slice(0, hasPrereq ? 3 : 4);
    displayedFacs.forEach((fac, idx) => {
      ctx.fillText(fac.length > 68 ? fac.slice(0, 65) + '...' : fac, 120, facY + 80 + idx * 36);
    });
    ctx.restore();

    // Footer CTA
    const footerY = 1165;
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(140, footerY, width - 280, 72, 36);
    ctx.fill();

    ctx.fillStyle = '#064e3b';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DAFTAR SEKARANG • AMANKAN KUOTAMU!', width / 2, footerY + 45);
    ctx.restore();

    // Website Link
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '500 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pendaftaran & Informasi Resmi: markaztikrar.id | Markaz Tikrar Indonesia', width / 2, 1280);

    setIsRendering(false);
  }, [data, startShort, endShort]);

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const link = document.createElement('a');
      const safeName = (data.class_name || 'flyer-kelas-mti').toLowerCase().replace(/[^a-z0-9]/g, '-');
      link.download = `mti-flyer-${safeName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Alhamdulillah! Flyer berhasil diunduh (PNG kualitas tinggi).');
    } catch (e: any) {
      toast.error('Gagal mengunduh gambar flyer: ' + e?.message);
    }
  };

  const handleCopyAIPrompt = () => {
    const startLong = formatPaidClassDate(data.start_date, 'long');
    const endLong = formatPaidClassDate(data.estimated_end_date, 'long');
    const periodLine = startLong
      ? `\nPeriod: "Mulai ${startLong}${endLong ? ` s.d. Est. ${endLong}` : ''}"`
      : '';
    const durationLine = data.duration_info?.trim() ? `\nDuration: "${data.duration_info.trim()}"` : '';
    const prereqLine = data.student_prerequisites?.trim() ? `\nPrerequisites: "${data.student_prerequisites.trim()}"` : '';
    const promptText = data.flyer_prompt_ai || `Create a luxury Islamic course flyer poster for "Markaz Tikrar Indonesia (MTI)".
Class: "${data.class_name}"
Teacher: "Ustadzah ${data.muallimah_name}"
Material: "${data.subject_material}"
Schedule: "${data.schedule_day} | ${data.time_start} - ${data.time_end} WIB"${periodLine}${durationLine}${prereqLine}
Fee: "Rp ${Number(data.fee_amount || 0).toLocaleString('id-ID')}"
Capacity: "${data.max_students} Thalibah"
Facilities: "${data.facilities || 'Ruang Zoom MTI, E-Sertifikat, Rekaman Sesi'}"
Theme: Deep emerald green (#064e3b), elegant gold (#d97706), modern typography, Islamic geometric border.`;

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    toast.success('Prompt AI berhasil disalin! Tempelkan ke ChatGPT / DALL-E / Canva.');
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleCopyWABroadcast = () => {
    const feeFormatted = Number(data.fee_amount || 0).toLocaleString('id-ID');
    const startLong = formatPaidClassDate(data.start_date, 'long');
    const endLong = formatPaidClassDate(data.estimated_end_date, 'long');
    const periodBlock = startLong
      ? `\n📅 *Tanggal Mulai:* ${startLong}${endLong ? `\n🏁 *Estimasi Selesai:* ${endLong}` : ''}`
      : '';
    const durationBlock = data.duration_info?.trim()
      ? `\n⏳ *Durasi Program:* ${data.duration_info.trim()}`
      : '';
    const prereqBlock = data.student_prerequisites?.trim()
      ? `\n\n🎯 *Pra-Syarat Thalibah:*\n${data.student_prerequisites.trim()}`
      : '';

    const waText = `*BISMILLAHIRRAHMANIRRAHIM* 🌸✨
*MARKAZ TIKRAR INDONESIA (MTI)*
Menghadirkan Kelas Bimbingan Khusus:

📖 *${data.class_name}*
📌 *Fokus Materi:* ${data.subject_material}
🧕 *Pengampu:* Ustadzah ${data.muallimah_name}

🗓️ *Jadwal Bimbingan:* ${data.schedule_day}
⏰ *Waktu:* ${data.time_start} - ${data.time_end} WIB${periodBlock}${durationBlock}
💻 *Media:* Live Zoom Meeting MTI
👥 *Kuota Peserta:* Terbatas hanya ${data.max_students} Thalibah
💰 *Infaq / SPP:* Rp ${feeFormatted} / Thalibah${prereqBlock}

✨ *Fasilitas Kelas:*
${data.facilities ? data.facilities.split(',').map(f => `• ${f.trim()}`).join('\n') : '• Live Zoom Interaktif\n• Rekaman Video Belajar\n• E-Sertifikat Kelulusan\n• Modul Pembelajaran PDF'}

🔗 *Informasi & Pendaftaran:*
https://markaztikrar.id/pendaftaran/kelas-berbayar

_Mari bersama-sama memperindah bacaan Al-Qur'an dan menuntut ilmu yang berkah._
Barakallahu fiikunna. 🌿`;

    navigator.clipboard.writeText(waText);
    setCopiedWA(true);
    toast.success('Teks Broadcast WhatsApp berhasil disalin!');
    setTimeout(() => setCopiedWA(false), 2500);
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Canvas Wrapper */}
      <div className="relative w-full max-w-[420px] rounded-2xl overflow-hidden shadow-2xl border-4 border-emerald-900/40 bg-emerald-950 aspect-[4/5] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />
        {isRendering && (
          <div className="absolute inset-0 bg-emerald-950/80 flex items-center justify-center text-white text-sm font-semibold">
            <Sparkles className="w-5 h-5 animate-spin mr-2 text-amber-400" />
            Merender Auto-Flyer MTI...
          </div>
        )}
      </div>

      {/* Action Buttons Toolbar */}
      <div className="w-full max-w-[420px] grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={handleDownloadPNG}
          type="button"
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
          title="Unduh file gambar flyer PNG"
        >
          <Download className="w-4 h-4 text-emerald-200" />
          <span>Unduh PNG</span>
        </button>

        <button
          onClick={handleCopyAIPrompt}
          type="button"
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
          title="Salin Prompt untuk ChatGPT / DALL-E / Canva"
        >
          {copiedPrompt ? <Check className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4 text-amber-200" />}
          <span>{copiedPrompt ? 'Tersalin!' : 'Prompt AI'}</span>
        </button>

        <button
          onClick={handleCopyWABroadcast}
          type="button"
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
          title="Salin format pengumuman untuk WhatsApp"
        >
          {copiedWA ? <Check className="w-4 h-4 text-teal-300" /> : <MessageCircle className="w-4 h-4 text-teal-200" />}
          <span>{copiedWA ? 'Tersalin!' : 'Format WA'}</span>
        </button>
      </div>
    </div>
  );
}
