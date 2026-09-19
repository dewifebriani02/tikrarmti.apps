'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn, parseAkadFiles } from '@/lib/utils';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  RefreshCw,
  List,
  FolderTree,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  FileSpreadsheet,
  BookOpen,
  Search,
  X,
  MessageSquare,
  Shield,
  Database,
  ArrowLeft
} from 'lucide-react';
import { getJuzOptionsAdmin } from '@/app/(protected)/admin/actions';
import { DaftarUlangHalaqahTab } from '@/components/DaftarUlangHalaqahTab';
import { EditDaftarUlangModal } from './EditDaftarUlangModal';
import { getWhatsAppUrl } from '@/lib/utils/whatsapp';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { DaftarUlangV2Stats } from './DaftarUlangV2Stats';
import { DaftarUlangV2Filters } from './DaftarUlangV2Filters';
import { DaftarUlangV2Table } from './DaftarUlangV2Table';
import { DetailModal, BulkConfirmModal } from './DaftarUlangV2Modals';
import { ResetExamModal } from './ResetExamModal';
import { DaftarUlangSubmission, DaftarUlangStatsData, SortField, SortOrder } from './types';

// Types are now imported from './types'

interface Batch {
  id: string;
  name: string;
}

interface DaftarUlangTabProps {
  batchId?: string;
}

