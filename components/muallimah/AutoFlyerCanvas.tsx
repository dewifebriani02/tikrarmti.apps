'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Download, Copy, Check, Sparkles, MessageCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';

export interface FlyerClassData {
  class_name: string;
  muallimah_name: string;
  subject_material: string;
  schedule_day: string;
  time_start: string;
  time_end: string;
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
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.15)'; // warm gold low opacity
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 + 50, 260 + i * 45, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Elegant Outer Double Border
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)'; // gold border
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
    ctx.roundRect(width / 2 - 240, 85, 480, 52, 26);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('MARKAZ TIKRAR INDONESIA', width / 2, 118);
    ctx.restore();

    // Small Tagline
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '600 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PROGRAM BIMBINGAN KHUSUS & INTENSIF', width / 2, 175);

    // Bismillah Calligraphy Placeholder or Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 24px serif';
    ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, 225);

    // Main Title Box
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(80, 270, width - 160, 220, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Class Name (Headline)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';

    const classNameText = data.class_name || 'Kelas Bimbingan Al-Quran';
    // Multi-line wrap if too long
    if (classNameText.length > 30) {
      const words = classNameText.split(' ');
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(' ');
      const line2 = words.slice(mid).join(' ');
      ctx.fillText(line1, width / 2, 345);
      ctx.fillText(line2, width / 2, 400);
    } else {
      ctx.fillText(classNameText, width / 2, 365);
    }

    // Subject Material Badge
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'italic 600 24px sans-serif';
    ctx.fillText(`Materi: ${data.subject_material || 'Tahsin & Talaqqi'}`, width / 2, 445);
    ctx.restore();

    // Pengajar / Mu'allimah Section
    ctx.save();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    ctx.beginPath();
    ctx.roundRect(140, 520, width - 280, 110, 20);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fcd34d';
    ctx.font = '600 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DIBIMBING LANGSUNG OLEH:', width / 2, 560);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`Ustadzah ${data.muallimah_name || 'Muallimah MTI'}`, width / 2, 605);
    ctx.restore();

    // Schedule & Details Grid (2 Columns)
    const cardY = 660;
    const cardH = 210;
    const cardW = 430;

    // Left Card: Jadwal Bimbingan
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.beginPath();
    ctx.roundRect(80, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🗓️ JADWAL BELAJAR', 110, cardY + 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(data.schedule_day || 'Senin & Kamis', 110, cardY + 95);

    ctx.fillStyle = '#fef3c7';
    ctx.font = '600 24px sans-serif';
    ctx.fillText(`Pukul ${data.time_start || '05:30'} - ${data.time_end || '06:30'} WIB`, 110, cardY + 140);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '16px sans-serif';
    ctx.fillText('Ruang Belajar: Zoom Meeting MTI', 110, cardY + 180);
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
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💎 INFAQ / SPP & KUOTA', width - 80 - cardW + 30, cardY + 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    const feeFormatted = Number(data.fee_amount || 0).toLocaleString('id-ID');
    ctx.fillText(`Rp ${feeFormatted}`, width - 80 - cardW + 30, cardY + 95);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`Kuota: Terbatas (${data.max_students || 10} Thalibah)`, width - 80 - cardW + 30, cardY + 140);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '16px sans-serif';
    ctx.fillText('Eksklusif & Fokus Bimbingan', width - 80 - cardW + 30, cardY + 180);
    ctx.restore();

    // Facilities Section
    const facY = 900;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.roundRect(80, facY, width - 160, 230, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fcd34d';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ FASILITAS & BENEFIT KELAS', width / 2, facY + 40);

    const defaultFacs = [
      '✅ Bimbingan Interaktif Live Zoom Tatap Muka',
      '✅ Rekaman Video Setiap Sesi (Akses Kapan Saja)',
      '✅ E-Sertifikat Kelulusan Resmi Markaz Tikrar',
      '✅ Modul Pembelajaran PDF & Bahan Bacaan Lengkap',
      '✅ Grup Pendampingan WhatsApp Bersama Mu\'allimah'
    ];
    const userFacs = data.facilities
      ? data.facilities.split(',').map(f => `✅ ${f.trim()}`).filter(Boolean)
      : defaultFacs;

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 20px sans-serif';
    ctx.textAlign = 'left';
    const displayedFacs = userFacs.slice(0, 4);
    displayedFacs.forEach((fac, idx) => {
      ctx.fillText(fac, 120, facY + 85 + idx * 36);
    });
    ctx.restore();

    // Footer CTA
    const footerY = 1160;
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(140, footerY, width - 280, 75, 38);
    ctx.fill();

    ctx.fillStyle = '#064e3b';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DAFTAR SEKARANG • AMANKAN KUOTAMU!', width / 2, footerY + 47);
    ctx.restore();

    // Website Link
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '500 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pendaftaran & Informasi Resmi: markaztikrar.id | Markaz Tikrar Indonesia', width / 2, 1280);

    setIsRendering(false);
  }, [data]);

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
    const promptText = data.flyer_prompt_ai || `Create a luxury Islamic course flyer poster for "Markaz Tikrar Indonesia (MTI)".
Class: "${data.class_name}"
Teacher: "Ustadzah ${data.muallimah_name}"
Material: "${data.subject_material}"
Schedule: "${data.schedule_day} | ${data.time_start} - ${data.time_end} WIB"
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
    const waText = `*BISMILLAHIRRAHMANIRRAHIM* 🌸✨
*MARKAZ TIKRAR INDONESIA (MTI)*
Menghadirkan Kelas Bimbingan Khusus:

📖 *${data.class_name}*
📌 *Fokus Materi:* ${data.subject_material}
🧕 *Pengampu:* Ustadzah ${data.muallimah_name}

🗓️ *Jadwal Bimbingan:* ${data.schedule_day}
⏰ *Waktu:* ${data.time_start} - ${data.time_end} WIB
💻 *Media:* Live Zoom Meeting MTI
👥 *Kuota Peserta:* Terbatas hanya ${data.max_students} Thalibah
💰 *Infaq / SPP:* Rp ${feeFormatted} / Thalibah

✨ *Fasilitas Kelas:*
${data.facilities ? data.facilities.split(',').map(f => `• ${f.trim()}`).join('\n') : '• Live Zoom Interaktif\n• Rekaman Video Belajar\n• E-Sertifikat Kelulusan\n• Modul Pembelajaran PDF'}

🔗 *Informasi & Pendaftaran:*
https://markaztikrar.id

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
