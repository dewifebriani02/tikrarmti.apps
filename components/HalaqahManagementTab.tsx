'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Clock,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Loader2,
  Sparkles,
  Edit,
  ChevronUp,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Download,
  FileSpreadsheet,
  FileText,
  Video,
  Copy,
  ClipboardList,
  MessageSquare,
  MoreVertical,
  ArrowRightLeft,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { HalaqahStudentsList } from '@/components/HalaqahStudentsList';
import { AutoCreateHalaqahModal } from '@/components/AutoCreateHalaqahModal';
import { EditHalaqahModal } from '@/components/EditHalaqahModal';
import { AssignThalibahModal } from '@/components/AssignThalibahModal';
import { ManualCreateHalaqahModal } from '@/components/ManualCreateHalaqahModal';
import { formatSchedule, formatClassType } from '@/lib/format-utils';
import { updateHalaqah, deleteHalaqah } from '@/app/(protected)/admin/halaqah/actions';
import { createClient } from '@/lib/supabase/client';
import { HalaqahStats, HalaqahStatsData } from '@/components/admin/halaqah/HalaqahStats';
import { ScheduleOverlapAnalysis } from '@/components/admin/halaqah/ScheduleOverlapAnalysis';
import {
  generateHalaqahReminder,

  generateLaporanKelas,
  type HalaqahForReminder
} from '@/lib/reminder-generator';

interface Halaqah {
  id: string;
  program_id: string | null;
  muallimah_id?: string;
  name: string;
  description?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  location?: string;
  max_students?: number;
  waitlist_max?: number;
  preferred_juz?: string;
  zoom_link?: string;
  zoom_link_id?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  class_type?: string;
  preferred_schedule?: string;
  program?: {
    id: string;
    name: string;
    class_type: string;
    batch_id: string;
    batch?: {
      id: string;
      name: string;
    };
  };
  muallimah?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  mentors?: {
    id: string;
    mentor_id: string;
    role: string;
    users?: {
      full_name?: string;
      email?: string;
    };
  }[];
  _count?: {
    students: number;
  };
  quota_details?: {
    pending?: number;
    submitted?: number;
    approved?: number;
    draft?: number;
    active: number;
    waitlist: number;
    total_used: number;
    total_reserved?: number;
  };
}

interface Batch {
  id: string;
  name: string;
  status: string;
}

interface Program {
  id: string;
  name: string;
  class_type: string;
  batch_id: string;
}

