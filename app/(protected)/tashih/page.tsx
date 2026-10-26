'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, BookOpen, Sparkles, Video } from 'lucide-react'
import { toast } from 'sonner'
import { useAllRegistrations } from '@/hooks/useRegistrations'
import { useActiveBatch } from '@/hooks/useBatches'
import { useAuth } from '@/hooks/useAuth'
import { useTashihStatus } from '@/hooks/useDashboard'
import { saveTashihRecord, getJuzOption, getWeekTashihRecords, getPraTikrarHalaqahList } from './actions'
import { getRoleRank, ROLE_RANKS } from '@/lib/roles'
import { parseBlokField } from '@/lib/blok'

// Import Modular Components
import { TashihHeader } from './components/TashihHeader'
import { TashihStatusGrid } from './components/TashihStatusGrid'
import { TashihEntryForm, PraTikrarHalaqahOption } from './components/TashihEntryForm'
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
  halaqahId?: string | null
  halaqahIds?: string[]
  halaqahNames?: string | null
  jenisKelas?: string[]
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
  halaqah_id?: string | null
  halaqah_ids?: any
  halaqah_names?: string | null
  jenis_kelas?: any
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

  // Selalu batch yang sedang berjalan (open/ongoing); tidak ada pilihan batch untuk thalibah.
  const activeRegistration = React.useMemo(() => {
    const isEligible = (r: any) => r.status === 'approved' || r.selection_status === 'selected'
    const isCurrent = (r: any) => ['open', 'ongoing'].includes(r.batch?.status)
    return registrations.find((r: any) => isCurrent(r) && isEligible(r))
      || registrations.find((r: any) => r.batch?.status === 'closed' && isEligible(r))
      || registrations[0]
  }, [registrations])

  // Deteksi program asal thalibah
  const isPraTikrarThalibah = React.useMemo(() => {
    const juz = (activeRegistration?.daftar_ulang as any)?.confirmed_chosen_juz ||
                (activeRegistration as any)?.confirmed_chosen_juz ||
                (activeRegistration as any)?.chosen_juz || '';
    if (/^[0-9]+[AB]$/i.test(juz.trim())) {
      return false;
    }

    const programClassType = (activeRegistration?.program as any)?.class_type || 
                             (activeRegistration as any)?.class_type ||
                             (activeRegistration?.daftar_ulang as any)?.program_class_type;
    return programClassType === 'pra_tahfidz' || activeRegistration?.selection_status === 'waitlist';
  }, [activeRegistration]);

  // Program selector tab: Tikrar Tahfidz vs Pra-Tikrar (Juz 30)
  const [selectedProgramTab, setSelectedProgramTab] = useState<'auto' | 'tikrar' | 'pra-tikrar'>('auto');

  const currentProgramMode = React.useMemo(() => {
    if (selectedProgramTab !== 'auto') {
      return selectedProgramTab;
    }
    return isPraTikrarThalibah ? 'pra-tikrar' : 'tikrar';
  }, [selectedProgramTab, isPraTikrarThalibah]);

  const { activeBatch } = useActiveBatch()
  const effectiveBatch = activeRegistration?.batch || activeBatch
  const targetBatchId = activeRegistration?.batch_id || activeRegistration?.batch?.id || activeBatch?.id

  const { tashihStatus, isLoading: tashihStatusLoading, mutate: mutateTashihStatus } = useTashihStatus(undefined, targetBatchId)

  const [tashihData, setTashihData] = useState<TashihData>({
    blok: [],
    lokasi: 'mti',
    lokasiDetail: '',
    ustadzahId: null,
    ustadzahName: null,
    halaqahId: null,
    halaqahIds: [],
    halaqahNames: null,
    jenisKelas: ['talaqqi_zoom', 'tahsin_juz30'],
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
  const [selectedJuzInfo, setSelectedJuzInfo] = useState<JuzOption | null>(null)
  const [availableMuallimah, setAvailableMuallimah] = useState<MuallimahOption[]>([])
  const [isLoadingMuallimah, setIsLoadingMuallimah] = useState(false)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1)
  const [praTikrarHalaqahs, setPraTikrarHalaqahs] = useState<PraTikrarHalaqahOption[]>([])

  // View mode: 'status' = show block status, 'form' = show tashih form
  const [viewMode, setViewMode] = useState<'status' | 'form'>('status')
  const [selectedBlocksForEditing, setSelectedBlocksForEditing] = useState<string[]>([])

  const rawJuz = activeRegistration?.daftar_ulang?.confirmed_chosen_juz ||
                 (activeRegistration as any)?.chosen_juz ||
                 (isAdmin ? '30A' : null)

  // Di Pra-Tikrar target kurikulum adalah Juz 30 (default 30A)
  const effectiveJuzToUse = currentProgramMode === 'pra-tikrar' ? '30A' : (rawJuz || (isAdmin ? '30A' : null))

  useEffect(() => {
    if (effectiveJuzToUse) {
      setConfirmedJuz(effectiveJuzToUse)
      if (effectiveBatch) {
        setBatchId(effectiveBatch.id)
        setBatchStartDate(effectiveBatch.first_week_start_date || effectiveBatch.start_date)
      } else if (isAdmin) {
        setBatchId('preview-batch')
        setBatchStartDate(new Date().toISOString())
      }
      loadJuzInfo(effectiveJuzToUse)
    }
  }, [effectiveJuzToUse, effectiveBatch, isAdmin])

  useEffect(() => {
    if (batchId && effectiveJuzToUse) {
      loadAvailableMuallimah()
    }
  }, [batchId, effectiveJuzToUse])

  // Muat daftar sesi halaqah Pra-Tikrar (Open Schedule) untuk dropdown sesi di form tashih
  useEffect(() => {
    let isMounted = true
    getPraTikrarHalaqahList(targetBatchId).then(data => {
      if (isMounted && data) {
        setPraTikrarHalaqahs(data)
      }
    }).catch(err => {
      console.error('Error loading pra-tikrar halaqah list:', err)
    })
    return () => { isMounted = false }
  }, [targetBatchId])

  useEffect(() => {
    if (user && selectedWeekNumber) {
      loadWeekRecords()
    }
  }, [confirmedJuz, user, selectedWeekNumber, targetBatchId])

  const loadJuzInfo = async (juzCode: string) => {
    setIsLoadingBlocks(true)
    try {
      const juzData = await getJuzOption(juzCode)
      if (juzData) setSelectedJuzInfo(juzData)
    } catch (error) {
      console.error('Error loading juz info:', error)
    } finally {
      setIsLoadingBlocks(false)
    }
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
    if (!user) return
    try {
      const data = await getWeekTashihRecords(user.id, targetBatchId)
      setWeekRecords(data || [])
    } catch (error) {
      console.error('Error loading records:', error)
    }
  }

  const getCurrentWeekNumber = (): number => {
    if (!batchStartDate) return 1
    const startDate = new Date(batchStartDate)
    const diffTime = new Date().getTime() - startDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const ziyadahWeek = Math.floor(diffDays / 7) + 1
    // Tashih berjalan 1 pekan mendahului Ziyadah untuk persiapan hafalan pekan berikutnya
    const tashihWeek = ziyadahWeek + 1
    return Math.max(1, tashihWeek)
  }

  // Bangun daftar 40 blok (10 pekan) lengkap
  const displayBlocks = React.useMemo(() => {
    if (tashihStatus?.blocks && tashihStatus.blocks.length > 0) {
      return tashihStatus.blocks;
    }
    // Fallback dinamis: bangun 40 blok untuk Juz aktif (misal 30A)
    const blocks: any[] = [];
    const blockOffset = selectedJuzInfo?.part === 'B' ? 10 : 0;
    const completedBlockCodes = new Set<string>();
    weekRecords.forEach(r => parseBlokField(r.blok).forEach(b => completedBlockCodes.add(b)));

    for (let w = 1; w <= 10; w++) {
      const blockNumber = w + blockOffset;
      const page = (selectedJuzInfo?.start_page || 582) + (w - 1);
      for (const part of ['A', 'B', 'C', 'D']) {
        const code = `H${blockNumber}${part}`;
        const record = weekRecords.find(r => parseBlokField(r.blok).includes(code));
        blocks.push({
          block_code: code,
          week_number: w,
          part,
          start_page: page,
          end_page: page,
          is_completed: completedBlockCodes.has(code),
          tashih_date: record?.waktu_tashih || undefined,
          tashih_count: completedBlockCodes.has(code) ? 1 : 0
        });
      }
    }
    return blocks;
  }, [tashihStatus, selectedJuzInfo, weekRecords]);

  const displayProgress = React.useMemo(() => {
    if (tashihStatus?.summary) {
      return {
        completed: tashihStatus.summary.completed_blocks,
        total: tashihStatus.summary.total_blocks
      };
    }
    const completed = displayBlocks.filter(b => b.is_completed).length;
    return {
      completed,
      total: displayBlocks.length || 40
    };
  }, [tashihStatus, displayBlocks]);

  const handleBlockClick = (blockCode: string, blockWeekNumber: number) => {
    const block = displayBlocks.find(b => b.block_code === blockCode)
    if (!block) return

    const currentWeekNumber = getCurrentWeekNumber()
    if (!isAdmin && blockWeekNumber > currentWeekNumber) {
      toast.info(`Tashih Pekan ${blockWeekNumber} belum dibuka. Jadwal Tashih angkatan saat ini masih Pekan ke-${currentWeekNumber}.`)
      return
    }

    if (block.is_completed && block.tashih_date) {
        const record = weekRecords.find(r => parseBlokField(r.blok).includes(blockCode))
        if (record) {
            let parsedHalaqahIds: string[] = []
            if (Array.isArray(record.halaqah_ids)) {
              parsedHalaqahIds = record.halaqah_ids
            } else if (typeof record.halaqah_ids === 'string') {
              try { parsedHalaqahIds = JSON.parse(record.halaqah_ids) } catch {}
            } else if (record.halaqah_id) {
              parsedHalaqahIds = [record.halaqah_id]
            }

            let parsedJenisKelas: string[] = []
            if (Array.isArray(record.jenis_kelas)) {
              parsedJenisKelas = record.jenis_kelas
            } else if (typeof record.jenis_kelas === 'string') {
              try { parsedJenisKelas = JSON.parse(record.jenis_kelas) } catch {}
            }

            setTashihData({
                id: record.id,
                blok: parseBlokField(record.blok),
                lokasi: (record.lokasi === 'halaqah' ? 'mti' : record.lokasi) as 'mti' | 'luar',
                lokasiDetail: record.lokasi_detail || '',
                ustadzahId: record.ustadzah_id,
                ustadzahName: record.nama_pemeriksa,
                halaqahId: record.halaqah_id || null,
                halaqahIds: parsedHalaqahIds,
                halaqahNames: (record as any).halaqah_names || null,
                jenisKelas: parsedJenisKelas.length > 0 ? parsedJenisKelas : ['talaqqi_zoom', 'tahsin_juz30'],
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
                halaqahId: null,
                halaqahIds: [],
                halaqahNames: null,
                jenisKelas: ['talaqqi_zoom', 'tahsin_juz30'],
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
      halaqah_id: formData.halaqahId || (formData.halaqahIds && formData.halaqahIds[0]) || null,
      halaqah_ids: formData.halaqahIds || [],
      halaqah_names: formData.halaqahNames || null,
      jenis_kelas: formData.jenisKelas || [],
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
    const completedInStatus = new Set(displayBlocks.filter(b => b.is_completed).map(b => b.block_code))
    const weekBlocksStatus = new Set<string>()
    weekRecords.forEach(r => parseBlokField(r.blok).forEach(b => weekBlocksStatus.add(b)))
    return expectedBlocks.every(b => completedInStatus.has(b) && weekBlocksStatus.has(b))
  }

  if (registrationsLoading && !activeRegistration && !isAdmin) {
    return (
      <div className="flex flex-col justify-center items-center py-24 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-green-900" />
        <p className="text-xs text-gray-500 font-medium">Memuat data pendaftaran...</p>
      </div>
    )
  }

  if (!effectiveJuzToUse) {
    return (
      <div className="text-center py-12 glass-premium rounded-3xl m-4">
        <h2 className="text-xl font-bold text-gray-800">Halaqah Belum Aktif</h2>
        <p className="text-gray-500 mt-2">Pendaftaran Ukhti sedang diproses.</p>
      </div>
    )
  }

  const weekCompleted = isWeekCompleted()
  const currentWeekNum = getCurrentWeekNumber()
  const totalWeekErrors = weekRecords.reduce((sum, r) => sum + (r.jumlah_kesalahan_tajwid || 0), 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fadeInUp">
      {/* Program Selector Tabs - Tikrar Tahfidz vs Pra-Tikrar */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 rounded-2xl border border-gray-100 bg-white p-1.5 sm:p-2 shadow-xs">
        <button
          type="button"
          onClick={() => {
            setSelectedProgramTab('tikrar');
            setViewMode('status');
          }}
          className={`flex min-h-[46px] sm:min-h-[50px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold transition-all ${
            currentProgramMode === 'tikrar'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>Tikrar Tahfidz</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedProgramTab('pra-tikrar');
            setViewMode('status');
          }}
          className={`flex min-h-[46px] sm:min-h-[50px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold transition-all ${
            currentProgramMode === 'pra-tikrar'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
          <span>Pra-Tikrar (Juz 30)</span>
        </button>
      </div>

      {/* Header Section */}
      <TashihHeader 
        title={viewMode === 'form' ? "Kembali" : (currentProgramMode === 'pra-tikrar' ? "Tashih Pra-Tikrar" : "Status Tashih")} 
        subtitle={viewMode === 'form' ? "Input Sesi" : (currentProgramMode === 'pra-tikrar' ? "Juz 30 (Open Schedule)" : "Dashboard Hafalan")} 
        juzInfo={selectedJuzInfo}
        progress={displayProgress}
      />

      {viewMode === 'status' ? (
        <>
          {/* Grid Section - 10 Pekan Tashih */}
          <TashihStatusGrid 
            blocks={displayBlocks} 
            currentWeekNumber={currentWeekNum}
            onBlockClick={handleBlockClick}
            isAdminPreview={isAdmin && !activeRegistration}
          />
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
          key={tashihData.id || selectedBlocksForEditing.join(',') || currentProgramMode}
          initialData={tashihData}
          availableMuallimah={availableMuallimah}
          isLoadingMuallimah={isLoadingMuallimah}
          isSubmitting={isSubmitting}
          isPraTikrar={currentProgramMode === 'pra-tikrar'}
          praTikrarHalaqahs={praTikrarHalaqahs}
          onSubmit={handleSubmit}
          onCancel={() => { setViewMode('status'); setSelectedBlocksForEditing([]) }}
        />
      )}
    </div>
  )
}
