'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, BookOpen, MessageSquare, Sparkles, Star, User, Phone, Mic, Headphones, ArrowRight, X, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadJurnalScreenshot } from '../actions'
import { toast } from 'sonner'
import { Loader2 as Spinner } from 'lucide-react'

interface JurnalEntryFormProps {
  blockCode: string
  initialData: any
  isSubmitting: boolean
  onSubmit: (data: any) => void
  onCancel: () => void
}

const activityOptions = [
  { id: 'rabth_completed', name: 'Rabth', sub: 'Menyambung (+10 Blok Terakhir)', desc: '1x per Hari', icon: BookOpen },
  { id: 'murajaah_completed', name: 'Murajaah', sub: 'Ulang Blok Kemarin', desc: '5x per Hari', icon: Headphones },
  { id: 'simak_murattal_completed', name: 'Simak Murattal', sub: 'Mendengar Qori', desc: '3x per Hari', icon: Headphones },
  { id: 'tikrar_bi_an_nadzar_completed', name: 'Tikrar Bi An Nadzar', sub: 'Baca Melihat Mushaf', desc: '40x per Blok', icon: Sparkles },
  { id: 'tasmi_record_completed', name: 'Tasmi Record', sub: 'Rekam Tanpa Mushaf', desc: '3x Rekaman Lancar', icon: Mic },
  { id: 'simak_record_completed', name: 'Simak Record', sub: 'Dengar Rekaman Sendiri', desc: '1x per Blok', icon: Headphones },
  { id: 'tikrar_bi_al_ghaib_completed', name: 'Tikrar Bi Al Ghaib', sub: 'Baca Tanpa Mushaf', desc: '40x per Blok', icon: Star }
]

