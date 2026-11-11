'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Calendar, Clock, Video, CheckCircle2, AlertCircle, 
  Sparkles, Headphones, GraduationCap, Save, History, Info, 
  Mic, Check, FileText, Loader2, ArrowRight, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  getPraTikrarContext, 
  savePraTikrarDailyEntry
} from '@/app/(protected)/jurnal-pra-tikrar/actions';
import {
  PraTikrarContextResponse,
  PraTikrarEntryInput,
  PRA_TIKRAR_TASHIH_CLASS_TYPES
} from '@/lib/pra-tikrar';
import { getJurnalLockStatus } from '@/lib/batch-schedule';

const JUZ_30_SURAT = [
  "78. An-Naba'",
  "79. An-Nazi'at",
  "80. 'Abasa",
  "81. At-Takwir",
  "82. Al-Infithar",
  "83. Al-Muthaffifin",
  "84. Al-Insyiqaq",
  "85. Al-Buruj",
  "86. Ath-Thariq",
  "87. Al-A'la",
  "88. Al-Ghasyiyah",
  "89. Al-Fajr",
  "90. Al-Balad",
  "91. Asy-Syams",
  "92. Al-Lail",
  "93. Adh-Dhuha",
  "94. Asy-Syarh",
  "95. At-Tin",
  "96. Al-'Alaq",
  "97. Al-Qadr",
  "98. Al-Bayyinah",
  "99. Az-Zalzalah",
  "100. Al-'Adiyat",
  "101. Al-Qari'ah",
  "102. At-Takatsur",
  "103. Al-'Ashr",
  "104. Al-Humazah",
  "105. Al-Fil",
  "106. Quraisy",
  "107. Al-Ma'un",
  "108. Al-Kautsar",
  "109. Al-Kafirun",
  "110. An-Nashr",
  "111. Al-Lahab",
  "112. Al-Ikhlas",
  "113. Al-Falaq",
  "114. An-Naas"
];

interface PraTikrarJurnalFormProps {
  user: any;
  activeBatch?: any;
  activeRegistration?: any;
}

