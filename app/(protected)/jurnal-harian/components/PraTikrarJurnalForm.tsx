'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Calendar, Clock, Video, CheckCircle2, AlertCircle, 
  Sparkles, Headphones, GraduationCap, Save, History, Info, 
  ChevronRight, ArrowRight, Check, FileText, HeartHandshake, Loader2
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
  PRA_TIKRAR_TASHIH_CLASS_TYPES,
  PRA_TIKRAR_ASAL_BIMBINGAN,
  PRA_TIKRAR_KATEGORI_KELAS,
  getJenisKelasLabel,
  getAsalBimbinganLabel,
  getKategoriKelasLabel,
  PraTikrarContextResponse,
  PraTikrarEntryInput
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

const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

interface PraTikrarJurnalFormProps {
  user: any;
  activeBatch?: any;
  activeRegistration?: any;
}

export function PraTikrarJurnalForm({ user, activeBatch, activeRegistration }: PraTikrarJurnalFormProps) {
  const [context, setContext] = useState<PraTikrarContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State (Thalibah Daily Entry)
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
    catatan_santri: '',
    jenis_kelas: 'tahsin_juz30',
    jenis_kelas_custom: '',
    asal_bimbingan: 'internal_mti',
    kategori_kelas: 'umum',
    halaqah_id: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPraTikrarContext();
      setContext(res);

      if (res.todayEntry) {
        setFormData({
          batch_id: res.todayEntry.batch_id || res.activeBatch?.id,
          halaqah_id: res.todayEntry.halaqah_id || '',
          tanggal: res.todayEntry.tanggal || new Date().toISOString().split('T')[0],
          pekan_ke: res.todayEntry.pekan_ke || 1,
          simak_1: !!res.todayEntry.simak_1,
          simak_2: !!res.todayEntry.simak_2,
          simak_3: !!res.todayEntry.simak_3,
          metode_simak: res.todayEntry.metode_simak || 'murni',
          surat_nama: res.todayEntry.surat_nama || "78. An-Naba'",
          ayat_range: res.todayEntry.ayat_range || '1-10',
          durasi_menit: res.todayEntry.durasi_menit || 20,
          catatan_santri: res.todayEntry.catatan_santri || '',
          jenis_kelas: res.todayEntry.jenis_kelas || 'tahsin_juz30',
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
  const totalEntriesCount = context?.history?.length || 0;

  return (
    <div className="space-y-6">
      {/* 1. HEADER CARD / STATUS BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-emerald-950 text-white p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Program Pra-Tikrar (Juz 30)
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-medium">
              🌸 SOP Simak Murottal 3x Sehari
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Jurnal Harian Pra-Tikrar
          </h1>
          <p className="text-indigo-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Catat pembiasaan mendengar murottal 3x sehari, perbaikan makharijul huruf & sifat huruf, serta materi latihan surat-surat Juz 30.
          </p>

          {/* Quick link to Jadwal Sesi Tatap Muka Zoom */}
          <div className="pt-2">
            <Link
              href="/jadwal-harian"
              className="inline-flex items-center gap-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl border border-white/20 transition-all shadow-xs group"
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lihat 23 Jadwal Sesi Tatap Muka Zoom di menu <strong>Jadwal Harian</strong></span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. STATS BAR / CAPAIAN HARI INI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="border border-indigo-100 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Simak Hari Ini</div>
              <div className="text-base font-extrabold text-gray-900">
                {completedSimakCount} / 3 Sesi
                <span className="text-xs font-normal text-gray-500 ml-1.5">
                  ({completedSimakCount === 3 ? 'Tuntas 100%' : 'Sedang berjalan'})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Hari Setor</div>
              <div className="text-base font-extrabold text-gray-900">
                {totalEntriesCount} Hari
                <span className="text-xs font-normal text-gray-500 ml-1.5">terekam</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-100 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status Evaluasi Asatidzah</div>
              <div className="text-xs font-bold text-gray-900">
                {context?.todayEntry?.status_bacaan === 'lancar_mutqin' ? (
                  <span className="text-emerald-700 font-extrabold">✓ Lancar & Mutqin</span>
                ) : context?.todayEntry?.status_bacaan === 'cukup' ? (
                  <span className="text-blue-700 font-extrabold">✓ Cukup Baik</span>
                ) : context?.todayEntry?.status_bacaan === 'perlu_bimbingan' ? (
                  <span className="text-amber-700 font-extrabold">Perlu Bimbingan</span>
                ) : (
                  <span className="text-gray-500 font-normal">Belum ditashih hari ini</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. LEMBAR FORMULIR PENGISIAN JURNAL */}
      <Card className="border border-gray-200 shadow-xs rounded-2xl bg-white overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 w-full" />
        <CardHeader className="pb-4 border-b border-gray-100 bg-gray-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" /> Lembar Pengisian Jurnal Mandiri
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Isi secara jujur dan konsisten setiap hari untuk membentuk kebiasaan mendengar dan bertilawah yang fasih.
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
          {/* Bagian A: SOP Simak Murottal 3x Sehari */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                <Headphones className="w-4 h-4 text-indigo-600" />
                1. SOP Menyimak Murottal 3x Sehari (Juz 30)
              </h4>
              <span className="text-[10px] sm:text-[11px] text-indigo-700 bg-indigo-50 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                Wajib Minimal 3x Sehari
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.simak_1 ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
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

              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.simak_2 ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
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

              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.simak_3 ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
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

            {/* Pilihan Metode Simak Dominan */}
            <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80 space-y-2">
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
                    className={`p-2.5 text-left rounded-lg border text-xs transition-all ${formData.metode_simak === m.id ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500/30' : 'bg-white/60 border-gray-200 hover:bg-white'}`}
                  >
                    <div className="font-bold text-gray-900">{m.label}</div>
                    <div className="text-[10px] text-gray-500">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bagian B: Materi Latihan Mandiri Surat Juz 30 */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              2. Materi Latihan Mandiri Surat Juz 30
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="surat-nama" className="text-xs font-bold text-gray-700">Nama Surat:</Label>
                <select
                  id="surat-nama"
                  value={formData.surat_nama}
                  onChange={(e) => setFormData({ ...formData, surat_nama: e.target.value })}
                  className="w-full text-xs h-10 px-3 rounded-lg border border-gray-200 bg-white font-medium"
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
                  value={formData.ayat_range}
                  onChange={(e) => setFormData({ ...formData, ayat_range: e.target.value })}
                  className="text-xs h-10 rounded-lg"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="durasi" className="text-xs font-bold text-gray-700">Durasi Latihan (Menit):</Label>
                <Input 
                  id="durasi"
                  type="number"
                  min={5}
                  step={5}
                  value={formData.durasi_menit}
                  onChange={(e) => setFormData({ ...formData, durasi_menit: parseInt(e.target.value) || 0 })}
                  className="text-xs h-10 rounded-lg font-medium"
                />
              </div>
            </div>
          </div>

          {/* Bagian C: Jenis Kelas Bimbingan Tashih */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              3. Jenis Kelas Bimbingan / Tashih yang Diikuti
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="jenis-kelas" className="text-xs font-bold text-gray-700">Jenis Kelas / Kurikulum:</Label>
                <select
                  id="jenis-kelas"
                  value={formData.jenis_kelas || 'tahsin_juz30'}
                  onChange={(e) => setFormData({ ...formData, jenis_kelas: e.target.value })}
                  className="w-full text-xs h-10 px-3 rounded-lg border border-gray-200 bg-white font-medium"
                >
                  {PRA_TIKRAR_TASHIH_CLASS_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="asal-bimbingan" className="text-xs font-bold text-gray-700">Asal Bimbingan:</Label>
                <select
                  id="asal-bimbingan"
                  value={formData.asal_bimbingan || 'internal_mti'}
                  onChange={(e) => setFormData({ ...formData, asal_bimbingan: e.target.value })}
                  className="w-full text-xs h-10 px-3 rounded-lg border border-gray-200 bg-white font-medium"
                >
                  {PRA_TIKRAR_ASAL_BIMBINGAN.map(a => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="kategori-kelas" className="text-xs font-bold text-gray-700">Kategori Kelas:</Label>
                <select
                  id="kategori-kelas"
                  value={formData.kategori_kelas || 'umum'}
                  onChange={(e) => setFormData({ ...formData, kategori_kelas: e.target.value })}
                  className="w-full text-xs h-10 px-3 rounded-lg border border-gray-200 bg-white font-medium"
                >
                  {PRA_TIKRAR_KATEGORI_KELAS.map(k => (
                    <option key={k.id} value={k.id}>{k.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom text jika memilih 'lainnya' */}
            {formData.jenis_kelas === 'lainnya' && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="jenis-kelas-custom" className="text-xs font-bold text-gray-700">
                  Tuliskan Nama Metode / Kitab Bimbingan:
                </Label>
                <Input
                  id="jenis-kelas-custom"
                  placeholder="Misal: Kitab Tuhfatul Athfal, Kajian Ustadz Fulan, dll..."
                  value={formData.jenis_kelas_custom || ''}
                  onChange={(e) => setFormData({ ...formData, jenis_kelas_custom: e.target.value })}
                  className="text-xs h-10 rounded-lg"
                />
              </div>
            )}

            {/* Sesi Zoom MTI Hari Ini (Opsional) */}
            {context?.availableSessions && context.availableSessions.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="sesi-zoom" className="text-xs font-bold text-gray-700">
                  Sesi Zoom MTI yang Dihadiri Hari Ini (Opsional):
                </Label>
                <select
                  id="sesi-zoom"
                  value={formData.halaqah_id || ''}
                  onChange={(e) => setFormData({ ...formData, halaqah_id: e.target.value })}
                  className="w-full text-xs h-10 px-3 rounded-lg border border-gray-200 bg-white font-medium"
                >
                  <option value="">-- Belajar Mandiri / Tidak Ikut Zoom Hari Ini --</option>
                  {context.availableSessions.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {DAYS[s.day_of_week]}, {s.start_time?.slice(0,5)} - {s.end_time?.slice(0,5)} WIB • {s.muallimah_name || 'Ustadzah'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Bagian D: Catatan / Kendala Santriwati */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <Label htmlFor="catatan-santri" className="text-xs sm:text-sm font-bold text-gray-900">
              4. Catatan Kendala Santriwati (Huruf / Tajwid)
            </Label>
            <textarea
              id="catatan-santri"
              rows={3}
              placeholder="Tuliskan kendala makhraj huruf yang masih berat atau belum lancar (misal: huruf 'Ain, Dhad, Haa, atau panjang mad)..."
              value={formData.catatan_santri || ''}
              onChange={(e) => setFormData({ ...formData, catatan_santri: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Action Save Button */}
          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleSaveDaily}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-7 py-2.5 rounded-xl shadow-md shadow-emerald-600/20"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Menyimpan Jurnal...' : 'Simpan Jurnal Pra-Tikrar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. RIWAYAT SETORAN JURNAL TERAKHIR */}
      {context?.history && context.history.length > 0 && (
        <Card className="border border-gray-200 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-600" />
              Riwayat Jurnal Pra-Tikrar Terakhir
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Catatan setoran mandiri dan evaluasi bacaan dari Mu'allimah pembimbing.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 overflow-x-auto">
              {context.history.slice(0, 10).map((item: any) => {
                const dateObj = new Date(item.tanggal);
                const dayName = DAYS[dateObj.getDay()];
                const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                const simaks = [item.simak_1 && '1', item.simak_2 && '2', item.simak_3 && '3'].filter(Boolean).join(', ');

                return (
                  <div key={item.id} className="p-4 sm:px-6 hover:bg-gray-50/70 transition-colors space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">{dayName}, {dateStr}</span>
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                          Pekan {item.pekan_ke || 1}
                        </span>
                        {item.status_bacaan && item.status_bacaan !== 'belum_tashih' && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.status_bacaan === 'lancar_mutqin' ? 'bg-emerald-100 text-emerald-800' :
                            item.status_bacaan === 'cukup' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            Tashih: {item.status_bacaan.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-500 flex items-center gap-2">
                        <span>Durasi: <strong>{item.durasi_menit || 0} Menit</strong></span>
                        <span>•</span>
                        <span>Simak: <strong>{simaks ? `Sesi ${simaks}` : 'Belum'}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-700">
                      <div>
                        Surat: <strong className="text-gray-900">{item.surat_nama || '-'}</strong> ({item.ayat_range || 'Semua ayat'})
                      </div>
                      <div>
                        Kelas: <span className="text-gray-600">{getJenisKelasLabel(item.jenis_kelas, item.jenis_kelas_custom)}</span>
                      </div>
                    </div>

                    {item.catatan_santri && (
                      <p className="text-xs text-gray-600 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        "{item.catatan_santri}"
                      </p>
                    )}

                    {item.catatan_muallimah && (
                      <div className="text-xs text-emerald-900 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/80 space-y-1">
                        <div className="font-bold text-[11px] text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Catatan Mu'allimah Pembimbing:
                        </div>
                        <p className="italic">"{item.catatan_muallimah}"</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
