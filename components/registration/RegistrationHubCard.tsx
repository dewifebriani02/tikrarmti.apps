'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useRegistrationBatch } from '@/hooks/useBatches';
import { useAuth } from '@/hooks/useAuth';
import { useMyRegistrations } from '@/hooks/useRegistrations';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RegistrationHubCardProps {
  className?: string;
  showTitle?: boolean;
}

export function RegistrationHubCard({
  className = '',
  showTitle = true,
}: RegistrationHubCardProps) {
  const { user } = useAuth();
  const { registrationBatch, isLoading: batchLoading } = useRegistrationBatch();
  const { registrations } = useMyRegistrations();

  const [isRegisteredMuallimah, setIsRegisteredMuallimah] = useState(false);
  const [isRegisteredMusyrifah, setIsRegisteredMusyrifah] = useState(false);
  const [checkingRoleStatus, setCheckingRoleStatus] = useState(false);

  // Check registration period
  const isRegistrationOpen = useMemo(() => {
    if (!registrationBatch) return false;
    const now = new Date();

    const getDeadline = (dateStr?: string | null) => {
      if (!dateStr) return null;
      const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? new Date(`${match[1]}T23:59:59+07:00`) : new Date(dateStr);
    };

    const getStartDate = (dateStr?: string | null) => {
      if (!dateStr) return null;
      const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? new Date(`${match[1]}T00:00:00+07:00`) : new Date(dateStr);
    };

    const regStart = getStartDate(registrationBatch.registration_start_date);
    const regEnd = getDeadline(registrationBatch.registration_end_date);

    if (regEnd) {
      if (regStart) {
        return now >= regStart && now <= regEnd;
      }
      return now <= regEnd;
    }

    return registrationBatch.status === 'open';
  }, [registrationBatch]);

  // Days remaining calculation
  const deadlineInfo = useMemo(() => {
    if (!registrationBatch?.registration_end_date) return null;
    const match = registrationBatch.registration_end_date.match(/^(\d{4}-\d{2}-\d{2})/);
    const dateStr = match ? match[1] : registrationBatch.registration_end_date;
    const deadlineWIB = new Date(`${dateStr}T23:59:59+07:00`);
    const now = new Date();

    const diffDays = Math.ceil((deadlineWIB.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const formattedDate = deadlineWIB.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });

    return {
      formattedDate,
      diffDays: diffDays >= 0 ? diffDays : 0,
      isLastDay: diffDays === 0
    };
  }, [registrationBatch]);

  // Check thalibah registrations in the registration batch
  const hasRegisteredTikrar = useMemo(() => {
    if (!registrationBatch?.id || !registrations.length) return false;
    return registrations.some(
      reg =>
        reg.batch_id === registrationBatch.id &&
        reg.program?.name?.toLowerCase().includes('tahfidz') &&
        !reg.program?.name?.toLowerCase().includes('pra') &&
        ['approved', 'pending'].includes(reg.status)
    );
  }, [registrationBatch?.id, registrations]);

  const hasRegisteredPraTikrar = useMemo(() => {
    if (!registrationBatch?.id || !registrations.length) return false;
    return registrations.some(
      reg =>
        reg.batch_id === registrationBatch.id &&
        (reg.program?.name?.toLowerCase().includes('pra-tikrar') ||
         reg.program?.name?.toLowerCase().includes('pra tikrar')) &&
        ['approved', 'pending'].includes(reg.status)
    );
  }, [registrationBatch?.id, registrations]);

  // Check muallimah & musyrifah registrations
  useEffect(() => {
    if (!user?.id || !registrationBatch?.id) {
      setIsRegisteredMuallimah(false);
      setIsRegisteredMusyrifah(false);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    async function checkRoleRegistrations() {
      setCheckingRoleStatus(true);
      try {
        const [muallimahRes, musyrifahRes] = await Promise.all([
          supabase
            .from('muallimah_akads')
            .select('id')
            .eq('user_id', user!.id)
            .eq('batch_id', registrationBatch!.id)
            .maybeSingle(),
          supabase
            .from('musyrifah_registrations')
            .select('id')
            .eq('user_id', user!.id)
            .eq('batch_id', registrationBatch!.id)
            .maybeSingle()
        ]);

        if (isMounted) {
          setIsRegisteredMuallimah(!!muallimahRes.data);
          setIsRegisteredMusyrifah(!!musyrifahRes.data);
        }
      } catch (err) {
        console.error('Error checking role registrations:', err);
      } finally {
        if (isMounted) {
          setCheckingRoleStatus(false);
        }
      }
    }

    checkRoleRegistrations();

    return () => {
      isMounted = false;
    };
  }, [user?.id, registrationBatch?.id]);

  // Don't render if still loading batch or if registration is not open
  if (batchLoading || !registrationBatch || !isRegistrationOpen) {
    return null;
  }

  const batchId = registrationBatch.id;

  return (
    <div className={`mb-8 ${className}`}>
      <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-emerald-950/15 overflow-hidden bg-white ring-1 ring-emerald-900/10">
        <CardContent className="p-0">
          
          {/* Header Banner Hub */}
          <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-green-950 p-6 sm:p-8 md:p-10 text-white relative overflow-hidden">
            {/* Background glowing circles */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl -z-0 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-md uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pendaftaran Dibuka
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-emerald-100 backdrop-blur-sm border border-white/10">
                    {registrationBatch.name}
                  </span>
                </div>

                {showTitle && (
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                    Pintu Khidmat & Belajar <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-200">Al-Qur'an</span>
                  </h2>
                )}

                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium">
                  Silakan pilih jalur di bawah ini sesuai tujuan dan peran Ukhti. Setiap program memiliki formulir, komitmen waktu, serta tahapan seleksi yang berbeda.
                </p>
              </div>

              {deadlineInfo && (
                <div className="bg-black/25 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex-shrink-0 text-left md:text-right space-y-1 shadow-inner">
                  <p className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-300 flex items-center md:justify-end gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Batas Pendaftaran
                  </p>
                  <p className="text-base sm:text-lg font-black text-white tracking-wide">
                    {deadlineInfo.formattedDate}
                  </p>
                  <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    deadlineInfo.diffDays <= 3 
                      ? 'bg-rose-500/25 text-rose-200 border border-rose-400/30' 
                      : 'bg-amber-400/20 text-amber-200 border border-amber-300/30'
                  }`}>
                    {deadlineInfo.diffDays === 0 ? 'Hari Terakhir!' : `⏳ Sisa ${deadlineInfo.diffDays} hari lagi`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cards Section */}
          <div className="p-5 sm:p-7 md:p-8 space-y-8 bg-gradient-to-b from-stone-50/50 to-white">
            
            {/* Kategori 1: Thalibah (Santri Belajar) */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md">
                  Kategori Santri (Thalibah)
                </span>
                <div className="flex-1 h-px bg-emerald-200/60"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                
                {/* 1. Tikrar Tahfidz */}
                <div className="bg-white border-2 border-amber-200/80 hover:border-amber-400 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 shadow-inner group-hover:scale-105 transition-transform">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Program Utama
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-amber-800 transition-colors">
                        Thalibah Tikrar Tahfidz
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                        Hafalan Al-Qur'an intensif metode 40x pengulangan (Juz 1, 2, 27, 28, 29, 30) dengan sistem pasangan setoran.
                      </p>
                    </div>

                    <div className="text-[11px] font-medium text-gray-500 pt-2 border-t border-gray-100 flex flex-wrap gap-x-3 gap-y-1">
                      <span>⏱ Durasi: <strong className="text-gray-700">13 Pekan</strong></span>
                      <span>•</span>
                      <span>💰 Biaya: <strong className="text-emerald-700 font-bold">GRATIS</strong></span>
                    </div>
                  </div>

                  <div className="pt-5">
                    {hasRegisteredTikrar ? (
                      <Button
                        disabled
                        className="w-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold py-2.5 rounded-xl cursor-default flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Sudah Terdaftar
                      </Button>
                    ) : (
                      <Link href={`/pendaftaran/tikrar-tahfidz?batchId=${batchId}`} className="block">
                        <Button className="w-full bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-2.5 rounded-xl shadow-md shadow-amber-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-1.5">
                          Daftar Tikrar Tahfidz
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* 2. Pra-Tikrar */}
                <div className="bg-white border-2 border-fuchsia-200/80 hover:border-fuchsia-400 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 bg-fuchsia-100 rounded-xl flex items-center justify-center text-fuchsia-700 shadow-inner group-hover:scale-105 transition-transform">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200">
                        Tahsin Dasar
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-fuchsia-800 transition-colors">
                        Thalibah Pra-Tikrar
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                        Perbaikan bacaan dasar Al-Qur'an (Tahsin) & pembekalan makhraj huruf sebelum melanjutkan ke program hafalan.
                      </p>
                    </div>

                    <div className="text-[11px] font-medium text-gray-500 pt-2 border-t border-gray-100 flex flex-wrap gap-x-3 gap-y-1">
                      <span>🎯 Target: <strong className="text-gray-700">Juz 30</strong></span>
                      <span>•</span>
                      <span>🎙 Seleksi: <strong className="text-gray-700">Tes Lisan</strong></span>
                    </div>
                  </div>

                  <div className="pt-5">
                    {hasRegisteredPraTikrar ? (
                      <Button
                        disabled
                        className="w-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold py-2.5 rounded-xl cursor-default flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Sudah Terdaftar
                      </Button>
                    ) : (
                      <Link href={`/pendaftaran/pra-tikrar?batchId=${batchId}`} className="block">
                        <Button className="w-full bg-gradient-to-r from-fuchsia-700 to-purple-800 hover:from-fuchsia-800 hover:to-purple-900 text-white font-bold py-2.5 rounded-xl shadow-md shadow-fuchsia-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-1.5">
                          Daftar Pra-Tikrar
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Kategori 2: Tim Pengajar & Pendamping (Khadimat Qur'an) */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="text-xs font-black uppercase tracking-widest text-teal-800 bg-teal-100/80 px-2.5 py-1 rounded-md">
                  Kategori Tim Pengajar & Pendamping
                </span>
                <div className="flex-1 h-px bg-teal-200/60"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                
                {/* 3. Mu'allimah */}
                <div className="bg-white border-2 border-emerald-200/80 hover:border-emerald-400 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-800 shadow-inner group-hover:scale-105 transition-transform">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Khadimat Pengajar
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-emerald-800 transition-colors">
                        Mu'allimah (Guru Penguji)
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                        Khusus calon pengajar untuk menyimak setoran, menguji pekanan, dan mentashih bacaan thalibah.
                      </p>
                    </div>

                    <div className="text-[11px] font-medium text-gray-500 pt-2 border-t border-gray-100">
                      📝 Formulir: <strong className="text-gray-700">Profil & Akad Komitmen Mengajar</strong>
                    </div>
                  </div>

                  <div className="pt-5">
                    {isRegisteredMuallimah ? (
                      <Button
                        disabled
                        className="w-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold py-2.5 rounded-xl cursor-default flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Akad Mengajar Terisi
                      </Button>
                    ) : (
                      <Link href={`/pendaftaran/muallimah?batchId=${batchId}`} className="block">
                        <Button className="w-full bg-gradient-to-r from-emerald-700 to-green-800 hover:from-emerald-800 hover:to-green-900 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-950/10 hover:shadow-lg transition-all flex items-center justify-center gap-1.5">
                          Daftar Sebagai Mu'allimah
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* 4. Musyrifah / Raisah */}
                <div className="bg-white border-2 border-blue-200/80 hover:border-blue-400 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center text-blue-800 shadow-inner group-hover:scale-105 transition-transform">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                        Manajerial Halaqah
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-blue-800 transition-colors">
                        Musyrifah / Raisah
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                        Pendamping halaqah, pemantau kedisiplinan setoran pasangan, dan koordinator grup belajar thalibah.
                      </p>
                    </div>

                    <div className="text-[11px] font-medium text-gray-500 pt-2 border-t border-gray-100">
                      🎯 Fokus: <strong className="text-gray-700">Pelatihan Leadership & Manajemen MTI</strong>
                    </div>
                  </div>

                  <div className="pt-5">
                    {isRegisteredMusyrifah ? (
                      <Button
                        disabled
                        className="w-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold py-2.5 rounded-xl cursor-default flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Sudah Terdaftar
                      </Button>
                    ) : (
                      <Link href={`/pendaftaran/musyrifah?batchId=${batchId}`} className="block">
                        <Button className="w-full bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-bold py-2.5 rounded-xl shadow-md shadow-blue-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-1.5">
                          Daftar Sebagai Musyrifah
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegistrationHubCard;
