'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, MapPin, School, AlertCircle, ChevronDown, Calendar, Minus, Plus, Video, Sparkles, Check, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRA_TIKRAR_TASHIH_CLASS_TYPES } from '@/lib/pra-tikrar'

export interface MuallimahOption {
  id: string
  user_id: string
  full_name: string
}

export interface PraTikrarHalaqahOption {
  id: string
  name: string
  label: string
  short_label?: string
  day_of_week?: number
  start_time?: string
  end_time?: string
  ustadzah_id?: string | null
  ustadzah_name?: string | null
}

interface TashihEntryFormProps {
  initialData: {
    id?: string
    blok: string[]
    lokasi: 'mti' | 'luar'
    lokasiDetail: string
    ustadzahId: string | null
    ustadzahName: string | null
    halaqahId?: string | null
    halaqahIds?: string[]
    halaqahNames?: string | null
    jenisKelas?: string[]
    jumlahKesalahanTajwid: number
    masalahTajwid: string[]
    catatanTambahan: string
    tanggalTashih: string
  }
  availableMuallimah: MuallimahOption[]
  isLoadingMuallimah: boolean
  isSubmitting: boolean
  isPraTikrar?: boolean
  praTikrarHalaqahs?: PraTikrarHalaqahOption[]
  onSubmit: (data: any) => void
  onCancel: () => void
}

const masalahTajwidOptions = [
  { id: 'mad', name: 'Mad' },
  { id: 'qolqolah', name: 'Qolqolah' },
  { id: 'ghunnah', name: 'Ghunnah' },
  { id: 'ikhfa', name: 'Ikhfa' },
  { id: 'idghom', name: 'Idghom' },
  { id: 'izhar', name: 'Izhar' },
  { id: 'waqaf', name: 'Waqaf' },
  { id: 'makhroj', name: 'Makhroj' },
  { id: 'sifat', name: 'Sifat' },
  { id: 'lainnya', name: 'Lainnya' }
]

