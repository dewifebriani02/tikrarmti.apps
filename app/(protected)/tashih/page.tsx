'use client'

import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAllRegistrations } from '@/hooks/useRegistrations'
import { useAuth } from '@/hooks/useAuth'
import { useTashihStatus } from '@/hooks/useDashboard'
import { saveTashihRecord } from './actions'
import { getRoleRank, ROLE_RANKS } from '@/lib/roles'

// Import Modular Components
import { TashihHeader } from './components/TashihHeader'
import { TashihStatusGrid } from './components/TashihStatusGrid'
import { TashihEntryForm } from './components/TashihEntryForm'
import { TashihSuccessState } from './components/TashihSuccessState'

interface JuzOption {
  id: string
  code: string
  name: string
  juz_number: number
  part: string
  start_page: number
  end_page: number
}

interface TashihBlock {
  block_code: string
  week_number: number
  part: string
  start_page: number
  end_page: number
}

interface TashihData {
  id?: string
  blok: string[]
  lokasi: 'mti' | 'luar'
  lokasiDetail: string
  ustadzahId: string | null
  ustadzahName: string | null
  jumlahKesalahanTajwid: number
  masalahTajwid: string[]
  catatanTambahan: string
  tanggalTashih: string
}

interface TashihRecord {
  id: string
  blok: string
  lokasi: string
  lokasi_detail: string | null
  nama_pemeriksa: string | null
  ustadzah_id: string | null
  jumlah_kesalahan_tajwid: number | null
  masalah_tajwid: string[] | null
  catatan_tambahan: string | null
  waktu_tashih: string
  created_at: string
}

interface MuallimahOption {
  id: string
  user_id: string
  full_name: string
  preferred_juz: string
}