function QuotaDetailsCell({ halaqah }: { halaqah: Halaqah }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="text-xs space-y-1 mt-1">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium w-full justify-between py-1 px-2 -mx-2 rounded-md hover:bg-blue-50 transition-colors"
      >
        <span>Rincian Kuota</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {expanded && (
        <div className="pt-2 pb-1 space-y-1.5 border-t border-gray-100 mt-1">
          <div className="flex justify-between gap-3">
            <span className="font-semibold text-gray-700">Total slot terisi:</span>
            <span className="font-medium text-gray-900">{halaqah.quota_details?.total_used || 0}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-green-600">✓ Thalibah aktif:</span>
            <span className="font-medium text-green-700">{halaqah.quota_details?.active || 0}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-blue-600">⏳ Menunggu aktivasi:</span>
            <span className="font-medium text-blue-700">{halaqah.quota_details?.pending || 0}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-yellow-600">⏱ Waitlist:</span>
            <span className="font-medium text-yellow-700">{halaqah.quota_details?.waitlist || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function HalaqahManagementTab() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const actionParam = searchParams?.get('action');
  
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [emptyOnly, setEmptyOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'tikrar_tahfidz' | 'pra_tahfidz' | 'tikrar_berbayar' | 'muallimah'>('tikrar_tahfidz');

  // Sort - default to day_of_week then start_time
  const [sortColumn, setSortColumn] = useState<keyof Halaqah>('day_of_week');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');



  // Modals
  const [selectedHalaqah, setSelectedHalaqah] = useState<Halaqah | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [editingHalaqah, setEditingHalaqah] = useState<Halaqah | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAutoCreateModal, setShowAutoCreateModal] = useState(false);
  const [showManualCreateModal, setShowManualCreateModal] = useState(false);
  const [showAssignThalibahModal, setShowAssignThalibahModal] = useState(false);
  const [showScheduleOverlapModal, setShowScheduleOverlapModal] = useState(false);
  const [zoomLinks, setZoomLinks] = useState<Array<{ id: string; name: string; url: string; meeting_id?: string; passcode?: string }>>([]);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [movingToPraId, setMovingToPraId] = useState<string | null>(null);
  const halaqahRequestIdRef = useRef(0);

  useEffect(() => {
    if (actionParam === 'analisis-zoom') {
      router.replace('/admin/halaqah/analisis-zoom');
    }
  }, [actionParam, router]);

  useEffect(() => {
    loadData();
  }, [selectedBatch, selectedProgram, selectedStatus, refreshTrigger]);

  // Load zoom links when batch changes
  useEffect(() => {
    if (selectedBatch) {
      loadZoomLinks();
    }
  }, [selectedBatch]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadBatches(), loadPrograms(), loadHalaqahs()]);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    console.log('[HalaqahManagementTab] Loading batches...');
    try {
      const response = await fetch('/api/admin/batches');
      const result = await response.json();

      if (response.ok && result.data) {
        console.log('[HalaqahManagementTab] Loaded batches via API:', result.data.length);
        setBatches(result.data);
        if (!selectedBatch && result.data.length > 0) {
          const defaultBatch = result.data.find((b: Batch) => b.status === 'open' || b.status === 'ongoing') || result.data[0];
          setSelectedBatch(defaultBatch.id);
        }
        return;
      }
    } catch (apiError: any) {
      console.error('[HalaqahManagementTab] Error loading batches:', apiError.message);
    }
  };

  const loadPrograms = async () => {
    if (!selectedBatch) return;

    try {
      const response = await fetch('/api/programs?batch_id=' + selectedBatch);
      const result = await response.json();

      if (response.ok && result.data) {
        setPrograms(result.data);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadHalaqahs = async () => {
    console.log('[HalaqahManagementTab] Loading halaqahs...');

    // Never request every batch while the default batch is still being chosen.
    if (!selectedBatch) {
      setHalaqahs([]);
      return;
    }

    const requestId = ++halaqahRequestIdRef.current;

    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedBatch) params.append('batch_id', selectedBatch);
      if (selectedProgram) params.append('program_id', selectedProgram);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/halaqah?${params.toString()}`);
      const result = await response.json();

      // A filter/batch changed while this request was running. Ignore the stale
      // response so it cannot overwrite the latest batch result.
      if (requestId !== halaqahRequestIdRef.current) return;

      if (!response.ok) {
        console.error('[HalaqahManagementTab] Failed to load halaqahs:', result);
        toast.error(result.error || 'Failed to load halaqah data');
        return;
      }

      if (result.data) {
        console.log('[HalaqahManagementTab] Loaded', result.data.length, 'halaqahs');
        // Transform data to match expected format
        const transformedHalaqahs = result.data.map((h: any) => ({
          ...h,
          _count: {
            students: h.students_count || 0
          },
          quota_details: h.quota_details || {
            pending: 0,
            submitted: 0,
            approved: 0,
            draft: 0,
            active: 0,
            waitlist: 0,
            total_used: 0
          }
        }));
        setHalaqahs(transformedHalaqahs);
      } else {
        setHalaqahs([]);
      }
    } catch (error: any) {
      if (requestId !== halaqahRequestIdRef.current) return;
      console.error('[HalaqahManagementTab] Error loading halaqahs:', error);
      toast.error('Failed to load halaqahs: ' + error.message);
    }
  };

  // ─── Zoom Links ──────────────────────────────────────────────
  const loadZoomLinks = async () => {
    try {
      const res = await fetch(`/api/admin/batch/${selectedBatch}/zoom-links`);
      const result = await res.json();
      if (res.ok && result.success) {
        setZoomLinks(result.data || []);
      }
    } catch (error) {
      console.error('Error loading zoom links:', error);
    }
  };

  const getZoomForHalaqah = (halaqah: Halaqah) => {
    // If halaqah has zoom_link_id, find the matching zoom link
    if (halaqah.zoom_link_id) {
      const zoom = zoomLinks.find(z => z.id === halaqah.zoom_link_id);
      if (zoom) return zoom;
    }
    // Fallback: try matching by URL
    if (halaqah.zoom_link) {
      const zoom = zoomLinks.find(z => z.url === halaqah.zoom_link);
      if (zoom) return zoom;
    }
    return null;
  };

  const buildReminderData = async (halaqah: Halaqah): Promise<HalaqahForReminder> => {
    const zoom = getZoomForHalaqah(halaqah);
    const classType = halaqah.class_type || halaqah.program?.class_type;

    // Fetch students for this halaqah
    let students: Array<{ full_name: string; preferred_juz?: string }> = [];
    try {
      const res = await fetch(`/api/halaqah/${halaqah.id}/students`);
      const result = await res.json();
      if (res.ok && result.students) {
        students = result.students
          .filter((s: any) => s.status === 'active')
          .map((s: any) => ({
            full_name: s.thalibah?.full_name || 'Unknown',
            preferred_juz: halaqah.preferred_juz,
            phone: s.thalibah?.phone
          }));
      }

      // Get the start of the current week (Monday)
      const now = new Date();
      const currentDay = now.getDay();
      const distance = currentDay === 0 ? 6 : currentDay - 1;
      const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distance);
      lastMonday.setHours(0, 0, 0, 0);
      const startOfWeek = lastMonday.toISOString();
      
      const { data: sitInLogs } = await supabase
        .from('audit_logs')
        .select('user_id, created_at, details, user:users(full_name, whatsapp)')
        .eq('action', 'UPDATE')
        .eq('resource', 'halaqah')
        .gte('created_at', startOfWeek);

      const sitIns = sitInLogs?.filter((log: any) => log.details?.action_type === 'SIT_IN' && log.details?.halaqah_id === halaqah.id) || [];
      const sitInStudents = sitIns.map((log: any) => ({
        full_name: (log.user?.full_name || 'Hamba Allah') + ' (Sit-In 🌸)',
        preferred_juz: halaqah.preferred_juz,
        phone: log.user?.whatsapp
      }));

      students = [...students, ...sitInStudents];
    } catch (error) {
      console.error('Error fetching students for reminder:', error);
    }

      return {
      name: halaqah.name,
      day_of_week: halaqah.day_of_week,
      start_time: halaqah.start_time,
      end_time: halaqah.end_time,
      preferred_juz: halaqah.preferred_juz,
      class_type: classType,
      zoom_link: zoom?.url || halaqah.zoom_link,
      zoom_name: zoom?.name,
      zoom_meeting_id: zoom?.meeting_id,
      zoom_passcode: zoom?.passcode,
      muallimah: halaqah.muallimah,
      program: halaqah.program,
      mentors: halaqah.mentors?.map((m: any) => ({
        role: m.role,
        user: m.user || m.users // handle both /api/halaqah and client-side variations
      })),
      students,
    };
  };

  // ─── Copy Handlers ──────────────────────────────────────────
  const handleCopyReminder = async (halaqah: Halaqah) => {
    setCopyingId(`reminder-${halaqah.id}`);
    try {
      const data = await buildReminderData(halaqah);
      const text = generateHalaqahReminder(data);
      await navigator.clipboard.writeText(text);
      toast.success('Reminder halaqah berhasil disalin!');
    } catch (error) {
      toast.error('Gagal menyalin reminder');
    } finally {
      setCopyingId(null);
    }
  };

  const getLiburStatus = (halaqah: any) => {
    if (!halaqah.day_of_week) return { isLibur: false, classDateString: null };
    const classDay = halaqah.day_of_week;
    const todayDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();
    let daysToAdd = classDay - todayDayOfWeek;
    if (daysToAdd < 0) daysToAdd += 7;
    const classDate = new Date();
    classDate.setDate(new Date().getDate() + daysToAdd);
    const classDateString = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}-${String(classDate.getDate()).padStart(2, '0')}`;
    return {
      isLibur: halaqah.libur_date === classDateString,
      classDateString
    };
  };

  const handleToggleLibur = async (halaqah: any) => {
    const { isLibur, classDateString } = getLiburStatus(halaqah);
    if (!classDateString) return;
    
    const newLiburDate = isLibur ? null : classDateString;
    const toastId = toast.loading(isLibur ? 'Membatalkan libur...' : 'Menandai libur...');
    
    // Optimistic UI update so it feels instant (1-click)
    setHalaqahs(prev => prev.map(h => h.id === halaqah.id ? { ...h, libur_date: newLiburDate } : h));

    try {
      const result = await updateHalaqah({ id: halaqah.id, libur_date: newLiburDate } as any);
      if (result.success) {
        toast.success(isLibur ? 'Status libur dibatalkan' : 'Berhasil menandai libur pekan ini', { id: toastId });
        // We already optimistically updated, but we can fetch in background to ensure sync
        loadHalaqahs();
      } else {
        // Revert on failure
        setHalaqahs(prev => prev.map(h => h.id === halaqah.id ? { ...h, libur_date: isLibur ? classDateString : null } : h));
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`, { id: toastId });
    }
  };

  const handleCopyLaporan = async (halaqah: Halaqah) => {
    setCopyingId(`laporan-${halaqah.id}`);
    try {
      const data = await buildReminderData(halaqah);
      const text = generateLaporanKelas(data);
      await navigator.clipboard.writeText(text);
      toast.success('Laporan kelas berhasil disalin!');
    } catch (error) {
      toast.error('Gagal menyalin laporan kelas');
    } finally {
      setCopyingId(null);
    }
  };

  const downloadExcel = async () => {
    try {
      toast.loading('Downloading Excel...', { id: 'download-excel' });

      // Use the filtered and sorted data
      const dataToExport = filteredAndSortedHalaqahs;

      // Create CSV content
      const headers = [
        'No',
        'Halaqah Name',
        'Program',
        'Batch',
        'Muallimah',
        'Class Type',
        'Preferred Juz',
        'Day',
        'Time',
        'Location',
        'Max Students',
        'Quota Used',
        'Approved',
        'Submitted',
        'Draft',
        'Active',
        'Waitlist',
        'Status',
        'Created At'
      ];

      const rows = dataToExport.map((h, index) => {
        const programName = h.program?.name || h.program?.batch?.name || '-';
        const batchName = h.program?.batch?.name || '-';
        const muallimahName = h.muallimah?.full_name 
          ? (h.muallimah.full_name.toLowerCase().startsWith('ustadzah') ? h.muallimah.full_name : `Ustadzah ${h.muallimah.full_name}`)
          : 'Not assigned';
        const dayName = h.day_of_week ? getDayName(h.day_of_week) : '-';
        const timeRange = h.start_time && h.end_time
          ? `${h.start_time} - ${h.end_time}`
          : (h.preferred_schedule ? formatSchedule(h.preferred_schedule).replace(/<[^>]*>/g, ' ') : '-');

        return [
          index + 1,
          `"${h.name || '-'}"`,
          `"${programName}"`,
          `"${batchName}"`,
          `"${muallimahName}"`,
          `"${formatClassType(h.class_type || h.program?.class_type)}"`,
          `"${h.preferred_juz || '-'}"`,
          `"${dayName}"`,
          `"${timeRange}"`,
          `"${h.location || '-'}"`,
          h.max_students || '-',
          h.quota_details?.total_used || 0,
          h.quota_details?.approved || 0,
          h.quota_details?.submitted || 0,
          h.quota_details?.draft || 0,
          h.quota_details?.active || 0,
          h.quota_details?.waitlist || 0,
          h.status,
          new Date(h.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `halaqah-data-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Excel downloaded successfully', { id: 'download-excel' });
    } catch (error) {
      console.error('[HalaqahManagementTab] Error downloading Excel:', error);
      toast.error('Failed to download Excel', { id: 'download-excel' });
    }
  };

  const downloadPDF = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'download-pdf' });

      // Use the filtered and sorted data, but for PDF, sort by day and time specifically
      const dataToExport = [...filteredAndSortedHalaqahs].sort((a, b) => {
        // Sort by day first (1 = Senin, 7 = Ahad)
        const dayA = a.day_of_week || 99;
        const dayB = b.day_of_week || 99;
        if (dayA !== dayB) return dayA - dayB;
        
        // Then by time
        const timeA = a.start_time || '23:59:59';
        const timeB = b.start_time || '23:59:59';
        return timeA.localeCompare(timeB);
      });

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Halaqah Data</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            h1 { text-align: center; color: #1f2937; }
            .meta { text-align: center; color: #6b7280; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #065f46; color: white; padding: 8px; text-align: left; font-weight: bold; border: 1px solid #065f46; }
            td { padding: 6px 8px; border: 1px solid #d1d5db; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .badge-active { background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px; font-size: 10px; }
            .badge-inactive { background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 9999px; font-size: 10px; }
            .badge-suspended { background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-size: 10px; }
            .day-1 { background-color: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; }
            .day-2 { background-color: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; }
            .day-3 { background-color: #fef9c3; color: #a16207; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; }
            .day-4 { background-color: #ffedd5; color: #c2410c; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; }
            .day-5 { background-color: #fce7f3; color: #be185d; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; }
            .day-6 { background-color: #f3e8ff; color: #7e22ce; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; }
            .day-7 { background-color: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>Halaqah Data Report</h1>
          <div class="meta">Generated on ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' })}</div>
          <div class="meta">Total Halaqahs: ${dataToExport.length}</div>

          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Waktu (WIB)</th>
                <th>Halaqah Name</th>
                <th>Quota</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${dataToExport.map((h, index) => {
                const dayName = h.day_of_week ? getDayName(h.day_of_week) : '-';
                const timeRange = h.start_time && h.end_time
                  ? `${h.start_time.substring(0, 5)} - ${h.end_time.substring(0, 5)}`
                  : (h.preferred_schedule ? formatSchedule(h.preferred_schedule).replace(/<[^>]*>/g, ' ') : '-');
                
                const dayBadge = h.day_of_week ? `<span class="day-${h.day_of_week}">${dayName}</span>` : '-';
                const scheduleStr = h.day_of_week 
                  ? `${dayBadge}<div style="margin-top: 4px; color: #4b5563; font-size: 11px;">${timeRange}</div>` 
                  : timeRange;
                  
                const statusBadge = `badge-${h.status}`;

                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${scheduleStr}</td>
                    <td><strong>${h.name || '-'}</strong></td>
                    <td>
                      <div>${h.quota_details?.total_used || 0} / ${h.max_students || '-'}</div>
                    </td>
                    <td><span class="${statusBadge}">${h.status}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div style="margin-top: 30px; text-align: center; color: #6b7280; font-size: 10px;">
            Generated by Tikrar MTI Admin System
          </div>
        </body>
        </html>
      `;

      // Create a new window and print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load then print
        setTimeout(() => {
          printWindow.print();
          toast.success('PDF generated. Use the print dialog to save as PDF.', { id: 'download-pdf' });
        }, 500);
      } else {
        toast.error('Failed to open print window. Please allow popups.', { id: 'download-pdf' });
      }
    } catch (error) {
      console.error('[HalaqahManagementTab] Error generating PDF:', error);
      toast.error('Failed to generate PDF', { id: 'download-pdf' });
    }
  };

  const calculateAge = (birthDate: string | undefined) => {
    if (!birthDate) return '-';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getJuzCode = (confirmedChosenJuz: string | undefined) => {
    if (!confirmedChosenJuz) return '-';
    const match = confirmedChosenJuz.match(/(\d+[A-B]?)/i);
    return match ? match[1].toUpperCase() : confirmedChosenJuz;
  };

  const downloadPDFHalaqahThalibah = async () => {
    const toastId = toast.loading('Mengambil data thalibah...');
    try {
      // 1. Fetch all submissions
      const params = new URLSearchParams();
      if (selectedBatch && selectedBatch !== 'all') params.append('batch_id', selectedBatch);
      params.append('limit', '5000');
      
      const response = await fetch(`/api/admin/daftar-ulang?${params.toString()}`);
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || 'Failed to fetch');
      const submissions = result.data || [];
      
      // 2. Group into halaqahs (only approved/active status)
      const halaqahMap = new Map();
      filteredAndSortedHalaqahs.forEach(h => {
        halaqahMap.set(h.id, { halaqah: h, thalibah: [] });
      });
      
      submissions.forEach((s: any) => {
        if (s.status !== 'approved' && s.status !== 'active') return;
        
        const user = s.user || {};
        const reg = s.registration || {};
        
        const thalibahData = {
          name: s.confirmed_full_name || user.full_name || '-',
          usia: calculateAge(user.tanggal_lahir || reg.birth_date),
          juzCode: getJuzCode(s.confirmed_chosen_juz),
          juz: s.confirmed_chosen_juz || reg.chosen_juz || '-',
          whatsapp: user.whatsapp || user.phone || '-',
          status: s.status
        };
        
        if (s.ujian_halaqah_id && halaqahMap.has(s.ujian_halaqah_id)) {
          halaqahMap.get(s.ujian_halaqah_id).thalibah.push(thalibahData);
        }
        
        if (s.tashih_halaqah_id && halaqahMap.has(s.tashih_halaqah_id) && s.tashih_halaqah_id !== s.ujian_halaqah_id) {
          halaqahMap.get(s.tashih_halaqah_id).thalibah.push(thalibahData);
        }
      });
      
      // 3. Sort the halaqahs by day and time
      const sortedList = Array.from(halaqahMap.values())
        .filter(group => group.thalibah.length > 0)
        .sort((a, b) => {
          const dayA = a.halaqah.day_of_week || 99;
          const dayB = b.halaqah.day_of_week || 99;
          if (dayA !== dayB) return dayA - dayB;
          
          const timeA = a.halaqah.start_time || '23:59:59';
          const timeB = b.halaqah.start_time || '23:59:59';
          return timeA.localeCompare(timeB);
        });
      
      if (sortedList.length === 0) {
        toast.error('Tidak ada thalibah untuk halaqah yang dipilih', { id: toastId });
        return;
      }
      
      // 4. Generate PDF
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Data Thalibah per Halaqah', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const batchName = batches.find(b => b.id === selectedBatch)?.name || 'Semua Batch';
      doc.text(`Batch: ${batchName}`, 14, 23);
      doc.text(`Total Halaqah: ${sortedList.length}`, 14, 28);
      
      let totalThalibah = 0;
      sortedList.forEach(g => totalThalibah += g.thalibah.length);
      doc.text(`Total Thalibah: ${totalThalibah}`, 14, 33);
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}`, pageWidth - 14, 23, { align: 'right' });
      
      let yPos = 45;
      
      const colors: Record<number, [number, number, number]> = {
        1: [3, 105, 161],   // Senin
        2: [21, 128, 61],   // Selasa
        3: [161, 98, 7],    // Rabu
        4: [194, 65, 12],   // Kamis
        5: [190, 24, 93],   // Jumat
        6: [126, 34, 206],  // Sabtu
        7: [185, 28, 28],   // Ahad
        99: [107, 114, 128], // Default
      };
      
      for (const group of sortedList) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }
        
        const h = group.halaqah;
        const dayColor = colors[h.day_of_week || 99] || colors[99];
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(dayColor[0], dayColor[1], dayColor[2]);
        doc.text(`${h.name || 'Halaqah'} (${group.thalibah.length} thalibah)`, 14, yPos);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        const dayName = h.day_of_week ? getDayName(h.day_of_week) : '-';
        const timeRange = h.start_time && h.end_time ? `${h.start_time.substring(0,5)} - ${h.end_time.substring(0,5)}` : '-';
        if (h.day_of_week) {
          doc.text(`Jadwal: ${dayName}, ${timeRange}`, 16, yPos);
          yPos += 5;
        }
        
        // Sort thalibah by name
        const sortedThalibah = group.thalibah.sort((a: any, b: any) => a.name.localeCompare(b.name, 'id-ID'));
        
        const tableData = sortedThalibah.map((t: any, i: number) => [
          i + 1,
          t.name,
          t.usia,
          t.juzCode,
          t.juz,
          t.whatsapp,
          t.status === 'approved' ? 'Approved' : (t.status === 'submitted' ? 'Submitted' : t.status === 'rejected' ? 'Rejected' : 'Draft')
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['No', 'Nama', 'Usia', 'Juz Code', 'Juz', 'WhatsApp', 'Status']],
          body: tableData,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: dayColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 70 },
            2: { cellWidth: 15 },
            3: { cellWidth: 20 },
            4: { cellWidth: 35 },
            5: { cellWidth: 30 },
            6: { cellWidth: 20 },
          },
          didDrawPage: (data: any) => {
            yPos = (data.cursor?.y ?? 50) + 10;
          },
        });
        
        yPos += 8;
      }
      
      const fileName = `daftar-thalibah-halaqah-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('PDF berhasil diunduh', { id: toastId });
    } catch (e: any) {
      console.error('Error generating PDF:', e);
      toast.error('Gagal membuat PDF: ' + e.message, { id: toastId });
    }
  };

  const downloadPDFJuzThalibah = async () => {
    const toastId = toast.loading('Mengambil data thalibah...');
    try {
      // 1. Fetch all submissions
      const params = new URLSearchParams();
      if (selectedBatch && selectedBatch !== 'all') params.append('batch_id', selectedBatch);
      params.append('limit', '5000');
      
      const response = await fetch(`/api/admin/daftar-ulang?${params.toString()}`);
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || 'Failed to fetch');
      const submissions = result.data || [];
      
      // 2. Group into Juz
      const juzMap = new Map();
      
      submissions.forEach((s: any) => {
        // Only include approved/active
        if (s.status !== 'approved' && s.status !== 'active') return;
        
        const user = s.user || {};
        const reg = s.registration || {};
        
        const rawJuzStr = s.confirmed_chosen_juz || reg.chosen_juz || 'Tanpa Juz';
        const juzStr = getJuzCode(rawJuzStr); // Normalize juz string to code
        const halaqahName = s.ujian_halaqah?.name || '-';
        
        const thalibahData = {
          name: s.confirmed_full_name || user.full_name || '-',
          usia: calculateAge(user.tanggal_lahir || reg.birth_date),
          juzCode: juzStr,
          halaqahName: halaqahName,
          whatsapp: user.whatsapp || user.phone || '-',
          status: s.status
        };
        
        if (!juzMap.has(juzStr)) {
          juzMap.set(juzStr, { juzName: `Juz ${juzStr}`, thalibah: [] });
        }
        juzMap.get(juzStr).thalibah.push(thalibahData);
      });
      
      // 3. Sort the Juz
      const sortedList = Array.from(juzMap.values())
        .sort((a, b) => a.juzName.localeCompare(b.juzName, undefined, {numeric: true}));
      
      if (sortedList.length === 0) {
        toast.error('Tidak ada thalibah untuk kriteria yang dipilih', { id: toastId });
        return;
      }
      
      // 4. Generate PDF
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Data Thalibah per Juz', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const batchName = batches.find(b => b.id === selectedBatch)?.name || 'Semua Batch';
      doc.text(`Batch: ${batchName}`, 14, 23);
      doc.text(`Total Juz: ${sortedList.length}`, 14, 28);
      
      let totalThalibah = 0;
      sortedList.forEach(g => totalThalibah += g.thalibah.length);
      doc.text(`Total Thalibah: ${totalThalibah}`, 14, 33);
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}`, pageWidth - 14, 23, { align: 'right' });
      
      let yPos = 45;
      
      for (const group of sortedList) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(34, 197, 94); // green-500
        doc.text(`${group.juzName} (${group.thalibah.length} thalibah)`, 14, yPos);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        // Sort thalibah by name
        const sortedThalibah = group.thalibah.sort((a: any, b: any) => a.name.localeCompare(b.name, 'id-ID'));
        
        const tableData = sortedThalibah.map((t: any, i: number) => [
          i + 1,
          t.name,
          t.usia,
          t.juzCode,
          t.halaqahName,
          t.whatsapp,
          t.status === 'approved' ? 'Approved' : (t.status === 'submitted' ? 'Submitted' : t.status === 'rejected' ? 'Rejected' : 'Draft')
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['No', 'Nama', 'Usia', 'Juz Code', 'Halaqah', 'WhatsApp', 'Status']],
          body: tableData,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [34, 197, 94], // green-500
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 60 },
            2: { cellWidth: 15 },
            3: { cellWidth: 20 },
            4: { cellWidth: 45 },
            5: { cellWidth: 30 },
            6: { cellWidth: 20 },
          },
          didDrawPage: (data: any) => {
            yPos = (data.cursor?.y ?? 50) + 10;
          },
        });
        
        yPos += 8;
      }
      
      const fileName = `daftar-thalibah-juz-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('PDF berhasil diunduh', { id: toastId });
    } catch (e: any) {
      console.error('Error generating PDF:', e);
      toast.error('Gagal membuat PDF: ' + e.message, { id: toastId });
    }
  };

  const handleDeleteHalaqah = async (halaqahId: string) => {
    if (!confirm('Are you sure you want to delete this halaqah?')) {
      return;
    }

    try {
      const result = await deleteHalaqah(halaqahId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete halaqah');
      }

      toast.success('Halaqah deleted successfully');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete halaqah');
    }
  };

  const handleStatusChange = async (halaqahId: string, newStatus: Halaqah['status']) => {
    try {
      const result = await updateHalaqah({
        id: halaqahId,
        status: newStatus as 'draft' | 'active' | 'completed' | 'cancelled'
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      toast.success(`Status updated to ${newStatus}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleMoveToPra = async (halaqah: Halaqah) => {
    const name = halaqah.muallimah?.full_name || halaqah.name;
    if (!confirm(`Pindahkan halaqah ${name} ke Pra Tikrar? Mu’allimah dan jadwal tetap sama.`)) return;

    setMovingToPraId(halaqah.id);
    try {
      const response = await fetch(`/api/admin/halaqah/${halaqah.id}/move-to-pra`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal memindahkan halaqah.');
      toast.success(`Halaqah ${name} berhasil dipindahkan ke Pra Tikrar.`);
      setOpenActionId(null);
      setRefreshTrigger(value => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memindahkan halaqah.');
    } finally {
      setMovingToPraId(null);
    }
  };

  const getDayName = (dayNum?: number) => {
    if (!dayNum) return '-';
    const days = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
    return days[dayNum] || '-';
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    return time;
  };

  const getStatusBadge = (status: Halaqah['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.inactive}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatHalaqahName = (halaqah: Halaqah) => {
    return halaqah.name || 'Halaqah Tanpa Nama';
  };

  // Handle sort
  const handleSort = (column: keyof Halaqah) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Tab filtered halaqahs
  const tabHalaqahs = useMemo(() => {
    return halaqahs.filter(h => {
      const type = h.class_type || h.program?.class_type;
      
      if (activeTab === 'muallimah') {
        return !type && h.program?.name?.toLowerCase().includes('muallimah');
      }
      
      if (activeTab === 'tikrar_berbayar') {
        return type === 'tikrar_berbayar' || h.program?.name?.toLowerCase().includes('berbayar');
      }

      return type === activeTab;
    });
  }, [halaqahs, activeTab]);

  // Filter and sort halaqahs
  const filteredAndSortedHalaqahs = useMemo(() => {
    // If there's a search query, search across ALL halaqahs (lintas tab)
    let filtered = searchQuery ? [...halaqahs] : [...tabHalaqahs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h =>
        h.name.toLowerCase().includes(query) ||
        h.muallimah?.full_name?.toLowerCase().includes(query) ||
        h.program?.name?.toLowerCase().includes(query) ||
        h.location?.toLowerCase().includes(query)
      );
    }

    // Day filter
    if (selectedDay !== '') {
      filtered = filtered.filter(h => h.day_of_week === parseInt(selectedDay));
    }

    if (emptyOnly) {
      filtered = filtered.filter(h =>
        (h._count?.students || 0) === 0 && (h.quota_details?.total_used || 0) === 0
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      // Determine values for the primary sort column
      if (sortColumn === 'name') {
        aVal = formatHalaqahName(a).toLowerCase();
        bVal = formatHalaqahName(b).toLowerCase();
      } else if (sortColumn === 'muallimah_id') {
        aVal = a.muallimah?.full_name?.toLowerCase() || '';
        bVal = b.muallimah?.full_name?.toLowerCase() || '';
      } else if (sortColumn === '_count') {
        aVal = a._count?.students || 0;
        bVal = b._count?.students || 0;
      } else if (sortColumn === 'status') {
        const statusOrder = { active: 1, inactive: 2, suspended: 3 };
        aVal = statusOrder[a.status as keyof typeof statusOrder] || 999;
        bVal = statusOrder[b.status as keyof typeof statusOrder] || 999;
      } else {
        aVal = a[sortColumn];
        bVal = b[sortColumn];
      }

      // Compare primary sort column
      if (aVal !== bVal) {
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal, undefined, { numeric: true })
            : bVal.localeCompare(aVal, undefined, { numeric: true });
        }
        
        return sortDirection === 'asc'
          ? (aVal > bVal ? 1 : -1)
          : (bVal > aVal ? 1 : -1);
      }

      // If primary columns are equal (or if sortColumn is day_of_week and equal),
      // fallback to day_of_week and start_time
      if (sortColumn !== 'day_of_week') {
        const aDay = a.day_of_week ?? 999;
        const bDay = b.day_of_week ?? 999;
        if (aDay !== bDay) {
          // Fallback uses the same sortDirection, or always asc? Usually always asc for fallback
          return aDay - bDay;
        }
      }
      
      const aTime = a.start_time ?? '23:59';
      const bTime = b.start_time ?? '23:59';
      if (aTime !== bTime) {
        return aTime.localeCompare(bTime);
      }

      return 0;
    });

    return filtered;
  }, [tabHalaqahs, searchQuery, sortColumn, sortDirection, selectedDay, emptyOnly]);



  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-3">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            onClick={() => setShowAssignThalibahModal(true)}
            disabled={!selectedBatch}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-xs sm:text-sm shadow-sm shadow-blue-600/10 active:scale-95 duration-200 flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Assign Thalibah</span>
          </button>
          <button
            onClick={() => setShowManualCreateModal(true)}
            disabled={!selectedBatch}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-xs sm:text-sm shadow-sm shadow-indigo-600/10 active:scale-95 duration-200 flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add Halaqah</span>
          </button>
          <button
            onClick={() => setShowAutoCreateModal(true)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-green-900 text-white rounded-xl hover:bg-green-800 transition-all font-bold text-xs sm:text-sm shadow-sm shadow-green-900/10 active:scale-95 duration-200 flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Auto Create</span>
          </button>
          <Link
            href="/admin/halaqah/analisis-zoom"
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all font-bold text-xs sm:text-sm shadow-sm shadow-teal-600/10 active:scale-95 duration-200 flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Analisis Zoom</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 mb-4 sm:mb-6 px-1.5 sm:px-2 rounded-xl sm:rounded-2xl shadow-sm">
        <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto scrollbar-none" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('tikrar_tahfidz')}
            className={`${
              activeTab === 'tikrar_tahfidz'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-3 px-3 sm:py-4 sm:px-4 border-b-2 font-bold text-xs sm:text-sm transition-colors`}
          >
            <span className="hidden sm:inline">Halaqah Tikrar Per Juz</span>
            <span className="sm:hidden">Tikrar</span>
          </button>
          <button
            onClick={() => setActiveTab('pra_tahfidz')}
            className={`${
              activeTab === 'pra_tahfidz'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-3 px-3 sm:py-4 sm:px-4 border-b-2 font-bold text-xs sm:text-sm transition-colors`}
          >
            Pra Tikrar
          </button>
          <button
            onClick={() => setActiveTab('tikrar_berbayar')}
            className={`${
              activeTab === 'tikrar_berbayar'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-3 px-3 sm:py-4 sm:px-4 border-b-2 font-bold text-xs sm:text-sm transition-colors`}
          >
            Berbayar
          </button>
          <button
            onClick={() => setActiveTab('muallimah')}
            className={`${
              activeTab === 'muallimah'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-3 px-3 sm:py-4 sm:px-4 border-b-2 font-bold text-xs sm:text-sm transition-colors`}
          >
            Muallimah
          </button>
        </nav>
      </div>

      {/* Stats Section */}
      <HalaqahStats
        isLoading={loading}
        stats={
          tabHalaqahs.length > 0
            ? {
                total: tabHalaqahs.length,
                active: tabHalaqahs.filter(h => h.status === 'active').length,
                muallimah: new Set(tabHalaqahs.map(h => h.muallimah_id).filter(Boolean)).size,
                capacity: tabHalaqahs.reduce((sum, h) => sum + (h.max_students || 0), 0),
                used: tabHalaqahs.reduce((sum, h) => sum + (h.quota_details?.total_used || 0), 0)
              }
            : null
        }
      />

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Filters:</span>
          </div>

          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, muallimah, juz, jadwal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-green-950 transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedProgram('');
                setSelectedBatch(e.target.value);
              }}
              className="w-full sm:w-auto px-2.5 sm:px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-green-950 transition-all bg-white shadow-sm font-semibold text-gray-700"
            >
              <option value="">All Batches {batches.length > 0 && `(${batches.length})`}</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} ({batch.status})
                </option>
              ))}
            </select>

            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full sm:w-auto px-2.5 sm:px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-green-950 transition-all bg-white shadow-sm font-semibold text-gray-700"
              disabled={!selectedBatch}
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto px-2.5 sm:px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-green-950 transition-all bg-white shadow-sm font-semibold text-gray-700"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full sm:w-auto px-2.5 sm:px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-green-950 transition-all bg-white shadow-sm font-semibold text-gray-700"
            >
              <option value="">Semua Hari</option>
              <option value="1">Senin</option>
              <option value="2">Selasa</option>
              <option value="3">Rabu</option>
              <option value="4">Kamis</option>
              <option value="5">Jumat</option>
              <option value="6">Sabtu</option>
              <option value="7">Ahad</option>
            </select>
          </div>
        </div>

        {/* Action and Export Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            {activeTab === 'tikrar_tahfidz' && (
              <button
                type="button"
                onClick={() => setEmptyOnly(value => !value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 border ${
                  emptyOnly
                    ? 'border-orange-300 bg-orange-100 text-orange-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Tanpa Thalibah
              </button>
            )}

            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm active:scale-95 duration-200 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 w-full sm:w-auto">
            <button
              onClick={downloadExcel}
              disabled={filteredAndSortedHalaqahs.length === 0}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 duration-200 shadow-emerald-600/10 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download as Excel (CSV)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>

            <button
              onClick={downloadPDF}
              disabled={filteredAndSortedHalaqahs.length === 0}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-sm active:scale-95 duration-200 shadow-rose-600/10 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download Halaqah Report (HTML)"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF Halaqah
            </button>
            
            <button
              onClick={downloadPDFHalaqahThalibah}
              disabled={filteredAndSortedHalaqahs.length === 0}
              className="px-2.5 sm:px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-sm active:scale-95 duration-200 shadow-purple-600/10 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download PDF List Thalibah per Halaqah"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF Thalibah
            </button>

            <button
              onClick={downloadPDFJuzThalibah}
              disabled={filteredAndSortedHalaqahs.length === 0}
              className="px-2.5 sm:px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all shadow-sm active:scale-95 duration-200 shadow-teal-600/10 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download PDF List Thalibah per Juz"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF per Juz
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="text-[11px] sm:text-xs font-semibold text-gray-500">
          Showing {filteredAndSortedHalaqahs.length} halaqahs
          {filteredAndSortedHalaqahs.length !== tabHalaqahs.length && ` (filtered from ${tabHalaqahs.length} total)`}
        </div>
      </div>

      {/* Halaqah List or Detail View */}
      {selectedHalaqah ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedHalaqah(null)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ← Back to list
          </button>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedHalaqah.name}</h3>
                <p className="text-gray-600 mt-1">{selectedHalaqah.description || 'No description'}</p>
              </div>
              {getStatusBadge(selectedHalaqah.status)}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Program</p>
                <p className="font-medium">{selectedHalaqah.program?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Batch</p>
                <p className="font-medium">{selectedHalaqah.program?.batch?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Schedule</p>
                {selectedHalaqah.day_of_week ? (
                  <p className="font-medium">
                    {getDayName(selectedHalaqah.day_of_week)}, {formatTime(selectedHalaqah.start_time)} - {formatTime(selectedHalaqah.end_time)}
                  </p>
                ) : (
                  <div
                    className="font-medium text-gray-900"
                    dangerouslySetInnerHTML={{ __html: formatSchedule(selectedHalaqah.preferred_schedule) }}
                  />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Muallimah</p>
                <p className="font-medium">
                  {selectedHalaqah.muallimah?.full_name
                    ? `Ustadzah ${selectedHalaqah.muallimah.full_name}`
                    : 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Musyrifah / Roisah</p>
                {selectedHalaqah.mentors && selectedHalaqah.mentors.filter(m => m.role === 'musyrifah' || m.role === 'roisah').length > 0 ? (
                  <div className="flex flex-col mt-1 gap-1">
                    {selectedHalaqah.mentors.filter(m => m.role === 'musyrifah' || m.role === 'roisah').map((mentor) => (
                      <p key={mentor.id} className="font-medium text-sm flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          mentor.role === 'roisah' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {mentor.role === 'roisah' ? 'ROISAH' : 'MUSYRIFAH'}
                        </span>
                        <span>{mentor.users?.full_name || 'Unknown'}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="font-medium text-sm mt-1 text-gray-400 italic">-</p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-semibold mb-4">Students</h4>
              <HalaqahStudentsList
                halaqahId={selectedHalaqah.id}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-900" />
            </div>
          ) : filteredAndSortedHalaqahs.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No halaqah found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting filters or create new halaqah
              </p>
            </div>
          ) : (
            <>
              {/* Container for both views */}
              <div className="w-full">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto overflow-y-visible scroll-smooth">
                  <table className="w-full border-collapse min-w-[1200px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th
                        onClick={() => handleSort('name')}
                        className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none cursor-pointer hover:bg-gray-100/80 transition-colors w-[300px]"
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortColumn === 'name' && (
                            sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">
                        Class Type
                      </th>
                      <th
                        onClick={() => handleSort('preferred_juz')}
                        className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Juz
                          {sortColumn === 'preferred_juz' && (
                            sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('day_of_week')}
                        className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Schedule
                          {sortColumn === 'day_of_week' && (
                            sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('muallimah_id')}
                        className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Muallimah
                          {sortColumn === 'muallimah_id' && (
                            sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">
                        Musyrifah/Roisah
                      </th>
                      <th
                        onClick={() => handleSort('_count')}
                        className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Thalibah
                          {sortColumn === '_count' && (
                            sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('status')}
                        className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Status
                          {sortColumn === 'status' && (
                            sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none min-w-[80px] w-[80px] sticky right-0 z-10 backdrop-blur-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedHalaqahs.map((halaqah) => (
                      <tr key={halaqah.id} className="hover:bg-gray-50 group">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatHalaqahName(halaqah)}
                            </p>
                            {halaqah.location && (
                              <p className="text-sm text-gray-500">{halaqah.location}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">
                            {formatClassType(halaqah.class_type || halaqah.program?.class_type)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">
                            {halaqah.preferred_juz || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {halaqah.day_of_week ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-sm text-gray-900">
                                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                <span className="whitespace-nowrap">{getDayName(halaqah.day_of_week)}</span>
                                {halaqah.start_time && (
                                  <>
                                    <Clock className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
                                    <span className="whitespace-nowrap">{halaqah.start_time} - {halaqah.end_time} WIB</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation(); 
                                    handleToggleLibur(halaqah); 
                                  }}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors ${getLiburStatus(halaqah).isLibur ? 'bg-red-500' : 'bg-gray-200'}`}
                                  title={getLiburStatus(halaqah).isLibur ? 'Batalkan libur' : 'Tandai libur pekan ini'}
                                >
                                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${getLiburStatus(halaqah).isLibur ? 'translate-x-2' : '-translate-x-2'}`} />
                                </button>
                                <span className={`ml-2 text-[10px] font-bold tracking-wide ${getLiburStatus(halaqah).isLibur ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                                  {getLiburStatus(halaqah).isLibur ? 'LIBUR PEKAN INI' : 'TANDAI LIBUR'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="text-sm max-w-xs whitespace-pre-line text-gray-900"
                              dangerouslySetInnerHTML={{ __html: formatSchedule(halaqah.preferred_schedule) }}
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">
                            {halaqah.muallimah?.full_name ? `Ustadzah ${halaqah.muallimah.full_name}` : 'Not assigned'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {halaqah.mentors && halaqah.mentors.filter(m => m.role === 'musyrifah' || m.role === 'roisah').length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {halaqah.mentors.filter(m => m.role === 'musyrifah' || m.role === 'roisah').map((mentor) => (
                                <p key={mentor.id} className="text-sm text-gray-900 flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    mentor.role === 'roisah' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                                  }`}>
                                    {mentor.role === 'roisah' ? 'ROISAH' : 'MUSYRIFAH'}
                                  </span>
                                  <span>{mentor.users?.full_name || 'Unknown'}</span>
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">-</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-900 whitespace-nowrap">
                                {halaqah.max_students ? Math.max(0, halaqah.max_students - (halaqah.quota_details?.total_used || 0)) : '?'} dari {halaqah.max_students || 20}
                              </span>
                              <span className="text-xs text-gray-500">tersedia</span>
                            </div>
                            {/* Progress bar - similar to daftar ulang */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  (halaqah.quota_details?.total_used || 0) >= (halaqah.max_students || 20)
                                    ? 'bg-red-500'
                                    : (halaqah.max_students || 20) - (halaqah.quota_details?.total_used || 0) <= 3
                                    ? 'bg-orange-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, ((halaqah.quota_details?.total_used || 0) / (halaqah.max_students || 20)) * 100)}%` }}
                              ></div>
                            </div>
                            {/* Quota details */}
                            <QuotaDetailsCell halaqah={halaqah} />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(halaqah.status)}
                        </td>
                        <td className="px-6 py-4 min-w-[80px] w-[80px] sticky right-0 z-[5] bg-white group-hover:bg-gray-50">
                          <div className="flex items-center justify-end gap-1.5 relative">
                            <button
                              onClick={() => setOpenActionId(openActionId === halaqah.id ? null : halaqah.id)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            
                            {openActionId === halaqah.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenActionId(null)}></div>
                                <div className="absolute right-10 top-0 w-48 bg-white border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 py-1 overflow-hidden">
                                  <button
                                    onClick={() => { setSelectedHalaqah(halaqah); setOpenActionId(null); }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                                  >
                                    <Eye className="w-4 h-4 text-gray-400" /> Detail
                                  </button>
                                  <button
                                    onClick={() => { setEditingHalaqah(halaqah); setOpenActionId(null); }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-gray-400" /> Edit
                                  </button>
                                  {activeTab === 'tikrar_tahfidz' &&
                                    (halaqah._count?.students || 0) === 0 &&
                                    (halaqah.quota_details?.total_used || 0) === 0 && (
                                    <button
                                      onClick={() => handleMoveToPra(halaqah)}
                                      disabled={movingToPraId === halaqah.id}
                                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-fuchsia-700 hover:bg-fuchsia-50 flex items-center gap-2.5 transition-colors disabled:opacity-50"
                                    >
                                      {movingToPraId === halaqah.id
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <ArrowRightLeft className="w-4 h-4" />}
                                      Pindah ke Pra Tikrar
                                    </button>
                                  )}
                                  {halaqah.status === 'inactive' && (
                                    <button
                                      onClick={() => { handleStatusChange(halaqah.id, 'active'); setOpenActionId(null); }}
                                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors"
                                    >
                                      <CheckCircle2 className="w-4 h-4" /> Aktifkan
                                    </button>
                                  )}
                                  {halaqah.status === 'active' && (
                                    <button
                                      onClick={() => { handleStatusChange(halaqah.id, 'inactive'); setOpenActionId(null); }}
                                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                                    >
                                      <XCircle className="w-4 h-4" /> Nonaktifkan
                                    </button>
                                  )}
                                  <div className="h-px bg-gray-100 my-1"></div>
                                  <button
                                    onClick={() => { handleDeleteHalaqah(halaqah.id); setOpenActionId(null); }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" /> Hapus
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4 p-4">
                {filteredAndSortedHalaqahs.map((halaqah) => (
                  <div key={halaqah.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3 relative">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 pr-16">
                        <p className="font-bold text-gray-900 text-lg leading-tight">
                          {formatHalaqahName(halaqah)}
                        </p>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                          {formatClassType(halaqah.class_type || halaqah.program?.class_type)}
                        </p>
                      </div>
                      <div className="absolute top-4 right-4">
                        {getStatusBadge(halaqah.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Target Juz</span>
                        <span className="font-semibold">{halaqah.preferred_juz || '-'}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Muallimah</span>
                        <span className="truncate font-semibold">{halaqah.muallimah?.full_name ? `Ustadzah ${halaqah.muallimah.full_name.split(' ')[0]}` : 'Belum Ada'}</span>
                      </div>
                      <div className="col-span-2 flex flex-col gap-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Musyrifah/Roisah</span>
                        {halaqah.mentors && halaqah.mentors.filter(m => m.role === 'musyrifah' || m.role === 'roisah').length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {halaqah.mentors.filter(m => m.role === 'musyrifah' || m.role === 'roisah').map((mentor) => (
                              <span key={mentor.id} className="truncate font-semibold flex items-center gap-1">
                                <span className={`px-1 rounded text-[8px] font-bold ${
                                  mentor.role === 'roisah' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {mentor.role === 'roisah' ? 'ROISAH' : 'MUSYRIFAH'}
                                </span>
                                {mentor.users?.full_name?.split(' ')[0] || 'Unknown'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="truncate font-semibold text-gray-400 italic">Belum Ada</span>
                        )}
                      </div>
                      <div className="col-span-2 flex flex-col gap-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Jadwal</span>
                        <span className="font-semibold">
                          {halaqah.day_of_week ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              {getDayName(halaqah.day_of_week)}, {halaqah.start_time} - {halaqah.end_time} WIB
                            </div>
                          ) : (
                            <span dangerouslySetInnerHTML={{ __html: formatSchedule(halaqah.preferred_schedule) }} />
                          )}
                        </span>
                      </div>
                      {halaqah.location && (
                         <div className="col-span-2 flex flex-col gap-0.5">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Lokasi</span>
                            <span className="font-semibold">{halaqah.location}</span>
                         </div>
                      )}
                    </div>

                    <div className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-gray-400" /> Quota Thalibah
                        </span>
                        <span className="text-xs font-semibold">
                          {halaqah.max_students ? Math.max(0, halaqah.max_students - (halaqah.quota_details?.total_used || 0)) : '?'} dari {halaqah.max_students || 20} sisa
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (halaqah.quota_details?.total_used || 0) >= (halaqah.max_students || 20)
                              ? 'bg-red-500'
                              : (halaqah.max_students || 20) - (halaqah.quota_details?.total_used || 0) <= 3
                              ? 'bg-orange-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, ((halaqah.quota_details?.total_used || 0) / (halaqah.max_students || 20)) * 100)}%` }}
                        ></div>
                      </div>
                      <QuotaDetailsCell halaqah={halaqah} />
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 pt-1">
                      <button
                        onClick={() => setSelectedHalaqah(halaqah)}
                        className="col-span-2 flex items-center justify-center gap-1 p-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all border border-indigo-100 active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>
                      
                      <button
                        onClick={() => setEditingHalaqah(halaqah)}
                        className="flex items-center justify-center p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all border border-blue-100 active:scale-95"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {activeTab === 'tikrar_tahfidz' &&
                        (halaqah._count?.students || 0) === 0 &&
                        (halaqah.quota_details?.total_used || 0) === 0 && (
                        <button
                          onClick={() => handleMoveToPra(halaqah)}
                          disabled={movingToPraId === halaqah.id}
                          className="col-span-2 flex items-center justify-center gap-1 p-2.5 text-xs font-semibold text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 rounded-lg border border-fuchsia-100 disabled:opacity-50"
                          title="Pindah ke Pra Tikrar"
                        >
                          {movingToPraId === halaqah.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <ArrowRightLeft className="w-3.5 h-3.5" />}
                          Pra Tikrar
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteHalaqah(halaqah.id)}
                        className="flex items-center justify-center p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all border border-red-100 active:scale-95"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
            </div>

            </>
          )}
        </div>
      )}

      {/* Auto Create Halaqah Modal */}
      {showAutoCreateModal && (
        <AutoCreateHalaqahModal
          onClose={() => setShowAutoCreateModal(false)}
          onSuccess={() => {
            setShowAutoCreateModal(false);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* Assign Thalibah Modal */}
      {showAssignThalibahModal && selectedBatch && (
        <AssignThalibahModal
          batchId={selectedBatch}
          batchName={batches.find(b => b.id === selectedBatch)?.name || ''}
          onClose={() => setShowAssignThalibahModal(false)}
          onSuccess={() => {
            setShowAssignThalibahModal(false);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* Edit Halaqah Modal */}
      {editingHalaqah && (
        <EditHalaqahModal
          halaqah={editingHalaqah as any}
          onClose={() => setEditingHalaqah(null)}
          onSuccess={() => {
            setEditingHalaqah(null);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* Manual Create Halaqah Modal */}
      {showManualCreateModal && (
        <ManualCreateHalaqahModal
          onClose={() => setShowManualCreateModal(false)}
          onSuccess={() => {
            setShowManualCreateModal(false);
            setRefreshTrigger(prev => prev + 1);
          }}
          batchId={selectedBatch}
        />
      )}

      {showScheduleOverlapModal && (
        <ScheduleOverlapAnalysis
          isOpen={showScheduleOverlapModal}
          onClose={() => setShowScheduleOverlapModal(false)}
          halaqahs={halaqahs}
          zoomLinks={zoomLinks}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
    </div>
  );
}
