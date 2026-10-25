'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useActiveBatch } from '@/hooks/useBatches';
import { 
  Award, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  HelpCircle,
  ArrowRight,
  BookOpen,
  RotateCcw,
  GraduationCap,
  FileCheck2,
  Download,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MyCertificate {
  id: string;
  certificate_number: string;
  user_id: string;
  batch_id: string;
  juz_number: string;
  predicate: string;
  issue_date: string;
  hijri_date: string;
  pdf_url: string;
  qr_code_url: string;
  status: string;
  batch_name: string;
  student_name: string;
  student_nit: string;
  created_at: string;
}

export default function KelulusanSertifikatPage() {
  const { user } = useAuth();
  const { activeBatch } = useActiveBatch();

  const [certificates, setCertificates] = useState<MyCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  useEffect(() => {
    async function loadMyCertificates() {
      try {
        setLoading(true);
        const res = await fetch('/api/certificates/my');
        const data = await res.json();
        if (data.success && Array.isArray(data.certificates)) {
          setCertificates(data.certificates);
          if (data.certificates.length > 0) {
            setSelectedPreview(data.certificates[0].pdf_url);
          }
        }
      } catch (err) {
        console.error('Failed to load certificates:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMyCertificates();
  }, []);

  const graduationCriteria = [
    {
      step: '1',
      title: 'Presensi & Tashih Bacaan (≥ 80%)',
      desc: 'Hadir aktif di kelas utama/sit-in dan menuntaskan setoran tashih bersama Mu\'allimah.'
    },
    {
      step: '2',
      title: 'Tuntas Jurnal Harian 40 Blok',
      desc: 'Melengkapi seluruh 9 indikator jurnal harian dari blok pertama hingga tuntas 1/2 juz.'
    },
    {
      step: '3',
      title: 'Kelulusan Ujian Akhir Juz',
      desc: 'Lulus evaluasi ujian akhir hafalan dengan predikat Mumtaz atau Jayyid Jiddan.'
    },
    {
      step: '4',
      title: 'Tuntas Muraja\'ah 40x Putaran',
      desc: 'Menyelesaikan 40 kali pengulangan 1/2 juz di ruang Muraja\'ah sebagai syarat syahadah & naik juz.'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-fadeInUp pb-24 font-sans">
      {/* 1. Header Halaman */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Kelulusan & Syahadah
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h1>
            <p className="text-gray-700 text-xs font-bold uppercase tracking-wider mt-1">
              {activeBatch?.name || 'Tikrar Tahfidz Markaz Tikrar Indonesia'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-2xl shadow-xs">
            <Award className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-black uppercase tracking-wider">
              Syahadah Resmi
            </span>
          </div>
        </div>

        {/* 2. Hero Status Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-900 p-5 sm:p-6 text-white shadow-xl border border-white/10">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                <Award className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Penerbitan Syahadah Santriwati
                </h2>
                <p className="text-emerald-100/80 text-xs font-medium">
                  Dokumen legalitas kelulusan resmi dengan sistem verifikasi QR Code terpadu.
                </p>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 text-emerald-100 px-3 py-1 rounded-full border border-white/10">
                Terakreditasi MTI
              </span>
            </div>
          </div>

          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>

      {/* 3. Section Syahadah yang Sudah Terbit (Jika Ada) */}
      {loading ? (
        <Card className="rounded-2xl border-gray-100 p-8 text-center text-xs text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
          Memeriksa status penerbitan syahadah...
        </Card>
      ) : certificates.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              Syahadah Resmi Milik Ukhti ({certificates.length})
            </h3>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Status: Terbit & Terdaftar
            </span>
          </div>

          {certificates.map((cert) => (
            <Card key={cert.id} className="rounded-3xl border-2 border-emerald-100/90 shadow-md overflow-hidden bg-white">
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-800 text-white px-2 py-0.5 rounded-md">
                      {cert.juz_number || 'Juz 30'}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-950">
                      {cert.certificate_number}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-gray-900">
                    Syahadah Tahfidz Al-Qur'an ({cert.predicate || 'Mumtaz'})
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Diterbitkan pada {cert.issue_date} {cert.hijri_date ? `(${cert.hijri_date})` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={cert.pdf_url}
                    download
                    className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh PDF</span>
                  </a>
                  <a
                    href={`/verify/${cert.certificate_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-semibold py-2.5 px-3 rounded-xl transition-all"
                    title="Cek Laman Verifikasi Publik"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Verifikasi</span>
                  </a>
                </div>
              </div>

              {/* PDF Preview Frame */}
              <div className="p-4 bg-slate-50/70 border-b border-gray-100">
                <div className="relative w-full aspect-[1.414/1] max-h-[380px] bg-slate-200 rounded-2xl overflow-hidden shadow-inner border border-gray-200">
                  <iframe
                    src={`${cert.pdf_url}#toolbar=0&navpanes=0`}
                    className="w-full h-full border-0"
                    title={`Syahadah ${cert.certificate_number}`}
                  />
                </div>
                <p className="text-[11px] text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Dilengkapi stempel digital QR Code resmi yang terhubung langsung ke basis data MTI.
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Status Belum Ada Sertifikat */
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950">
              Syahadah Belum Diterbitkan
            </h4>
            <p className="text-[11px] text-amber-900/80 leading-relaxed mt-0.5">
              Syahadah digital resmi akan diterbitkan oleh pihak Markaz Tikrar Indonesia setelah Ukhti menuntaskan seluruh 4 pilar kriteria kelulusan program di bawah ini.
            </p>
          </div>
        </div>
      )}

      {/* 4. Banner Edukasi Alur Kelulusan */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Info className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-900 leading-tight">
              4 Pilar Syarat Penerbitan Syahadah
            </p>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              Diterbitkan secara digital dengan QR Code verifikasi resmi setelah seluruh pilar tuntas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-lg border border-emerald-200">
            Terstandarisasi MTI
          </span>
        </div>
      </div>

      {/* 5. Kartu 4 Pilar Kelulusan */}
      <Card className="rounded-3xl border border-gray-100 shadow-xs p-5 sm:p-6 bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Kriteria Kelulusan Wisudawati
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Pastikan seluruh kewajiban pembelajaran berikut terpenuhi:
            </p>
          </div>
          <span className="text-[10px] font-bold bg-green-50 text-green-800 border border-green-200 px-2.5 py-1 rounded-full">
            4 Pilar Utama
          </span>
        </div>

        <div className="space-y-3">
          {graduationCriteria.map((item) => (
            <div key={item.step} className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100">
              <div className="w-7 h-7 rounded-xl bg-green-100 text-green-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <Link href="/murojaah" className="flex-1">
            <Button className="w-full bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold py-2.5 gap-1.5 shadow-xs">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Program Muraja'ah 40x</span>
            </Button>
          </Link>
          <Link href="/alumni" className="flex-1">
            <Button variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold py-2.5 gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Ruang Alumni MTI</span>
            </Button>
          </Link>
        </div>
      </Card>

      {/* 6. Catatan Legalisasi & Verifikasi */}
      <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-1.5">
        <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
          Verifikasi Keaslian Syahadah
        </p>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Setiap sertifikat digital dilengkapi dengan ID unik dan QR-Code verifikasi resmi yang terhubung langsung ke database wisudawati Markaz Tikrar Indonesia untuk memastikan keabsahan riwayat hafalan Ukhti kapan pun dan di mana pun.
        </p>
      </div>
    </div>
  );
}