export function DaftarUlangV2Tab({ batchId: initialBatchId }: DaftarUlangTabProps) {
  const [submissions, setSubmissions] = useState<DaftarUlangSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<DaftarUlangSubmission | null>(null);
  const [resettingExamSubmission, setResettingExamSubmission] = useState<DaftarUlangSubmission | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sortField, setSortField] = useState<SortField>('submitted_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<DaftarUlangSubmission | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);

  // Download state
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingVCF, setDownloadingVCF] = useState(false);
  const [allSubmissionsForDownload, setAllSubmissionsForDownload] = useState<any[]>([]);

  // Statistics state
  const [stats, setStats] = useState<{
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    withHalaqah: number;
    withAkad: number;
    juzCount: Record<string, number>;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');
  const [filterAkadStatus, setFilterAkadStatus] = useState('all');
  const [filterSubmissionStatus, setFilterSubmissionStatus] = useState('all');
  const [filterHalaqahStatus, setFilterHalaqahStatus] = useState('all');
  const [filterJuz, setFilterJuz] = useState('all');
  
  const [juzOptions, setJuzOptions] = useState<any[]>([]);

  // Local batch filter state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [localBatchId, setLocalBatchId] = useState<string>(initialBatchId || 'all');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Prevent race conditions
  const statsAbortControllerRef = useRef<AbortController | null>(null);
  const submissionsAbortControllerRef = useRef<AbortController | null>(null);

  const loadBatches = async () => {
    try {
      const response = await fetch('/api/batch');
      const result = await response.json();
      if (result.success && result.data) {
        setBatches(result.data);
        // Default to the open batch (or latest if none open) on initial load
        if ((!initialBatchId || initialBatchId === 'all') && result.data.length > 0) {
          const openBatch = result.data.find((b: any) => b.status === 'open') || result.data[0];
          setLocalBatchId(openBatch.id);
        }
      }
    } catch (error) {
      console.error('[DaftarUlangTab] Error loading batches:', error);
    }
  };

  const loadJuzOptions = async () => {
    try {
      const result = await getJuzOptionsAdmin();
      if (result.success && result.data) {
        setJuzOptions(result.data.filter((j: any) => j.is_active));
      }
    } catch (error) {
      console.error('[DaftarUlangTab] Error loading juz options:', error);
    }
  };

  const loadStats = async () => {
    console.log('[DaftarUlangTab] Loading statistics...');
    setStatsLoading(true);

    if (statsAbortControllerRef.current) {
      statsAbortControllerRef.current.abort();
    }
    statsAbortControllerRef.current = new AbortController();

    try {
      // Build query params
      const params = new URLSearchParams();
      if (localBatchId && localBatchId !== 'all') params.append('batch_id', localBatchId);

      const response = await fetch(`/api/admin/daftar-ulang/stats?${params.toString()}`, {
        signal: statsAbortControllerRef.current.signal
      });
      const result = await response.json();

      if (!response.ok) {
        console.error('[DaftarUlangTab] Failed to load stats:', result);
        return;
      }

      if (result.data) {
        console.log('[DaftarUlangTab] Loaded stats:', result.data);
        setStats(result.data);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[DaftarUlangTab] Stats request aborted');
        return;
      }
      console.error('[DaftarUlangTab] Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadSubmissions = async () => {
    console.log('[DaftarUlangTab] Loading submissions...');
    setLoading(true);

    if (submissionsAbortControllerRef.current) {
      submissionsAbortControllerRef.current.abort();
    }
    submissionsAbortControllerRef.current = new AbortController();

    try {
      // Build query params
      const params = new URLSearchParams();
      if (localBatchId && localBatchId !== 'all') params.append('batch_id', localBatchId);
      if (filterAkadStatus !== 'all') params.append('akad_status', filterAkadStatus);
      if (filterSubmissionStatus !== 'all') params.append('status', filterSubmissionStatus);
      if (filterHalaqahStatus !== 'all') params.append('halaqah_status', filterHalaqahStatus);
      if (filterJuz !== 'all') params.append('juz', filterJuz);

      // If searching, load all data. Otherwise use pagination.
      if (searchQuery.trim()) {
        params.append('limit', '10000'); // Load all data for search
      } else {
        params.append('page', currentPage.toString());
        params.append('limit', '50');
      }

      const response = await fetch(`/api/admin/daftar-ulang?${params.toString()}`, {
        signal: submissionsAbortControllerRef.current.signal
      });
      const result = await response.json();

      if (!response.ok) {
        console.error('[DaftarUlangTab] Failed to load submissions:', result);
        toast.error(result.error || 'Failed to load submissions');
        return;
      }

      if (result.data) {
        console.log('[DaftarUlangTab] Loaded', result.data.length, 'submissions');
        setSubmissions(result.data);
        // Only set pagination when not searching
        if (!searchQuery.trim()) {
          setPagination(result.pagination || null);
        } else {
          setPagination(null); // No pagination when searching
        }
      } else {
        setSubmissions([]);
        setPagination(null);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[DaftarUlangTab] Request aborted');
        return;
      }
      console.error('[DaftarUlangTab] Error loading submissions:', error);
      toast.error('Failed to load submissions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Load all submissions for download (with complete data from pendaftaran_tikrar_tahfidz)
  const loadAllSubmissionsForDownload = async () => {
    console.log('[DaftarUlangTab] Loading all submissions for download...');
    try {
      const params = new URLSearchParams();
      if (localBatchId && localBatchId !== 'all') params.append('batch_id', localBatchId);
      if (filterJuz !== 'all') params.append('juz', filterJuz);
      params.append('limit', '10000'); // Get all data

      const response = await fetch(`/api/admin/daftar-ulang?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        console.error('[DaftarUlangTab] Failed to load submissions for download:', result);
        toast.error(result.error || 'Failed to load data');
        return [];
      }

      return result.data || [];
    } catch (error: any) {
      console.error('[DaftarUlangTab] Error loading submissions for download:', error);
      toast.error('Failed to load data: ' + error.message);
      return [];
    }
  };

  // Helper function to calculate age from birth date
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

  // Helper function to get juz code from confirmed_chosen_juz
  const getJuzCode = (confirmedChosenJuz: string | undefined) => {
    if (!confirmedChosenJuz) return '-';
    // Try to extract code from the juz string (e.g., "1A" -> "1A")
    const match = confirmedChosenJuz.match(/(\d+[A-B]?)/i);
    return match ? match[1].toUpperCase() : confirmedChosenJuz;
  };

  // Download Excel - Filter by approved/submitted status only
  const downloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const data = await loadAllSubmissionsForDownload();

      console.log('[Download Excel] Total data before filter:', data.length);
      console.log('[Download Excel] Status breakdown:', data.reduce((acc: any, s: any) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {}));

      // Filter only approved or submitted status (exclude draft and rejected)
      const filteredData = data.filter(
        (item: any) => item.status === 'approved' || item.status === 'submitted'
      );

      console.log('[Download Excel] Total data after filter:', filteredData.length);

      if (filteredData.length === 0) {
        toast.error('Tidak ada data dengan status approved/submitted untuk diunduh');
        return;
      }

      // Sort data alphabetically by name
      const sortedData = [...filteredData].sort((a, b) => {
        const aName = a.confirmed_full_name || a.user?.full_name || '';
        const bName = b.confirmed_full_name || b.user?.full_name || '';
        return aName.localeCompare(bName, 'id-ID');
      });

      // Helper functions
      const formatTimeSlot = (slot: string | undefined) => {
        if (!slot) return '-';
        const timeMap: Record<string, string> = {
          '04-06': '04.00 - 06.00',
          '06-09': '06.00 - 09.00',
          '09-12': '09.00 - 12.00',
          '12-15': '12.00 - 15.00',
          '15-18': '15.00 - 18.00',
          '18-21': '18.00 - 21.00',
          '21-24': '21.00 - 24.00'
        };
        return timeMap[slot] || slot;
      };

      const formatHalaqahSchedule = (halaqah: any) => {
        if (!halaqah || !halaqah.name) return '-';
        const days = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
        const day = halaqah.day_of_week !== undefined ? days[halaqah.day_of_week] : '';
        const time = (halaqah.start_time && halaqah.end_time) ? `${halaqah.start_time} - ${halaqah.end_time}` : '';
        return day && time ? `${day}, ${time}` : halaqah.name || '-';
      };

      const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
      };

      const formatDateTime = (dateString: string | undefined) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit', timeZone: 'Asia/Jakarta' });
      };

      // Prepare Excel data with ALL fields from database schema
      const excelData = sortedData.map((item, index) => {
        const user = item.user || {};
        const registration = item.registration || {};
        const ujianHalaqah = item.ujian_halaqah || {};
        const tashihHalaqah = item.tashih_halaqah || {};
        const partnerUser = item.partner_user || {};
        const studyPartner = item.study_partner || {};

        return {
          // === SEQUENCE NUMBER ===
          'No': index + 1,

          // === DATA THALIBAH (from daftar_ulang_submissions) ===
          'Submission ID': item.id || '-',
          'User ID': user.id || '-',
          'Registration ID': registration.id || '-',
          'Batch ID': item.batch_id || '-',

          // Confirmed Data (daftar_ulang_submissions)
          'Nama Lengkap (Confirmed)': item.confirmed_full_name || '-',
          'Juz Pilihan (Confirmed)': item.confirmed_chosen_juz || '-',
          'Juz Pilihan Akhir (Final Juz)': registration?.final_juz || '-',
          'Slot Jadwal Utama (Confirmed)': formatTimeSlot(item.confirmed_main_time_slot),
          'Slot Jadwal Cadangan (Confirmed)': formatTimeSlot(item.confirmed_backup_time_slot),
          'No. WhatsApp (Confirmed)': item.confirmed_wa_phone || '-',
          'Alamat (Confirmed)': item.confirmed_address || '-',

          // Additional daftar_ulang_submissions fields
          'Reviewed By User': item.reviewed_by_user || '-',
          'Pairing Status': item.pairing_status || '-',
          'Rejection Reason': item.rejection_reason || '-',
          'Akad URL': item.akad_url || '-',
          'Akad File Name': item.akad_file_name || '-',
          'Batch Name': item.batch_name || '-',
          'Program ID': item.program_id || '-',
          'Selection Status': item.selection_status || '-',
          'Re-enrollment Completed': item.re_enrollment_completed ? 'Ya' : 'Tidak',

          // Exam & Juz Adjustment
          'Nilai Exam': item.exam_score ?? registration.exam_score ?? '-',
          'Final Juz': item.final_juz || '-',
          'Juz Disesuaikan': item.juz_adjusted ? 'Ya' : 'Tidak',
          'Alasan Penyesuaian Juz': item.juz_adjustment_reason || '-',

          // Halaqah Selection
          'Halaqah': ujianHalaqah.name || '-',
          'Jadwal Halaqah': formatHalaqahSchedule(ujianHalaqah),
          'Lokasi Halaqah': ujianHalaqah.location || '-',
          'Tipe Kelas': ujianHalaqah.class_type || '-',
          'Muallimah': ujianHalaqah.muallimah_name || '-',

          // Partner
          'Tipe Partner': item.partner_type || '-',
          'Nama Partner': item.partner_type === 'self_match' && partnerUser.full_name
            ? partnerUser.full_name
            : (item.partner_name || '-'),
          'Hubungan Partner': item.partner_relationship || '-',
          'No. WA Partner': item.partner_wa_phone || '-',
          'Catatan Partner': item.partner_notes || '-',

          // Study Partner (from study_partners table)
          'Nama Pasangan Studi': studyPartner.nama_pasangan || '-',
          'Hubungan Pasangan Studi': studyPartner.hubungan || '-',
          'Catatan Pasangan Studi': studyPartner.catatan || '-',

          // Akad
          'Akad Terupload': item.akad_files && item.akad_files.length > 0 ? 'Ya' : 'Tidak',
          'Jumlah File Akad': item.akad_files?.length || 0,
          'Tanggal Upload Akad': formatDate(item.akad_submitted_at),

          // Status & Timestamps
          'Status Daftar Ulang': item.status === 'approved' ? 'Approved' : item.status === 'submitted' ? 'Submitted' : '-',
          'Tanggal Submit': formatDateTime(item.submitted_at),
          'Tanggal Review': formatDateTime(item.reviewed_at),
          'Tanggal Dibuat': formatDateTime(item.created_at),
          'Tanggal Diupdate': formatDateTime(item.updated_at),

          // === DATA PENDAFTARAN (from pendaftaran_tikrar_tahfidz) ===

          // Data Pendaftaran Awal
          'Nama Lengkap (Pendaftaran)': registration.full_name || '-',
          'Juz Pilihan (Pendaftaran)': registration.chosen_juz || '-',
          'Juz Akhir setelah Demotion': registration.final_juz || '-',
          'Nilai Exam (Pendaftaran)': registration.exam_score ?? '-',
          'Slot Jadwal Utama (Pendaftaran)': formatTimeSlot(registration.main_time_slot),
          'Slot Jadwal Cadangan (Pendaftaran)': formatTimeSlot(registration.backup_time_slot),
          'No. WhatsApp (Pendaftaran)': registration.wa_phone || '-',
          'Alamat (Pendaftaran)': registration.address || '-',
          'Tanggal Lahir (Pendaftaran)': formatDate(registration.birth_date),
          'Zona Waktu (Pendaftaran)': registration.zona_waktu || '-',

          // Oral Assessment Data (Nilai Rekaman Suara)
          'Oral Submission URL': registration.oral_submission_url || '-',
          'Oral Makhraj Errors': registration.oral_makhraj_errors ?? '-',
          'Oral Sifat Errors': registration.oral_sifat_errors ?? '-',
          'Oral Mad Errors': registration.oral_mad_errors ?? '-',
          'Oral Ghunnah Errors': registration.oral_ghunnah_errors ?? '-',
          'Oral Harakat Errors': registration.oral_harakat_errors ?? '-',
          'Oral Itmamul Harakat Errors': registration.oral_itmamul_harakat_errors ?? '-',
          'Oral Total Score': registration.oral_total_score ?? '-',
          'Oral Assessment Status': registration.oral_assessment_status || '-',
          'Oral Assessed By': registration.oral_assessed_by || '-',
          'Oral Assessed At': formatDateTime(registration.oral_assessed_at),
          'Oral Feedback': registration.oral_feedback || '-',

          // Written Quiz Data
          'Written Quiz Score (F3)': registration.exam_score ?? '-',
          'Written Quiz Score (F1)': registration.written_quiz_score ?? '-',
          'Written Quiz Submitted At': formatDateTime(registration.written_quiz_submitted_at),

          // Commitment Data
          'Understands Commitment': registration.understands_commitment ? 'Ya' : 'Tidak',
          'Tried Simulation': registration.tried_simulation ? 'Ya' : 'Tidak',
          'No Travel Plans': registration.no_travel_plans ? 'Ya' : 'Tidak',
          'Has Telegram': registration.has_telegram ? 'Ya' : 'Tidak',
          'Saved Contact': registration.saved_contact ? 'Ya' : 'Tidak',
          'Has Permission': registration.has_permission ? 'Ya' : 'Tidak',
          'Permission Name': registration.permission_name || '-',
          'Permission Phone': registration.permission_phone || '-',
          'Motivation': registration.motivation || '-',
          'Ready for Team': registration.ready_for_team === 'ready' ? 'Ya' : (registration.ready_for_team === 'infaq' ? 'Infaq' : 'Tidak'),
          'Infaq Amount': registration.infaq_amount || '-',
          'Time Commitment': registration.time_commitment || '-',
          'Understands Program': registration.understands_program ? 'Ya' : 'Tidak',
          'Questions': registration.questions || '-',

          // Exam Data
          'Exam Juz Number': registration.exam_juz_number || '-',
          'Exam Attempt ID': registration.exam_attempt_id || '-',
          'Exam Submitted At': formatDateTime(registration.exam_submitted_at),
          'Exam Status': registration.exam_status || '-',

          // === DATA USER (from users table) ===
          'Nama Lengkap (User)': user.full_name || '-',
          'Email': user.email || '-',
          'No. WhatsApp (User)': user.whatsapp || user.phone || '-',
          'Tanggal Lahir (User)': formatDate(user.tanggal_lahir),
          'Zona Waktu (User)': user.zona_waktu || '-',
          'Roles': user.roles?.join(', ') || '-',
          'Provinsi': user.provinsi || '-',
          'Kota': user.kota || '-',
          'Alamat Lengkap': user.alamat || '-',
          'Telegram': user.telegram || '-',
          'Tempat Lahir': user.tempat_lahir || '-',
          'Pekerjaan': user.pekerjaan || '-',
          'Alasan Daftar': user.alasan_daftar || '-',
          'Jenis Kelamin': user.jenis_kelamin || '-',
          'Negara': user.negara || '-',
          'Nama Kunyah': user.nama_kunyah || '-',
        };
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths - adjusted for all new fields
      ws['!cols'] = [
        // Sequence
        { wch: 5 },   // No

        // IDs & References
        { wch: 40 },  // Submission ID
        { wch: 40 },  // User ID
        { wch: 40 },  // Registration ID
        { wch: 15 },  // Batch ID

        // Confirmed Data
        { wch: 35 },  // Nama Lengkap (Confirmed)
        { wch: 15 },  // Juz Pilihan (Confirmed)
        { wch: 20 },  // Slot Jadwal Utama (Confirmed)
        { wch: 20 },  // Slot Jadwal Cadangan (Confirmed)
        { wch: 18 },  // No. WhatsApp (Confirmed)
        { wch: 40 },  // Alamat (Confirmed)

        // Additional daftar_ulang_submissions fields
        { wch: 35 },  // Reviewed By User
        { wch: 15 },  // Pairing Status
        { wch: 40 },  // Rejection Reason
        { wch: 50 },  // Akad URL
        { wch: 30 },  // Akad File Name
        { wch: 20 },  // Batch Name
        { wch: 15 },  // Program ID
        { wch: 15 },  // Selection Status
        { wch: 20 },  // Re-enrollment Completed

        // Exam & Juz Adjustment
        { wch: 12 },  // Nilai Exam
        { wch: 10 },  // Final Juz
        { wch: 15 },  // Juz Disesuaikan
        { wch: 50 },  // Alasan Penyesuaian Juz

        // Halaqah
        { wch: 30 },  // Halaqah
        { wch: 30 },  // Jadwal Halaqah
        { wch: 25 },  // Lokasi Halaqah
        { wch: 18 },  // Tipe Kelas
        { wch: 25 },  // Muallimah

        // Partner
        { wch: 15 },  // Tipe Partner
        { wch: 35 },  // Nama Partner
        { wch: 20 },  // Hubungan Partner
        { wch: 18 },  // No. WA Partner
        { wch: 40 },  // Catatan Partner

        // Study Partner
        { wch: 35 },  // Nama Pasangan Studi
        { wch: 20 },  // Hubungan Pasangan Studi
        { wch: 40 },  // Catatan Pasangan Studi

        // Akad
        { wch: 15 },  // Akad Terupload
        { wch: 15 },  // Jumlah File Akad
        { wch: 20 },  // Tanggal Upload Akad

        // Status & Timestamps
        { wch: 18 },  // Status Daftar Ulang
        { wch: 25 },  // Tanggal Submit
        { wch: 25 },  // Tanggal Review
        { wch: 25 },  // Tanggal Dibuat
        { wch: 25 },  // Tanggal Diupdate

        // Data Pendaftaran
        { wch: 35 },  // Nama Lengkap (Pendaftaran)
        { wch: 15 },  // Juz Pilihan (Pendaftaran)
        { wch: 12 },  // Nilai Exam (Pendaftaran)
        { wch: 20 },  // Slot Jadwal Utama (Pendaftaran)
        { wch: 20 },  // Slot Jadwal Cadangan (Pendaftaran)
        { wch: 18 },  // No. WhatsApp (Pendaftaran)
        { wch: 40 },  // Alamat (Pendaftaran)
        { wch: 20 },  // Tanggal Lahir (Pendaftaran)
        { wch: 15 },  // Zona Waktu (Pendaftaran)

        // Oral Assessment Data
        { wch: 50 },  // Oral Submission URL
        { wch: 15 },  // Oral Makhraj Errors
        { wch: 15 },  // Oral Sifat Errors
        { wch: 15 },  // Oral Mad Errors
        { wch: 15 },  // Oral Ghunnah Errors
        { wch: 15 },  // Oral Harakat Errors
        { wch: 20 },  // Oral Itmamul Harakat Errors
        { wch: 15 },  // Oral Total Score
        { wch: 18 },  // Oral Assessment Status
        { wch: 35 },  // Oral Assessed By
        { wch: 25 },  // Oral Assessed At
        { wch: 50 },  // Oral Feedback

        // Written Quiz Data
        { wch: 15 },  // Written Quiz Score
        { wch: 20 },  // Written Quiz Total Questions
        { wch: 20 },  // Written Quiz Correct Answers
        { wch: 25 },  // Written Quiz Submitted At

        // Commitment Data
        { wch: 18 },  // Understands Commitment
        { wch: 15 },  // Tried Simulation
        { wch: 15 },  // No Travel Plans
        { wch: 15 },  // Has Telegram
        { wch: 15 },  // Saved Contact
        { wch: 15 },  // Has Permission
        { wch: 35 },  // Permission Name
        { wch: 18 },  // Permission Phone
        { wch: 50 },  // Motivation
        { wch: 15 },  // Ready for Team
        { wch: 20 },  // Time Commitment
        { wch: 18 },  // Understands Program
        { wch: 50 },  // Questions

        // Exam Data
        { wch: 15 },  // Exam Juz Number
        { wch: 40 },  // Exam Attempt ID
        { wch: 25 },  // Exam Submitted At
        { wch: 15 },  // Exam Status

        // Data User
        { wch: 35 },  // Nama Lengkap (User)
        { wch: 35 },  // Email
        { wch: 18 },  // No. WhatsApp (User)
        { wch: 20 },  // Tanggal Lahir (User)
        { wch: 15 },  // Zona Waktu (User)
        { wch: 20 },  // Roles
        { wch: 20 },  // Provinsi
        { wch: 20 },  // Kota
        { wch: 40 },  // Alamat Lengkap
        { wch: 18 },  // Telegram
        { wch: 20 },  // Tempat Lahir
        { wch: 25 },  // Pekerjaan
        { wch: 50 },  // Alasan Daftar
        { wch: 15 },  // Jenis Kelamin
        { wch: 20 },  // Negara
        { wch: 30 },  // Nama Kunyah
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Data Thalibah');

      // Generate filename
      const batchName = batches.find(b => b.id === localBatchId)?.name || 'all-batches';
      const fileName = `daftar-ulang-${batchName}-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download
      XLSX.writeFile(wb, fileName);
      toast.success(`Excel berhasil diunduh (${filteredData.length} thalibah dengan status approved/submitted)`);
    } catch (error) {
      console.error('[DaftarUlangTab] Error downloading Excel:', error);
      toast.error('Gagal mengunduh Excel');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Download VCF
  const downloadVCF = async () => {
    setDownloadingVCF(true);
    try {
      const data = await loadAllSubmissionsForDownload();
      
      const filteredData = data.filter(
        (item: any) => item.status === 'approved' || item.status === 'submitted'
      );

      if (filteredData.length === 0) {
        toast.error('Tidak ada data dengan status approved/submitted untuk diunduh');
        return;
      }

      // Sort data alphabetically by name
      const sortedData = [...filteredData].sort((a, b) => {
        const aName = a.confirmed_full_name || a.user?.full_name || '';
        const bName = b.confirmed_full_name || b.user?.full_name || '';
        return aName.localeCompare(bName, 'id-ID');
      });

      const toProperCase = (text: string) => {
        if (!text) return '';
        return text.toLowerCase().replace(/(^\w|\s\w|-\w|\.\w|,\s*\w)/g, (letter) => letter.toUpperCase());
      }

      const getYearFromBirthDate = (birthDate: string) => {
        if (!birthDate) return '';
        try {
          return new Date(birthDate).getFullYear().toString().slice(-2);
        } catch {
          return '';
        }
      }

      const escapeVcfField = (field: string) => {
        if (!field) return '';
        return field.toString().replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
      }

      const formatPhoneForVcf = (phone: string) => {
        if (!phone) return '';
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
          cleaned = '62' + cleaned.slice(1);
        }
        return '+' + cleaned;
      }

      // Identify batch number for filename
      const batchObj = batches.find(b => b.id === (localBatchId === 'all' && batches.length > 0 ? batches[0].id : localBatchId));
      const batchNameStr = batchObj ? batchObj.name : '';
      const batchMatch = batchNameStr.match(/Batch\s*(\d+)/i);
      const fileBatchNumber = batchMatch ? batchMatch[1] : 'All';

      const vcfLines: string[] = [];

      sortedData.forEach(item => {
        // Identify batch number for this specific item
        const itemBatchId = item.batch_id || (item.registration?.batch_id) || localBatchId;
        const itemBatchObj = batches.find(b => b.id === itemBatchId);
        const itemBatchNameStr = itemBatchObj ? itemBatchObj.name : '';
        const itemBatchMatch = itemBatchNameStr.match(/Batch\s*(\d+)/i);
        const itemBatchNumber = itemBatchMatch ? itemBatchMatch[1] : 'XX';

        const fullName = item.confirmed_full_name || item.user?.full_name || '';
        const waPhone = item.confirmed_wa_phone || item.user?.whatsapp || '';
        const birthDate = item.registration?.birth_date || '';
        const domicile = item.registration?.domicile || '';

        const birthYearYY = getYearFromBirthDate(birthDate);
        const formattedName = toProperCase(fullName);
        const formattedDomicile = toProperCase(domicile);
        
        const chosenJuz = item.confirmed_chosen_juz || item.registration?.chosen_juz || '';
        let juzStr = 'J-';
        if (chosenJuz) {
          const match = chosenJuz.match(/30A|30B|\d+/i);
          juzStr = match ? `J${match[0].toUpperCase()}` : `J${chosenJuz}`;
        }
        
        // MTI3_nama_juz_tahun lahir_kota domisili🌹
        const name = `MTI${itemBatchNumber}_${formattedName}_${juzStr}_${birthYearYY}_${formattedDomicile}🌹`;

        vcfLines.push('BEGIN:VCARD');
        vcfLines.push('VERSION:3.0');
        vcfLines.push(`FN:${escapeVcfField(name)}`);
        vcfLines.push(`N:${escapeVcfField(name)};;;;`);
        
        const phone = formatPhoneForVcf(waPhone);
        if (phone) {
          vcfLines.push(`TEL;TYPE=CELL:${phone}`);
        }
        
        vcfLines.push('END:VCARD');
      });

      const vcfContent = vcfLines.join('\n');
      const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Daftar_Ulang_MTI_Batch_${fileBatchNumber}.vcf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('File VCF berhasil diunduh');
    } catch (error) {
      console.error('Download VCF error:', error);
      toast.error('Gagal mengunduh file VCF');
    } finally {
      setDownloadingVCF(false);
    }
  };

  const downloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const data = await loadAllSubmissionsForDownload();
      if (data.length === 0) {
        toast.error('Tidak ada data untuk diunduh');
        return;
      }

      // Sort data alphabetically by name
      const sortedData = [...data].sort((a, b) => {
        const aName = a.confirmed_full_name || a.user?.full_name || '';
        const bName = b.confirmed_full_name || b.user?.full_name || '';
        return aName.localeCompare(bName, 'id-ID');
      });

      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Data Thalibah Daftar Ulang', pageWidth / 2, 15, { align: 'center' });

      // Batch info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const batchName = batches.find(b => b.id === localBatchId)?.name || 'Semua Batch';
      doc.text(`Batch: ${batchName}`, 14, 23);
      doc.text(`Total: ${sortedData.length} thalibah`, 14, 28);
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}`, pageWidth - 14, 23, { align: 'right' });

      // Group data by Juz
      const juzMap = new Map<string, any[]>();
      
      sortedData.forEach(item => {
        const registration = item.registration || {};
        const rawJuzStr = item.confirmed_chosen_juz || registration.chosen_juz || 'Tanpa Juz';
        const juzStr = getJuzCode(rawJuzStr); // Normalize juz string to code
        
        if (!juzMap.has(juzStr)) {
          juzMap.set(juzStr, []);
        }
        juzMap.get(juzStr)!.push(item);
      });
      
      // Sort Juz keys
      const sortedJuzKeys = Array.from(juzMap.keys())
        .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
        
      let yPos = 40; // start lower for the title
      
      for (const juzKey of sortedJuzKeys) {
        const items = juzMap.get(juzKey)!;
        
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = 20;
        }
        
        // Print Juz title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(34, 197, 94);
        doc.text(`${juzKey} (${items.length} thalibah)`, 14, yPos);
        yPos += 6;
        
        doc.setTextColor(0, 0, 0); // reset color
        
        const tableData = items.map((item, index) => {
          const user = item.user || {};
          const registration = item.registration || {};
          const ujianHalaqah = item.ujian_halaqah || {};
  
          return [
            index + 1,
            item.confirmed_full_name || user.full_name || '-',
            calculateAge(user.tanggal_lahir || registration.birth_date),
            getJuzCode(item.confirmed_chosen_juz),
            ujianHalaqah.name || '-',
            user.whatsapp || user.phone || '-',
            item.status === 'approved' ? 'Approved' : (item.status === 'submitted' ? 'Submitted' : item.status === 'rejected' ? 'Rejected' : 'Draft'),
          ];
        });
  
        // Generate table
        autoTable(doc, {
          startY: yPos,
          head: [['No', 'Nama', 'Usia', 'Juz Code', 'Halaqah', 'WhatsApp', 'Status']],
          body: tableData,
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [34, 197, 94],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { cellWidth: 10 },  // No
            1: { cellWidth: 60 },  // Nama
            2: { cellWidth: 15 },  // Usia
            3: { cellWidth: 20 },  // Juz Code
            4: { cellWidth: 65 },  // Halaqah
            5: { cellWidth: 35 },  // WhatsApp
            6: { cellWidth: 25 },  // Status
          },
          didDrawPage: (data: any) => {
            yPos = (data.cursor?.y ?? 50) + 10;
            // Add page number
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(0, 0, 0);
            doc.text(
              `Halaman ${doc.getNumberOfPages()}`,
              pageWidth / 2,
              pageHeight - 10,
              { align: 'center' }
            );
          },
        });
        
        yPos += 8;
      }

      // Generate filename
      const batchNameClean = batchName.replace(/\s+/g, '-');
      const fileName = `daftar-ulang-${batchNameClean}-${new Date().toISOString().split('T')[0]}.pdf`;

      doc.save(fileName);
      toast.success('PDF berhasil diunduh');
    } catch (error) {
      console.error('[DaftarUlangTab] Error downloading PDF:', error);
      toast.error('Gagal mengunduh PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Load batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  // Load juz options when batch changes
  useEffect(() => {
    loadJuzOptions();
  }, [localBatchId]);

  // Load statistics when batch changes or refresh triggers
  useEffect(() => {
    loadStats();
  }, [localBatchId, refreshTrigger]);

  // Load submissions when batch changes, page changes, or refresh triggers
  useEffect(() => {
    loadSubmissions();
  }, [localBatchId, filterSubmissionStatus, filterAkadStatus, filterHalaqahStatus, filterJuz, refreshTrigger, currentPage]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSubmissions();
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit', timeZone: 'Asia/Jakarta' });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    const labels = {
      draft: 'Draft',
      submitted: 'Submitted',
      approved: 'Approved',
      rejected: 'Rejected',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  // Sorted submissions for display
  const sortedSubmissions = useMemo(() => {
    const sorted = [...submissions].sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'name':
          const aName = a.confirmed_full_name || a.user?.full_name || '';
          const bName = b.confirmed_full_name || b.user?.full_name || '';
          compareValue = aName.localeCompare(bName);
          break;
        case 'juz':
          compareValue = (a.confirmed_chosen_juz || '').localeCompare(b.confirmed_chosen_juz || '');
          break;
        case 'halaqah':
          const aHalaqah = a.ujian_halaqah?.name || a.tashih_halaqah?.name || '';
          const bHalaqah = b.ujian_halaqah?.name || b.tashih_halaqah?.name || '';
          compareValue = aHalaqah.localeCompare(bHalaqah);
          break;
        case 'status':
          compareValue = (a.akad_status || a.status).localeCompare(b.akad_status || b.status);
          break;
        case 'submitted_at':
          const aDate = new Date(a.submitted_at || a.created_at).getTime();
          const bDate = new Date(b.submitted_at || b.created_at).getTime();
          compareValue = aDate - bDate;
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [submissions, sortField, sortOrder]);

  // Filtered submissions based on search query
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedSubmissions;
    }

    const query = searchQuery.toLowerCase();
    return sortedSubmissions.filter((submission) => {
      const name = (submission.confirmed_full_name || submission.user?.full_name || '').toLowerCase();
      const email = (submission.user?.email || '').toLowerCase();
      const whatsapp = (submission.user?.whatsapp || '').toLowerCase();

      return name.includes(query) || email.includes(query) || whatsapp.includes(query);
    });
  }, [sortedSubmissions, searchQuery]);

  // Statistics for submissions - use API stats for aggregate data
  const submissionStats = useMemo(() => {
    if (stats) {
      return {
        ...stats,
        showing: filteredSubmissions.length
      };
    }

    // Fallback to current page data if stats not loaded yet
    return {
      total: pagination?.total ?? submissions.length,
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      withHalaqah: 0,
      withAkad: 0,
      juzCount: {},
      showing: filteredSubmissions.length
    };
  }, [stats, submissions, pagination, filteredSubmissions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const getPartnerLabel = (submission: DaftarUlangSubmission) => {
    if (submission.partner_type === 'self_match' && submission.partner_user) {
      return submission.partner_user.full_name || submission.partner_user_id || '-';
    }
    if (submission.partner_type === 'family' || submission.partner_type === 'tarteel') {
      return submission.partner_name || '-';
    }
    if (submission.partner_type === 'system_match') {
      return 'System Match';
    }
    return '-';
  };

  const getWhatsAppButton = (phoneNumber?: string, name?: string) => {
    if (!phoneNumber) return null;

    const whatsappUrl = getWhatsAppUrl(
      phoneNumber, 
      name, 
      `Assalamu'alaikum ${name || 'Thalibah'},\n\nIni adalah pesan dari admin Markaz Tikrar Indonesia terkait pendaftaran ulang Program Tikrar Tahfidz MTI.\n\nJazakillahu khairan`
    );

    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-all shadow-sm"
        title={`WhatsApp ${phoneNumber}`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Chat
      </a>
    );
  };
  
  const handleResetAkad = async (submissionId: string) => {
    if (!confirm('Apakah Ukhti yakin ingin menghapus file akad dan menolak pendaftaran ini? Thalibah harus mengupload ulang akadnya.')) {
      return;
    }

    setResettingId(submissionId);
    try {
      const response = await fetch(`/api/admin/daftar-ulang/${submissionId}/reset-akad`, {
        method: 'POST'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset akad');
      }

      toast.success(result.message || 'File Akad berhasil dihapus');
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[DaftarUlangTab] Error resetting akad:', error);
      toast.error('Gagal mereset akad: ' + error.message);
    } finally {
      setResettingId(null);
    }
  };

  const handleResetHalaqah = async (submissionId: string) => {
    if (!confirm('Apakah Ukhti yakin ingin mereset pilihan halaqah untuk thalibah ini? Data halaqah akan dihapus tetapi akad dan partner akan tetap tersimpan.')) {
      return;
    }

    setResettingId(submissionId);
    try {
      const response = await fetch(`/api/admin/daftar-ulang/${submissionId}/reset-halaqah`, {
        method: 'POST'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset halaqah');
      }

      toast.success('Halaqah berhasil direset');
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[DaftarUlangTab] Error resetting halaqah:', error);
      toast.error('Gagal mereset halaqah: ' + error.message);
    } finally {
      setResettingId(null);
    }
  };

  // Handlers for V2 Components
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(finalSubmissions.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleEdit = (submission: DaftarUlangSubmission) => {
    setEditingSubmission(submission);
  };

  const handleDelete = async (submissionId: string) => {
    if (!window.confirm('Apakah Ukhti yakin ingin menghapus data daftar ulang ini secara permanen?')) return;
    
    try {
      const { error } = await createClient()
        .from('daftar_ulang_submissions')
        .delete()
        .eq('id', submissionId);
        
      if (error) throw error;
      toast.success('Data berhasil dihapus');
      loadSubmissions();
      loadStats();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghapus data: ' + err.message);
    }
  };

  const handleUpdateStatus = async (
    submissionId: string, type: 'akad' | 'partner', status: 'draft' | 'submitted' | 'approved') => {
    setResettingId(submissionId);
    try {
      const response = await fetch(`/api/admin/daftar-ulang/${submissionId}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, status })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      toast.success(`Status ${type === 'akad' ? 'Akad' : 'Pasangan/Halaqah'} berhasil diubah menjadi ${status}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[DaftarUlangTab] Error updating status:', error);
      toast.error('Gagal mengubah status: ' + error.message);
    } finally {
      setResettingId(null);
    }
  };

  const handleEditExamScore = async (submission: DaftarUlangSubmission) => {
    if (!submission.registration?.id) {
      toast.error('Registration ID tidak ditemukan.');
      return;
    }
    const currentScore = submission.registration?.exam_score ?? '';
    const newScore = window.prompt('Masukkan nilai Ujian Tulis baru (0-100):', String(currentScore));
    
    if (newScore === null) return; // Cancelled
    
    const parsedScore = parseInt(newScore, 10);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      toast.error('Nilai tidak valid. Masukkan angka 0-100.');
      return;
    }

    setResettingId(submission.registration.id);
    try {
      const response = await fetch('/api/admin/daftar-ulang/exam', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: submission.registration.id, score: parsedScore })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Nilai berhasil diubah');
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(data.error || 'Gagal mengubah nilai');
      }
    } catch (e: any) {
      toast.error('Terjadi kesalahan: ' + e.message);
    } finally {
      setResettingId(null);
    }
  };

  const handleResetExam = async (registrationId: string, targetJuz: string, resetStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/exams/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: registrationId, target_juz: targetJuz, reset_status: resetStatus }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Ujian berhasil direset!');
        loadSubmissions(); // refresh table
      } else {
        toast.error(result.error || 'Gagal mereset ujian');
      }
    } catch (error: any) {
      toast.error('Kesalahan server saat mereset ujian: ' + error.message);
    }
  };

  const handleBulkAction = async () => {
    setIsBulkProcessing(true);
    try {
      const response = await fetch('/api/admin/daftar-ulang/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionIds: Array.from(selectedIds),
          action: bulkAction,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process bulk action');
      }

      toast.success(
        `Berhasil ${bulkAction === 'approve' ? 'menyetujui' : 'menolak'} ${selectedIds.size} pendaftaran`
      );

      // Refresh data
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[DaftarUlangV2Tab] Error in bulk action:', error);
      toast.error(error.message || 'Terjadi kesalahan');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Derived final submissions
  const finalSubmissions = useMemo(() => {
    return [...filteredSubmissions].sort((a, b) => {
      // Basic sorting mapped from the v2 table
      if (sortField === 'name') {
        const aName = a.confirmed_full_name || a.user?.full_name || '';
        const bName = b.confirmed_full_name || b.user?.full_name || '';
        return sortOrder === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }
      if (sortField === 'status') {
        const aStatus = a.akad_status || a.status;
        const bStatus = b.akad_status || b.status;
        return sortOrder === 'asc' ? aStatus.localeCompare(bStatus) : bStatus.localeCompare(aStatus);
      }
      if (sortField === 'submitted_at') {
        const aDate = new Date(a.submitted_at || a.created_at).getTime();
        const bDate = new Date(b.submitted_at || b.created_at).getTime();
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
      if (sortField === 'halaqah') {
        const aHal = a.ujian_halaqah?.name || '';
        const bHal = b.ujian_halaqah?.name || '';
        return sortOrder === 'asc' ? aHal.localeCompare(bHal) : bHal.localeCompare(aHal);
      }
      if (sortField === 'score_test') {
        const aScore = a.registration?.exam_score ?? -1;
        const bScore = b.registration?.exam_score ?? -1;
        return sortOrder === 'asc' ? aScore - bScore : bScore - aScore;
      }
      if (sortField === 'pengabdian') {
        const aPeng = (a.pengabdian_type || a.pengabdian_choice || '').toLowerCase();
        const bPeng = (b.pengabdian_type || b.pengabdian_choice || '').toLowerCase();
        return sortOrder === 'asc' ? aPeng.localeCompare(bPeng) : bPeng.localeCompare(aPeng);
      }
      if (sortField === 'akad_files') {
        const aHasFile = parseAkadFiles(a.akad_files).length;
        const bHasFile = parseAkadFiles(b.akad_files).length;
        return sortOrder === 'asc' ? aHasFile - bHasFile : bHasFile - aHasFile;
      }
      if (sortField === 'partner') {
        const aPartner = a.partner_type || '';
        const bPartner = b.partner_type || '';
        return sortOrder === 'asc' ? aPartner.localeCompare(bPartner) : bPartner.localeCompare(aPartner);
      }
      if (sortField === 'partner_status') {
        const aPartnerStatus = a.partner_status || a.status || 'draft';
        const bPartnerStatus = b.partner_status || b.status || 'draft';
        return sortOrder === 'asc' ? aPartnerStatus.localeCompare(bPartnerStatus) : bPartnerStatus.localeCompare(aPartnerStatus);
      }
      if (sortField === 'partner_submitted_at') {
        const aPartnerDate = new Date(a.submitted_at || a.created_at).getTime();
        const bPartnerDate = new Date(b.submitted_at || b.created_at).getTime();
        return sortOrder === 'asc' ? aPartnerDate - bPartnerDate : bPartnerDate - aPartnerDate;
      }
      return 0;
    });
  }, [filteredSubmissions, sortField, sortOrder]);


  return (
    <div className="space-y-6 relative">
      {editingSubmission && (
        <EditDaftarUlangModal
          submission={editingSubmission}
          onClose={() => setEditingSubmission(null)}
          onSaved={() => {
            setEditingSubmission(null);
            loadSubmissions();
          }}
        />
      )}
      <DaftarUlangV2Stats 
        stats={stats as DaftarUlangStatsData}
        isLoading={statsLoading}
      />

      <DaftarUlangV2Filters 
        searchQuery={searchQuery}
        batchId={localBatchId}
        submissionStatus={filterSubmissionStatus}
        akadStatus={filterAkadStatus}
        halaqahStatus={filterHalaqahStatus}
        juz={filterJuz}
        batches={batches}
        juzOptions={juzOptions}
        onRefresh={handleRefresh}
        isLoading={loading}
        onChange={(filters) => {
          setSearchQuery(filters.search);
          setLocalBatchId(filters.batchId);
          setFilterSubmissionStatus(filters.submissionStatus);
          setFilterAkadStatus(filters.akadStatus);
          setFilterHalaqahStatus(filters.halaqahStatus);
          setFilterJuz(filters.juz);
          setCurrentPage(1);
        }}
        onDownloadExcel={downloadExcel}
        onDownloadPDF={downloadPDF}
        onDownloadVCF={downloadVCF}
        isDownloadingExcel={downloadingExcel}
        isDownloadingPDF={downloadingPDF}
        isDownloadingVCF={downloadingVCF}
      />

      <DaftarUlangV2Table 
        submissions={finalSubmissions}
        isLoading={loading}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        onViewDetail={(sub) => setSelectedSubmission(sub)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onResetHalaqah={handleResetHalaqah}
        onResetAkad={handleResetAkad}
        onUpdateStatus={handleUpdateStatus}
        onEditExamScore={handleEditExamScore}
        onResetExamScore={(sub) => setResettingExamSubmission(sub as any)}
        resettingId={resettingId}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={(field) => {
          if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
          } else {
            setSortField(field as SortField);
            setSortOrder('asc');
          }
        }}
      />

      {/* Pagination Component mapped here */}
      {!searchQuery && pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-white rounded-2xl shadow-sm">
          <div className="text-sm text-gray-500 font-medium">
            Halaman {currentPage} dari {pagination.totalPages} <span className="mx-2 text-gray-300">|</span> Total {pagination.total} data
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40 animate-in slide-in-from-bottom-8">
          <div className="flex items-center gap-2 border-r border-gray-700 pr-6">
            <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold">
              {selectedIds.size}
            </span>
            <span className="text-sm font-medium">Data Terpilih</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setBulkAction('approve');
                setShowBulkConfirm(true);
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Approve Terpilih
            </button>
            <button
              onClick={() => {
                setBulkAction('reject');
                setShowBulkConfirm(true);
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Reject Terpilih
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedSubmission && (
        <DetailModal 
          submission={selectedSubmission} 
          onClose={() => setSelectedSubmission(null)} 
          onUpdateJuz={async (submissionId, newJuz) => {
            try {
              const res = await fetch('/api/admin/daftar-ulang/update-juz', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId, newJuz })
              });
              if (!res.ok) throw new Error('Failed to update Juz');
              toast.success('Juz berhasil diubah');
              loadSubmissions();
              // Update local state for modal
              setSelectedSubmission(prev => prev ? { ...prev, confirmed_chosen_juz: newJuz } : null);
            } catch (err: any) {
              toast.error(err.message || 'Gagal mengubah Juz');
            }
          }}
        />
      )}

      <BulkConfirmModal 
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleBulkAction}
        action={bulkAction}
        count={selectedIds.size}
        isProcessing={isBulkProcessing}
      />

      {resettingExamSubmission && (
        <ResetExamModal
          submission={resettingExamSubmission}
          onClose={() => setResettingExamSubmission(null)}
          onConfirm={handleResetExam}
        />
      )}
    </div>
  );
}