export function PraTikrarJurnalForm({ user, activeBatch, activeRegistration }: PraTikrarJurnalFormProps) {
  const [context, setContext] = useState<PraTikrarContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State: 3 Tahapan Utama + Multi-Halaqah & Program yang Diikuti
  const [formData, setFormData] = useState<PraTikrarEntryInput>({
    tanggal: new Date().toISOString().split('T')[0],
    pekan_ke: 1,
    simak_1: false,
    simak_2: false,
    simak_3: false,
    metode_simak: 'murni',
    surat_nama: "78. An-Naba'",
    ayat_range: '1-10',
    durasi_menit: 20,
    rekam_mandiri: false,
    catatan_santri: '',
    jenis_kelas: 'tahsin_juz30',
    jenis_kelas_list: ['iqro_dewasa', 'tahsin_juz30'],
    asal_bimbingan: 'internal_mti',
    kategori_kelas: 'umum',
    halaqah_id: '',
    halaqah_ids: [],
  });

  const effectiveBatchData = context?.activeBatch || activeBatch;
  const lock = React.useMemo(() => {
    return getJurnalLockStatus(effectiveBatchData);
  }, [effectiveBatchData]);

  const isLocked = !context?.isAdmin && lock.isLocked;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPraTikrarContext();
      setContext(res);

      if (res.todayEntry) {
        let parsedClassList: string[] = ['iqro_dewasa', 'tahsin_juz30'];
        if (Array.isArray((res.todayEntry as any).jenis_kelas_list)) {
          parsedClassList = (res.todayEntry as any).jenis_kelas_list;
        } else if (typeof (res.todayEntry as any).jenis_kelas_list === 'string') {
          try { parsedClassList = JSON.parse((res.todayEntry as any).jenis_kelas_list); } catch {}
        } else if (res.todayEntry.jenis_kelas) {
          parsedClassList = [res.todayEntry.jenis_kelas];
        }

        let parsedHalaqahIds: string[] = [];
        if (Array.isArray((res.todayEntry as any).halaqah_ids)) {
          parsedHalaqahIds = (res.todayEntry as any).halaqah_ids;
        } else if (typeof (res.todayEntry as any).halaqah_ids === 'string') {
          try { parsedHalaqahIds = JSON.parse((res.todayEntry as any).halaqah_ids); } catch {}
        } else if (res.todayEntry.halaqah_id) {
          parsedHalaqahIds = [res.todayEntry.halaqah_id];
        }

        setFormData({
          batch_id: res.todayEntry.batch_id || res.activeBatch?.id,
          halaqah_id: res.todayEntry.halaqah_id || '',
          halaqah_ids: parsedHalaqahIds,
          tanggal: res.todayEntry.tanggal || new Date().toISOString().split('T')[0],
          pekan_ke: res.todayEntry.pekan_ke || 1,
          simak_1: !!res.todayEntry.simak_1,
          simak_2: !!res.todayEntry.simak_2,
          simak_3: !!res.todayEntry.simak_3,
          metode_simak: res.todayEntry.metode_simak || 'murni',
          surat_nama: res.todayEntry.surat_nama || "78. An-Naba'",
          ayat_range: res.todayEntry.ayat_range || '1-10',
          durasi_menit: res.todayEntry.durasi_menit || 20,
          rekam_mandiri: !!(res.todayEntry as any).rekam_mandiri,
          catatan_santri: res.todayEntry.catatan_santri || '',
          jenis_kelas: res.todayEntry.jenis_kelas || 'tahsin_juz30',
          jenis_kelas_list: parsedClassList,
          jenis_kelas_custom: res.todayEntry.jenis_kelas_custom || '',
          asal_bimbingan: res.todayEntry.asal_bimbingan || 'internal_mti',
          kategori_kelas: res.todayEntry.kategori_kelas || 'umum',
        });
      } else if (res.activeBatch) {
        setFormData(prev => ({ ...prev, batch_id: res.activeBatch?.id }));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat data jurnal Pra-Tikrar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleJenisKelas = (classId: string) => {
    setFormData(prev => {
      const currentList = prev.jenis_kelas_list || [];
      const exists = currentList.includes(classId);
      const nextList = exists
        ? currentList.filter(c => c !== classId)
        : [...currentList, classId];
      return {
        ...prev,
        jenis_kelas_list: nextList,
        jenis_kelas: nextList[0] || 'tahsin_juz30'
      };
    });
  };

  const handleSaveDaily = async () => {
    if (isLocked) {
      toast.info(lock.reason || 'Pengisian Jurnal Pra-Tikrar telah ditutup sesuai kalender akademik angkatan.');
      return;
    }

    try {
      setSaving(true);
      const res = await savePraTikrarDailyEntry({
        ...formData,
        batch_id: context?.activeBatch?.id || activeBatch?.id,
      });

      if (res.success) {
        toast.success(res.message || 'Jurnal Pra-Tikrar berhasil disimpan!');
        loadData();
      } else {
        toast.error(res.error || 'Gagal menyimpan jurnal');
      }
    } catch (e: any) {
      const errMsg = e?.message || "";
      if (
        errMsg.includes("reading 'call'") ||
        errMsg.includes("Server Action") ||
        errMsg.includes("Failed to find Server Action") ||
        errMsg.includes("Failed to fetch")
      ) {
        toast.error("Versi aplikasi baru saja diperbarui oleh server. Memuat ulang halaman otomatis...", {
          duration: 4000,
        });
        setTimeout(() => window.location.reload(), 1200);
        return;
      }
      toast.error(errMsg || "Gagal menyimpan jurnal");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-xs font-medium text-gray-500">Memuat jurnal harian Pra-Tikrar...</p>
      </div>
    );
  }

  const completedSimakCount = [formData.simak_1, formData.simak_2, formData.simak_3].filter(Boolean).length;
  const isTahap1Complete = completedSimakCount === 3;
  const isTahap2Complete = !!(formData.surat_nama && (formData.durasi_menit || 0) > 0);
  const isTahap3Complete = !!formData.rekam_mandiri;
  const totalCompletedStages = (isTahap1Complete ? 1 : 0) + (isTahap2Complete ? 1 : 0) + (isTahap3Complete ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* 1. HEADER CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-emerald-950 text-white p-6 sm:p-7 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Program Pra-Tikrar (Juz 30)
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-medium">
              🌸 Anjuran Mengikuti &gt;1 Halaqah
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Jurnal Harian Pra-Tikrar
          </h1>
          <p className="text-indigo-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
            3 tahapan pembiasaan harian teratur. Ukhti dianjurkan mengikuti lebih dari satu halaqah (Iqro&apos;, Tahsin, Zoom MTI) agar percepatan kelenturan lisan semakin maksimal.
          </p>

          <div className="pt-1 flex flex-wrap gap-2.5">
            <Link
              href="/tashih"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl transition-all shadow-sm"
            >
              <span>Isi Lembar Tashih Pra-Tikrar (Multi-Halaqah)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/jadwal-harian"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl transition-all backdrop-blur-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-300" />
              <span>Lihat Jadwal Seluruh Sesi Zoom</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Lock Banner if Closed / Upcoming */}
      {lock.isLocked && (
        <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-amber-950">Pengisian Jurnal Pra-Tikrar Ditutup</h4>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full">
                {lock.badgeLabel}
              </span>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed mt-1">
              {lock.reason} Seluruh riwayat presensi jurnal Ukhti tetap tersimpan aman.
            </p>
          </div>
        </div>
      )}

      {/* 2. PROGRESS TAHAPAN SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`p-4 rounded-2xl border transition-all ${isTahap1Complete ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Tahap 1: Simak 3x</span>
            {isTahap1Complete ? (
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
            ) : (
              <span className="text-xs font-bold text-gray-400">{completedSimakCount}/3</span>
            )}
          </div>
          <div className="mt-2 text-sm font-bold">
            {isTahap1Complete ? 'Selesai 3 Sesi Murottal' : 'Belum Lengkap 3 Sesi'}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">Shubuh, Zhuhur, Maghrib/Isya</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${isTahap2Complete ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Tahap 2: Latihan Mandiri</span>
            {isTahap2Complete ? (
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
            ) : (
              <span className="text-xs font-bold text-gray-400">0/1</span>
            )}
          </div>
          <div className="mt-2 text-sm font-bold">
            {isTahap2Complete ? `${formData.surat_nama} (${formData.durasi_menit}m)` : 'Pilih Surat & Durasi'}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">Membaca mandiri minimal 15-30 menit</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${isTahap3Complete ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Tahap 3: Rekaman Mandiri</span>
            {isTahap3Complete ? (
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
            ) : (
              <span className="text-xs font-bold text-gray-400">0/1</span>
            )}
          </div>
          <div className="mt-2 text-sm font-bold">
            {isTahap3Complete ? 'Koreksi Mandiri Selesai' : 'Belum Merekam & Menyimak'}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">Rekam suara & dengarkan kembali</div>
        </div>
      </div>

      {/* 3. FORM INPUT HARIAN */}
      <Card className="rounded-3xl border-gray-200/80 shadow-md overflow-hidden bg-white">
        <CardHeader className="bg-gray-50/70 border-b border-gray-100 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" /> Lembar Jurnal Harian
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Lakukan 3 tahapan mandiri secara berurutan setiap hari.
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="tanggal-jurnal" className="text-xs font-bold text-gray-600">Tanggal:</Label>
                <Input 
                  id="tanggal-jurnal"
                  type="date" 
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="text-xs h-9 w-36 rounded-lg font-medium bg-white"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="pekan-ke" className="text-xs font-bold text-gray-600">Pekan:</Label>
                <select
                  id="pekan-ke"
                  value={formData.pekan_ke}
                  onChange={(e) => setFormData({ ...formData, pekan_ke: parseInt(e.target.value) || 1 })}
                  className="text-xs h-9 px-2.5 rounded-lg font-medium border border-gray-200 bg-white"
                >
                  {Array.from({ length: 13 }, (_, i) => i + 1).map(p => (
                    <option key={p} value={p}>Pekan {p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* TAHAP 1: SIMAK MUROTTAL 3X SEHARI */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">1</span>
                <span>Tahap 1: Simak Murottal 3x Sehari (Juz 30)</span>
              </h4>
              <span className="text-[10px] sm:text-[11px] text-indigo-700 bg-indigo-50 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                Wajib 3 Sesi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.simak_1 ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400/20' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="checkbox" 
                  checked={formData.simak_1}
                  onChange={(e) => setFormData({ ...formData, simak_1: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-900">Simak ke-1 (Pagi / Shubuh)</div>
                  <div className="text-[11px] text-gray-500">Mendengar murni fokus pada makhraj</div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.simak_2 ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400/20' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="checkbox" 
                  checked={formData.simak_2}
                  onChange={(e) => setFormData({ ...formData, simak_2: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-900">Simak ke-2 (Siang / Zhuhur)</div>
                  <div className="text-[11px] text-gray-500">Menyimak sambil memandang mushaf</div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.simak_3 ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400/20' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="checkbox" 
                  checked={formData.simak_3}
                  onChange={(e) => setFormData({ ...formData, simak_3: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-900">Simak ke-3 (Sore / Malam)</div>
                  <div className="text-[11px] text-gray-500">Menyelaraskan ketukan & tajwid</div>
                </div>
              </label>
            </div>
          </div>

          {/* TAHAP 2: LATIHAN MEMBACA MANDIRI */}
          <div className="space-y-3.5 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">2</span>
                <span>Tahap 2: Latihan Membaca Mandiri (Juz 30)</span>
              </h4>
              <span className="text-[10px] sm:text-[11px] text-emerald-700 bg-emerald-50 font-bold px-2.5 py-0.5 rounded-full border border-emerald-100">
                Min. 15-30 Menit
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="surat-nama" className="text-xs font-semibold text-gray-700">Surat yang Dilatih:</Label>
                <select
                  id="surat-nama"
                  value={formData.surat_nama}
                  onChange={(e) => setFormData({ ...formData, surat_nama: e.target.value })}
                  className="mt-1 w-full text-xs h-10 px-3 rounded-xl border border-gray-200 bg-white font-medium"
                >
                  {JUZ_30_SURAT.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="ayat-range" className="text-xs font-semibold text-gray-700">Rentang Ayat:</Label>
                <Input
                  id="ayat-range"
                  placeholder="Contoh: 1-10 atau 1-Selesai"
                  value={formData.ayat_range || ''}
                  onChange={(e) => setFormData({ ...formData, ayat_range: e.target.value })}
                  className="mt-1 text-xs h-10 rounded-xl bg-white"
                />
              </div>

              <div>
                <Label htmlFor="durasi-menit" className="text-xs font-semibold text-gray-700">Durasi Latihan (Menit):</Label>
                <Input
                  id="durasi-menit"
                  type="number"
                  min={5}
                  max={120}
                  value={formData.durasi_menit || 20}
                  onChange={(e) => setFormData({ ...formData, durasi_menit: parseInt(e.target.value) || 0 })}
                  className="mt-1 text-xs h-10 rounded-xl bg-white"
                />
              </div>
            </div>
          </div>

          {/* CHECKLIST PROGRAM YANG DIIKUTI */}
          <div className="space-y-3 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span>Kelas Pembinaan yang Sedang Diikuti Ukhti (Multi-Pilihan):</span>
              </Label>
              <span className="text-[10px] text-purple-600 bg-purple-50 font-bold px-2 py-0.5 rounded-md">
                Bisa Pilih &gt;1
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRA_TIKRAR_TASHIH_CLASS_TYPES.map(cls => {
                const isChecked = (formData.jenis_kelas_list || []).includes(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleJenisKelas(cls.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      isChecked
                        ? 'bg-purple-50/80 border-purple-400 ring-1 ring-purple-400/30 text-purple-950 font-bold shadow-xs'
                        : 'bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 mt-0.5 transition-all ${
                      isChecked ? 'bg-purple-600 text-white' : 'border border-gray-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                        <span>{cls.icon}</span>
                        <span>{cls.label}</span>
                      </div>
                      {cls.desc && <div className="text-[10px] text-gray-500 font-normal leading-tight">{cls.desc}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAHAP 3: SIMAK / TASMI' REKAMAN MANDIRI */}
          <div className="space-y-3.5 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">3</span>
                <span>Tahap 3: Simak / Tasmi&apos; Rekaman Mandiri (Koreksi Mandiri)</span>
              </h4>
              <span className="text-[10px] sm:text-[11px] text-purple-700 bg-purple-50 font-bold px-2.5 py-0.5 rounded-full border border-purple-100">
                Wajib Koreksi Mandiri
              </span>
            </div>

            <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.rekam_mandiri ? 'bg-purple-50/80 border-purple-300 ring-1 ring-purple-400/20' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
              <input 
                type="checkbox" 
                checked={!!formData.rekam_mandiri}
                onChange={(e) => setFormData({ ...formData, rekam_mandiri: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-purple-600" />
                  <span>Sudah merekam suara sendiri dan mendengarkan kembali untuk mengoreksi kesalahan makhraj/mad</span>
                </div>
                <div className="text-[11px] text-gray-500 leading-relaxed">
                  Mendengarkan rekaman suara sendiri sebelum talaqqi/tashih membantu telinga mengenali letak ketidaktepatan bacaan sebelum dibimbing Ustadzah di sesi Zoom.
                </div>
              </div>
            </label>
          </div>

          {/* OPSIONAL: CATATAN KENDALA THALIBAH */}
          <div className="space-y-2 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <Label htmlFor="catatan-thalibah" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                <span>Catatan / Kendala Latihan Hari Ini (Opsional):</span>
              </Label>
              <span className="text-[10px] text-gray-400 font-semibold">Opsional</span>
            </div>
            <textarea
              id="catatan-thalibah"
              rows={2}
              placeholder="Contoh: Masih terasa berat mengalirkan suara di huruf 'ain dan ghain pada ayat 5..."
              value={formData.catatan_santri || ''}
              onChange={(e) => setFormData({ ...formData, catatan_santri: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* TOMBOL SIMPAN */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={handleSaveDaily}
              disabled={saving || isLocked}
              className={`w-full h-11 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                isLocked
                  ? 'bg-gray-400 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Jurnal Pra-Tikrar...</span>
                </>
              ) : isLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pengisian Jurnal Ditutup ({lock.badgeLabel})</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Jurnal Pra-Tikrar Hari Ini</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
