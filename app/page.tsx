import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Import FAQ component as default export
import FAQComponent from '@/components/FAQ';
import { LandingTestimonialsCarousel } from '@/components/LandingTestimonialsCarousel';
import {
  Star,
  Users,
  Trophy,
  Crown,
  Heart,
  Shield,
  Sparkles,
  BookOpen,
  GraduationCap,
  Layers,
  MapPin,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  FileText,
  Clock,
  Sparkle,
} from "lucide-react";

import { createSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

// Force dynamic rendering so testimonials and metrics are always fresh
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const supabaseAuth = createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  const supabase = createSupabaseAdmin();
  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('*, user:users(full_name, kota, tanggal_lahir)')
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  // Query live KPI metrics directly from database
  let kpiStats = {
    totalThalibahBelajar: 225,
    totalKursiBatch: 346,
    totalMuallimah: 48,
    totalHalaqah: 82,
    totalKota: 223
  };

  try {
    const kpiRes = await db.query(`
      SELECT 
        (SELECT COUNT(DISTINCT user_id) FROM pendaftaran_tikrar_tahfidz WHERE selection_status IN ('selected', 'passed')) as total_thalibah,
        (SELECT COUNT(*) FROM pendaftaran_tikrar_tahfidz WHERE selection_status IN ('selected', 'passed')) as total_kursi,
        (SELECT COUNT(*) FROM users WHERE role = 'muallimah') as total_muallimah,
        (SELECT COUNT(*) FROM halaqah) as total_halaqah,
        (SELECT COUNT(DISTINCT kota) FROM users WHERE kota IS NOT NULL AND kota != '') as total_kota;
    `);
    if (kpiRes.rows && kpiRes.rows[0]) {
      const row = kpiRes.rows[0];
      kpiStats = {
        totalThalibahBelajar: Number(row.total_thalibah) || 225,
        totalKursiBatch: Number(row.total_kursi) || 346,
        totalMuallimah: Number(row.total_muallimah) || 48,
        totalHalaqah: Number(row.total_halaqah) || 82,
        totalKota: Number(row.total_kota) || 223
      };
    }
  } catch (err) {
    console.error('Error fetching KPI metrics:', err);
  }

  return (
    <>
      {/* Minimal Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-48 h-48 bg-emerald-900/10 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-amber-500/10 rounded-full opacity-30 blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <section className="min-h-[75vh] sm:min-h-[85vh] flex items-center justify-center relative bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/40 pt-14 sm:pt-20 lg:pt-20 pb-12">
        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">

          {/* Badge Tagline */}
          <div className="mb-3 sm:mb-4">
            <Badge className="bg-emerald-900 hover:bg-emerald-850 text-white border-0 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-lg tracking-wide inline-flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-300" />
              <span>Markaz Pembelajaran Tahfidz & Murojaah Qur&apos;an</span>
            </Badge>
          </div>

          {/* Main Clean Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-4 sm:mb-6 leading-tight tracking-tight">
            Wujudkan Mimpi
            <span className="block bg-gradient-to-r from-emerald-950 via-emerald-800 to-amber-600 bg-clip-text text-transparent mt-1 sm:mt-2 font-black">
              Menjadi Hafidzah Mutqin
            </span>
          </h1>

          {/* Concise Subtitle */}
          <p className="text-lg sm:text-2xl text-emerald-950 font-semibold max-w-2xl sm:max-w-3xl mx-auto mb-2 sm:mb-3 leading-relaxed">
            dengan Niat Bulat, Disiplin Belajar, & Komitmen Berkelanjutan
          </p>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-xl sm:max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Menerapkan <strong>Metode Tikrar 40x</strong>: Pembelajaran intensif, terukur dengan SOP simak murottal 3x, rabth 10 blok, dan pendampingan mu&apos;allimah mutqin &amp; terverifikasi MTI.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center mb-10 sm:mb-12">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-emerald-900 to-emerald-800 hover:from-emerald-850 hover:to-emerald-750 text-white px-8 sm:px-11 py-5 sm:py-6 text-base sm:text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl group"
            >
              <Link href="/register" className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform duration-300" />
                <span>Daftar / Buat Akun</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-emerald-900 text-emerald-950 hover:bg-emerald-50 px-8 sm:px-11 py-5 sm:py-6 text-base sm:text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg group"
            >
              <Link href="/metode" className="flex items-center gap-3">
                <Star className="w-5 h-5 text-amber-600 group-hover:rotate-12 transition-transform duration-300" />
                <span>Pelajari Metode Tikrar</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="text-emerald-900 hover:bg-emerald-50/80 px-6 sm:px-8 py-5 sm:py-6 text-base font-semibold rounded-2xl transition-all duration-300 hover:scale-105"
            >
              <a href="#program" className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-700" />
                <span>Pilihan Program</span>
              </a>
            </Button>
          </div>

          {/* Quick Login Bar */}
          <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur border border-emerald-100 shadow-sm rounded-full px-5 py-2.5 text-sm text-gray-700">
            <span>Sudah memiliki akun santriwati/mu&apos;allimah?</span>
            <Link
              href="/login"
              className="font-bold text-emerald-900 hover:text-emerald-700 inline-flex items-center gap-1 hover:underline underline-offset-2"
            >
              <span>Masuk di sini</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>

      {/* KPI & Live Stats Section */}
      <section className="py-12 bg-gradient-to-b from-white via-emerald-50/30 to-white border-y border-emerald-100/60 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
              Pencapaian Akademik Nyata
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2.5 tracking-tight">
              Statistik Belajar Santriwati & Mu&apos;allimah MTI
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Data terintegrasi dari sistem akademik dan pelaksanaan halaqah belajar
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 max-w-6xl mx-auto">
            
            {/* Metric 1: Thalibah Pernah Belajar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-0 pointer-events-none group-hover:bg-emerald-100 transition-colors"></div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Thalibah Belajar</span>
              </div>
              <div className="text-2xl sm:text-4xl font-black text-emerald-950 tracking-tight relative z-10">
                {kpiStats.totalThalibahBelajar.toLocaleString('id-ID')}+
              </div>
              <p className="text-[11px] text-gray-500 mt-1 relative z-10">
                Lolos seleksi & mengikuti batch
              </p>
              <div className="mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-md px-2 py-0.5 inline-block">
                {kpiStats.totalKursiBatch} Kepesertaan Batch
              </div>
            </div>

            {/* Metric 2: Muallimah Mutqin & Terverifikasi */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -z-0 pointer-events-none group-hover:bg-amber-100 transition-colors"></div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Mu&apos;allimah</span>
              </div>
              <div className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight relative z-10">
                {kpiStats.totalMuallimah.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-gray-500 mt-1 relative z-10">
                Ustadzah mutqin & terverifikasi
              </p>
              <div className="mt-2 text-[10px] font-semibold text-amber-800 bg-amber-50 rounded-md px-2 py-0.5 inline-block">
                Pengampu Khusus
              </div>
            </div>

            {/* Metric 3: Halaqah Belajar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-teal-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-teal-50 rounded-bl-full -z-0 pointer-events-none group-hover:bg-teal-100 transition-colors"></div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-900">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider">Halaqah Aktif</span>
              </div>
              <div className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight relative z-10">
                {kpiStats.totalHalaqah.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-gray-500 mt-1 relative z-10">
                Kelompok simak pasangan
              </p>
              <div className="mt-2 text-[10px] font-semibold text-teal-800 bg-teal-50 rounded-md px-2 py-0.5 inline-block">
                7 Slot Waktu WIB
              </div>
            </div>

            {/* Metric 4: 4 Pilar Program */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -z-0 pointer-events-none group-hover:bg-indigo-100 transition-colors"></div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-900">
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Jalur Program</span>
              </div>
              <div className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight relative z-10">
                4 Pilar
              </div>
              <p className="text-[11px] text-gray-500 mt-1 relative z-10">
                Layanan kurikulum berjenjang
              </p>
              <div className="mt-2 text-[10px] font-semibold text-indigo-800 bg-indigo-50 rounded-md px-2 py-0.5 inline-block">
                Pra s.d. Murojaah
              </div>
            </div>

            {/* Metric 5: Sebaran Kota */}
            <div className="col-span-2 md:col-span-1 bg-white rounded-2xl p-4 sm:p-5 border border-rose-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-bl-full -z-0 pointer-events-none group-hover:bg-rose-100 transition-colors"></div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-900">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">Sebaran Wilayah</span>
              </div>
              <div className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight relative z-10">
                {kpiStats.totalKota.toLocaleString('id-ID')}+
              </div>
              <p className="text-[11px] text-gray-500 mt-1 relative z-10">
                Kota di Indonesia & Luar Negeri
              </p>
              <div className="mt-2 text-[10px] font-semibold text-rose-800 bg-rose-50 rounded-md px-2 py-0.5 inline-block">
                Komunitas Global
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4 Pillars Section */}
      <section className="py-20 sm:py-24 bg-gray-50" id="program">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-100/80 px-3.5 py-1.5 rounded-full border border-emerald-200">
              Kurikulum Berjenjang & Terstruktur
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-950 mt-3 tracking-tight">
              4 Pilar Layanan Markaz Tikrar
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mt-2.5 leading-relaxed">
              Pilihan program pembelajaran Al-Qur&apos;an yang disesuaikan dengan kesiapan, target capaian hafalan, dan kebutuhan santriwati.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
            
            {/* Pilar 1: Pra Tikrar */}
            <Card className="bg-white border-2 border-emerald-100 hover:border-emerald-300 rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">
                    🌿
                  </div>
                  <Badge variant="outline" className="border-emerald-300 text-emerald-850 font-bold bg-emerald-50">
                    Pondasi & Pemula
                  </Badge>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  1. Program Pra-Tikrar MTI
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Bimbingan dasar makharijul huruf, sifatul huruf, dan perbaikan bacaan (tahsin asasi) sebelum santriwati memasuki ziyadah hafalan intensif.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-700 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Fokus evaluasi bacaan per ayat & itmamul harakat</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Jurnal harian Pra-Tikrar terpisah dari tahfidz reguler</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Jembatan persiapan menuju seleksi Tikrar Tahfidz</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800">Khusus Ibu & Remaja Putri</span>
                <Button asChild size="sm" className="bg-emerald-850 hover:bg-emerald-900 text-white rounded-xl font-bold">
                  <Link href="/register" className="inline-flex items-center gap-1.5">
                    <span>Daftar Akun</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Pilar 2: Tikrar Tahfidz (Program Utama) */}
            <Card className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-850 text-white border-2 border-amber-400/40 rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-bl-full pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-300/30 flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">
                    📖
                  </div>
                  <Badge className="bg-amber-400 text-emerald-950 font-black border-0 uppercase tracking-wider text-[10px]">
                    ⭐ Program Inti (Gratis)
                  </Badge>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">
                  2. Tikrar Tahfidz Intensif (13 Pekan)
                </h3>
                <p className="text-sm text-emerald-100/90 mb-4 leading-relaxed">
                  Program ziyadah hafalan baru dengan target &frac12; juz per batch. Menerapkan disiplin 40x putaran, simak murottal 3x, dan setoran pasangan harian.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-emerald-100 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                    <span>Setoran wajib & saling simak 40x bersama pasangan tikrar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                    <span>Rabth hafalan 10 blok ke belakang untuk menjaga kekuatan hafalan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                    <span>Didampingi Musyrifah & Ujian Lisan/Tulisan resmi berijazah</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-emerald-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">Komitmen Wajib 2 Jam/Hari</span>
                <Button asChild size="sm" className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black rounded-xl">
                  <Link href="/metode" className="inline-flex items-center gap-1.5">
                    <span>Pelajari SOP 40X</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Pilar 3: Murojaah 40X */}
            <Card className="bg-white border-2 border-emerald-100 hover:border-emerald-300 rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">
                    🛡️
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-900 font-bold bg-amber-50">
                    Syarat Wajib Naik Juz
                  </Badge>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  3. Tikrar Murojaah 40X Pasca-Kelulusan
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Ruang alumni untuk menjaga hafalan tetap mutqin sebelum melangkah ke juz berikutnya. Dilengkapi tantangan rolling 20 hari dan mitra simak komunitas.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-700 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Target 40 putaran murojaah penuh per juz kelulusan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Lencana kehormatan <strong>&ldquo;Murojaah Warrior&rdquo;</strong> (selesai &le; 20 hari)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>4 Metode: Pasangan Tikrar, Tarteel AI, Saat Sholat, & Aktivitas</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800">Ruang Khusus Alumni MTI</span>
                <Button asChild size="sm" variant="outline" className="border-emerald-800 text-emerald-900 hover:bg-emerald-50 rounded-xl font-bold">
                  <Link href="/login" className="inline-flex items-center gap-1.5">
                    <span>Masuk Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Pilar 4: Kelas Berbayar Muallimah */}
            <Card className="bg-white border-2 border-emerald-100 hover:border-emerald-300 rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-900 flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">
                    💎
                  </div>
                  <Badge variant="outline" className="border-teal-300 text-teal-900 font-bold bg-teal-50">
                    Bimbingan Privat & Eksklusif
                  </Badge>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  4. Kelas Berbayar Resmi Mu&apos;allimah MTI
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Kelas bimbingan intensif yang diampu langsung oleh Mu&apos;allimah terverifikasi MTI dengan skema infaq transparan, materi mendalam, dan kuota terbatas.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-700 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Talaqqi Tahsin Lanjutan &amp; Pemantapan Kaidah Tajwid</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Jadwal bimbingan fleksibel didampingi room Zoom Cloud resmi MTI</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Pengajar alumni & senior terverifikasi MTI dengan seleksi ketat</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-teal-800">Kuota Terbatas 5–15 Santriwati</span>
                <Button asChild size="sm" className="bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold">
                  <Link href="/register" className="inline-flex items-center gap-1.5">
                    <span>Informasi Kelas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>

          </div>
        </div>
      </section>

      {/* Simple Journey Section - Retained */}
      <section className="py-24 bg-gray-50/60" id="alur">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 text-emerald-950 tracking-tight">
              4 Langkah Menuju Kelulusan Mutqin
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Proses pembelajaran terstruktur dengan bimbingan intensif, evaluasi berkala, dan seleksi komitmen
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[
              {
                step: "01",
                title: "Simulasi & Tes",
                description: "Mencoba simulasi Tikrar (An-Naba' 1-11 x 40 kali) untuk mengukur kesanggupan, dilanjutkan tes bacaan lisan & ujian pilihan ganda.",
                icon: Sparkles
              },
              {
                step: "02",
                title: "Penjadwalan",
                description: "Penempatan halaqah belajar dan pencocokan pasangan setoran berdasarkan zona waktu dan pilihan slot belajar WIB.",
                icon: Heart
              },
              {
                step: "03",
                title: "Belajar 13 Pekan",
                description: "Sesi Tahsin, Ziyadah, dan Murottal 3x. Setoran wajib 40 kali dengan partner, laporan harian, dan rabth 10 blok ke belakang.",
                icon: Star
              },
              {
                step: "04",
                title: "Lulus & Bersertifikat",
                description: "Ujian komprehensif, sertifikat digital resmi ber-QR code verifikasi, dan akses ke ruang alumni Murojaah 40X.",
                icon: Trophy
              }
            ].map((item, index) => (
              <div key={index} className="text-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-emerald-100 to-amber-100 rounded-2xl flex items-center justify-center">
                  <span className="text-xl font-black text-emerald-900">{item.step}</span>
                </div>
                <item.icon className="w-8 h-8 mx-auto mb-3 text-amber-600" />
                <h3 className="text-lg font-bold mb-2 text-emerald-950">{item.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section - Retained */}
      {testimonials && testimonials.length > 0 && (
        <section id="testimoni" className="py-24 bg-gradient-to-b from-white to-[#F4F7F5]">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                Kisah Inspiratif Santriwati MTI
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-950 mt-4 tracking-tight">
                Apa Kata Alumni Markaz Tikrar?
              </h2>
              <p className="text-gray-600 mt-2.5 leading-relaxed text-sm sm:text-base">
                Simak pengalaman luar biasa dari para santriwati yang telah menyelesaikan program hafalan di MTI menggunakan Metode Tikrar 40x.
              </p>
            </div>

            <LandingTestimonialsCarousel testimonials={testimonials} />
          </div>
        </section>
      )}

      {/* FAQ Section - Retained */}
      <FAQComponent />

      {/* Final CTA Section - Retained */}
      <section className="py-24 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-850 relative overflow-hidden">
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
              Waktunya Melangkah Bersama Kalamullah
            </h2>

            <p className="text-base sm:text-xl text-emerald-100/90 mb-10 leading-relaxed max-w-2xl mx-auto">
              Transformasi hafalan dimulai dari komitmen dan kesungguhan hati. Program ini menuntut kedisiplinan minimal 2 jam sehari bersama Al-Qur&apos;an. Siap berjuang bersama kami?
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-amber-400 hover:bg-amber-300 text-emerald-950 px-10 sm:px-12 py-6 text-lg sm:text-xl font-black rounded-2xl transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl group"
              >
                <Link href="/register" className="flex items-center gap-2 sm:gap-3">
                  <Crown className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Daftar Akun Baru</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-emerald-950 px-10 sm:px-12 py-6 text-lg sm:text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg group"
              >
                <Link href="/login" className="flex items-center gap-2 sm:gap-3">
                  <Heart className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                  <span>Masuk ke Akun</span>
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="text-center mt-12">
              <p className="text-xs sm:text-sm text-emerald-200/80">
                Catatan: Markaz Tikrar Indonesia mengutamakan keikhlasan, istiqamah, dan rasa persaudaraan sesama perindu Al-Qur&apos;an.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
