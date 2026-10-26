'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Calendar, Clock, Video, CheckCircle2, AlertCircle, 
  Sparkles, Headphones, GraduationCap, Save, History, Info, 
  Mic, Check, FileText, Loader2, ArrowRight
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
      toast.error(e?.message || 'Gagal menyimpan jurnal');
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
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl border border-white/20 transition-all"
            >
              <Video className="w-3.5 h-3.5 text-emerald-300" />
              <span>Jadwal 23 Sesi Zoom Bebas</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. RINGKASAN PROGRESS 3 TAHAPAN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="border border-indigo-100 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${totalCompletedStages === 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tahapan Hari Ini</div>
              <div className="text-base font-extrabold text-gray-900">
                {totalCompletedStages} dari 3 Tahap
                <span className="text-xs font-normal text-gray-500 ml-1.5">
                  ({Math.round((totalCompletedStages / 3) * 100)}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-indigo-100 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Simak Murottal</div>
              <div className="text-base font-extrabold text-gray-900">
                {completedSimakCount} / 3 Sesi
                <span className="text-xs font-normal text-gray-500 ml-1.5">
                  ({completedSimakCount === 3 ? 'Tuntas' : 'Berjalan'})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-indigo-100 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Halaqah yang Diikuti</div>
              <div className="text-base font-extrabold text-gray-900">
                {(formData.jenis_kelas_list || []).length} Program
                <span className="text-xs font-normal text-gray-500 ml-1.5">aktif</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. LEMBAR PENGISIAN JURNAL: 3 TAHAPAN WAJIB + PILIHAN HALAQAH & OPSIONAL */}
      <Card className="border border-gray-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 w-full" />
        <CardHeader className="pb-4 border-b border-gray-100 bg-gray-50/50">
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

              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.simak_2 ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400/20' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>\
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

            {/* Metode Simakan Dominan */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 space-y-2">
              <Label className="text-xs font-bold text-gray-700">Metode Simakan Dominan Hari Ini:</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'murni', label: '1. Simak Murni', desc: 'Fokus mendengar tanpa bersuara' },
                  { id: 'gerak_bibir', label: '2. Gerak Bibir & Mushaf', desc: 'Menirukan gerak bibir & harakat' },
                  { id: 'selaras_ketukan', label: '3. Selaras Ketukan Murottal', desc: 'Menyamakan tempo dan makhraj' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, metode_simak: m.id })}
                    className={`p-2.5 text-left rounded-lg border text-xs transition-all ${formData.metode_simak === m.id ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500/30 font-bold text-indigo-900' : 'bg-white/60 border-gray-200 hover:bg-white text-gray-700'}`}
                  >
                    <div>{m.label}</div>
                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TAHAP 2: LATIHAN MANDIRI SURAT JUZ 30 */}
          <div className="space-y-3.5 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">2</span>
                <span>Tahap 2: Latihan Mandiri / Tilawah Bi An-Nadzar Surat Juz 30</span>
              </h4>
              <span className="text-[10px] sm:text-[11px] text-emerald-700 bg-emerald-50 font-bold px-2.5 py-0.5 rounded-full border border-emerald-100">
                Wajib Latihan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="surat-nama" className="text-xs font-bold text-gray-700">Nama Surat:</Label>
                <select
                  id="surat-nama"
                  value={formData.surat_nama || "78. An-Naba'"}
                  onChange={(e) => setFormData({ ...formData, surat_nama: e.target.value })}
                  className="w-full text-xs h-10 px-3 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {JUZ_30_SURAT.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="ayat-range" className="text-xs font-bold text-gray-700">Rentang Ayat:</Label>
                <Input 
                  id="ayat-range"
                  placeholder="Contoh: 1-10 atau 1-Selesai"
                  value={formData.ayat_range || ''}
                  onChange={(e) => setFormData({ ...formData, ayat_range: e.target.value })}
                  className="text-xs h-10 rounded-lg font-medium"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="durasi" className="text-xs font-bold text-gray-700">Durasi Latihan (Menit):</Label>
                <Input 
                  id="durasi"
                  type="number"
                  min={5}
                  step={5}
                  value={formData.durasi_menit || 0}
                  onChange={(e) => setFormData({ ...formData, durasi_menit: parseInt(e.target.value) || 0 })}
                  className="text-xs h-10 rounded-lg font-medium"
                />
              </div>
            </div>
          </div>

          {/* PROGRAM & HALAQAH BIMBINGAN YANG DIIKUTI (DIANJURKAN >1) */}
          <div className="space-y-3 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span>Halaqah &amp; Program Bimbingan yang Diikuti</span>
              </h4>
              <span className="text-[10px] text-purple-700 bg-purple-50 font-bold px-2.5 py-0.5 rounded-full border border-purple-100">
                Dianjurkan &gt;1 Halaqah
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              Pilih seluruh jenis halaqah/metode yang Ukhti ikuti (misalnya Iqro&apos;, Tahsin Juz 30, Talaqqi Zoom MTI, dsb.):
            </p>

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

          {/* OPSIONAL: CATATAN KENDALA SANTRIWATI */}
          <div className="space-y-2 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <Label htmlFor="catatan-santri" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                <span>Catatan / Kendala Latihan Hari Ini (Opsional):</span>
              </Label>
              <span className="text-[10px] text-gray-400 font-semibold">Opsional</span>
            </div>
            <textarea
              id="catatan-santri"
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
              disabled={saving}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Jurnal Pra-Tikrar...</span>
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