export default function TashihPage() {
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

  const targetBatchId = activeRegistration?.batch_id || activeRegistration?.batch?.id
  const { tashihStatus, isLoading: tashihStatusLoading, mutate: mutateTashihStatus } = useTashihStatus(undefined, targetBatchId)

  const [tashihData, setTashihData] = useState<TashihData>({
    blok: [],
    lokasi: 'mti',
    lokasiDetail: '',
    ustadzahId: null,
    ustadzahName: null,
    jumlahKesalahanTajwid: 0,
    masalahTajwid: [],
    catatanTambahan: '',
    tanggalTashih: new Date().toISOString().slice(0, 10)
  })

  const [weekRecords, setWeekRecords] = useState<TashihRecord[]>([])
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [confirmedJuz, setConfirmedJuz] = useState<string | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [batchStartDate, setBatchStartDate] = useState<string | null>(null)
  const [availableBlocks, setAvailableBlocks] = useState<TashihBlock[]>([])
  const [selectedJuzInfo, setSelectedJuzInfo] = useState<JuzOption | null>(null)
  const [availableMuallimah, setAvailableMuallimah] = useState<MuallimahOption[]>([])
  const [isLoadingMuallimah, setIsLoadingMuallimah] = useState(false)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1)

  // View mode: 'status' = show block status, 'form' = show tashih form
  const [viewMode, setViewMode] = useState<'status' | 'form'>('status')
  const [selectedBlocksForEditing, setSelectedBlocksForEditing] = useState<string[]>([])



  const isBatchStarted = React.useMemo(() => {
    if (isAdmin) return true;
    if (!batchStartDate) return false;
    return new Date().getTime() >= new Date(batchStartDate).getTime();
  }, [batchStartDate, isAdmin]);

  const juzToUse = activeRegistration?.daftar_ulang?.confirmed_chosen_juz ||
                      (activeRegistration as any)?.chosen_juz ||
                      (isAdmin ? '30A' : null)

  useEffect(() => {
    if (juzToUse) {
      setConfirmedJuz(juzToUse)
      if (activeRegistration?.batch) {
        setBatchId(activeRegistration.batch.id)
        setBatchStartDate(activeRegistration.batch.first_week_start_date || activeRegistration.batch.start_date)
      } else if (isAdmin) {
        setBatchId('preview-batch')
        setBatchStartDate(new Date().toISOString())
      }
      loadJuzInfo(juzToUse)
    }
  }, [juzToUse, activeRegistration, isAdmin])

  useEffect(() => {
    if (selectedJuzInfo && batchStartDate) {
      updateBlocksForWeek(selectedWeekNumber)
    }
  }, [selectedWeekNumber, selectedJuzInfo, batchStartDate])

  useEffect(() => {
    if (batchId && juzToUse) {
      loadAvailableMuallimah()
    }
  }, [batchId, juzToUse])

  useEffect(() => {
    if (confirmedJuz && user && selectedWeekNumber) {
      loadWeekRecords()
    }
  }, [confirmedJuz, user, selectedWeekNumber])

  const loadJuzInfo = async (juzCode: string) => {
    setIsLoadingBlocks(true)
    try {
      const supabase = createClient()
      const { data: juzData } = await supabase.from('juz_options').select('*').eq('code', juzCode).single()
      if (juzData) setSelectedJuzInfo(juzData)
    } catch (error) {
      console.error('Error loading juz info:', error)
    } finally {
      setIsLoadingBlocks(false)
    }
  }

  const updateBlocksForWeek = (weekNumber: number) => {
    if (!selectedJuzInfo) return
    const totalPages = selectedJuzInfo.end_page - selectedJuzInfo.start_page + 1
    if (weekNumber < 1 || weekNumber > totalPages) return
    const blockOffset = selectedJuzInfo.part === 'B' ? 10 : 0
    const blockNumber = weekNumber + blockOffset
    const weekPage = selectedJuzInfo.start_page + (weekNumber - 1)
    const blocks: TashihBlock[] = []
    const parts = ['A', 'B', 'C', 'D']
    for (let i = 0; i < 4; i++) {
        blocks.push({
            block_code: `H${blockNumber}${parts[i]}`,
            week_number: weekNumber,
            part: parts[i],
            start_page: weekPage,
            end_page: weekPage
        })
    }
    setAvailableBlocks(blocks)
  }

  const loadAvailableMuallimah = async () => {
    if (!batchId) {
      setIsLoadingMuallimah(false);
      return;
    }
    try {
      setIsLoadingMuallimah(true)
      const response = await fetch(`/api/muallimah/list?batch_id=${batchId}`)
      if (!response.ok) throw new Error('Failed to fetch teachers')
      const result = await response.json()
      setAvailableMuallimah(result.data || [])
    } catch (error) {
      console.error('Error loading muallimah:', error)
    } finally {
      setIsLoadingMuallimah(false)
    }
  }

  const loadWeekRecords = async () => {
    if (!user || !batchStartDate) return
    try {
      const supabase = createClient()
      const weekStart = getWeekStartDate(selectedWeekNumber)
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)
      const { data } = await supabase.from('tashih_records').select('*').eq('user_id', user.id)
        .gte('waktu_tashih', weekStart.toISOString()).lt('waktu_tashih', weekEnd.toISOString())
      setWeekRecords(data || [])
    } catch (error) {
      console.error('Error loading records:', error)
    }
  }

  const getWeekStartDate = (weekNumber: number): Date => {
    if (!batchStartDate) return new Date()
    const startDate = new Date(batchStartDate)
    const dayOfWeek = startDate.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const firstMonday = new Date(startDate); firstMonday.setDate(startDate.getDate() + daysToMonday)
    const weekStart = new Date(firstMonday); weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7)
    return weekStart
  }

  const getCurrentWeekNumber = (): number => {
    if (!batchStartDate) return 1
    const startDate = new Date(batchStartDate)
    const diffTime = new Date().getTime() - startDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const weekNum = Math.floor(diffDays / 7) + 1
    return Math.max(1, weekNum)
  }

  const handleBlockClick = (blockCode: string, blockWeekNumber: number) => {
    if (!tashihStatus) return
    const block = tashihStatus.blocks.find(b => b.block_code === blockCode)
    if (!block) return

    const currentWeekNumber = getCurrentWeekNumber()
    if (blockWeekNumber > currentWeekNumber) {
        const confirmMsg = `Peringatan: Blok ini merupakan target untuk Pekan ${blockWeekNumber}, sedangkan jadwal Tashih saat ini masih Pekan ${currentWeekNumber}.\n\nApakah Ukhti yakin ingin menyetorkan Tashih mendahului jadwal? Pastikan data yang diinput benar.`;
        if (!window.confirm(confirmMsg)) {
            return;
        }
    }

    if (block.is_completed && block.tashih_date) {
        const record = weekRecords.find(r => r.blok?.includes(blockCode))
        if (record) {
            setTashihData({
                id: record.id,
                blok: typeof record.blok === 'string' ? record.blok.split(',') : (record.blok || []),
                lokasi: (record.lokasi === 'halaqah' ? 'mti' : record.lokasi) as 'mti' | 'luar',
                lokasiDetail: record.lokasi_detail || '',
                ustadzahId: record.ustadzah_id,
                ustadzahName: record.nama_pemeriksa,
                jumlahKesalahanTajwid: record.jumlah_kesalahan_tajwid || 0,
                masalahTajwid: record.masalah_tajwid || [],
                catatanTambahan: record.catatan_tambahan || '',
                tanggalTashih: new Date(record.waktu_tashih).toISOString().slice(0, 10)
            })
            toast.info(`Mengedit blok ${blockCode}`)
        }
    } else {
        const match = blockCode.match(/H(\d+)[A-D]/)
        if (match) {
            const blockNumber = match[1]
            const sameWeekBlocks = [`H${blockNumber}A`, `H${blockNumber}B`, `H${blockNumber}C`, `H${blockNumber}D`]
            setSelectedBlocksForEditing(sameWeekBlocks)
            setTashihData({
                id: undefined,
                blok: sameWeekBlocks,
                lokasi: 'mti',
                lokasiDetail: '',
                ustadzahId: null,
                ustadzahName: null,
                jumlahKesalahanTajwid: 0,
                masalahTajwid: [],
                catatanTambahan: '',
                tanggalTashih: new Date().toISOString().slice(0, 10)
            })
        }
    }
    setSelectedWeekNumber(blockWeekNumber)
    setViewMode('form')
  }

  const handleSubmit = async (formData: any) => {
    if (!user) { toast.error('Silakan login'); return }
    setIsSubmitting(true)
    const submissionData = {
      id: formData.id,
      blok: formData.blok.join(','),
      lokasi: formData.lokasi,
      lokasi_detail: formData.lokasiDetail,
      ustadzah_id: formData.ustadzahId,
      nama_pemeriksa: formData.ustadzahName,
      jumlah_kesalahan_tajwid: formData.jumlahKesalahanTajwid,
      masalah_tajwid: formData.masalahTajwid,
      catatan_tambahan: formData.catatanTambahan,
      waktu_tashih: new Date(formData.tanggalTashih).toISOString()
    }
    try {
      const result = await saveTashihRecord(submissionData as any)
      if (result.success) {
        toast.success(result.message)
        await loadWeekRecords(); await mutateTashihStatus()
        setViewMode('status'); setSelectedBlocksForEditing([])
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Gagal menyimpan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isWeekCompleted = (): boolean => {
    if (!selectedJuzInfo) return false
    const expectedBlocks = [`H${selectedWeekNumber + (selectedJuzInfo.part === 'B' ? 10 : 0)}A`, `H${selectedWeekNumber + (selectedJuzInfo.part === 'B' ? 10 : 0)}B`, `H${selectedWeekNumber + (selectedJuzInfo.part === 'B' ? 10 : 0)}C`, `H${selectedWeekNumber + (selectedJuzInfo.part === 'B' ? 10 : 0)}D`]
    const weekBlocksStatus = new Set<string>()
    weekRecords.forEach(r => r.blok?.split(',').forEach(b => weekBlocksStatus.add(b.trim())))
    return expectedBlocks.every(b => weekBlocksStatus.has(b))
  }

  if (registrationsLoading || tashihStatusLoading) {
    return <div className="flex justify-center items-center py-24"><Loader2 className="h-10 w-10 animate-spin text-green-900" /></div>
  }

  if (!juzToUse) {
    return (
      <div className="text-center py-12 glass-premium rounded-3xl m-4">
        <h2 className="text-xl font-bold text-gray-800">Halaqah Belum Aktif</h2>
        <p className="text-gray-500 mt-2">Pendaftaran Ukhti sedang diproses.</p>
      </div>
    )
  }

  if (!isBatchStarted) {
    return (
      <div className="text-center py-12 glass-premium rounded-3xl m-4">
        <h2 className="text-xl font-bold text-gray-800">Program Belum Dimulai</h2>
        <p className="text-gray-500 mt-2">Halaman ini akan terbuka secara otomatis saat tanggal dimulainya batch tiba.</p>
      </div>
    )
  }

  const weekCompleted = isWeekCompleted()
  const currentWeekNum = getCurrentWeekNumber()
  const totalWeekErrors = weekRecords.reduce((sum, r) => sum + (r.jumlah_kesalahan_tajwid || 0), 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fadeInUp">
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

      {/* Header Section - Zero Stats card, integrated into Header */}
      <TashihHeader 
        title={viewMode === 'form' ? "Kembali" : "Status Tashih"} 
        subtitle={viewMode === 'form' ? "Input Sesi" : "Dashboard Hafalan"} 
        juzInfo={selectedJuzInfo}
        progress={tashihStatus ? {
          completed: tashihStatus.summary.completed_blocks,
          total: tashihStatus.summary.total_blocks
        } : undefined}
      />

      {viewMode === 'status' ? (
        <>
          {/* Grid Section Only - stats moved to Header */}
          {tashihStatus && (
            <TashihStatusGrid 
              blocks={tashihStatus.blocks} 
              currentWeekNumber={currentWeekNum}
              onBlockClick={handleBlockClick}
              isAdminPreview={isAdmin && !activeRegistration}
            />
          )}
        </>
      ) : (weekCompleted && !tashihData.id) ? (
        <TashihSuccessState 
          weekNumber={selectedWeekNumber}
          juzName={selectedJuzInfo?.name}
          juzCode={confirmedJuz || ''}
          completedCount={4}
          totalBlocks={4}
          teacherName={tashihData.ustadzahName}
          totalErrors={totalWeekErrors}
          onBackToStatus={() => setViewMode('status')}
        />
      ) : (
        <TashihEntryForm 
          key={tashihData.id || selectedBlocksForEditing.join(',')}
          initialData={tashihData}
          availableMuallimah={availableMuallimah}
          isLoadingMuallimah={isLoadingMuallimah}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={() => { setViewMode('status'); setSelectedBlocksForEditing([]) }}
        />
      )}
    </div>
  )
}