export function TashihEntryForm({
  initialData,
  availableMuallimah,
  isLoadingMuallimah,
  isSubmitting,
  isPraTikrar = false,
  praTikrarHalaqahs = [],
  onSubmit,
  onCancel
}: TashihEntryFormProps) {
  const [formData, setFormData] = useState({
    ...initialData,
    halaqahIds: initialData.halaqahIds || (initialData.halaqahId ? [initialData.halaqahId] : []),
    jenisKelas: initialData.jenisKelas || (isPraTikrar ? ['talaqqi_zoom', 'tahsin_juz30'] : [])
  })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [teacherSearch, setTeacherSearch] = useState('')
  const [sessionSearch, setSessionSearch] = useState('')
  const [showAllSessions, setShowAllSessions] = useState(false)
  
  const filteredMuallimah = availableMuallimah.filter(m => 
    m.full_name.toLowerCase().includes(teacherSearch.toLowerCase())
  )

  const filteredSessions = praTikrarHalaqahs.filter(h => 
    h.label.toLowerCase().includes(sessionSearch.toLowerCase())
  )

  const toggleMasalahTajwid = (id: string) => {
    setFormData(prev => ({
      ...prev,
      masalahTajwid: prev.masalahTajwid.includes(id)
        ? prev.masalahTajwid.filter(m => m !== id)
        : [...prev.masalahTajwid, id]
    }))
  }

  // Toggle multi-pilihan sesi Zoom halaqah Pra-Tikrar
  const toggleHalaqahSession = (sessionId: string) => {
    setFormData(prev => {
      const exists = prev.halaqahIds.includes(sessionId)
      const nextHalaqahIds = exists
        ? prev.halaqahIds.filter(id => id !== sessionId)
        : [...prev.halaqahIds, sessionId]
      
      const selectedSessions = praTikrarHalaqahs.filter(h => nextHalaqahIds.includes(h.id))
      const teachers = Array.from(new Set(selectedSessions.map(s => s.ustadzah_name).filter(Boolean))) as string[]
      const teacherIds = Array.from(new Set(selectedSessions.map(s => s.ustadzah_id).filter(Boolean))) as string[]
      const sessionLabels = selectedSessions.map(s => s.short_label || s.name).join('; ')

      return {
        ...prev,
        halaqahIds: nextHalaqahIds,
        halaqahId: nextHalaqahIds[0] || null,
        halaqahNames: sessionLabels,
        lokasi: nextHalaqahIds.length > 0 ? 'mti' : prev.lokasi,
        ustadzahName: teachers.length > 0 ? teachers.join(', ') : prev.ustadzahName,
        ustadzahId: teacherIds.length > 0 ? teacherIds[0] : prev.ustadzahId
      }
    })
  }

  // Toggle multi-pilihan metode/jenis kelas bimbingan (Iqro, Tahsin, dll.)
  const toggleJenisKelas = (classId: string) => {
    setFormData(prev => {
      const exists = prev.jenisKelas.includes(classId)
      const next = exists
        ? prev.jenisKelas.filter(c => c !== classId)
        : [...prev.jenisKelas, classId]
      return {
        ...prev,
        jenisKelas: next
      }
    })
  }

  const isValid = !!(
    formData.blok.length > 0 &&
    formData.tanggalTashih &&
    (isPraTikrar
      ? (formData.halaqahIds.length > 0 || formData.jenisKelas.length > 0 || !!formData.ustadzahName || !!formData.lokasiDetail)
      : (formData.lokasi && (formData.lokasi === 'luar' ? formData.lokasiDetail : !!formData.ustadzahId)))
  )

  const selectedSessionsCount = formData.halaqahIds.length
  const selectedClassesCount = formData.jenisKelas.length

  return (
    <div className="space-y-4 animate-fadeInUp">
      {/* Date & Block Info Card - Interactive Date */}
      <Card className="glass-premium border-none shadow-md overflow-hidden rounded-2xl">
        <div className={cn(
          "p-3 text-white flex items-center justify-between",
          isPraTikrar 
            ? "bg-gradient-to-r from-indigo-900 to-indigo-800"
            : "bg-gradient-to-r from-green-900 to-green-800"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 flex items-center gap-1.5 focus-within:ring-1 focus-within:ring-emerald-400 rounded transition-all">
                <input 
                  type="date"
                  value={formData.tanggalTashih}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggalTashih: e.target.value }))}
                  className="bg-transparent border-none p-0 text-emerald-50 text-[11px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer [color-scheme:dark] h-4"
                />
              </p>
              <p className="text-[8px] text-emerald-200/60 font-medium uppercase tracking-tight">Klik tanggal untuk ubah</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-amber-500/20 backdrop-blur-sm rounded-xl border border-amber-500/30">
            <span className="text-[11px] font-black uppercase text-amber-100 tracking-tighter">{formData.blok.join(', ')}</span>
          </div>
        </div>
      </Card>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
        {/* KHUSUS PRA-TIKRAR: MULTI-SELECT HALAQAH & JENIS BIMBINGAN (DIANJURKAN > 1) */}
        {isPraTikrar ? (
          <div className="space-y-4">
            {/* Anjuran Mengikuti Lebih dari 1 Halaqah */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-2xl p-3.5 shadow-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                  <span>Anjuran Halaqah Pra-Tikrar (Bisa Pilih &gt; 1)</span>
                  <span className="text-[10px] bg-indigo-200/60 text-indigo-900 px-2 py-0.5 rounded-full font-extrabold">
                    {selectedSessionsCount + selectedClassesCount} Terpilih
                  </span>
                </div>
                <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                  Pada program Pra-Tikrar, thalibah <strong>sangat dianjurkan mengikuti lebih dari satu halaqah / bimbingan tashih</strong> (misal: Sesi Zoom MTI + Kelas Iqro&apos; / Tahsin / An-Nuraniyah) untuk percepatan kelenturan lisan dan kelulusan Juz 30.
                </p>
              </div>
            </div>

            {/* Bagian 1: Jenis Program / Metode Bimbingan yang Diikuti (Iqro, Tahsin, dll.) */}
            <Card className="border border-indigo-100 shadow-sm p-4 rounded-3xl bg-white space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>1. Metode &amp; Program Bimbingan yang Diikuti</span>
                </label>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {selectedClassesCount} Metode
                </span>
              </div>

              <p className="text-[11px] text-gray-500 leading-tight">
                Pilih seluruh program bimbingan yang Ukhti ikuti pekan ini (misalnya Iqro&apos;, Tahsin Juz 30, dll.):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRA_TIKRAR_TASHIH_CLASS_TYPES.map(cls => {
                  const isChecked = formData.jenisKelas.includes(cls.id)
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleJenisKelas(cls.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5",
                        isChecked
                          ? "bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-400/30 text-indigo-950 font-bold shadow-xs"
                          : "bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 mt-0.5 transition-all",
                        isChecked ? "bg-indigo-600 text-white" : "border border-gray-300 bg-white"
                      )}>
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
                  )
                })}
              </div>
            </Card>

            {/* Bagian 2: Sesi Halaqah Zoom MTI yang Diikuti (23 Sesi Open Schedule) */}
            <Card className="border border-indigo-100 shadow-sm p-4 rounded-3xl bg-white space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-emerald-600" />
                  <span>2. Sesi Halaqah Zoom MTI yang Dihadiri</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  {selectedSessionsCount} Sesi Dipilih
                </span>
              </div>

              <p className="text-[11px] text-gray-500 leading-tight">
                Centang satu atau beberapa sesi Zoom yang Ukhti hadiri. Nama Ustadzah pengampu otomatis tercatat:
              </p>

              {/* Search Sesi Zoom */}
              <input
                type="text"
                placeholder="Cari hari, jam, atau nama Ustadzah..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500"
              />

              {/* List Sesi Zoom */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-50">
                {(showAllSessions || sessionSearch ? filteredSessions : filteredSessions.slice(0, 6)).map(session => {
                  const isChecked = formData.halaqahIds.includes(session.id)
                  return (
                    <label
                      key={session.id}
                      className={cn(
                        "flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs transition-all",
                        isChecked
                          ? "bg-emerald-50/80 border border-emerald-300 font-bold text-emerald-950"
                          : "hover:bg-gray-50 text-gray-800"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleHalaqahSession(session.id)}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1 text-[11px]">
                        <span>{session.label}</span>
                      </div>
                    </label>
                  )
                })}
              </div>

              {filteredSessions.length > 6 && !sessionSearch && (
                <button
                  type="button"
                  onClick={() => setShowAllSessions(!showAllSessions)}
                  className="w-full text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 py-1.5 bg-indigo-50/50 rounded-lg transition-all"
                >
                  {showAllSessions ? 'Tampilkan Lebih Sedikit' : `Lihat Semua 23 Jadwal Sesi Zoom (+${filteredSessions.length - 6})`}
                </button>
              )}

              {/* Info Ustadzah yang Terpilih Otomatis */}
              {formData.ustadzahName && (
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/80 text-xs">
                  <div className="text-[10px] uppercase font-bold text-gray-500">Ustadzah Pengampu Tercatat:</div>
                  <div className="font-extrabold text-indigo-950 mt-0.5">{formData.ustadzahName}</div>
                </div>
              )}
            </Card>

            {/* Bimbingan / Lokasi Tambahan Luar MTI (Opsional jika ikut kelas luar) */}
            <Card className="border border-gray-200/80 shadow-xs p-3.5 rounded-2xl bg-gray-50/50 space-y-1.5">
              <label className="text-[10px] font-bold text-gray-600 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>Keterangan Lembaga / Bimbingan Luar (Opsional):</span>
              </label>
              <input
                type="text"
                value={formData.lokasiDetail}
                onChange={(e) => setFormData(prev => ({ ...prev, lokasiDetail: e.target.value }))}
                placeholder="Contoh: Tahsin Masjid Al-Ikhlas, Privat Ustadzah Fulanah..."
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
              />
            </Card>
          </div>
        ) : (
          /* TAMPILAN REGULER TIKRAR TAHFIDZ (1 LOKASI + 1 USTADZAH) */
          <>
            {/* Location Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900/80 pl-1">Pilih Lokasi</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, lokasi: 'mti', lokasiDetail: '' }))}
                  className={cn(
                    "p-3 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-1.5 relative overflow-hidden group shadow-md",
                    formData.lokasi === 'mti'
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-emerald-600/10"
                      : "border-transparent bg-white text-gray-900 hover:border-emerald-200"
                  )}
                >
                  <School className={cn("w-5 h-5", formData.lokasi === 'mti' ? "text-white" : "text-emerald-600")} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Markaz (MTI)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, lokasi: 'luar' }))}
                  className={cn(
                    "p-3 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-1.5 relative overflow-hidden group shadow-md",
                    formData.lokasi === 'luar'
                      ? "border-amber-500 bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-amber-500/10"
                      : "border-transparent bg-white text-gray-900 hover:border-amber-200"
                  )}
                >
                  <MapPin className={cn("w-5 h-5", formData.lokasi === 'luar' ? "text-white" : "text-amber-500")} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Luar MTI</span>
                </button>
              </div>
            </div>

            {/* Location Detail or Teacher Selection */}
            <Card className="glass-premium border-none shadow-md p-4 rounded-3xl relative z-[100]">
              {formData.lokasi === 'luar' ? (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-emerald-900/80 flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Nama Lokasi Luar
                  </label>
                  <input
                    type="text"
                    value={formData.lokasiDetail}
                    onChange={(e) => setFormData(prev => ({ ...prev, lokasiDetail: e.target.value }))}
                    placeholder="Masjid, Rumah, Bimbingan Luar, dll."
                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-gray-400 shadow-inner"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-emerald-900/80 flex items-center gap-2">
                    <School className="w-3 h-3" /> Ustadzah Pemeriksa
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-900 text-left flex items-center justify-between shadow-inner transition-all hover:bg-gray-100"
                    >
                      <span className={formData.ustadzahId || formData.ustadzahName ? "text-gray-900" : "text-gray-400"}>
                        {formData.ustadzahName || 'Pilih Ustadzah...'}
                      </span>
                      <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isDropdownOpen && "rotate-180")} />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeInScale">
                        <div className="p-2 border-b border-gray-50 bg-gray-50/50">
                          <input 
                            type="text"
                            placeholder="Cari nama ustadzah..."
                            value={teacherSearch}
                            onChange={(e) => setTeacherSearch(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-[10px] font-bold text-gray-900 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        
                        <div className="max-h-52 overflow-y-auto p-1.5 scrollbar-hide">
                          {isLoadingMuallimah ? (
                            <div className="p-4 text-center">
                              <div className="inline-block w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                              <div className="text-[9px] font-bold text-gray-400 uppercase">Memuat Daftar...</div>
                            </div>
                          ) : filteredMuallimah.length > 0 ? (
                            filteredMuallimah.map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, ustadzahId: m.user_id, ustadzahName: m.full_name }));
                                  setIsDropdownOpen(false);
                                  setTeacherSearch('');
                                }}
                                className={cn(
                                  "w-full text-left p-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all mb-1",
                                  formData.ustadzahId === m.user_id ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10" : "hover:bg-emerald-50 text-gray-700"
                                )}
                              >
                                {m.full_name}
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center">
                              <p className="text-[9px] font-bold text-gray-400 uppercase mb-3">Ustadzah tidak ditemukan</p>
                              <Button 
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (teacherSearch.trim()) {
                                    setFormData(prev => ({ ...prev, ustadzahName: teacherSearch.trim(), ustadzahId: 'manual' }));
                                    setIsDropdownOpen(false);
                                  }
                                }}
                                className="w-full text-[9px] h-8 font-black uppercase tracking-widest border-amber-200 text-amber-700 hover:bg-amber-50"
                              >
                                Pakai Nama &quot;{teacherSearch}&quot;
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Counter Section - Condensed */}
        <Card className="glass-premium border-none shadow-md p-4 rounded-3xl overflow-hidden relative z-0">
          <div className="relative z-10 flex flex-col items-center">
            <label className="text-[9px] font-black uppercase tracking-widest text-emerald-900/80 mb-2">Total Kesalahan Tajwid</label>
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, jumlahKesalahanTajwid: Math.max(0, prev.jumlahKesalahanTajwid - 1) }))}
                className="w-10 h-10 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:text-red-500 transition-all active:scale-95"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="text-5xl font-black text-gray-900 tabular-nums tracking-tighter">
                {formData.jumlahKesalahanTajwid}
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, jumlahKesalahanTajwid: prev.jumlahKesalahanTajwid + 1 }))}
                className="w-10 h-10 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:text-emerald-600 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-3 opacity-[0.05]">
             <AlertCircle className="w-16 h-16 text-emerald-950" />
          </div>
        </Card>

        {/* Tajwid Specific Blocks - Compact Chips */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900/80 pl-1">Detail Masalah Tajwid</label>
          <div className="flex flex-wrap gap-1.5">
            {masalahTajwidOptions.map(opt => {
              const isSelected = formData.masalahTajwid.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleMasalahTajwid(opt.id)}
                  className={cn(
                    "px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all duration-300 border-2",
                    isSelected
                      ? "bg-red-600 border-red-600 text-white shadow-md shadow-red-600/10 scale-105"
                      : "bg-white border-gray-200 text-gray-600 hover:border-red-100"
                  )}
                >
                  {opt.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes - Compact */}
        <Card className="glass-premium border-none shadow-md p-3 rounded-2xl">
          <textarea
            value={formData.catatanTambahan}
            onChange={(e) => setFormData(prev => ({ ...prev, catatanTambahan: e.target.value }))}
            placeholder="Catatan tambahan hasil tashih (opsional)..."
            className="w-full bg-transparent border-none rounded-xl p-1 text-[11px] font-bold text-gray-900 focus:ring-0 transition-all placeholder:text-gray-400 h-16 resize-none"
          />
        </Card>

        {/* Submit Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className={cn(
              "w-full h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all",
              isValid && !isSubmitting
                ? (isPraTikrar
                    ? "bg-gradient-to-r from-indigo-700 to-indigo-800 text-white hover:from-indigo-800 hover:to-indigo-900 shadow-indigo-500/10"
                    : "bg-gradient-to-r from-emerald-700 to-teal-800 text-white hover:from-emerald-800 hover:to-teal-900 shadow-emerald-500/10")
                : "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
            )}
          >
            {isSubmitting ? 'Simpan...' : 'Simpan Tashih'}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
            className="h-10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900"
          >
            Batal
          </Button>
        </div>
      </form>
    </div>
  )
}
