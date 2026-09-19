'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sunrise,
  Sun,
  Sunset,
  Moon,
  BookOpen,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  Award,
  FileText,
  ClipboardList,
  GraduationCap,
  Star,
  AlertCircle,
  Wallet,
  Settings,
  User,
  LayoutGrid,
  ChevronRight,
  Sparkles,
  MapPin,
  UserX,
  AlertTriangle,
  Lock,
  Snowflake,
  Trophy,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useActiveBatch } from '@/hooks/useBatches'
import { useDashboardStats, useTashihStatus, useJurnalStatus, useHalaqahOfTheWeek } from '@/hooks/useDashboard'
import { useMyRegistrations } from '@/hooks/useRegistrations'
import { createClient } from '@/lib/supabase/client'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { SWRLoadingFallback, SWRErrorFallback } from '@/lib/swr/providers'
import { cn } from '@/lib/utils'
import { isStaff } from '@/lib/roles'
import { FinalExamPortalModal } from '@/components/dashboard/FinalExamPortalModal'
import { GroupLinks } from '@/components/dashboard/GroupLinks'
import { UserJadwalHarian } from '@/components/dashboard/UserJadwalHarian'

export default function DashboardContent() {
  // NOTE: Authentication is now handled by server-side layout
  // No need for client-side auth checks or redirects
  const { user, isLoading } = useAuth()
  const { push } = useRouter()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('user_id')
  
  const userRole = user?.primaryRole || 'calon_thalibah'
  const canSeeAdminStats = isStaff(userRole)
  const isImpersonating = !!(targetUserId && userRole === 'admin')
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [isThalibahRankModalOpen, setIsThalibahRankModalOpen] = useState(false);

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mti_selected_batch_id');
      if (saved) {
        setSelectedBatchId(saved);
      }
    }
  }, []);

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mti_selected_batch_id', batchId);
    }
  };

  // SWR hooks for data fetching
  const { activeBatch, isLoading: batchLoading, error: batchError } = useActiveBatch()
  const { stats, isLoading: statsLoading, error: statsError } = useDashboardStats(canSeeAdminStats)
  const { registrations, isLoading: registrationsLoading } = useMyRegistrations(targetUserId || undefined)

  // Available batches derived from active batch and user registrations
  const availableBatches = useMemo(() => {
    const batchesMap = new Map<string, { id: string; name: string; first_week_start_date?: string; start_date?: string; status?: string }>();
    if (activeBatch) {
      batchesMap.set(activeBatch.id, {
        id: activeBatch.id,
        name: activeBatch.name,
        first_week_start_date: activeBatch.first_week_start_date,
        start_date: activeBatch.start_date,
        status: activeBatch.status
      });
    }
    if (registrations && registrations.length > 0) {
      registrations.forEach(reg => {
        if (reg.batch_id && !batchesMap.has(reg.batch_id)) {
          const b = reg.batch as any;
          batchesMap.set(reg.batch_id, {
            id: reg.batch_id,
            name: (reg as any).batch_name || b?.name || `Batch (Dari Pendaftaran)`,
            first_week_start_date: b?.first_week_start_date,
            start_date: b?.start_date,
            status: b?.status
          });
        }
      });
    }
    return Array.from(batchesMap.values());
  }, [activeBatch, registrations]);

  // Priority: User Selected Batch -> Active Batch -> First Registration Batch
  const effectiveBatchId = selectedBatchId || activeBatch?.id || (registrations?.[0]?.batch_id ?? null);
  const selectedBatch = availableBatches.find(b => b.id === effectiveBatchId) || activeBatch;

  const { tashihStatus, isLoading: tashihLoading, error: tashihError, mutate: tashihMutate } = useTashihStatus(targetUserId || undefined, effectiveBatchId || undefined)
  const { jurnalStatus, isLoading: jurnalLoading, error: jurnalError, mutate: jurnalMutate } = useJurnalStatus(targetUserId || undefined, effectiveBatchId || undefined)
  const { halaqahOfTheWeek, allHalaqahs, userRank, isLoading: halaqahLoading } = useHalaqahOfTheWeek(effectiveBatchId || undefined)
  
  const isMurajaahCompleted = useMemo(() => {
    if (!jurnalStatus || !jurnalStatus.blocks) return false;
    const murajaahBlocks = jurnalStatus.blocks.filter((b: any) => b.week_number === 11 || b.block_code?.startsWith('M'));
    if (murajaahBlocks.length === 0) return false;
    return murajaahBlocks.every((b: any) => b.is_completed);
  }, [jurnalStatus]);
  const { 
    prayerTimes, 
    hijriDate, 
    gregorianDate, 
    locationName, 
    isLoading: prayersLoading,
    updateManualCity
  } = usePrayerTimes()

  const handleLocationChange = () => {
    const newCity = window.prompt('Masukkan nama kota Ukhti untuk jadwal shalat (contoh: Bogor, Bandung, Surabaya):', locationName === 'Memuat...' ? '' : locationName)
    if (newCity !== null) {
      updateManualCity(newCity.trim() || null)
    }
  }
  
  const [activitiesPage, setActivitiesPage] = useState(1)
  const [examModalOpen, setExamModalOpen] = useState(false)
  const [expandedHalaqahId, setExpandedHalaqahId] = useState<string | null>(null)
  const activitiesPerPage = 5

  const [hasMuallimahReg, setHasMuallimahReg] = useState(false)
  const [isFrozen, setIsFrozen] = useState<boolean>(false)
  const isSuperadmin = (user?.roles as string[] | undefined)?.includes('super_admin') || 
                       (user?.primaryRole as string | undefined) === 'super_admin' || 
                       (user as any)?.role === 'super_admin' ||
                       (user?.roles as string[] | undefined)?.includes('admin') || 
                       user?.primaryRole === 'admin' || 
                       (user as any)?.role === 'admin' || false;

  useEffect(() => {
    if (isSuperadmin) {
      const fetchSettings = async () => {
        try {
          const res = await fetch('/api/admin/settings');
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setIsFrozen(data.is_frozen);
            }
          }
        } catch (e) {}
      };
      fetchSettings();
    }
  }, [isSuperadmin]);

  useEffect(() => {
    async function checkMuallimah() {
      if (!user?.id || !effectiveBatchId) return;
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('muallimah_registrations')
          .select('id')
          .eq('user_id', user.id)
          .eq('batch_id', effectiveBatchId)
          .maybeSingle()
        if (data) {
          setHasMuallimahReg(true)
        } else {
          setHasMuallimahReg(false)
        }
      } catch (err) {
        console.error('Error checking muallimah registration:', err)
      }
    }
    checkMuallimah()
  }, [user?.id, effectiveBatchId])

  const [pairingData, setPairingData] = useState<any | null>(null);
  useEffect(() => {
    async function fetchPairingData() {
      if (!user?.id || !effectiveBatchId) return;
      try {
        const response = await fetch(`/api/user/pairing?batch_id=${effectiveBatchId}`, { cache: 'no-store' });
        const result = await response.json();
        if (result.success) setPairingData(result.data);
        else setPairingData(null);
      } catch (error) {
        console.error('Error fetching pairing data:', error);
      }
    }
    fetchPairingData();
  }, [user?.id, effectiveBatchId]);

  const hasRegisteredTikrar = useMemo(() => {
    return effectiveBatchId && registrations.some(reg => reg.batch_id === effectiveBatchId);
  }, [effectiveBatchId, registrations])

  // Combined loading state
  // Note: Stats loading only matters if we are trying to fetch them
  const isPageLoading = isLoading || batchLoading || (canSeeAdminStats && statsLoading) || registrationsLoading

  // Calculate registration status from SWR data matching selected batch
  const matchingRegistration = useMemo(() => {
    if (!registrations || registrations.length === 0) return null;
    return (effectiveBatchId ? registrations.find(r => r.batch_id === effectiveBatchId) : null) || registrations[0];
  }, [registrations, effectiveBatchId]);

  const hasRegistered = !!matchingRegistration;
  const registrationStatus = hasRegistered ? {
    registered: true,
    batchId: matchingRegistration.batch_id,
    status: matchingRegistration.status,
    daftarUlang: matchingRegistration.daftar_ulang
  } : { registered: false }

  // Debug logging for tashih status
  useEffect(() => {
    console.log('[Dashboard] tashihStatus:', {
      hasRegistered,
      hasTashihStatus: !!tashihStatus,
      isLoading: tashihLoading,
      error: tashihError,
      registrationsCount: registrations.length,
      effectiveBatchId
    })
  }, [hasRegistered, tashihStatus, tashihLoading, tashihError, registrations.length, effectiveBatchId])

  // Helper function to convert day number to Indonesian day name
  const getDayNameFromNumber = (dayNum: number | string | undefined) => {
    const days = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad']
    if (dayNum === undefined) return ''
    const num = typeof dayNum === 'string' ? parseInt(dayNum) : dayNum
    return days[num] || `${dayNum}`
  }

  const totalHariTarget = (jurnalStatus?.summary.total_blocks || (canSeeAdminStats ? stats?.totalHariTarget : 0) || 0)

  // Calculate current week based on selected batch timeline
  const computeCurrentWeek = () => {
    const targetStartDate = selectedBatch?.first_week_start_date || selectedBatch?.start_date;
    if (!targetStartDate) return 1;
    const today = new Date();
    const week1Start = new Date(targetStartDate);
    if (today < week1Start) return 1;
    const daysDiff = Math.floor((today.getTime() - week1Start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(11, Math.max(1, Math.floor(daysDiff / 7) + 1));
  };
  const [currentWeek, setCurrentWeek] = useState<number>(computeCurrentWeek());
  // Update current week when batch changes
  useEffect(() => {
    setCurrentWeek(computeCurrentWeek());
  }, [selectedBatch]);

  const displayStats = {
    totalHariTarget: totalHariTarget,
    hariAktual: (jurnalStatus?.summary.completed_blocks || (canSeeAdminStats ? stats?.hariAktual : 0) || 0),
    persentaseProgress: (jurnalStatus && (jurnalStatus.summary.total_blocks || 0) > 0)
      ? Math.round((jurnalStatus.summary.completed_blocks / jurnalStatus.summary.total_blocks) * 100)
      : (canSeeAdminStats ? stats?.persentaseProgress : 0) || 0
  }

  const daftarUlangArray = registrationStatus?.daftarUlang;
  const daftarUlangData = Array.isArray(daftarUlangArray) ? daftarUlangArray[0] : daftarUlangArray;
  
  const hasAkadFiles = !!(daftarUlangData?.akad_files && daftarUlangData.akad_files.length > 0);
  const isAkadSubmitted = !!(daftarUlangData && (
    daftarUlangData.akad_status === 'submitted' || 
    daftarUlangData.akad_status === 'approved' || 
    (daftarUlangData.status === 'approved' && !daftarUlangData.akad_status) ||
    (daftarUlangData.status === 'submitted' && !daftarUlangData.akad_status)
  ));
  const hasAkad = hasAkadFiles && isAkadSubmitted;
  
  const hasHalaqah = !!(daftarUlangData?.ujian_halaqah_id || daftarUlangData?.tashih_halaqah_id);
  const hasPartnerSelection = !!(daftarUlangData?.partner_type);
  const isPartnerSubmitted = !!(daftarUlangData && (
    daftarUlangData.partner_status === 'submitted' || 
    daftarUlangData.partner_status === 'approved' || 
    (daftarUlangData.status === 'approved' && !daftarUlangData.partner_status) ||
    (daftarUlangData.status === 'submitted' && !daftarUlangData.partner_status)
  ));
  const isSelfMatch = daftarUlangData?.partner_type === 'self_match';
  const isMutualSelfMatch = !!pairingData?.partner_details?.is_mutual_match;
  const isPartnerComplete = (isPartnerSubmitted && (!isSelfMatch || isMutualSelfMatch)) || daftarUlangData?.pairing_status === 'paired';
  
  const hasPhase3 = hasAkad && hasHalaqah && isPartnerComplete;
  
  const partner = pairingData ? [pairingData.user_1, pairingData.user_2, pairingData.user_3].find((p: any) => p && p.id !== user?.id) : undefined;
  const partnerName = partner ? partner.full_name : pairingData?.partner_details?.partner_name;

  // Get welcome theme based on time
  const welcomeTheme = React.useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 11) {
      return {
        greeting: "Shabahul Khayr",
        gradient: "from-emerald-600 via-green-500 to-teal-400",
        icon: <Sunrise className="w-10 h-10 text-yellow-300 animate-pulse" />,
        label: "Pagi",
        ring: "ring-emerald-400/30"
      }
    } else if (hour >= 11 && hour < 15) {
      return {
        greeting: "Naharakum Sa'id",
        gradient: "from-blue-500 via-green-500 to-sky-400",
        icon: <Sun className="w-10 h-10 text-yellow-200 animate-spin-slow" />,
        label: "Siang",
        ring: "ring-blue-400/30"
      }
    } else if (hour >= 15 && hour < 18) {
      return {
        greeting: "Masaa'ul Khayr",
        gradient: "from-orange-500 via-green-600 to-amber-500",
        icon: <Sunset className="w-10 h-10 text-orange-200" />,
        label: "Sore",
        ring: "ring-orange-400/30"
      }
    } else {
      return {
        greeting: "Lailatukum Sa'idah",
        gradient: "from-indigo-950 via-slate-900 to-green-950",
        icon: <Moon className="w-10 h-10 text-blue-200 animate-twinkle" />,
        label: "Malam",
        ring: "ring-indigo-500/30"
      }
    }
  }, [])

  // Combined Recent Activity
  const recentActivity = React.useMemo(() => {
    // If Admin/Staff, show system-wide active
    if (canSeeAdminStats && stats?.recentActivity) {
      return stats.recentActivity.map(a => ({
        id: a.id,
        type: a.type,
        title: a.description,
        date: new Date(a.timestamp),
        icon: a.type === 'registration' ? GraduationCap : a.type === 'approval' ? CheckCircle : Calendar,
        color: a.type === 'registration' ? 'text-blue-500' : a.type === 'approval' ? 'text-emerald-500' : 'text-amber-500',
        user: a.user?.name
      }))
    }

    // Student activities
    const activities: any[] = []
    
    // Add Tashih activities
    if (tashihStatus?.blocks) {
      const completedTashih = tashihStatus.blocks
        .filter(b => b.is_completed && b.tashih_date)
        .sort((a, b) => new Date(b.tashih_date!).getTime() - new Date(a.tashih_date!).getTime())
        .slice(0, 3)
      
      completedTashih.forEach(b => {
        activities.push({
          type: 'tashih',
          title: `Tashih Selesai: ${b.block_code}`,
          date: new Date(b.tashih_date!),
          icon: CheckCircle,
          color: 'text-emerald-500'
        })
      })
    }

    // Add Jurnal activities
    if (jurnalStatus?.blocks) {
      const completedJurnal = jurnalStatus.blocks
        .filter(b => b.is_completed && b.jurnal_date)
        .sort((a, b) => new Date(b.jurnal_date!).getTime() - new Date(a.jurnal_date!).getTime())
        .slice(0, 3)
      
      completedJurnal.forEach(b => {
        activities.push({
          type: 'jurnal',
          title: `Input Jurnal: ${b.block_code}`,
          date: new Date(b.jurnal_date!),
          icon: BookOpen,
          color: 'text-blue-500'
        })
      })
    }

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [canSeeAdminStats, stats, tashihStatus, jurnalStatus])

  // Loading state - Consistent across all devices
  if (isPageLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome card skeleton */}
        <Card>
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-3.5 sm:h-4 bg-gray-200 rounded w-1/2 animate-pulse mt-2"></div>
          </CardHeader>
        </Card>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                <div className="h-3.5 sm:h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="h-7 sm:h-8 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress card skeleton */}
        <Card>
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
            <div className="h-4 sm:h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="h-1.5 sm:h-2 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-1.5 sm:h-2 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (batchError || statsError) {
    return (
      <div className="space-y-6">
        <SWRErrorFallback
          error={batchError || statsError || new Error('Failed to load dashboard data')}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }


  const toGregorianLabel = () => {
    if (gregorianDate) return `${gregorianDate.day} ${gregorianDate.month} ${gregorianDate.year}`
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric',
      month: 'long',
      day: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date())
  }

  const toHijriLabel = () => {
    if (hijriDate) return `${hijriDate.day} ${hijriDate.month} ${hijriDate.year} ${hijriDate.designation}`
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'islamic-umalqura'
    }
    return new Intl.DateTimeFormat('id-ID', options).format(new Date())
  }

  const isDropout = registrationStatus.registered && registrationStatus.status === 'dropout';

  if (isDropout) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="max-w-md w-full border-rose-100 shadow-2xl shadow-rose-900/10 rounded-[2.5rem] overflow-hidden">
          <div className="bg-rose-600 h-2 w-full" />
          <CardContent className="p-10 text-center space-y-6">
            <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-rose-100 animate-bounce-slow">
              <UserX className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Afwan Ukhti,</h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                Status Ukhti saat ini adalah <span className="text-rose-600 font-black">Dropout (DO)</span> sehingga tidak dapat mengikuti kegiatan Tikrar MTI Batch ini.
              </p>
            </div>
            <div className="pt-4">
              <Link href="/pendaftaran">
                <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-6 rounded-2xl shadow-lg shadow-rose-900/20 transition-all border-b-4 border-rose-800 active:border-b-0 active:translate-y-1">
                  Hubungi Admin / Cek Pendaftaran
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeInUp pb-10">
      {/* Welcome Section - Premium Glassmorphism */}
      <div className={cn(
        "relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-2xl transition-all duration-700 bg-gradient-to-br ring-4",
        welcomeTheme.gradient,
        welcomeTheme.ring
      )}>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 flex-1 min-w-0">
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] sm:text-xs font-bold ring-1 ring-white/20">
                {welcomeTheme.icon}
                <span className="tracking-[0.2em] uppercase">{welcomeTheme.label} di Tikrar MTI Apps</span>
              </div>
              
              <div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-2 tracking-tight break-words">
                  {welcomeTheme.greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">{user?.full_name?.split(' ')[0] || 'Ukhti'}!</span>
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/80 text-xs sm:text-sm font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 opacity-70" />
                    <span>{toGregorianLabel()}</span>
                  </div>
                  <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/20" />
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span>{toHijriLabel()}</span>
                  </div>
                  <button 
                    onClick={handleLocationChange}
                    className="flex items-center gap-1.5 text-white/90 bg-white/10 px-3 py-1 rounded-full border border-white/10 hover:bg-white/20 transition-all group lg:ml-4"
                    title="Klik untuk ganti lokasi"
                  >
                    <MapPin className="w-4 h-4 text-green-300 group-hover:scale-110 transition-transform" />
                    <span className="font-bold tracking-tight">{locationName}</span>
                  </button>
                </div>
              </div>

              {/* Ultra-Compact Prayer Times Bar */}
              {prayersLoading ? (
                <div className="flex items-center gap-4 pt-2 animate-pulse">
                   <div className="h-4 w-12 bg-white/10 rounded-full" />
                   <div className="h-4 w-12 bg-white/10 rounded-full" />
                   <div className="h-4 w-12 bg-white/10 rounded-full" />
                </div>
              ) : prayerTimes ? (
                <div className="flex items-center gap-x-4 sm:gap-x-6 pt-3 overflow-x-auto scrollbar-hide">
                  {[
                    { label: 'Subuh', time: prayerTimes.Fajr },
                    { label: 'Dzuhur', time: prayerTimes.Dhuhr },
                    { label: 'Ashar', time: prayerTimes.Asr },
                    { label: 'Maghrib', time: prayerTimes.Maghrib },
                    { label: 'Isya', time: prayerTimes.Isha },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center gap-2 whitespace-nowrap">
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">{p.label}</span>
                        <span className="text-sm font-black text-white tracking-tight">{p.time}</span>
                      </div>
                      {i < 4 && <div className="ml-1 h-4 w-px bg-white/10" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-white/40 italic pt-2">
                  Jadwal tidak tersedia
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide snap-x shrink-0">
              {/* Batch Selector Card */}
              {availableBatches.length > 0 && (
                <div className="shrink-0 snap-center h-16 lg:h-24 px-4 rounded-2xl lg:rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/20 flex flex-col items-center justify-center shadow-2xl transition-all hover:bg-white/15">
                  <p className="text-[9px] lg:text-[10px] uppercase font-black text-amber-200 tracking-widest flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-300" />
                    Angkatan
                  </p>
                  {availableBatches.length > 1 ? (
                    <select
                      value={effectiveBatchId || ''}
                      onChange={(e) => handleSelectBatch(e.target.value)}
                      className="bg-transparent text-white font-black text-xs lg:text-sm cursor-pointer focus:outline-none mt-0.5 lg:mt-1 max-w-[140px] truncate text-center"
                    >
                      {availableBatches.map(b => (
                        <option key={b.id} value={b.id} className="text-gray-900 bg-white font-bold">
                          {b.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs lg:text-sm font-black text-white/90 mt-0.5 lg:mt-1 truncate max-w-[130px]">
                      {selectedBatch?.name || 'Batch Aktif'}
                    </p>
                  )}
                </div>
              )}

              {/* Thalibah Rank Card */}
              {userRank && (
                <div 
                  className="relative group shrink-0 snap-center cursor-pointer"
                  onClick={() => setIsThalibahRankModalOpen(true)}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-400/20 to-transparent blur-xl opacity-50 rounded-3xl group-hover:opacity-70 transition-opacity" />
                  <div className="relative h-16 lg:h-24 px-5 lg:px-0 lg:w-28 rounded-2xl lg:rounded-[2rem] bg-gradient-to-b from-amber-500/10 to-black/40 backdrop-blur-xl border border-amber-500/20 flex flex-col justify-center items-center shadow-2xl transition-all group-hover:border-amber-400/50 group-hover:scale-105" title="Klik untuk evaluasi skor">
                    <div className="flex items-center gap-1.5 lg:mb-1">
                       <Trophy className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                       <p className="text-[9px] lg:text-[10px] uppercase font-black text-amber-200/80 tracking-widest drop-shadow-md">Peringkat</p>
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5 lg:mt-1">
                      <span className="text-2xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-400 drop-shadow-sm">{userRank.rank}</span>
                      <span className="text-xs lg:text-sm font-bold text-amber-500/60">/ {userRank.total}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pekan Card */}
              <div className="shrink-0 snap-center h-16 lg:h-24 px-5 lg:px-0 lg:w-24 rounded-2xl lg:rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center shadow-2xl transition-all hover:bg-white/10">
                <p className="text-[9px] lg:text-[10px] uppercase font-black text-white/50 tracking-widest">Pekan</p>
                <div className="flex items-center gap-3 lg:gap-2 mt-0.5 lg:mt-1">
                   <button onClick={() => setCurrentWeek(w => Math.max(1, w - 1))} className="text-white/40 hover:text-white transition-colors w-6 lg:w-auto text-center font-medium">‹</button>
                   <p className="text-2xl lg:text-4xl font-black text-white/90">{currentWeek}</p>
                   <button onClick={() => setCurrentWeek(w => w + 1)} className="text-white/40 hover:text-white transition-colors w-6 lg:w-auto text-center font-medium">›</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-60 h-60 bg-black/10 rounded-full blur-3xl" />
      </div>

      {/* Prominent Batch Switcher Bar if multiple batches available */}
      {availableBatches.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/90 backdrop-blur-xl rounded-[1.75rem] border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-900">Pilih Angkatan / Batch</p>
              <p className="text-[10px] text-gray-500 font-medium">Beralih angkatan untuk melihat data & capaian tiap batch</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {availableBatches.map(b => {
              const isSelected = b.id === effectiveBatchId;
              const isActiveBatch = b.id === activeBatch?.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBatch(b.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border cursor-pointer",
                    isSelected
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-600/20 scale-[1.02]"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                  )}
                >
                  <span>{b.name}</span>
                  {isActiveBatch && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider",
                      isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                    )}>
                      Sedang Aktif
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notice if current batch has 0 progress but user has another batch */}
      {tashihStatus?.summary?.completed_blocks === 0 && jurnalStatus?.summary?.completed_blocks === 0 && availableBatches.length > 1 && (
        <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200/80 rounded-[1.75rem] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-black text-[10px] uppercase">
                  {selectedBatch?.name || 'Batch'}
                </span>
                <span className="text-xs font-black text-gray-900">
                  Hafalan: Juz {tashihStatus?.juz_info?.name || 'Target'}
                </span>
              </div>
              <p className="text-xs text-sky-800/80 font-medium mt-1 leading-relaxed">
                Belum ada catatan setoran di angkatan ini. Ukhti dapat berpindah ke angkatan sebelumnya untuk melihat riwayat setoran Tashih & Jurnal yang sudah tersimpan.
              </p>
            </div>
          </div>
          {availableBatches.filter(b => b.id !== effectiveBatchId).map(otherBatch => (
            <Button
              key={otherBatch.id}
              size="sm"
              onClick={() => handleSelectBatch(otherBatch.id)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-black text-xs rounded-xl px-4 py-2.5 shadow-md shadow-sky-600/20 shrink-0 self-stretch sm:self-auto"
            >
              Lihat {otherBatch.name} →
            </Button>
          ))}
        </div>
      )}

      {/* SP Warning Banner */}
      {!canSeeAdminStats && jurnalStatus?.summary?.sp_summary && (
        <div className={cn(
          "relative overflow-hidden rounded-[2rem] p-6 shadow-2xl border-l-8 animate-fadeIn",
          jurnalStatus.summary.sp_summary.sp_level === 3 ? "bg-rose-50 border-rose-600 shadow-rose-950/5" :
          jurnalStatus.summary.sp_summary.sp_level === 2 ? "bg-orange-50 border-orange-500 shadow-orange-950/5" :
          "bg-amber-50 border-amber-400 shadow-amber-950/5"
        )}>
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
              jurnalStatus.summary.sp_summary.sp_level === 3 ? "bg-rose-600 text-white" :
              jurnalStatus.summary.sp_summary.sp_level === 2 ? "bg-orange-500 text-white" :
              "bg-amber-400 text-yellow-900"
            )}>
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  jurnalStatus.summary.sp_summary.sp_level === 3 ? "bg-rose-600 text-white" :
                  jurnalStatus.summary.sp_summary.sp_level === 2 ? "bg-orange-500 text-white" :
                  "bg-amber-400 text-yellow-900"
                )}>
                  Peringatan Level {jurnalStatus.summary.sp_summary.sp_level}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white/50 px-2 py-1 rounded-full border border-gray-100">
                  Diterbitkan Pekan {jurnalStatus.summary.sp_summary.week_number}
                </span>
              </div>
              <h3 className={cn(
                "text-xl font-black mb-1 leading-tight",
                jurnalStatus.summary.sp_summary.sp_level === 3 ? "text-rose-900" :
                jurnalStatus.summary.sp_summary.sp_level === 2 ? "text-orange-950" :
                "text-amber-950"
              )}>
                {jurnalStatus.summary.sp_summary.sp_type === 'permanent_do' ? 'Status: Drop Out Permanen' :
                 jurnalStatus.summary.sp_summary.sp_type === 'temporary_do' ? 'Status: Drop Out Sementara' :
                 jurnalStatus.summary.sp_summary.sp_level === 3 ? 'Peringatan Terakhir (SP 3)' :
                 `Perlu Perhatian: Surat Peringatan ${jurnalStatus.summary.sp_summary.sp_level}`}
              </h3>
              <p className="text-sm font-medium text-gray-600 max-w-2xl">
                Alasan: <span className="font-bold text-gray-900">"{jurnalStatus.summary.sp_summary.reason}"</span>. 
                {jurnalStatus.summary.sp_summary.sp_type ? " Ukhti telah dinonaktifkan dari program ini secara sistem." : " Mohon segera hubungi Musyrifah Ukhti untuk koordinasi lebih lanjut agar progres hafalan tetap terjaga."}
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white/30 rounded-full blur-3xl opacity-50" />
        </div>
      )}

      {/* 2. Progress Jurnal & Tashih */}
      {(tashihStatus || jurnalStatus || canSeeAdminStats) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {tashihStatus && (
            <Dialog>
              <DialogTrigger asChild>
                <div className="block group cursor-pointer">
                  <Card className="overflow-hidden border-none shadow-xl glass-premium transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-emerald-500/20">
                    <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-4 sm:px-6 py-4">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 group-hover:scale-110 transition-transform">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                                Progress Tashih
                              </CardTitle>
                            </div>
                            <CardDescription className="text-[10px] sm:text-xs font-medium text-emerald-700 flex flex-col mt-0.5 truncate">
                              <span className="truncate">Juz {tashihStatus.juz_info.juz_number} Part {tashihStatus.juz_info.part}</span>
                              <span className="opacity-80 text-[9px] sm:text-[10px] truncate">({tashihStatus.juz_info.name})</span>
                            </CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <div className="text-center flex flex-col justify-center px-1 sm:px-2">
                            <p className="text-lg sm:text-xl font-black text-emerald-700 leading-none">
                              {Math.round((tashihStatus.summary.completed_blocks / tashihStatus.summary.total_blocks) * 100)}%
                            </p>
                            <p className="text-[8px] sm:text-[9px] uppercase font-bold text-emerald-600/70 tracking-wider mt-1 whitespace-nowrap">
                              {tashihStatus.summary.completed_blocks} / {tashihStatus.summary.total_blocks} Blok
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end justify-center gap-1.5 pl-2 sm:pl-3 border-l border-emerald-500/10">
                            <span className="text-[10px] font-bold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm" title="Tashih Streak">
                              {tashihStatus.summary.streak_count || 0} 💎
                            </span>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm" title="Tashih XP">
                              {(tashihStatus.summary.completed_blocks * 10) + ((tashihStatus.summary.streak_count || 0) * 5)} ⭐
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4 pt-1">
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${(tashihStatus.summary.completed_blocks / tashihStatus.summary.total_blocks) * 100}%` }}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-0 shadow-2xl">
                <DialogHeader className="mb-2">
                  <DialogTitle className="flex items-center gap-3 text-2xl font-black text-gray-900">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    Pencapaian Tashih
                  </DialogTitle>
                  <DialogDescription className="text-gray-500 font-medium">
                    Detail pencapaian hafalan Tashih Ukhti pada batch ini.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-2">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-emerald-900">Progress Blok</p>
                      <p className="text-xs text-emerald-700/80 font-medium mt-0.5">Telah disetorkan {tashihStatus.summary.completed_blocks} dari total {tashihStatus.summary.total_blocks} blok.</p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center shrink-0">
                      <p className="text-sm font-black text-emerald-600">{Math.round((tashihStatus.summary.completed_blocks / tashihStatus.summary.total_blocks) * 100)}%</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col items-center text-center justify-center shadow-sm">
                      <Star className="w-8 h-8 text-amber-500 mb-2 fill-amber-500 animate-pulse" />
                      <p className="font-black text-2xl text-amber-600 leading-none">{(tashihStatus.summary.completed_blocks * 10) + ((tashihStatus.summary.streak_count || 0) * 5)}</p>
                      <p className="text-xs font-bold text-amber-700 mt-1">Total XP</p>
                      <p className="text-[9px] font-medium text-amber-600/70 mt-1">10 XP per blok disetor</p>
                    </div>
                    <div className="flex-1 bg-sky-50 p-4 rounded-2xl border border-sky-100 flex flex-col items-center text-center justify-center shadow-sm">
                      <span className="text-3xl mb-1 filter drop-shadow-sm animate-bounce-slow">💎</span>
                      <p className="font-black text-2xl text-sky-600 leading-none">{tashihStatus.summary.streak_count || 0}</p>
                      <p className="text-xs font-bold text-sky-700 mt-1">Streak</p>
                      <p className="text-[9px] font-medium text-sky-600/70 mt-1">Bonus 5 XP per hari konsisten</p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 mt-1 italic text-xs text-emerald-800 text-center font-medium shadow-sm">
                  "Masya Allah! Setiap ayat yang Ukhti setorkan adalah langkah nyata menuju gelar Ahlul Qur'an. Tetap semangat dan istiqomah menjaga hafalan ya!"
                </div>
                
                <DialogFooter className="flex-col sm:flex-row gap-2 mt-4 sm:space-x-0">
                  <DialogClose asChild>
                    <Button variant="outline" className="w-full sm:w-1/3 rounded-xl border-gray-200 text-gray-600 font-bold hover:bg-gray-50">Tutup</Button>
                  </DialogClose>
                  <Link href="/tashih" className="w-full sm:w-2/3">
                    <Button className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                      Lanjut Isi Tashih <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

        {jurnalStatus && (
            <Dialog>
              <DialogTrigger asChild>
                <div className="block group cursor-pointer">
                  <Card className="overflow-hidden border-none shadow-xl glass-premium transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-purple-500/20">
                    <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 sm:px-6 py-4">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                          <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0 group-hover:scale-110 transition-transform">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-purple-700 transition-colors truncate">
                                Progress Jurnal
                              </CardTitle>
                            </div>
                            <CardDescription className="text-[10px] sm:text-xs font-medium text-purple-700 flex flex-col mt-0.5 truncate">
                              <span className="truncate">Juz {jurnalStatus.juz_info.juz_number} Part {jurnalStatus.juz_info.part}</span>
                              <span className="opacity-80 text-[9px] sm:text-[10px] truncate">({jurnalStatus.juz_info.name})</span>
                            </CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <div className="text-center flex flex-col justify-center px-1 sm:px-2">
                            <p className="text-lg sm:text-xl font-black text-purple-700 leading-none">
                              {Math.round((jurnalStatus.summary.completed_blocks / jurnalStatus.summary.total_blocks) * 100)}%
                            </p>
                            <p className="text-[8px] sm:text-[9px] uppercase font-bold text-purple-600/70 tracking-wider mt-1 whitespace-nowrap">
                              {jurnalStatus.summary.completed_blocks} / {jurnalStatus.summary.total_blocks} Blok
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end justify-center gap-1.5 pl-2 sm:pl-3 border-l border-purple-500/10">
                            <span className="text-[10px] font-bold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm" title="Jurnal Streak">
                              {jurnalStatus.summary.streak_count || 0} 💎
                            </span>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm" title="Jurnal XP">
                              {(jurnalStatus.summary.completed_blocks * 40) + ((jurnalStatus.summary.streak_count || 0) * 5)} ⭐
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4 pt-1">
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${(jurnalStatus.summary.completed_blocks / jurnalStatus.summary.total_blocks) * 100}%` }}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-0 shadow-2xl">
                <DialogHeader className="mb-2">
                  <DialogTitle className="flex items-center gap-3 text-2xl font-black text-gray-900">
                    <div className="w-12 h-12 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                      <FileText className="h-6 w-6" />
                    </div>
                    Pencapaian Jurnal
                  </DialogTitle>
                  <DialogDescription className="text-gray-500 font-medium">
                    Detail pencapaian muraja'ah harian Ukhti pada batch ini.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-2">
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-purple-900">Progress Blok</p>
                      <p className="text-xs text-purple-700/80 font-medium mt-0.5">Telah diselesaikan {jurnalStatus.summary.completed_blocks} dari total {jurnalStatus.summary.total_blocks} blok.</p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-purple-100 border-2 border-purple-200 flex items-center justify-center shrink-0">
                      <p className="text-sm font-black text-purple-600">{Math.round((jurnalStatus.summary.completed_blocks / jurnalStatus.summary.total_blocks) * 100)}%</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col items-center text-center justify-center shadow-sm">
                      <Star className="w-8 h-8 text-amber-500 mb-2 fill-amber-500 animate-pulse" />
                      <p className="font-black text-2xl text-amber-600 leading-none">{(jurnalStatus.summary.completed_blocks * 40) + ((jurnalStatus.summary.streak_count || 0) * 5)}</p>
                      <p className="text-xs font-bold text-amber-700 mt-1">Total XP</p>
                      <p className="text-[9px] font-medium text-amber-600/70 mt-1">40 XP per blok jurnal</p>
                    </div>
                    <div className="flex-1 bg-sky-50 p-4 rounded-2xl border border-sky-100 flex flex-col items-center text-center justify-center shadow-sm">
                      <span className="text-3xl mb-1 filter drop-shadow-sm animate-bounce-slow">💎</span>
                      <p className="font-black text-2xl text-sky-600 leading-none">{jurnalStatus.summary.streak_count || 0}</p>
                      <p className="text-xs font-bold text-sky-700 mt-1">Streak</p>
                      <p className="text-[9px] font-medium text-sky-600/70 mt-1">Bonus 5 XP per hari konsisten</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/50 mt-1 italic text-xs text-purple-800 text-center font-medium shadow-sm">
                  "Tabaarakallah! Muraja'ah adalah sebaik-baik cara untuk mengikat hafalan di dalam hati. Semoga Allah mudahkan setiap pengulangan Ukhti."
                </div>
                
                <DialogFooter className="flex-col sm:flex-row gap-2 mt-4 sm:space-x-0">
                  <DialogClose asChild>
                    <Button variant="outline" className="w-full sm:w-1/3 rounded-xl border-gray-200 text-gray-600 font-bold hover:bg-gray-50">Tutup</Button>
                  </DialogClose>
                  <Link href="/jurnal-harian" className="w-full sm:w-2/3">
                    <Button className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20">
                      Lanjut Isi Jurnal <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Halaqah of the Week Banner */}
      {!halaqahLoading && halaqahOfTheWeek && (
        <div 
          className="relative overflow-hidden rounded-[2rem] p-4 sm:p-6 shadow-xl border-l-8 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 animate-fadeInUp mt-4 w-full cursor-pointer hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 group" 
          style={{ animationDelay: '150ms' }}
          onClick={() => setIsRankingModalOpen(true)}
        >
          <div className="absolute top-0 right-0 -mt-8 -mr-8 text-yellow-500 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <Trophy className="w-40 h-40" />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 relative z-10 w-full">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg bg-yellow-400 text-yellow-900">
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="flex-1 text-center md:text-left w-full">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-yellow-700 bg-yellow-200/50 px-3 py-1 rounded-full">
                  Halaqah of the Week
                </span>
                <span className="text-xs font-bold text-gray-500">
                  {activeBatch?.name || 'Aktif'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-1 break-words">
                {(() => {
                  if (!halaqahOfTheWeek.name.includes(' | ')) return halaqahOfTheWeek.name;
                  const parts = halaqahOfTheWeek.name.split(' | ');
                  const prefixPart = parts[0];
                  
                  const newNamePart = `Ustadzah ${halaqahOfTheWeek.muallimah_name}`;
                  
                  if (prefixPart.toLowerCase().includes('pra')) {
                    return `${prefixPart} | ${newNamePart}`;
                  }
                  
                  if (parts.length > 2) {
                    return `${parts.slice(0, -1).join(' | ')} | ${newNamePart}`;
                  }
                  
                  return `${prefixPart} | ${newNamePart}`;
                })()}
              </h2>
              <p className="text-gray-600 font-medium">
                Bersama Ustadzah <span className="font-bold text-gray-900">{halaqahOfTheWeek.muallimah_name}</span>
              </p>
              {halaqahOfTheWeek.evaluation_period && (
                <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  Periode Penilaian: <span className="font-semibold text-gray-700">{halaqahOfTheWeek.evaluation_period}</span> (Pekan {halaqahOfTheWeek.target_week})
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 md:flex items-stretch shrink-0 gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0">
              <div className="flex flex-col items-center justify-center bg-white/60 p-3 sm:px-4 sm:py-3 rounded-2xl border border-yellow-100 shadow-sm md:min-w-[120px]">
                <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Disiplin Tashih</span>
                <div className="flex items-end gap-1 sm:gap-1.5 text-green-600 mt-1">
                  <span className="text-xl sm:text-2xl font-black leading-none">{halaqahOfTheWeek.active_tashih || 0}</span>
                  <span className="text-xs sm:text-sm font-bold leading-none mb-0.5 text-gray-400">/ {halaqahOfTheWeek.total_thalibah}</span>
                </div>
                <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 mt-1 text-center">Santri Aktif</span>
              </div>
              
              {currentWeek >= 2 && (
                <div className="flex flex-col items-center justify-center bg-white/60 p-3 sm:px-4 sm:py-3 rounded-2xl border border-yellow-100 shadow-sm md:min-w-[120px]">
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Disiplin Jurnal</span>
                  <div className="flex items-end gap-1 sm:gap-1.5 text-blue-600 mt-1">
                    <span className="text-xl sm:text-2xl font-black leading-none">{halaqahOfTheWeek.active_jurnal || 0}</span>
                    <span className="text-xs sm:text-sm font-bold leading-none mb-0.5 text-gray-400">/ {halaqahOfTheWeek.total_thalibah}</span>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 mt-1 text-center">Santri Aktif</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Menu Layanan */}
      <div className="space-y-4">
        {isImpersonating && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-400 mr-2" />
              <span className="text-amber-800 font-medium">
                Mode Preview: Melihat Dashboard Thalibah (ID: {targetUserId})
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-amber-600 hover:text-amber-800"
              onClick={() => push('/dashboard')}
            >
              Keluar Preview
            </Button>
          </div>
        )}

        {/* Tikrar Tahfidz Registration CTA - Muncul di masa pendaftaran/seleksi */}
        {(() => {
          // Cek apakah masa pendaftaran masih terbuka
          // Masa pendaftaran: dari registration_start_date sampai registration_end_date
          const isRegistrationPeriod = activeBatch &&
            activeBatch.registration_start_date &&
            activeBatch.registration_end_date &&
            new Date(activeBatch.registration_start_date) <= new Date() &&
            new Date(activeBatch.registration_end_date) >= new Date();

          // Card muncul kalau:
          // 1) Ada active batch, DAN
          // 2) Masa pendaftaran masih terbuka, DAN
          // 3) User BELUM mendaftar di batch aktif ini
          const shouldShowCard = activeBatch &&
            isRegistrationPeriod &&
            !hasRegisteredTikrar;

          return shouldShowCard;
        })() && (
          <div className="mb-8">
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-amber-900/20 overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 ring-2 ring-amber-300/50 relative">
              {/* Gold sparkle effects */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-400/20 to-amber-500/10 rounded-full blur-3xl -z-10"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-amber-400/15 to-yellow-500/10 rounded-full blur-2xl -z-10"></div>

              <CardContent className="p-0 relative">
                <div className="flex flex-col md:flex-row items-stretch">
                  <div className="w-full md:w-1/3 bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 p-8 flex flex-col items-center justify-center text-white relative overflow-hidden">
                    {/* Gold shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent"></div>

                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 ring-2 ring-yellow-300/50 shadow-xl relative z-10">
                      <BookOpen className="w-8 h-8 text-yellow-900" />
                    </div>
                    <div className="text-center relative z-10">
                      <p className="text-[10px] uppercase font-black tracking-[0.3em] text-yellow-100 mb-1 flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Program Utama
                        <Sparkles className="w-3 h-3" />
                      </p>
                      <h3 className="text-xl font-black text-white drop-shadow-lg">Tikrar Tahfidz</h3>
                      {activeBatch?.name && (
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-white/20 text-[9px] font-bold text-white tracking-wide">
                          {activeBatch.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 p-8 md:p-10 flex flex-col justify-center space-y-6 relative">
                    <div className="space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                        Siap Menjadi <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">Hafidzah</span> Al-Qur'an?
                      </h2>
                      <p className="text-sm font-medium text-gray-600 leading-relaxed">
                        Program Tahfidz Tikrar MTI dengan metode pengulangan 40X. Daftar sekarang dan raih keberkahan menghafal Al-Qur'an.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <Link href={`/pendaftaran/tikrar-tahfidz?batchId=${activeBatch?.id}`} className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-700 hover:via-yellow-700 hover:to-amber-800 text-white font-black px-8 py-6 rounded-2xl shadow-xl shadow-amber-900/30 border-b-4 border-amber-900 active:border-b-0 active:translate-y-1 transition-all">
                          Daftar Sekarang
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Muallimah Registration CTA - Muncul jika user belum mendaftar Muallimah di batch aktif dan masih dalam masa pendaftaran */}
        {(() => {
          const isRegistrationPeriod = activeBatch &&
            activeBatch.registration_start_date &&
            activeBatch.registration_end_date &&
            new Date(activeBatch.registration_start_date) <= new Date() &&
            new Date(activeBatch.registration_end_date) >= new Date();

          return !hasMuallimahReg && activeBatch && isRegistrationPeriod;
        })() && (
          <div className="mb-8">
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-green-900/10 overflow-hidden bg-gradient-to-br from-white to-green-50 ring-1 ring-green-100/50">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-stretch">
                  <div className="w-full md:w-1/3 bg-gradient-to-br from-green-700 to-green-900 p-8 flex flex-col items-center justify-center text-white">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 ring-1 ring-white/20 shadow-xl">
                      <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-black tracking-[0.3em] text-green-300 mb-1">Recruitment</p>
                      <h3 className="text-xl font-black">Muallimah MTI</h3>
                      {activeBatch?.name && (
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-green-200 tracking-wide border border-white/10">
                          {activeBatch.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 p-8 md:p-10 flex flex-col justify-center space-y-6">
                    <div className="space-y-3">
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                        Siap Menjadi Bagian dari <span className="text-green-700">Pendidik Al-Qur'an?</span>
                      </h2>
                      <p className="text-sm font-medium text-gray-500 leading-relaxed">
                        Bergabunglah menjadi Muallimah Markaz Tikrar Indonesia. Bagikan ilmu Ukhti dan raih pahala jariyah.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <Link href={activeBatch ? `/pendaftaran/muallimah?batchId=${activeBatch.id}` : "/pendaftaran/muallimah"} className="w-full sm:w-auto" onClick={(e) => {
                        if (!window.confirm("PERHATIAN!\n\nPendaftaran ini khusus untuk calon PENGAJAR (Mu'allimah), BUKAN untuk calon SANTRI (Thalibah).\n\nJika Ukhti ingin mendaftar sebagai santri, silakan pilih Pendaftaran Tikrar Tahfidz.\n\nApakah Ukhti yakin ingin melanjutkan mendaftar sebagai Mu'allimah?")) {
                          e.preventDefault();
                        }
                      }}>
                        <Button className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white font-black px-8 py-6 rounded-2xl shadow-lg border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all">
                          Daftar Sekarang
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-green-700" />
            Menu Layanan
          </h2>
          {isSuperadmin && (
            <Button
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_frozen: !isFrozen })
                  });
                  if (res.ok) {
                    setIsFrozen(!isFrozen);
                    toast.success(!isFrozen ? "Aplikasi berhasil dibekukan" : "Aplikasi dibuka kembali");
                  }
                } catch (e) {
                  toast.error("Gagal mengubah status aplikasi");
                }
              }}
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-2 transition-all",
                isFrozen 
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700" 
                  : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700"
              )}
            >
              <Snowflake className="w-4 h-4" />
              {isFrozen ? 'Buka Aplikasi (Unfreeze)' : 'Freeze Aplikasi'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-6 w-full">
          {(() => {
            const menuItems = [
              { label: 'Perjalanan Saya', icon: Clock, color: 'blue', href: '/perjalanan-saya' },
              { label: 'Catatan Tashih', icon: ClipboardList, color: 'emerald', href: '/tashih' },
              { label: 'Jurnal Harian', icon: BookOpen, color: 'indigo', href: '/jurnal-harian' },
              { label: 'Ujian Pekanan', icon: Calendar, color: 'amber', href: '/ujian' },
              { label: 'Ujian Akhir', icon: Award, color: 'blue', href: '#' },
              { label: 'Sertifikat', icon: CheckCircle, color: 'emerald', href: '/kelulusan-sertifikat' },
              { label: 'Infaq & Donasi', icon: Wallet, color: 'amber', href: '/infaq-donasi' },
              { label: 'Alumni', icon: GraduationCap, color: 'purple', href: '/alumni' },
            ];

            return menuItems.map((item, i) => (
              <Link key={i} href={item.href} className="group min-w-0">
                <div 
                  onClick={(e) => {
                    if ((item as any).locked) {
                      e.preventDefault();
                      alert(`Maaf Ukhti, menu ini terkunci.`);
                    } else if (item.label === 'Ujian Akhir') {
                      e.preventDefault();
                      setExamModalOpen(true);
                    }
                  }}
                  className={cn(
                    "h-full glass-premium rounded-xl sm:rounded-3xl p-1.5 sm:p-4 border border-white transition-all duration-300 flex flex-col items-center text-center justify-start sm:justify-center min-h-[90px] sm:min-h-0 relative overflow-hidden",
                    (item as any).locked 
                      ? "opacity-50 grayscale cursor-not-allowed" 
                      : "hover:border-green-100 hover:shadow-xl hover:-translate-y-1 cursor-pointer",
                    item.label === 'Infaq & Donasi' && "bg-amber-50/90 border-amber-300/80 shadow-md shadow-amber-100/50 hover:border-amber-400"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl flex items-center justify-center mb-1 sm:mb-3 transition-transform duration-300 shadow-sm flex-shrink-0 relative",
                    !(item as any).locked && "group-hover:scale-110",
                    item.label === 'Infaq & Donasi' ? "bg-amber-500 text-white shadow-md shadow-amber-350/50 border border-amber-400/30" :
                    item.color === 'blue' ? "bg-blue-50 text-blue-600 border border-blue-100/50" :
                    item.color === 'emerald' ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" :
                    item.color === 'indigo' ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50" :
                    item.color === 'amber' ? "bg-amber-50 text-amber-600 border border-amber-100/50" :
                    item.color === 'purple' ? "bg-purple-50 text-purple-600 border border-purple-100/50" :
                    "bg-gray-50 text-gray-400 border border-gray-100/50"
                  )}>
                    <item.icon className="w-5 h-5 sm:w-7 sm:h-7" />
                    {(item as any).locked && (
                      <div className="absolute -top-1 -right-1 bg-gray-600 text-white p-1 rounded-full shadow-lg">
                        <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                      </div>
                    )}
                  </div>
                  <h3 className={cn(
                    "text-[8px] sm:text-xs lg:text-sm font-bold leading-[1.1] w-full px-0.5 break-words",
                    item.label === 'Infaq & Donasi' ? "text-amber-950" : "text-gray-900"
                  )}>
                    {item.label}
                  </h3>
                </div>
              </Link>
            ));
          })()}
        </div>
      </div>

      {/* Jadwal Harian Section - only for active batch members & admin */}
      {(hasRegisteredTikrar || hasMuallimahReg || canSeeAdminStats) && (
        <UserJadwalHarian user={user} activeBatch={selectedBatch || activeBatch} daftarUlangData={daftarUlangData} />
      )}

      {/* Group Links Section */}
      {hasPhase3 && (
        <GroupLinks 
          daftarUlangData={daftarUlangData}
          batchData={selectedBatch || activeBatch}
          partnerName={partnerName}
        />
      )}

      {/* 5. Ayat & Hadits Motivasi */}
      <Card className="rounded-3xl border-none shadow-xl overflow-hidden bg-gradient-to-br from-green-900 to-green-800 text-white">
        <CardContent className="p-8 text-center space-y-6 relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none overflow-hidden">
             <BookOpen className="w-64 h-64 -ml-20 -mt-20 rotate-12" />
             <Sparkles className="w-32 h-32 absolute top-10 right-10" />
          </div>

          <div className="space-y-2">
            <p className="text-xl sm:text-2xl font-serif italic leading-relaxed">
              "Dan sesungguhnya telah Kami mudahkan Al-Quran untuk pelajaran, maka adakah orang yang mengambil pelajaran?"
            </p>
            <p className="text-xs uppercase tracking-widest font-bold text-green-300">QS. Al-Qamar: 17</p>
          </div>

          <div className="w-12 h-px bg-white/20 mx-auto" />

          <div className="space-y-2">
            <p className="text-sm sm:text-base font-medium text-green-100">
              "Sebaik-baik kalian adalah yang mempelajari Al-Qur'an dan mengajarkannya."
            </p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-400">HR. Bukhari</p>
          </div>
        </CardContent>
      </Card>

      {/* 6. Aktivitas Terkini */}
      <Card className="rounded-3xl border-none shadow-xl overflow-hidden glass-premium">
        <CardHeader className="bg-gradient-to-br from-gray-50 to-white/50 border-b border-gray-100 px-6 py-5">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-700" />
            Aktivitas Terkini
          </CardTitle>
          <CardDescription className="text-xs">Riwayat update terbaru Ukhti</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-4">
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              <>
                {recentActivity
                  .slice((activitiesPage - 1) * activitiesPerPage, activitiesPage * activitiesPerPage)
                  .map((activity, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl bg-gray-50", activity.color)}>
                          <activity.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{activity.title}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(activity.date)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-green-500 transition-colors" />
                    </div>
                  ))
                }

                {recentActivity.length > activitiesPerPage && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActivitiesPage(p => Math.max(1, p - 1))}
                      disabled={activitiesPage === 1}
                      className="text-[10px] font-bold uppercase tracking-widest h-8"
                    >
                      Sebelumnya
                    </Button>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Hal {activitiesPage} dari {Math.ceil(recentActivity.length / activitiesPerPage)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActivitiesPage(p => Math.min(Math.ceil(recentActivity.length / activitiesPerPage), p + 1))}
                      disabled={activitiesPage >= Math.ceil(recentActivity.length / activitiesPerPage)}
                      className="text-[10px] font-bold uppercase tracking-widest h-8"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-xs font-medium">Belum ada aktivitas terekam pekan ini</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <FinalExamPortalModal 
        isOpen={examModalOpen} 
        onClose={() => setExamModalOpen(false)} 
        hariAktual={displayStats.hariAktual}
        percentage={displayStats.persentaseProgress}
        isAdmin={userRole === 'admin'}
        batchName={registrations[0]?.batch?.name || registrations[0]?.batch_name}
        batchId={registrations[0]?.batch_id}
        isMurajaahCompleted={isMurajaahCompleted}
      />

      {/* Thalibah Rank Modal */}
      <Dialog open={isThalibahRankModalOpen} onOpenChange={setIsThalibahRankModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-b from-amber-50 to-white rounded-[2rem] border-0 shadow-2xl">
          <DialogHeader className="p-6 pb-5 bg-amber-400 text-amber-950 shrink-0 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 text-amber-500 opacity-30">
              <Trophy className="w-32 h-32" />
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-amber-950 shadow-inner">
                <Trophy className="w-7 h-7" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">Evaluasi Kedisiplinan</DialogTitle>
                <DialogDescription className="text-amber-900/80 font-semibold mt-1">
                  Rincian perhitungan skor disiplin Anda
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-100/50 rounded-2xl p-4 flex flex-col items-center justify-center border border-amber-200">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Peringkat</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-amber-600">{userRank?.rank}</span>
                  <span className="text-sm font-bold text-amber-500/70">/ {userRank?.total}</span>
                </div>
              </div>
              <div className="bg-amber-100/50 rounded-2xl p-4 flex flex-col items-center justify-center border border-amber-200">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Total Skor</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-amber-600">{userRank?.score}</span>
                  <span className="text-sm font-bold text-amber-500/70">pts</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-gray-800">Bagaimana skor dihitung?</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <p>Skor dihitung berdasarkan <b>ketepatan waktu</b> Anda menyetorkan Jurnal dan Tugas Tashih pekanan.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <p>Setiap blok (Jurnal/Tashih) yang dikumpulkan <b>tepat waktu</b> atau lebih awal mendapatkan skor wajib penuh <b>10 poin</b>.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  <p>Anda mendapatkan tambahan <b>+1 Poin Opsional</b> untuk setiap kegiatan ekstra (Baca Tafsir, dsb) yang Anda centang per blok Jurnal.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <p>Keterlambatan 1 hari akan <b>mengurangi 2 poin</b> dari skor maksimal blok terkait.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <p>Total skor maksimal adalah <b>100 Poin</b> (80 poin wajib + 20 poin ekstra kegiatan opsional).</p>
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter className="p-4 bg-gray-50 border-t">
            <DialogClose asChild>
              <button className="w-full py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                Tutup
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Halaqah Ranking Modal */}
      <Dialog open={isRankingModalOpen} onOpenChange={setIsRankingModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-gradient-to-b from-yellow-50 to-white rounded-[2rem] border-0 shadow-2xl">
          <DialogHeader className="p-6 pb-5 bg-yellow-400 text-yellow-950 shrink-0 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 text-yellow-500 opacity-30">
              <Trophy className="w-32 h-32" />
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-yellow-950 shadow-inner">
                <Trophy className="w-7 h-7" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">Peringkat Halaqah</DialogTitle>
                <DialogDescription className="text-yellow-900/80 font-semibold mt-1">
                  Berdasarkan pencapaian pekan {halaqahOfTheWeek?.target_week} ({halaqahOfTheWeek?.evaluation_period})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-3 bg-gray-50/50">
            {allHalaqahs && allHalaqahs.length > 0 ? (
              allHalaqahs.map((halaqah, index) => (
                <div key={halaqah.id} className="flex flex-col gap-2">
                  <div 
                    onClick={() => setExpandedHalaqahId(expandedHalaqahId === halaqah.id ? null : halaqah.id)}
                    className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                      index === 0 
                        ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-300 shadow-md ring-1 ring-yellow-400/50' 
                        : index < 3 
                          ? 'bg-white border-gray-200 shadow-sm' 
                          : 'bg-white/80 border-gray-100 hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-yellow-500/50' :
                      index === 1 ? 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 shadow-gray-400/30' :
                      index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-amber-700/30' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left min-w-0 w-full">
                      <h3 className={`font-bold truncate ${index === 0 ? 'text-lg text-yellow-900' : 'text-base text-gray-900'}`} title={halaqah.name}>
                        {halaqah.name}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium mt-0.5">Ustadzah {halaqah.muallimah_name}</p>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full sm:w-auto text-center shrink-0 mt-3 sm:mt-0">
                      <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Progress</p>
                        <p className="font-black text-gray-900 text-sm">{halaqah.avg_progress}%</p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Jurnal</p>
                        <p className="font-black text-emerald-600 text-sm">{halaqah.active_jurnal} <span className="text-[10px] font-medium text-gray-400">/{halaqah.total_thalibah}</span></p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tashih</p>
                        <p className="font-black text-amber-600 text-sm">{halaqah.active_tashih} <span className="text-[10px] font-medium text-gray-400">/{halaqah.total_thalibah}</span></p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center relative">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Skor Disiplin</p>
                        <p className="font-black text-purple-600 text-sm mt-0.5 whitespace-nowrap">{halaqah.on_time_score ?? '-'}</p>
                        <div className="absolute -right-2 -bottom-2 bg-white rounded-full p-0.5 shadow-sm border border-gray-100 text-gray-400">
                           {expandedHalaqahId === halaqah.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown section */}
                  {expandedHalaqahId === halaqah.id && (
                    <div className="ml-0 sm:ml-16 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {(!halaqah.students || halaqah.students.length === 0) ? (
                        <div className="p-4 text-center text-sm text-gray-500 font-medium">
                          Data rincian tidak tersedia atau Anda tidak memiliki akses untuk melihat rincian halaqah ini.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-3 font-semibold">Nama Santri</th>
                                <th className="px-4 py-3 font-semibold text-center">Progress</th>
                                <th className="px-4 py-3 font-semibold text-center">Jurnal</th>
                                <th className="px-4 py-3 font-semibold text-center">Tashih</th>
                                <th className="px-4 py-3 font-semibold text-center">Skor Disiplin</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {halaqah.students.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                                  <td className="px-4 py-3 text-center font-bold text-gray-700">{student.progress}%</td>
                                  <td className="px-4 py-3 text-center font-bold text-emerald-600">{student.jurnal}</td>
                                  <td className="px-4 py-3 text-center font-bold text-amber-600">{student.tashih}</td>
                                  <td className="px-4 py-3 text-center font-black text-purple-600">{student.punctualityScore}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-gray-400 flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="w-10 h-10 opacity-20" />
                </div>
                <p className="font-medium">Data peringkat belum tersedia</p>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 sm:p-5 bg-white border-t border-gray-100 shrink-0">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto rounded-xl font-bold hover:bg-gray-50">Tutup</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
