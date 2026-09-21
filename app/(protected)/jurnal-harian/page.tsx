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
  batch_id?: string | null
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

  const { activeBatch } = useActiveBatch()
  
  // Selalu batch yang sedang berjalan (open/ongoing); tidak ada pilihan batch untuk thalibah.
  const activeRegistration = React.useMemo(() => {
    const isEligible = (r: any) => r.status === 'approved' || r.selection_status === 'selected'
    const isCurrent = (r: any) => ['open', 'ongoing'].includes(r.batch?.status)
    return registrations.find((r: any) => isCurrent(r) && isEligible(r))
      || registrations.find((r: any) => r.batch?.status === 'closed' && isEligible(r))
      || registrations[0]
  }, [registrations])

  const effectiveBatch = activeRegistration?.batch || activeBatch
  const targetBatchId = activeRegistration?.batch_id || activeRegistration?.batch?.id || activeBatch?.id
  const { jurnalStatus, isLoading: jurnalStatusLoading, mutate: mutateJurnalStatus } = useJurnalStatus(undefined, targetBatchId)

  const [jurnalData, setJurnalData] = useState<JurnalData>({
    batch_id: targetBatchId || null,
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
                   (activeRegistration as any)?.confirmed_chosen_juz ||
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
        setJurnalData(prev => ({ ...prev, juz_code: juzCode, batch_id: targetBatchId }))
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

    // Reset form for the specific block
    const blockData = jurnalStatus?.blocks.find(b => b.block_code === blockCode)
    
    setJurnalData(prev => ({ 
      ...prev, 
      blok: blockCode,
      juz_code: juzToUse || prev.juz_code,
      batch_id: targetBatchId || prev.batch_id,
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
        batch_id: targetBatchId || null,
        juz_code: juzToUse || data.juz_code,
        weekNumber: data.blok.startsWith('M') ? 11 : Math.ceil(parseInt(data.blok.match(/H(\d+)/)?.[1] || '1') / 1)
      })
      if (result.success) {
        toast.success(result.message || 'Jurnal berhasil disimpan!')
        await mutateJurnalStatus()
        setViewMode('status')
      } else {
        toast.error(result.error)
      }
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menyimpan jurnal')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (registrationsLoading || jurnalStatusLoading || isLoadingJuz) {
    return <div className="flex justify-center items-center py-24"><Loader2 className="h-10 w-10 animate-spin text-green-900" /></div>
  }

  const completedBlocks = jurnalStatus?.summary?.completed_blocks || 0
  const totalBlocks = jurnalStatus?.summary?.total_blocks || 40

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
                Fitur Jurnal Harian khusus bagi thalibah aktif Markaz Tikrar Indonesia.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Jurnal Container */}
      <div className="space-y-6">
        {/* Dynamic Header Component */}
        <JurnalHeader 
          title="Jurnal Harian"
          subtitle={effectiveBatch?.name || 'Tikrar Tahfidz'}
          juzInfo={selectedJuzInfo}
          progress={{
            completed: completedBlocks,
            total: totalBlocks
          }}
          streakCount={jurnalStatus?.summary?.streak_count || 0}
        />

        {/* Dynamic View: Status Grid vs Form Entry */}
        {viewMode === 'status' ? (
          <JurnalStatusGrid
            blocks={jurnalStatus?.blocks || []}
            currentWeekNumber={currentWeekNumber}
            onBlockClick={handleBlockClick}
            isAdminPreview={!activeRegistration && isAdmin}
          />
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
    </div>
  )
}