export function JurnalEntryForm({
  blockCode,
  initialData,
  isSubmitting,
  onSubmit,
  onCancel
}: JurnalEntryFormProps) {
  const isMurajaahBlock = blockCode.startsWith('M')
  
  const [formData, setFormData] = useState({
    ...initialData,
    blok: blockCode,
    murajaah_completed: initialData.murajaah_completed || false,
    simak_murattal_completed: false,
    tikrar_bi_an_nadzar_completed: false,
    tasmi_record_completed: false,
    simak_record_completed: false,
    tikrar_bi_al_ghaib_completed: false,
    tikrar_bi_al_ghaib_type: null,
    tikrar_bi_al_ghaib_20x_multi: [],
    tarteel_screenshot_url: null,
    rabth_methods: initialData.rabth_methods || [],
    tafsir_options: initialData.tafsir_options || [],
    catatan_tambahan: ''
  })

  const [showRabthMenu, setShowRabthMenu] = useState(false)
  const [showGhaibMenu, setShowGhaibMenu] = useState(false)
  const [ghaibCategory, setGhaibCategory] = useState<'partner' | 'tarteel' | 'keluarga' | 'teman' | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const toggleActivity = (id: string) => {
    if (id === 'tikrar_bi_al_ghaib_completed') {
      const isClosing = showGhaibMenu;
      setShowGhaibMenu(!showGhaibMenu)
      if (isClosing) setGhaibCategory(null)
      return
    }
    if (id === 'rabth_completed') {
      setShowRabthMenu(!showRabthMenu)
    }
    setFormData((prev: any) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleGhaibSelection = (optionId: string) => {
    setFormData((prev: any) => {
      if (optionId === '20x_multimodal') {
         const isSelected = prev.tikrar_bi_al_ghaib_20x_multi.length === 2
         return {
           ...prev,
           tikrar_bi_al_ghaib_completed: !isSelected,
           tikrar_bi_al_ghaib_type: isSelected ? null : 'pasangan_20',
           tikrar_bi_al_ghaib_20x_multi: isSelected ? [] : ['pasangan_20', 'voice_note_20']
         }
      } 
      const isSelected = prev.tikrar_bi_al_ghaib_type === optionId
      return {
        ...prev,
        tikrar_bi_al_ghaib_completed: !isSelected,
        tikrar_bi_al_ghaib_type: isSelected ? null : optionId,
        tikrar_bi_al_ghaib_20x_multi: []
      }
    })
  }

  const handleTarteelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', file)
      const result = await uploadJurnalScreenshot(uploadData)
      if (result.success && result.data) {
        setFormData((prev: any) => ({ ...prev, tarteel_screenshot_url: result.data.url }))
        toast.success('Screenshot berhasil diunggah')
      } else {
        toast.error(result.error || 'Gagal mengunggah screenshot')
      }
    } catch (error: any) {
      const errMsg = error?.message || "";
      if (
        errMsg.includes("reading 'call'") ||
        errMsg.includes("Server Action") ||
        errMsg.includes("Failed to find Server Action")
      ) {
        toast.error("Versi aplikasi baru saja diperbarui oleh server. Memuat ulang halaman otomatis...", {
          duration: 4000,
        });
        setTimeout(() => window.location.reload(), 1200);
        return;
      }
      toast.error("Terjadi kesalahan saat mengunggah");
    } finally {
      setIsUploading(false)
    }
  }

  const completedCount = isMurajaahBlock 
    ? (formData.murajaah_completed ? 1 : 0)
    : activityOptions.filter(opt => (formData as any)[opt.id]).length

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isMurajaahBlock && formData.tikrar_bi_al_ghaib_type === 'tarteel_40' && !formData.tarteel_screenshot_url) {
      toast.error('Ukhti wajib mengunggah screenshot aplikasi Tarteel sebagai bukti.')
      return
    }
    onSubmit(formData)
  }

  return (
    <div className="space-y-4 animate-fadeInUp pb-12">
      <Card className="glass-premium border-none shadow-md overflow-hidden rounded-2xl">
        <div className="bg-gradient-to-r from-green-900 to-green-800 p-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-green-200" />
             </div>
             <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-100 flex items-center gap-1.5">
                  <input 
                    type="date"
                    value={formData.tanggal_setor}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, tanggal_setor: e.target.value }))}
                    className="bg-transparent border-none p-0 text-green-50 text-[11px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer [color-scheme:dark] h-4"
                  />
                </p>
                <p className="text-[8px] text-green-200/60 font-medium uppercase tracking-tight">Klik tanggal untuk ubah</p>
             </div>
          </div>
          <div className="px-3 py-1 bg-amber-500/20 backdrop-blur-sm rounded-xl border border-amber-500/30">
            <span className="text-[11px] font-black uppercase text-amber-100 tracking-tighter">{formData.blok}</span>
          </div>
        </div>
      </Card>

      <form onSubmit={handlePreSubmit} className="space-y-4">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-green-800/80 pl-1">
            {isMurajaahBlock ? 'Target Murajaah' : `Tahapan Kurikulum (${completedCount}/${activityOptions.length})`}
          </label>
          
          {isMurajaahBlock ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, murajaah_completed: !prev.murajaah_completed }))}
                className={cn(
                  "w-full p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-4 relative overflow-hidden group",
                  formData.murajaah_completed ? "bg-amber-50 border-amber-500 shadow-amber-600/5" : "bg-white border-gray-100 text-gray-700 hover:border-amber-200 shadow-sm"
                )}
              >
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg", formData.murajaah_completed ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-amber-50 group-hover:text-amber-500")}>
                  <Headphones className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <div className={cn("text-sm font-black uppercase tracking-widest", formData.murajaah_completed ? "text-amber-900" : "text-gray-900")}>Selesai Murajaah</div>
                  <div className="text-[10px] font-bold text-amber-700 tracking-tight mt-1 max-w-[200px] bg-amber-100/50 px-2 py-1 rounded-lg border border-amber-200">
                    {formData.label || "Target harian setara 1 juz"}
                  </div>
                </div>
                {formData.murajaah_completed && (
                  <div className="absolute top-4 right-4 text-amber-500">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                )}
              </button>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                 <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                 <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
                   Ukhti, pada pekan ini fokus hanya pada Murajaah. Silakan baca berulang-ulang porsi halaman hari ini hingga lancar, dengan total bacaan setara 1 juz.
                 </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {activityOptions.map(opt => {
                const isSelected = (formData as any)[opt.id]
                const isGhaib = opt.id === 'tikrar_bi_al_ghaib_completed'
                
                return (
                  <div key={opt.id} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleActivity(opt.id)}
                      className={cn(
                        "w-full p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between relative overflow-hidden group",
                        isSelected ? "bg-white border-green-500 shadow-emerald-600/5 ring-1 ring-green-500 ring-offset-0" : "bg-white border-green-50 text-gray-700 hover:border-green-200 shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all", isSelected ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-green-50 group-hover:text-green-600")}>
                          <opt.icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className={cn("text-xs font-black uppercase tracking-tight", isSelected ? "text-green-900" : "text-gray-900")}>{opt.name}</div>
                          <div className="text-[9px] font-bold text-gray-500 tracking-tighter leading-none mt-0.5">{opt.sub}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pr-1">
                         <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm", isSelected ? "bg-amber-500 border-amber-400 text-white" : "bg-gray-50 border-gray-100 text-gray-400")}>{opt.desc}</span>
                         <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", isSelected ? "border-green-600 bg-green-600 text-white" : "border-gray-100 bg-white")}>
                           {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                         </div>
                      </div>
                    </button>

                    {opt.id === 'rabth_completed' && showRabthMenu && isSelected && (
                      <Card className="p-4 bg-green-50/50 border-green-100 border-2 rounded-2xl animate-fadeInDown space-y-4">
                         <div className="flex flex-col items-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-green-800 mb-3">Metode Rabth (Opsional)</p>
                            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                               {[
                                 { id: 'pasangan', label: 'Setor Pasangan' },
                                 { id: 'tarteel', label: 'Setor Tarteel' },
                                 { id: 'solat', label: 'Setor Solat' }
                               ].map(r => {
                                const checked = formData.rabth_methods.includes(r.id);
                                return (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev: any) => ({
                                        ...prev,
                                        rabth_methods: checked 
                                          ? prev.rabth_methods.filter((x:string) => x !== r.id) 
                                          : [...prev.rabth_methods, r.id]
                                      }))
                                    }}
                                    className={cn("px-4 py-2.5 rounded-2xl border text-[9px] font-black uppercase tracking-tight transition-all flex items-center gap-2", 
                                      checked ? "bg-green-600 text-white border-green-500 shadow-md" : "bg-white text-green-900 border-green-100 hover:border-green-300")}
                                  >
                                    <div className={cn("w-3 h-3 rounded border flex items-center justify-center", checked ? "border-white bg-green-500" : "border-green-300")}>
                                      {checked && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    {r.label}
                                  </button>
                                )
                              })}
                            </div>
                         </div>
                      </Card>
                    )}

                    {isGhaib && showGhaibMenu && (
                      <Card className="p-4 bg-green-50/50 border-green-100 border-2 rounded-2xl animate-fadeInDown space-y-4">
                         <div className="flex flex-col items-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-green-800 mb-3">Pilih Metode Setoran (Wajib 40x)</p>
                            <div className="flex flex-row gap-1 w-full bg-green-900/5 p-1 rounded-2xl border border-green-900/10">
                               {[
                                 { id: 'partner', label: 'Partner', icon: User },
                                 { id: 'tarteel', label: 'Tarteel', icon: Sparkles },
                                 { id: 'keluarga', label: 'Keluarga', icon: Headphones },
                                 { id: 'teman', label: 'Teman', icon: User }
                               ].map(cat => (
                                 <button
                                   key={cat.id}
                                   type="button"
                                   onClick={() => {
                                     if (cat.id === 'tarteel') handleGhaibSelection('tarteel_40')
                                     setGhaibCategory(cat.id as any)
                                   }}
                                   className={cn(
                                     "flex-1 py-1.5 px-0.5 rounded-xl border transition-all flex flex-col items-center gap-0.5",
                                     ghaibCategory === cat.id || (cat.id === 'tarteel' && !ghaibCategory && formData.tikrar_bi_al_ghaib_type === 'tarteel_40')
                                       ? "bg-green-600 text-white border-green-500 shadow-sm" 
                                       : "bg-transparent text-green-900/60 border-transparent hover:bg-green-600/5"
                                   )}
                                 >
                                   <cat.icon className={cn("w-3 h-3", (ghaibCategory === cat.id || (cat.id === 'tarteel' && !ghaibCategory && formData.tikrar_bi_al_ghaib_type === 'tarteel_40')) ? "text-white" : "text-green-800/40")} />
                                   <span className="text-[7px] font-black uppercase tracking-tight">{cat.label}</span>
                                 </button>
                               ))}
                            </div>
                         </div>

                         {ghaibCategory && (
                           <div className="animate-fadeInScale border-t border-green-100 pt-3">
                             <p className="text-[9px] font-black uppercase tracking-widest text-green-800 mb-2 text-center">Pilih Opsi {ghaibCategory}</p>
                             <div className="flex flex-wrap gap-2">
                                {ghaibCategory === 'partner' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => { handleGhaibSelection('pasangan_40'); setShowGhaibMenu(false); setGhaibCategory(null); }}
                                      className={cn("w-full p-2.5 rounded-xl border text-[8px] font-black uppercase tracking-tighter transition-all", 
                                        formData.tikrar_bi_al_ghaib_type === 'pasangan_40' ? "bg-green-600 text-white shadow-md border-green-500" : "bg-white text-green-900 border-green-100")}
                                    >
                                      Setoran Langsung (40x Partner Offline)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { handleGhaibSelection('pasangan_40_wa'); setShowGhaibMenu(false); setGhaibCategory(null); }}
                                      className={cn("flex-1 p-2.5 rounded-xl border text-[8px] font-black uppercase tracking-tighter transition-all", 
                                        formData.tikrar_bi_al_ghaib_type === 'pasangan_40_wa' ? "bg-green-600 text-white shadow-md border-green-500" : "bg-white text-green-900 border-green-100")}
                                    >
                                      Voice Call WA (40x)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { handleGhaibSelection('20x_multimodal'); setShowGhaibMenu(false); setGhaibCategory(null); }}
                                      className={cn("flex-1 p-2.5 rounded-xl border text-[8px] font-black uppercase tracking-tighter transition-all", 
                                        formData.tikrar_bi_al_ghaib_20x_multi.length === 2 ? "bg-green-600 text-white shadow-md border-green-500" : "bg-white text-green-900 border-green-100")}
                                    >
                                      Multi (20x VC + 20x VN)
                                    </button>
                                  </>
                                )}
                                {ghaibCategory === 'tarteel' && (
                                  <div className="w-full space-y-3">
                                    <div className="bg-white p-4 rounded-2xl border border-dashed border-green-300 flex flex-col items-center gap-3">
                                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center"><Upload className="w-6 h-6 text-green-600" /></div>
                                      <div className="text-center">
                                        <p className="text-[10px] font-black text-green-900 uppercase">Upload Bukti Tarteel</p>
                                        <p className="text-[8px] text-gray-500 font-medium mt-1">Upload hasil pengerjaan di aplikasi Tarteel</p>
                                      </div>
                                      {formData.tarteel_screenshot_url ? (
                                        <div className="flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
                                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                          <span className="text-[9px] font-black text-green-800 uppercase">Sudah diunggah</span>
                                          <button type="button" onClick={() => setFormData((prev: any) => ({ ...prev, tarteel_screenshot_url: null }))} className="p-1 hover:bg-green-200 rounded-full text-green-700"><X className="w-3 h-3" /></button>
                                        </div>
                                      ) : (
                                        <div className="relative w-full">
                                          <input type="file" accept="image/*" onChange={handleTarteelUpload} className="absolute inset-0 opacity-0 custom-pointer" disabled={isUploading} />
                                          <Button type="button" disabled={isUploading} className="w-full h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[9px] font-black uppercase">
                                            {isUploading ? <Spinner className="w-3.5 h-3.5 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                                            PILIH FILE GAMBAR
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                    <Button type="button" onClick={() => { setShowGhaibMenu(false); setGhaibCategory(null); }} className="w-full h-10 bg-green-900 text-white rounded-xl text-[9px] font-black uppercase">LANJUTKAN</Button>
                                  </div>
                                )}
                                {ghaibCategory === 'keluarga' && (
                                  <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                                    {[
                                      { id: 'keluarga_40_suami', label: 'Suami' },
                                      { id: 'keluarga_40_ayah', label: 'Ayah' },
                                      { id: 'keluarga_40_ibu', label: 'Ibu' },
                                      { id: 'keluarga_40_kakak', label: 'Kakak' },
                                      { id: 'keluarga_40_adik', label: 'Adik' },
                                      { id: 'keluarga_40_anak', label: 'Anak' }
                                    ].map((fam, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => { handleGhaibSelection(fam.id); setShowGhaibMenu(false); setGhaibCategory(null); }}
                                        className={cn("px-4 py-2.5 rounded-2xl border text-[9px] font-black uppercase tracking-tight transition-all", 
                                          formData.tikrar_bi_al_ghaib_type === fam.id ? "bg-green-600 text-white border-green-500 shadow-md" : "bg-white text-green-900 border-green-100 hover:border-green-300")}
                                      >
                                        {fam.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {ghaibCategory === 'teman' && (
                                  <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                                    {[
                                      { id: 'teman_40_mti', label: 'Teman Thalibah MTI' },
                                      { id: 'teman_40_luar', label: 'Teman Diluar MTI' }
                                    ].map((teman, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => { handleGhaibSelection(teman.id); setShowGhaibMenu(false); setGhaibCategory(null); }}
                                        className={cn("px-4 py-2.5 rounded-2xl border text-[9px] font-black uppercase tracking-tight transition-all", 
                                          formData.tikrar_bi_al_ghaib_type === teman.id ? "bg-green-600 text-white border-green-500 shadow-md" : "bg-white text-green-900 border-green-100 hover:border-green-300")}
                                      >
                                        {teman.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                             </div>
                           </div>
                         )}
                      </Card>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-green-800/80 pl-1">
            Kegiatan Opsional
          </label>
          <div className="space-y-2">
            {[
              { id: 'baca_tafsir', label: 'Baca Tafsir', icon: BookOpen },
              { id: 'tulis_ayat', label: 'Tulis Ayat', icon: BookOpen },
              { id: 'audio_tafsir', label: 'Menyimak Video/Audio Tafsir', icon: Headphones },
              { id: 'baca_terjemahan', label: 'Baca Terjemahan per Kalimat', icon: BookOpen },
              { id: 'baca_terjemahan_perkata', label: 'Baca Terjemahan per Kata', icon: BookOpen },
            ].map(opt => {
              const isChecked = formData.tafsir_options.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setFormData((prev: any) => ({
                      ...prev,
                      tafsir_options: isChecked 
                        ? prev.tafsir_options.filter((x:string) => x !== opt.id) 
                        : [...prev.tafsir_options, opt.id]
                    }))
                  }}
                  className={cn(
                    "w-full p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between relative overflow-hidden group",
                    isChecked ? "bg-white border-green-500 shadow-emerald-600/5 ring-1 ring-green-500 ring-offset-0" : "bg-white border-green-50 text-gray-700 hover:border-green-200 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all", isChecked ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-green-50 group-hover:text-green-600")}>
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className={cn("text-xs font-black uppercase tracking-tight", isChecked ? "text-green-900" : "text-gray-900")}>{opt.label}</div>
                    </div>
                  </div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mr-1", isChecked ? "border-green-600 bg-green-600 text-white" : "border-gray-100 bg-white")}>
                    {isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <Card className="glass-premium border-none shadow-md p-4 rounded-3xl relative overflow-hidden">
          <div className="relative z-10 space-y-2">
             <label className="text-[9px] font-black uppercase tracking-widest text-green-800/80 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Catatan Tambahan (Opsional)</label>
             <textarea value={formData.catatan_tambahan} onChange={(e) => setFormData((prev: any) => ({ ...prev, catatan_tambahan: e.target.value }))} placeholder="Tambahkan evaluasi mandiri Ukhti di sini..." className="w-full bg-gray-50/50 border-none rounded-2xl p-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-green-500 transition-all placeholder:text-gray-400 h-24 shadow-inner resize-none" />
          </div>
          <div className="absolute -right-8 -bottom-8 w-24 h-24 text-green-900/5 rotate-12"><MessageSquare className="w-full h-full" /></div>
        </Card>

        <div className="flex flex-col gap-2 pt-4">
           <Button type="submit" disabled={isSubmitting || completedCount === 0} className={cn("w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all relative overflow-hidden", !isSubmitting && completedCount > 0 ? "bg-gradient-to-r from-green-700 to-emerald-700 text-white hover:scale-[1.01] active:scale-95 shadow-green-500/20" : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none")}>
              <div className="flex items-center gap-2">
                 {isSubmitting ? <Spinner className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                 {isSubmitting ? 'SEDANG MENULIS...' : 'SIMPAN JURNAL HARIAN'}
              </div>
           </Button>
           <Button type="button" onClick={onCancel} variant="ghost" className="h-10 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900">BATAL & KEMBALI</Button>
        </div>
      </form>
    </div>
  )
}

function Loader2(props: any) { return <Sparkles className={cn("animate-spin", props.className)} /> }
