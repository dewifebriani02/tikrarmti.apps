'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAllRegistrations } from '@/hooks/useRegistrations'
import { useActiveBatch } from '@/hooks/useBatches'
import { useAuth } from '@/hooks/useAuth'
import { useJurnalStatus } from '@/hooks/useDashboard'
import { saveJurnalRecord } from './actions'
import { getRoleRank, ROLE_RANKS } from '@/lib/roles'

// Import New Modular Components
import { JurnalHeader } from './components/JurnalHeader'
import { JurnalStatusGrid } from './components/JurnalStatusGrid'
import { JurnalEntryForm } from './components/JurnalEntryForm'

interface JuzOption {
  id: string
  code: string
  name: string
  juz_number: number
  part: string
  start_page: number
  end_page: number
}

interface JurnalData {
  tanggal_setor: string
  juz_code: string
  blok: string
  rabth_completed: boolean
  murajaah_completed: boolean
  simak_murattal_completed: boolean
  tikrar_bi_an_nadzar_completed: boolean
  tasmi_record_completed: boolean
  simak_record_completed: boolean
  tikrar_bi_al_ghaib_completed: boolean
  tafsir_completed: boolean
  menulis_completed: boolean
  catatan_tambahan: string
}

export default function JurnalHarianPage() {
  const { user } = useAuth()
  
  // Identify if user is Admin/Staff for preview mode
  const isAdmin = React.useMemo(() => {
    const primaryRole = (user as any)?.primaryRole;
    return getRoleRank(primaryRole) >= ROLE_RANKS.admin;
  }, [user]);

  const { registrations, isLoading: registrationsLoading } = useAllRegistrations()
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mti_selected_batch_id');
      if (saved) {
        setSelectedBatchId(saved);
      }
    }
  }, []);

  const handleSelectBatch = (id: string) => {
    setSelectedBatchId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mti_selected_batch_id', id);
    }
  };

  const availableBatches = React.useMemo(() => {
    const batchesMap = new Map<string, { id: string; name: string }>()
    if (registrations && registrations.length > 0) {
      registrations.forEach((reg: any) => {
        if (reg.batch_id && !batchesMap.has(reg.batch_id)) {
          batchesMap.set(reg.batch_id, {
            id: reg.batch_id,
            name: reg.batch_name || reg.batch?.name || `Batch`
          })
        }
      })
    }
    return Array.from(batchesMap.values())
  }, [registrations])

  const { activeBatch } = useActiveBatch()
  
  // Get active registration matching selected batch
  const activeRegistration = React.useMemo(() => {
    if (selectedBatchId && registrations) {
      const match = registrations.find((r: any) => r.batch_id === selectedBatchId)
      if (match) return match
    }
    return registrations.find((reg: any) =>
      ['open', 'closed', 'ongoing'].includes(reg.batch?.status) &&
      (reg.status === 'approved' || reg.selection_status === 'selected')
    ) || registrations[0]
  }, [registrations, selectedBatchId])

  const effectiveBatch = activeRegistration?.batch || activeBatch
  const targetBatchId = activeRegistration?.batch_id || activeRegistration?.batch?.id || activeBatch?.id
  const { jurnalStatus, isLoading: jurnalStatusLoading, mutate: mutateJurnalStatus } = useJurnalStatus(undefined, targetBatchId)

  const [jurnalData, setJurnalData] = useState<JurnalData>({
    tanggal_setor: new Date().toISOString().slice(0, 10),
    juz_code: '',
    blok: '',
    rabth_completed: false,
    murajaah_completed: false,
    simak_murattal_completed: false,
    tikrar_bi_an_nadzar_completed: false,
    tasmi_record_completed: false,
    simak_record_completed: false,
    tikrar_bi_al_ghaib_completed: false,
    tafsir_completed: false,
    menulis_completed: false,
    catatan_tambahan: ''
  })

  const [isLoadingJuz, setIsLoadingJuz] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedJuzInfo, setSelectedJuzInfo] = useState<JuzOption | null>(null)
  
  // View states
  const [viewMode, setViewMode] = useState<'status' | 'form'>('status')
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(1)

  const hasNoActiveRegistration = !activeRegistration && !isAdmin

  const juzToUse = activeRegistration?.daftar_ulang?.confirmed_chosen_juz ||
                      (activeRegistration as any)?.chosen_juz ||
                      (isAdmin ? '30A' : null)

  const firstWeekStartDate = effectiveBatch?.first_week_start_date || effectiveBatch?.start_date

  useEffect(() => {
    if (juzToUse) {
      loadJuzInfo(juzToUse)
    }
  }, [juzToUse])

  useEffect(() => {
    if (firstWeekStartDate) {
      const startDate = new Date(firstWeekStartDate)
      const now = new Date()
      if (now < startDate) {
        setCurrentWeekNumber(1)
      } else {
        const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const weekNum = Math.min(11, Math.max(1, Math.floor(diffDays / 7) + 1))
        setCurrentWeekNumber(weekNum)
      }
    }
  }, [firstWeekStartDate])

  const loadJuzInfo = async (juzCode: string) => {
    setIsLoadingJuz(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('juz_options').select('*').eq('code', juzCode).single()
      if (data) {
        setSelectedJuzInfo(data)
        setJurnalData(prev => ({ ...prev, juz_code: juzCode }))
      }
    } catch (error) {
      console.error('Error loading juz info:', error)
    } finally {
      setIsLoadingJuz(false)
    }
  }

  const handleBlockClick = (blockCode: string, weekNumber: number) => {
    if (hasNoActiveRegistration) {
      toast.error('Maaf Ukhti, silakan mendaftar terlebih dahulu untuk dapat mengisi jurnal.')
      return
    }

    if (weekNumber > currentWeekNumber) {
      const confirmMsg = `Peringatan: Blok ${blockCode} adalah target untuk Pekan ${weekNumber}, sedangkan Jurnal Harian saat ini baru Pekan ${currentWeekNumber}.\n\nApakah Ukhti yakin ingin mengisi jurnal mendahului jadwal kalender?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    // Reset form for the specific block
    const blockData = jurnalStatus?.blocks.find(b => b.block_code === blockCode)
    
    // If block exists and is completed, we could load it (optional edit mode)
    // For now, let's just reset
    setJurnalData(prev => ({ 
      ...prev, 
      blok: blockCode,
      label: (blockData as any)?.label,
      rabth_completed: false,
      murajaah_completed: false,
      simak_murattal_completed: false,
      tikrar_bi_an_nadzar_completed: false,
      tasmi_record_completed: false,
      simak_record_completed: false,
      tikrar_bi_al_ghaib_completed: false,
      tafsir_completed: false,
      menulis_completed: false,
      catatan_tambahan: ''
    }))
    setViewMode('form')
  }

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const result = await saveJurnalRecord({
        ...data,
        weekNumber: data.blok.startsWith('M') ? 11 : Math.ceil(parseInt(data.blok.match(/H(\d+)/)?.[1] || '1') / 1)
      })
      if (result.success) {
        toast.success(result.message)
        await mutateJurnalStatus()
        setViewMode('status')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Gagal menyimpan jurnal')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (registrationsLoading || jurnalStatusLoading || isLoadingJuz) {
    return <div className="flex justify-center items-center py-24"><Loader2 className="h-10 w-10 animate-spin text-green-900" /></div>
  }

  // NOTE: We don't return early if !jurnalStatus anymore, 
  // because we want to show the read-only view with the banner.
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadeInUp">
      {/* Registration Banner for Unauthorized Users */}
      {hasNoActiveRegistration && (
        <div className="relative group overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 shadow-xl border border-emerald-500/20 mb-4 transition-all hover:shadow-emerald-900/10">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
          <div className="relative flex flex-col md:flex-row items-center gap-4 text-white">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Info className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold">Ukhti Belum Terdaftar</h3>
              <p className="text-emerald-50 text-xs opacity-90 leading-relaxed max-w-sm">
                Afwan, saat ini Ukhti hanya bisa melihat progres. Silakan mendaftar di Batch berikutnya untuk mendapatkan akses penuh Jurnal Harian.
              </p>
            </div>
            <a 
              href="/pendaftaran/tikrar-tahfidz"
              className="px-5 py-2.5 bg-white text-emerald-700 rounded-2xl font-bold text-sm shadow-lg hover:bg-emerald-50 transition-all active:scale-95 border-b-4 border-emerald-100/50"
            >
              Mendaftar Sekarang
            </a>
          </div>
        </div>
      )}

      {availableBatches.length > 1 && (
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-500">Pilih Angkatan:</span>
          <select
            value={activeRegistration?.batch_id || ''}
            onChange={(e) => handleSelectBatch(e.target.value)}
            className="bg-transparent text-gray-800 font-bold text-xs cursor-pointer focus:outline-none"
          >
            {availableBatches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Header Section */}
      <JurnalHeader 
        title={viewMode === 'form' ? "Entry Jurnal Harian" : "Jurnal Harian"} 
        subtitle={viewMode === 'form' ? "Catat aktivitas harian Ukhti" : "Pantau kedisiplinan hafalan harian"} 
        juzInfo={selectedJuzInfo}
        progress={jurnalStatus ? {
          completed: jurnalStatus.summary.completed_blocks,
          total: jurnalStatus.summary.total_blocks
        } : (isAdmin ? { completed: 0, total: 40 } : undefined)}
        streakCount={jurnalStatus?.summary?.streak_count}
      />

      {viewMode === 'status' ? (
        <>
          {/* Grid Section */}
          {(jurnalStatus || isAdmin || hasNoActiveRegistration) && (
            <JurnalStatusGrid 
              blocks={jurnalStatus?.blocks || []} 
              currentWeekNumber={currentWeekNumber}
              onBlockClick={handleBlockClick}
              isAdminPreview={isAdmin && !activeRegistration}
            />
          )}

          {(!jurnalStatus && !isAdmin && !hasNoActiveRegistration) && (
            <div className="text-center py-12 glass-premium rounded-3xl">
              <h2 className="text-xl font-bold text-gray-800">Halaqah Belum Aktif</h2>
              <p className="text-gray-500 mt-2">Pendaftaran Ukhti sedang diproses.</p>
            </div>
          )}
        </>
      ) : (
        <JurnalEntryForm 
          blockCode={jurnalData.blok}
          initialData={jurnalData}
          isSubmitting={isSubmitting}
          onSubmit={handleFormSubmit}
          onCancel={() => setViewMode('status')}
        />
      )}
    </div>
  )
}
