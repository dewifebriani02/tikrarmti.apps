'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isStaff } from '@/lib/roles';
import { 
  Calendar, Clock, Users, BookOpen, Video, Copy, ChevronDown, CheckCircle2, Tag, FileText, Download, Image as ImageIcon, Pencil, X,
  Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, MessageCircle, AlertCircle
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { 
  generateHalaqahReminder, 
  generateDailyReminder, 

  generateLaporanKelas,
  generateMuallimahReminder,
  getDayName,
  formatTimeShort,
  type HalaqahForReminder
} from '@/lib/reminder-generator';
import { toPng } from 'html-to-image';
import { JadwalPoster } from './JadwalPoster';
import { TerimaKasihPoster } from './TerimaKasihPoster';

const DAYS = [
  { id: 1, name: 'Senin' },
  { id: 2, name: 'Selasa' },
  { id: 3, name: 'Rabu' },
  { id: 4, name: 'Kamis' },
  { id: 5, name: 'Jumat' },
  { id: 6, name: 'Sabtu' },
  { id: 7, name: 'Ahad' },
  { id: 0, name: 'Sepekan' }
];

export default function AdminJadwalHarianTab() {
  const { user } = useAuth();
  const [programTab, setProgramTab] = useState<'tikrar' | 'pra_tikrar'>('tikrar');
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay() === 0 ? 7 : new Date().getDay());
  const [halaqahs, setHalaqahs] = useState<HalaqahForReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBatchName, setActiveBatchName] = useState<string>('');
  const [activeUstadzahName, setActiveUstadzahName] = useState<string>('');
  const [zoomLinks, setZoomLinks] = useState<any[]>([]);
  const [studentListHalaqah, setStudentListHalaqah] = useState<HalaqahForReminder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'time' | 'class' | 'muallimah' | 'students'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const supabase = createClient();
  const userRoles = (user as any)?.primaryRole ? [(user as any).primaryRole] : (user?.roles || []);
  const isUserStaff = isStaff(userRoles);
  
  const tikrarPosterRef = useRef<HTMLDivElement>(null);
  const praTikrarPosterRef = useRef<HTMLDivElement>(null);
  const terimaKasihPosterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchSchedule();
    }
  }, [user]);

  const fetchSchedule = async () => {
    setIsLoading(true);
    try {
      // 1. Get active batch
      const batchRes = await fetch('/api/batches');
      const batchJson = await batchRes.json();
      const loadedBatches = batchJson.data || [];
      const batch = loadedBatches.find((b: any) => b.status === 'open' || b.status === 'ongoing') || loadedBatches[0];

      if (!batch) {
        setIsLoading(false);
        return;
      }
      
      setActiveBatchName(batch.name);
      
      let links: any[] = [];
      try {
        const { data } = await supabase.from('batch_zoom_links').select('id, name').eq('batch_id', batch.id).order('name');
        links = data || [];
      } catch (e) {
        console.warn('Could not fetch zoom links:', e);
      }
      setZoomLinks(links);

      // 2. Get ALL halaqahs for this batch (to enable global search)
      // We use the server-side API to bypass RLS so that all authenticated users
      // (including musyrifah and thalibah) can see the full active roster for 'Jadwal Harian'
      const response = await fetch(`/api/shared/halaqah-roster?batch_id=${batch.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch halaqah data');
      }
      const rosterJson = await response.json();
      const halaqahData = rosterJson.data || [];

      let filteredData = halaqahData || [];

      // Daftar Ulang uses confirmed_full_name. Use the same approved, batch-scoped
      // value in Jadwal Harian so the roster name is identical everywhere.
      const confirmedNameMap = new Map<string, string>();
      try {
        const { data: approvedSubmissions } = await supabase
          .from('daftar_ulang_submissions')
          .select('user_id, confirmed_full_name, updated_at')
          .eq('batch_id', batch.id)
          .eq('status', 'approved')
          .order('updated_at', { ascending: false });

        for (const submission of approvedSubmissions || []) {
          if (submission.confirmed_full_name && !confirmedNameMap.has(submission.user_id)) {
            confirmedNameMap.set(submission.user_id, submission.confirmed_full_name);
          }
        }
      } catch (e) {
        console.warn('Could not fetch confirmed names:', e);
      }

      // Map to HalaqahForReminder format
      // Get the start of the current week (Monday)
      let sitInLogs: any[] = [];
      try {
        const now = new Date();
        const currentDay = now.getDay();
        const distance = currentDay === 0 ? 6 : currentDay - 1;
        const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distance);
        lastMonday.setHours(0, 0, 0, 0);
        const startOfWeek = lastMonday.toISOString();

        const { data } = await supabase
          .from('audit_logs')
          .select('user_id, created_at, details, user:users(full_name, whatsapp)')
          .eq('action', 'UPDATE')
          .eq('resource', 'halaqah')
          .gte('created_at', startOfWeek);
        sitInLogs = data || [];
      } catch (e) {
        console.warn('Could not fetch sit-in logs:', e);
      }

      // Fetch accurate quota/student counts that bypass RLS
      let quotas: Record<string, { activeCount: number, maxStudents: number }> = {};
      try {
        const quotaRes = await fetch(`/api/shared/halaqah-quota?batch_id=${batch.id}`);
        if (quotaRes.ok) {
          const quotaJson = await quotaRes.json();
          const quotaList = Array.isArray(quotaJson) ? quotaJson : (quotaJson.data?.halaqah || quotaJson.data || []);
          if (Array.isArray(quotaList)) {
            quotaList.forEach((q: any) => {
              quotas[q.id || q.halaqahId] = { activeCount: q.total_current_students ?? q.activeCount ?? 0, maxStudents: q.total_max_students ?? q.maxStudents ?? 5 };
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch halaqah quota', err);
      }

      const formattedData: HalaqahForReminder[] = filteredData.map((h: any) => {
        const sitIns = sitInLogs?.filter((log: any) => log.details?.action_type === 'SIT_IN' && log.details?.halaqah_id === h.id) || [];
        const sitInStudents = sitIns.map((log: any) => ({
          thalibah_id: log.user_id + '_sitin',
          full_name: (log.user?.full_name || 'Hamba Allah') + ' (Sit-In 🌸)',
          preferred_juz: h.preferred_juz,
          phone: log.user?.whatsapp
        }));

        return {
        ...h,
        class_type: h.program?.class_type,
        zoom_name: h.zoom?.name || '',
        zoom_link: h.zoom?.url || h.zoom_link || '',
        zoom_link_id: h.zoom_link_id,
        zoom_meeting_id: h.zoom?.meeting_id || '',
        zoom_passcode: h.zoom?.passcode || '',
        zoom_claim_host: h.zoom?.claim_host || '',
        muallimah: {
          full_name: h.muallimah?.full_name,
          whatsapp: h.muallimah?.whatsapp
        },
        program: {
          class_type: h.program?.class_type,
          batch: {
            name: h.program?.batch?.name
          }
        },
        max_students: h.max_students,
        // Only active students and sit-ins
        students: Array.from(
          new Map(
            [
              ...(h.students || [])
                .filter((s: any) => s.status === 'active')
                .map((s: any) => [s.thalibah_id, {
                  full_name: confirmedNameMap.get(s.thalibah_id) || s.thalibah?.full_name,
                  preferred_juz: h.preferred_juz,
                  phone: s.thalibah?.whatsapp || s.thalibah?.phone
                }]),
              ...sitInStudents.map((s: any) => [s.thalibah_id, s])
            ]
          ).values()
        ),
        activeCount: quotas[h.id]?.activeCount ?? (h.students?.filter((s: any) => s.status === 'active').length || 0)
      };
    });

      setHalaqahs(formattedData);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      toast.error('Gagal memuat jadwal harian');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch (err) {
      toast.error('Gagal menyalin teks. Silakan coba lagi.');
    }
  };

  const userName = (user as any)?.user_metadata?.full_name || (user as any)?.full_name || '';

  const handleCopyRekapan = () => {
    const text = generateDailyReminder(activeBatchName, activeProgramHalaqahs, getNextDateForDay(activeDay), userName);
    copyToClipboard(text, 'Rekapan Harian berhasil disalin!');
  };

  // Helper to get the actual Date object for the selected day of the week
  const getNextDateForDay = (dayOfWeek: number): Date => {
    const date = new Date();
    const currentDay = date.getDay() === 0 ? 7 : date.getDay();
    const distance = (dayOfWeek + 7 - currentDay) % 7;
    date.setDate(date.getDate() + distance);
    return date;
  };

  const [generatingPoster, setGeneratingPoster] = useState<'tikrar' | 'pra_tikrar' | null>(null);

  const tikrarHalaqahs = halaqahs.filter(h => h.class_type !== 'pra_tahfidz' && (activeDay === 0 || h.day_of_week === activeDay));
  const praTikrarHalaqahs = halaqahs.filter(h => h.class_type === 'pra_tahfidz' && (activeDay === 0 || h.day_of_week === activeDay));
  const activeProgramHalaqahs = programTab === 'tikrar' ? tikrarHalaqahs : praTikrarHalaqahs;

  const filteredAndSortedHalaqahs = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('id-ID');
    
    // Filter globally if there is a search query, otherwise filter by active day (or all week) and program
    let baseHalaqahs = halaqahs;
    if (!query) {
      baseHalaqahs = activeProgramHalaqahs;
    }

    const filtered = baseHalaqahs.filter((halaqah) => {
      if (!query) return true;
      const searchableText = [
        halaqah.name,
        DAYS.find(d => d.id === halaqah.day_of_week)?.name,
        halaqah.muallimah?.full_name,
        halaqah.preferred_juz,
        halaqah.zoom_name,
        ...(halaqah.students || []).map(student => student.full_name)
      ].filter(Boolean).join(' ').toLocaleLowerCase('id-ID');
      return searchableText.includes(query);
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      // If viewing whole week and sorting by time, group by day first
      if (activeDay === 0 && sortField === 'time' && a.day_of_week !== b.day_of_week) {
        return (a.day_of_week || 99) - (b.day_of_week || 99);
      }
      
      if (sortField === 'time') {
        if (query && a.day_of_week !== b.day_of_week) {
           comparison = (a.day_of_week || 0) - (b.day_of_week || 0);
        } else {
           comparison = (a.start_time || '').localeCompare(b.start_time || '');
        }
      }
      if (sortField === 'class') comparison = (a.name || '').localeCompare(b.name || '', 'id-ID');
      if (sortField === 'muallimah') comparison = (a.muallimah?.full_name || '').localeCompare(b.muallimah?.full_name || '', 'id-ID');
      if (sortField === 'students') comparison = (a.activeCount ?? a.students?.length ?? 0) - (b.activeCount ?? b.students?.length ?? 0);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [halaqahs, activeProgramHalaqahs, searchQuery, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedHalaqahs.length / itemsPerPage));
  const paginatedHalaqahs = activeDay === 0 
    ? filteredAndSortedHalaqahs
    : filteredAndSortedHalaqahs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeDay, programTab, searchQuery, sortField, sortOrder, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const toggleSort = (field: 'time' | 'class' | 'muallimah' | 'students') => {
    if (sortField === field) {
      setSortOrder(order => order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortIcon = (field: 'time' | 'class' | 'muallimah' | 'students') => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
      : <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />;
  };

  const handleDownloadTerimaKasih = async (ustadzahName: string) => {
    if (!ustadzahName) {
      toast.error('Nama ustadzah tidak tersedia');
      return;
    }
    
    setActiveUstadzahName(ustadzahName);
    
    // Wait for state to update and component to render
    setTimeout(async () => {
      if (!terimaKasihPosterRef.current) return;
      try {
        toast.loading('Menyiapkan poster...', { id: 'poster-gen' });
        
        const dataUrl = await toPng(terimaKasihPosterRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          style: { transform: 'none' }
        });
        
        const link = document.createElement('a');
        link.download = `Ucapan_Terima_Kasih_${ustadzahName.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
        
        toast.success('Poster berhasil diunduh!', { id: 'poster-gen' });
      } catch (err) {
        console.error('Failed to generate poster', err);
        toast.error('Gagal membuat poster. Silakan coba lagi.', { id: 'poster-gen' });
      }
    }, 100);
  };

  const handleDownloadPoster = async (variant: 'tikrar' | 'pra_tikrar') => {
    const posterRef = variant === 'tikrar' ? tikrarPosterRef : praTikrarPosterRef;
    const posterHalaqahs = variant === 'tikrar' ? tikrarHalaqahs : praTikrarHalaqahs;
    if (!posterRef.current || posterHalaqahs.length === 0) return;
    
    setGeneratingPoster(variant);
    const dayName = DAYS.find(d => d.id === activeDay)?.name || '';
    const posterLabel = variant === 'tikrar' ? 'Tikrar' : 'Pra-Tikrar';
    
    try {
      toast.loading('Menyiapkan gambar poster...', { id: 'poster-gen' });
      
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2, // Higher quality
        style: {
          transform: 'none', // Prevent layout shifts during capture
        },
      });
      
      const link = document.createElement('a');
      link.download = `Jadwal-${posterLabel}-${dayName}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success(`Poster ${posterLabel} berhasil di-download!`, { id: 'poster-gen' });
    } catch (err) {
      console.error('Error generating poster:', err);
      toast.error('Gagal men-generate poster. Silakan coba lagi.', { id: 'poster-gen' });
    } finally {
      setGeneratingPoster(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Program Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={() => setProgramTab('tikrar')}
          className={`flex min-h-[72px] items-center justify-center gap-3 rounded-xl px-5 py-4 text-base font-bold transition-all ${
            programTab === 'tikrar'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <BookOpen className="h-5 w-5" />
          Tikrar Tahfidz
        </button>
        <button
          type="button"
          onClick={() => setProgramTab('pra_tikrar')}
          className={`flex min-h-[72px] items-center justify-center gap-3 rounded-xl px-5 py-4 text-base font-bold transition-all ${
            programTab === 'pra_tikrar'
              ? 'bg-fuchsia-700 text-white shadow-lg shadow-fuchsia-700/20'
              : 'bg-gray-50 text-gray-600 hover:bg-fuchsia-50 hover:text-fuchsia-700'
          }`}
        >
          <BookOpen className="h-5 w-5" />
          Pra Tikrar Tahfidz
        </button>
      </div>

      {/* Day Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const isTikrar = programTab === 'tikrar';
            const count = halaqahs.filter(h => 
              (isTikrar ? h.class_type !== 'pra_tahfidz' : h.class_type === 'pra_tahfidz') && 
              (day.id === 0 || h.day_of_week === day.id)
            ).length;

            return (
              <button
                key={day.id}
                onClick={() => setActiveDay(day.id)}
                className={`flex-1 min-w-[80px] py-2 px-3 flex flex-col items-center justify-center rounded-xl transition-all ${
                  activeDay === day.id
                    ? 'bg-green-600 text-white shadow-md shadow-green-600/20'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-sm font-semibold">{day.name}</span>
                <span className={`text-[10px] leading-tight font-medium ${activeDay === day.id ? 'text-green-100' : 'text-gray-400'}`}>
                  {count} Kelas
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Jadwal Kelas: {DAYS.find(d => d.id === activeDay)?.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isUserStaff 
              ? `Menampilkan kelas ${programTab === 'tikrar' ? 'Tikrar Tahfidz' : 'Pra Tikrar Tahfidz'} untuk batch ${activeBatchName || '...'}`
              : `Menampilkan jadwal ${programTab === 'tikrar' ? 'Tikrar Tahfidz' : 'Pra Tikrar Tahfidz'} Ukhti untuk batch ${activeBatchName || '...'}`
            }
          </p>
        </div>
        
        {isUserStaff && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleDownloadPoster(programTab)}
              disabled={isLoading || activeProgramHalaqahs.length === 0 || generatingPoster !== null || activeDay === 0}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-sm w-full sm:w-auto ${
                programTab === 'tikrar'
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                  : 'bg-fuchsia-700 hover:bg-fuchsia-800 shadow-fuchsia-700/20'
              }`}
            >
              {generatingPoster === programTab ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              Poster {programTab === 'tikrar' ? 'Tikrar' : 'Pra-Tikrar'}
            </button>
            <button
              onClick={handleCopyRekapan}
              disabled={isLoading || activeProgramHalaqahs.length === 0 || activeDay === 0}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-amber-500/20 w-full sm:w-auto"
            >
              <Copy className="h-4 w-4" />
              Copy Rekapan Harian
            </button>
          </div>
        )}
      </div>

      {/* Search, sort, and page-size controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari kelas, mu'allimah, juz, Zoom, atau nama thalibah..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-10 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Hapus pencarian"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="schedule-sort">
            Urutkan
          </label>
          <select
            id="schedule-sort"
            value={`${sortField}-${sortOrder}`}
            onChange={(event) => {
              const [field, order] = event.target.value.split('-') as [typeof sortField, typeof sortOrder];
              setSortField(field);
              setSortOrder(order);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-emerald-500"
          >
            <option value="time-asc">Waktu paling awal</option>
            <option value="time-desc">Waktu paling akhir</option>
            <option value="class-asc">Kelas A–Z</option>
            <option value="class-desc">Kelas Z–A</option>
            <option value="muallimah-asc">Mu'allimah A–Z</option>
            <option value="muallimah-desc">Mu'allimah Z–A</option>
            <option value="students-desc">Thalibah terbanyak</option>
            <option value="students-asc">Thalibah tersedikit</option>
          </select>
          {activeDay !== 0 && (
            <select
              value={itemsPerPage}
              onChange={(event) => setItemsPerPage(Number(event.target.value))}
              aria-label="Jumlah jadwal per halaman"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-emerald-500"
            >
              <option value={10}>10 / halaman</option>
              <option value={20}>20 / halaman</option>
              <option value={50}>50 / halaman</option>
            </select>
          )}
        </div>
      </div>

      {/* Hidden Poster Template for html-to-image */}
      <div className="absolute left-[-9999px] top-[-9999px] overflow-hidden pointer-events-none">
        <JadwalPoster 
          ref={tikrarPosterRef}
          halaqahs={tikrarHalaqahs}
          dayName={DAYS.find(d => d.id === activeDay)?.name || ''} 
          dayNum={activeDay}
          variant="tikrar"
        />
        <JadwalPoster
          ref={praTikrarPosterRef}
          halaqahs={praTikrarHalaqahs}
          dayName={DAYS.find(d => d.id === activeDay)?.name || ''}
          dayNum={activeDay}
          variant="pra_tikrar"
        />
        <TerimaKasihPoster
          ref={terimaKasihPosterRef}
          ustadzahName={activeUstadzahName}
        />
      </div>

      {/* Schedule Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 h-64 animate-pulse border border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                <div className="h-4 bg-gray-100 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedHalaqahs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">
            {searchQuery ? 'Jadwal Tidak Ditemukan' : 'Tidak Ada Jadwal'}
          </h3>
          <p className="text-gray-500 mt-1">
            {searchQuery
              ? `Tidak ada jadwal yang cocok dengan “${searchQuery}”.`
              : `Belum ada kelas ${programTab === 'tikrar' ? 'Tikrar Tahfidz' : 'Pra Tikrar Tahfidz'} aktif di hari ini.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="py-4 px-6 w-12 text-center text-xs font-bold tracking-wider">NO</th>
                  <th className="py-4 px-6 whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort('time')} className="inline-flex items-center gap-1.5 hover:text-gray-900">
                      WAKTU {sortIcon('time')}
                    </button>
                  </th>
                  <th className="py-4 px-6">
                    <button type="button" onClick={() => toggleSort('class')} className="inline-flex items-center gap-1.5 hover:text-gray-900">
                      KELAS {sortIcon('class')}
                    </button>
                  </th>
                  <th className="py-4 px-6">
                    <button type="button" onClick={() => toggleSort('muallimah')} className="inline-flex items-center gap-1.5 hover:text-gray-900">
                      MU'ALLIMAH / MUSYRIFAH {sortIcon('muallimah')}
                    </button>
                  </th>
                  <th className="py-4 px-6 text-center">
                    <button type="button" onClick={() => toggleSort('students')} className="inline-flex items-center gap-1.5 hover:text-gray-900">
                      THALIBAH AKTIF {sortIcon('students')}
                    </button>
                  </th>
                  <th className="py-4 px-6 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedHalaqahs.map((halaqah, index) => {
                  const dateForTemplate = getNextDateForDay(activeDay);
                  const overallIndex = activeDay === 0 
                    ? index + 1 
                    : (currentPage - 1) * itemsPerPage + index + 1;
                    
                  // Calculate if it's libur this week
                  const classDay = halaqah.day_of_week || 1;
                  const todayDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();
                  let daysToAdd = classDay - todayDayOfWeek;
                  if (daysToAdd < 0) daysToAdd += 7;
                  const classDate = new Date();
                  classDate.setDate(new Date().getDate() + daysToAdd);
                  const classDateString = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}-${String(classDate.getDate()).padStart(2, '0')}`;
                  const isLibur = (halaqah as any).libur_date === classDateString;

                  return (
                    <tr key={halaqah.id} className={`hover:bg-gray-50/30 transition-colors ${isLibur ? 'bg-red-50/50' : ''}`}>
                      <td className="py-4 px-6 text-center font-medium text-gray-500">
                        {overallIndex}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          {(searchQuery || activeDay === 0) && (
                            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5 bg-emerald-50 w-fit px-2 py-0.5 rounded-md">
                              {DAYS.find(d => d.id === halaqah.day_of_week)?.name || '-'}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-900 font-medium">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {formatTimeShort(halaqah.start_time)} - {formatTimeShort(halaqah.end_time)} WIB
                          </div>
                          {halaqah.zoom_name && (
                            <div className="flex flex-col gap-0.5 mt-1">
                              <a 
                                href={halaqah.zoom_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline w-fit"
                                title="Klik untuk bergabung ke Zoom"
                              >
                                <Video className="h-3.5 w-3.5" />
                                {halaqah.zoom_name}
                              </a>
                              {halaqah.zoom_meeting_id && (
                                <div className="text-[11px] text-gray-500 pl-5 leading-tight">
                                  ID: <span className="font-medium text-gray-700">{halaqah.zoom_meeting_id}</span>
                                  {halaqah.zoom_passcode && (
                                    <> | Pass: <span className="font-medium text-gray-700">{halaqah.zoom_passcode}</span></>
                                  )}
                                </div>
                              )}
                              {halaqah.zoom_claim_host && isUserStaff && (
                                <div className="text-[11px] text-gray-500 font-medium pl-5">
                                  Claim Host: <span className="font-bold text-gray-700">{halaqah.zoom_claim_host}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className={`font-semibold mb-1 leading-tight ${isLibur ? 'text-gray-500 line-through decoration-red-400 decoration-2' : 'text-gray-900'}`}>{halaqah.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            halaqah.class_type === 'pra_tahfidz' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {halaqah.class_type === 'pra_tahfidz' ? 'PRA TIKRAR' : 'TIKRAR TAHFIDZ'}
                          </span>
                          {isLibur && (
                            <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-red-600 text-white shadow-sm flex items-center gap-1 animate-pulse">
                              <AlertCircle className="w-3 h-3" /> LIBUR PEKAN INI
                            </span>
                          )}
                          {halaqah.preferred_juz && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                              Juz {halaqah.preferred_juz}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 flex items-center gap-1.5">
                              {halaqah.muallimah?.whatsapp ? (
                                <a href={`https://wa.me/${halaqah.muallimah.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600 transition-colors" title="Hubungi Mu'allimah via WhatsApp">
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              ) : (
                                <span className="text-gray-300 cursor-not-allowed" title="Nomor WhatsApp tidak terdaftar">
                                  <MessageCircle className="h-4 w-4" />
                                </span>
                              )}
                              {halaqah.muallimah?.full_name || '-'}
                            </span>
                          </div>
                          {halaqah.mentors && halaqah.mentors.filter((m: any) => m.user?.full_name !== halaqah.muallimah?.full_name).length > 0 && (
                            <div className="flex flex-col gap-1 mt-0.5">
                              {halaqah.mentors
                                .filter((m: any) => m.user?.full_name !== halaqah.muallimah?.full_name)
                                .map((m: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <span className="font-semibold text-emerald-700 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50 flex items-center gap-1">
                                    {m.user?.whatsapp ? (
                                      <a href={`https://wa.me/${m.user.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 transition-colors" title="Hubungi via WhatsApp">
                                        <MessageCircle className="h-3.5 w-3.5" />
                                      </a>
                                    ) : (
                                      <span className="text-gray-300 cursor-not-allowed" title="Nomor WhatsApp tidak terdaftar">
                                        <MessageCircle className="h-3.5 w-3.5" />
                                      </span>
                                    )}
                                    {m.user?.full_name || '-'}
                                    <span className="opacity-70 font-normal capitalize">({m.role})</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => setStudentListHalaqah(halaqah)}
                          className="inline-flex items-center justify-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 hover:bg-emerald-50 hover:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors"
                          title="Lihat daftar thalibah"
                          aria-label={`Lihat ${halaqah.activeCount ?? halaqah.students?.length ?? 0} thalibah aktif di ${halaqah.name}`}
                        >
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {halaqah.activeCount ?? halaqah.students?.length ?? 0}
                          </span>
                        </button>
                      </td>
                      <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            {/* Dropdown Template Chat */}
                            <details className="relative group">
                              <summary className="list-none cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-100 transition-colors">
                                <FileText className="h-3.5 w-3.5" />
                                Template Chat
                                <ChevronDown className="h-3 w-3 opacity-70" />
                              </summary>
                              {/* Overlay for clicking outside to close (hack using fixed full screen before the dropdown content) */}
                              <div 
                                className="fixed inset-0 z-40 hidden group-open:block"
                                onClick={(e) => {
                                  const details = e.currentTarget.parentElement;
                                  if (details) details.removeAttribute('open');
                                }}
                              />
                              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-1.5 hidden group-open:flex flex-col gap-1">
                                <button
                                  onClick={() => {
                                    copyToClipboard(generateHalaqahReminder(halaqah, dateForTemplate), 'Reminder Kelas berhasil disalin!');
                                    const details = document.activeElement?.closest('details');
                                    if (details) details.removeAttribute('open');
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors text-left"
                                >
                                  <Copy className="h-3.5 w-3.5 shrink-0" />
                                  <span>Reminder Kelas</span>
                                </button>
                                <button
                                  onClick={() => {
                                    copyToClipboard(generateLaporanKelas(halaqah, dateForTemplate, userName), 'Berita Acara berhasil disalin!');
                                    const details = document.activeElement?.closest('details');
                                    if (details) details.removeAttribute('open');
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors text-left"
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                  <span>Berita Acara (BA)</span>
                                </button>
                                <button
                                  onClick={() => {
                                    copyToClipboard(generateMuallimahReminder(halaqah, dateForTemplate), 'Reminder Muallimah berhasil disalin!');
                                    const details = document.activeElement?.closest('details');
                                    if (details) details.removeAttribute('open');
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors text-left"
                                >
                                  <Copy className="h-3.5 w-3.5 shrink-0" />
                                  <span>Reminder Muallimah</span>
                                </button>
                              </div>
                            </details>

                            {/* Button Poster */}
                            <button
                              onClick={() => handleDownloadTerimaKasih(halaqah.muallimah?.full_name || '')}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100 shrink-0"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              Poster
                            </button>
                          </div>
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {activeDay !== 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-gray-500">
                Menampilkan {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredAndSortedHalaqahs.length)} dari {filteredAndSortedHalaqahs.length} jadwal
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </button>
                <span className="min-w-[110px] text-center text-sm font-semibold text-gray-600">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Selanjutnya <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {studentListHalaqah && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-list-title"
          onClick={() => setStudentListHalaqah(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div className="pr-6">
                <h3 id="student-list-title" className="text-lg font-bold text-gray-900">
                  Daftar Thalibah Aktif
                </h3>
                <p className="mt-1 text-sm text-gray-500">{studentListHalaqah.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setStudentListHalaqah(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Tutup daftar thalibah"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {!studentListHalaqah.students?.length ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-3 font-medium text-gray-700">Belum ada thalibah aktif</p>
                </div>
              ) : (
                <ol className="space-y-2">
                  {studentListHalaqah.students.map((student, index) => (
                    <li
                      key={`${student.full_name}-${index}`}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">
                        {student.full_name || 'Nama belum tersedia'}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-sm font-medium text-gray-600">
              Total: {studentListHalaqah.students?.length || 0} thalibah aktif
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
