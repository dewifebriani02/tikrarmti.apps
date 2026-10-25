import React from 'react';
import Link from 'next/link';
import { query } from '@/lib/db';
import { 
  CheckCircle2, 
  XCircle, 
  Award, 
  ShieldCheck, 
  Calendar, 
  BookOpen, 
  User, 
  Download, 
  ExternalLink, 
  Sparkles, 
  ArrowLeft 
} from 'lucide-react';
import { Metadata } from 'next';

interface Props {
  params: {
    code: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = decodeURIComponent(params.code || '');
  return {
    title: `Verifikasi Syahadah Resmi ${code} | Markaz Tikrar Indonesia`,
    description: `Pemeriksaan keabsahan dokumen syahadah resmi kelulusan santriwati Markaz Tikrar Indonesia (MTI).`,
  };
}

export const dynamic = 'force-dynamic';

export default async function VerifyCertificatePage({ params }: Props) {
  const code = decodeURIComponent(params.code || '').trim();

  let cert: any = null;
  let error: string | null = null;

  try {
    const sql = `
      SELECT 
        c.id,
        c.certificate_number,
        c.user_id,
        c.batch_id,
        c.juz_number,
        c.predicate,
        c.issue_date,
        c.hijri_date,
        c.pdf_url,
        c.status,
        c.metadata,
        c.created_at,
        u.full_name as student_name,
        u.student_id_number as student_nit,
        b.name as batch_name
      FROM certificates c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN batches b ON c.batch_id = b.id
      WHERE LOWER(c.certificate_number) = LOWER($1)
      LIMIT 1;
    `;
    const { rows } = await query(sql, [code]);
    if (rows.length > 0) {
      cert = rows[0];
    } else {
      error = 'Nomor syahadah tidak ditemukan dalam pangkalan data resmi Markaz Tikrar Indonesia.';
    }
  } catch (err: any) {
    console.error('Verification query error:', err);
    error = 'Terjadi kesalahan sistem saat memverifikasi data.';
  }

  // Format date helper
  const formatDateMasehi = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Banner / Navbar */}
      <header className="bg-white border-b border-gray-100 shadow-xs py-4 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-900 flex items-center justify-center text-white font-black shadow-sm">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="font-black text-gray-900 text-sm tracking-tight block">
                MARKAZ TIKRAR INDONESIA
              </span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                Pusat Verifikasi Dokumen & Syahadah
              </span>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Sistem Terakreditasi
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl w-full mx-auto px-4 py-8 sm:py-12 flex-1">
        {cert && cert.status === 'issued' ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden transition-all duration-300">
            {/* Header Badge */}
            <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 p-6 sm:p-8 text-white text-center relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner mb-3">
                  <CheckCircle2 className="w-9 h-9 text-emerald-300" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-black tracking-wide uppercase mb-2">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Syahadah Sah & Terverifikasi
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Syahadah Tahfidz Al-Qur'an
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100/80 font-mono tracking-wider mt-1">
                  No: {cert.certificate_number}
                </p>
              </div>

              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Certificate Details */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Student Identity */}
              <div className="text-center pb-6 border-b border-gray-100">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                  Diberikan Kepada
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                  {cert.student_name || 'Santriwati MTI'}
                </h2>
                {cert.student_nit && (
                  <p className="text-xs font-semibold text-gray-700 font-mono mt-1">
                    NIT: {cert.student_nit}
                  </p>
                )}
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    Capaian Hafalan
                  </span>
                  <p className="text-base font-black text-gray-900">
                    {cert.juz_number || 'Juz 30'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Predikat Kelulusan
                  </span>
                  <p className="text-base font-black text-emerald-800">
                    {cert.predicate || 'Mumtaz'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Tanggal Terbit (Masehi)
                  </span>
                  <p className="text-sm font-bold text-gray-800">
                    {formatDateMasehi(cert.issue_date)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    Tanggal Terbit (Hijriah)
                  </span>
                  <p className="text-sm font-bold text-gray-800">
                    {cert.hijri_date || '-'}
                  </p>
                </div>
              </div>

              {/* Batch Program */}
              {cert.batch_name && (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-950">
                  <span className="text-gray-600">Program Penyelenggara:</span>
                  <span className="font-black text-emerald-800">{cert.batch_name}</span>
                </div>
              )}

              {/* Official Seal / Statement */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed text-center space-y-1">
                <p className="font-bold text-slate-800">
                  Pernyataan Keaslian Dokumen
                </p>
                <p>
                  Sertifikat digital ini telah diverifikasi secara elektronik melalui pangkalan data Markaz Tikrar Indonesia dan dinyatakan sah sebagai bukti kelulusan program Tikrar Tahfidz Al-Qur'an.
                </p>
              </div>

              {/* Action Buttons */}
              {cert.pdf_url && (
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <a 
                    href={cert.pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all text-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Dokumen Asli (PDF)</span>
                  </a>
                  <a 
                    href={cert.pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center justify-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl text-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Lihat Dokumen</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Error / Invalid Certificate Card */
          <div className="bg-white rounded-3xl border border-red-100 shadow-xl overflow-hidden text-center p-8 sm:p-12 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shadow-inner text-red-600">
              <XCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                Sertifikat Tidak Ditemukan
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                {error || 'Nomor sertifikat yang Anda cari tidak terdaftar atau telah dicabut dalam database Markaz Tikrar Indonesia.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 text-xs text-gray-600 font-mono">
              Kode Pencarian: <span className="font-bold text-gray-900">{code || '-'}</span>
            </div>

            <div className="pt-4">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs shadow-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Beranda</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-600 border-t border-gray-100 bg-white">
        <p className="font-bold">Markaz Tikrar Indonesia</p>
        <p className="text-[11px] mt-0.5">Sistem Verifikasi Syahadah & Ijazah Tahfidz Digital</p>
      </footer>
    </div>
  );
}
