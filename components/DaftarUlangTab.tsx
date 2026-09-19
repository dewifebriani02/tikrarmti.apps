'use client';

import { useState, useEffect, useMemo } from 'react';
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
  MessageSquare
} from 'lucide-react';
import { DaftarUlangHalaqahTab } from './DaftarUlangHalaqahTab';
import { getWhatsAppUrl } from '@/lib/utils/whatsapp';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DaftarUlangSubTab = 'submissions' | 'halaqah' | 'per_juz';

type SortField = 'name' | 'juz' | 'halaqah' | 'status' | 'submitted_at';
type SortOrder = 'asc' | 'desc';

interface DaftarUlangSubmission {
  id: string;
  user_id: string;
  batch_id: string;
  registration_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';

  // Confirmed data
  confirmed_full_name?: string;
  confirmed_chosen_juz?: string;
  confirmed_main_time_slot?: string;
  confirmed_backup_time_slot?: string;

  // Partner
  partner_type?: 'self_match' | 'system_match' | 'family' | 'tarteel';
  partner_user_id?: string;
  partner_name?: string;
  partner_relationship?: string;
  partner_wa_phone?: string;
  partner_notes?: string;

  // Halaqah
  ujian_halaqah_id?: string;
  tashih_halaqah_id?: string;
  is_tashih_umum?: boolean;

  // Akad
  akad_files?: Array<{ url: string; name: string }>;
  akad_submitted_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;

  // Relations
  user?: {
    id: string;
    full_name: string;
    email: string;
    whatsapp?: string;
  };
  partner_user?: {
    id: string;
    full_name: string;
    email: string;
    whatsapp?: string;
  };
  ujian_halaqah?: {
    id: string;
    name: string;
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
  };
  tashih_halaqah?: {
    id: string;
    name: string;
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
  };
  registration?: {
    final_juz?: string;
  };
}

interface Batch {
  id: string;
  name: string;
}

interface DaftarUlangTabProps {
  batchId?: string;
}

export function DaftarUlangTab({ batchId: initialBatchId }: DaftarUlangTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<DaftarUlangSubTab>('submissions');
  const [submissions, setSubmissions] = useState<DaftarUlangSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<DaftarUlangSubmission | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sortField, setSortField] = useState<SortField>('submitted_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);

  // Download state
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
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

  // Local batch filter state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [localBatchId, setLocalBatchId] = useState<string>(initialBatchId || 'all');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Per Juz state
  const [juzGroups, setJuzGroups] = useState<Record<string, any[]>>({});
  const [juzGroupsLoading, setJuzGroupsLoading] = useState(true);
  const [juzSortField, setJuzSortField] = useState<'name' | 'status' | 'halaqah' | 'partner' | 'submitted_at'>('name');
  const [juzSortOrder, setJuzSortOrder] = useState<'asc' | 'desc'>('asc');

  // Export contacts state
  const [exportingContacts, setExportingContacts] = useState(false);
  const [exportCategory, setExportCategory] = useState<'tikrar' | 'pra_tikrar'>('tikrar');
  const [exportFormat, setExportFormat] = useState<'csv' | 'vcf'>('csv');
  const [exportBatchId, setExportBatchId] = useState<string>('all');

  const loadBatches = async () => {
    try {
      const response = await fetch('/api/batch');
      const result = await response.json();
      if (result.success && result.data) {
        setBatches(result.data);
        // If no initial batchId, set to the latest batch
        if (!initialBatchId && result.data.length > 0) {
          setLocalBatchId(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('[DaftarUlangTab] Error loading batches:', error);
    }
  };

  const loadStats = async () => {
    console.log('[DaftarUlangTab] Loading statistics...');
    setStatsLoading(true);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (localBatchId && localBatchId !== 'all') params.append('batch_id', localBatchId);

      const response = await fetch(`/api/admin/daftar-ulang/stats?${params.toString()}`);
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
      console.error('[DaftarUlangTab] Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadSubmissions = async () => {
    console.log('[DaftarUlangTab] Loading submissions...');
    setLoading(true);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (localBatchId && localBatchId !== 'all') params.append('batch_id', localBatchId);

      // If searching, load all data. Otherwise use pagination.
      if (searchQuery.trim()) {
        params.append('limit', '10000'); // Load all data for search
      } else {
        params.append('page', currentPage.toString());
        params.append('limit', '50');
      }

      const response = await fetch(`/api/admin/daftar-ulang?${params.toString()}`);
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
      console.error('[DaftarUlangTab] Error loading submissions:', error);
      toast.error('Failed to load submissions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadJuzGroups = async () => {
    console.log('[DaftarUlangTab] Loading juz groups...');
    setJuzGroupsLoading(true);

    try {
      const params = new URLSearchParams();
      if (localBatchId && localBatchId !== 'all') params.append('batch_id', localBatchId);
      params.append('limit', '10000'); // Get all data for grouping

      const response = await fetch(`/api/admin/daftar-ulang?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        console.error('[DaftarUlangTab] Failed to load submissions for juz grouping:', result);
        return;
      }

      const allSubmissions = result.data || [];

      // Group by juz
      const groups: Record<string, any[]> = {};
      allSubmissions.forEach((sub: any) => {
        const juz = sub.confirmed_chosen_juz || sub.registration?.chosen_juz || 'Unknown';
        if (!groups[juz]) {
          groups[juz] = [];
        }
        groups[juz].push(sub);
      });

      console.log('[DaftarUlangTab] Loaded juz groups:', Object.keys(groups).length, 'juz');
      setJuzGroups(groups);
    } catch (error: any) {
      console.error('[DaftarUlangTab] Error loading juz groups:', error);
      toast.error('Failed to load juz groups: ' + error.message);
    } finally {
      setJuzGroupsLoading(false);
    }
  };

  // Load all submissions for download (with complete data from pendaftaran_tikrar_tahfidz)
  const loadAllSubmissionsForDownload = async () => {
    console.log('[DaftarUlangTab] Loading all submissions for download...');
    try {
      const params = new URLSearchParams();
      if (localBatchId && localBatchId !== 'all') params.append('batch_id', localBatchId);
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
          'Juz Pilihan Akhir (Final Juz)': registration.final_juz || '-',
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
          'Halaqah Ujian': ujianHalaqah.name || '-',
          'Jadwal Halaqah Ujian': formatHalaqahSchedule(ujianHalaqah),
          'Lokasi Halaqah Ujian': ujianHalaqah.location || '-',
          'Tipe Kelas Ujian': ujianHalaqah.class_type || '-',
          'Muallimah Ujian': ujianHalaqah.muallimah_name || '-',

          'Halaqah Tashih': item.is_tashih_umum ? 'Umum' : (tashihHalaqah.name || '-'),
          'Jadwal Halaqah Tashih': item.is_tashih_umum ? 'Umum' : formatHalaqahSchedule(tashihHalaqah),
          'Lokasi Halaqah Tashih': item.is_tashih_umum ? '-' : (tashihHalaqah.location || '-'),
          'Tipe Kelas Tashih': item.is_tashih_umum ? '-' : (tashihHalaqah.class_type || '-'),
          'Muallimah Tashih': item.is_tashih_umum ? '-' : (tashihHalaqah.muallimah_name || '-'),

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
          'Written Quiz Score': registration.written_quiz_score ?? '-',
          'Written Quiz Total Questions': registration.written_quiz_total_questions ?? '-',
          'Written Quiz Correct Answers': registration.written_quiz_correct_answers ?? '-',
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
        { wch: 15 },  // Juz Pilihan Akhir (Final Juz)
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

        // Halaqah Ujian
        { wch: 30 },  // Halaqah Ujian
        { wch: 30 },  // Jadwal Halaqah Ujian
        { wch: 25 },  // Lokasi Halaqah Ujian
        { wch: 18 },  // Tipe Kelas Ujian
        { wch: 25 },  // Muallimah Ujian

        // Halaqah Tashih
        { wch: 30 },  // Halaqah Tashih
        { wch: 30 },  // Jadwal Halaqah Tashih
        { wch: 25 },  // Lokasi Halaqah Tashih
        { wch: 18 },  // Tipe Kelas Tashih
        { wch: 25 },  // Muallimah Tashih

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

  // Download PDF
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

      // Table data
      const tableData = sortedData.map((item, index) => {
        const user = item.user || {};
        const registration = item.registration || {};
        const ujianHalaqah = item.ujian_halaqah || {};
        const tashihHalaqah = item.tashih_halaqah || {};
        const tashihName = item.is_tashih_umum ? 'Umum' : (tashihHalaqah.name || '-');

        return [
          index + 1,
          item.confirmed_full_name || user.full_name || '-',
          calculateAge(user.tanggal_lahir || registration.birth_date),
          getJuzCode(item.confirmed_chosen_juz),
          item.confirmed_chosen_juz || registration.chosen_juz || '-',
          ujianHalaqah.name || '-',
          tashihName,
          user.whatsapp || user.phone || '-',
        ];
      });

      // Generate table
      autoTable(doc, {
        startY: 35,
        head: [['No', 'Nama', 'Usia', 'Juz Code', 'Juz', 'Halaqah Ujian', 'Halaqah Tashih', 'WhatsApp']],
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
          1: { cellWidth: 45 },  // Nama
          2: { cellWidth: 10 },  // Usia
          3: { cellWidth: 15 },  // Juz Code
          4: { cellWidth: 20 },  // Juz
          5: { cellWidth: 40 },  // Halaqah Ujian
          6: { cellWidth: 40 },  // Halaqah Tashih
          7: { cellWidth: 35 },  // WhatsApp
        },
        didDrawPage: (data) => {
          // Add page number
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.text(
            `Halaman ${doc.getNumberOfPages()}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        },
      });

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

  // Export contacts handler
  const handleExportContacts = async () => {
    setExportingContacts(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (exportBatchId && exportBatchId !== 'all') {
        params.append('batch_id', exportBatchId);
      }
      params.append('format', exportFormat);
      params.append('category', exportCategory);

      const response = await fetch(`/api/admin/export-contacts?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to export contacts');
        return;
      }

      // Get the content (CSV or VCF)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = exportFormat === 'vcf' ? 'vcf' : 'csv';
      const categorySuffix = exportCategory === 'tikrar' ? '-tikrar' : '-pra-tikrar';
      const batchName = exportBatchId && exportBatchId !== 'all' ? `-${exportBatchId}` : '';
      a.download = `mti-contacts${categorySuffix}${batchName}-${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const formatName = exportFormat === 'vcf' ? 'VCF' : 'CSV';
      const categoryName = exportCategory === 'tikrar' ? 'Tikrar (MTIA)' : 'Pra Tikrar (MTIPRA)';
      const importMessage = exportFormat === 'vcf'
        ? `${categoryName} VCF downloaded! You can import this file directly to Google Contacts.`
        : `${categoryName} CSV downloaded! Open Gmail Contacts to import.`;
      toast.success(importMessage);
    } catch (error) {
      console.error('[DaftarUlangTab] Export error:', error);
      toast.error('Failed to export contacts');
    } finally {
      setExportingContacts(false);
    }
  };

  // Load batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  // Load statistics when batch changes or refresh triggers
  useEffect(() => {
    loadStats();
  }, [localBatchId, refreshTrigger]);

  // Load submissions when batch changes, page changes, or refresh triggers
  useEffect(() => {
    if (activeSubTab === 'submissions') {
      loadSubmissions();
    }
  }, [localBatchId, refreshTrigger, currentPage, activeSubTab]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeSubTab === 'submissions') {
        loadSubmissions();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load juz groups when batch changes or refresh triggers
  useEffect(() => {
    if (activeSubTab === 'per_juz') {
      loadJuzGroups();
    }
  }, [localBatchId, refreshTrigger, activeSubTab]);

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

  // Sort juz submissions
  const sortJuzSubmissions = (submissions: any[], field: typeof juzSortField, order: typeof juzSortOrder) => {
    return [...submissions].sort((a, b) => {
      let compareValue = 0;

      switch (field) {
        case 'name':
          const aName = a.confirmed_full_name || a.user?.full_name || '';
          const bName = b.confirmed_full_name || b.user?.full_name || '';
          compareValue = aName.localeCompare(bName, 'id-ID');
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
        case 'halaqah':
          const aHalaqah = a.ujian_halaqah?.name || a.tashih_halaqah?.name || (a.is_tashih_umum ? 'Umum' : '') || 'zzz';
          const bHalaqah = b.ujian_halaqah?.name || b.tashih_halaqah?.name || (b.is_tashih_umum ? 'Umum' : '') || 'zzz';
          compareValue = aHalaqah.localeCompare(bHalaqah);
          break;
        case 'partner':
          const aPartner = a.partner_name || a.partner_user?.full_name || 'zzz';
          const bPartner = b.partner_name || b.partner_user?.full_name || 'zzz';
          compareValue = aPartner.localeCompare(bPartner);
          break;
        case 'submitted_at':
          const aDate = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
          const bDate = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
          compareValue = aDate - bDate;
          break;
        default:
          compareValue = 0;
      }

      return order === 'asc' ? compareValue : -compareValue;
    });
  };

  const handleJuzSort = (field: typeof juzSortField) => {
    if (juzSortField === field) {
      setJuzSortOrder(juzSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setJuzSortField(field);
      setJuzSortOrder('asc');
    }
  };

  const getJuzSortIcon = (field: typeof juzSortField) => {
    if (juzSortField !== field) return null;
    return juzSortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1" />
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
          compareValue = a.status.localeCompare(b.status);
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


  return (
    <div className="space-y-4">
      {/* Header & Sub-tabs */}
      <div className="space-y-4">
        {/* Batch Filter & Search */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <label className="text-sm font-bold text-gray-700">Filter by Batch:</label>
          <select
            value={localBatchId}
            onChange={(e) => {
              setLocalBatchId(e.target.value);
              setCurrentPage(1); // Reset to page 1 when batch changes
              setSearchQuery(''); // Clear search when batch changes
            }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-green-950 focus:border-green-950 font-semibold text-gray-700 bg-white"
          >
            <option value="all">All Batches</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
          {localBatchId !== 'all' && (
            <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              Showing: {batches.find(b => b.id === localBatchId)?.name}
            </span>
          )}

          {/* Search Input - Only show on submissions tab */}
          {activeSubTab === 'submissions' && (
            <div className="ml-auto relative w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to page 1 when search changes
                }}
                placeholder="Cari nama, email, atau WhatsApp..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-green-950 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Export Contacts Section */}
        <div className="flex flex-wrap items-end gap-4 bg-blue-50/50 p-5 rounded-2xl border border-blue-100/60 shadow-sm">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-blue-800 mb-1.5">Kategori</label>
            <select
              value={exportCategory}
              onChange={(e) => setExportCategory(e.target.value as 'tikrar' | 'pra_tikrar')}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-blue-950 focus:border-blue-950 font-semibold text-gray-700 bg-white"
            >
              <option value="tikrar">Tikrar (MTIA)</option>
              <option value="pra_tikrar">Pra Tikrar (MTIPRA)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-blue-800 mb-1.5">Export Batch</label>
            <select
              value={exportBatchId}
              onChange={(e) => setExportBatchId(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-blue-950 focus:border-blue-950 font-semibold text-gray-700 bg-white"
            >
              <option value="all">All Batches</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-blue-800 mb-1.5">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'vcf')}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-blue-950 focus:border-blue-950 font-semibold text-gray-700 bg-white"
            >
              <option value="csv">CSV (Gmail Import)</option>
              <option value="vcf">VCF (Google Contacts)</option>
            </select>
          </div>
          <button
            onClick={handleExportContacts}
            disabled={exportingContacts}
            className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 duration-200 shadow-blue-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingContacts ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Export Contacts
              </>
            )}
          </button>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Daftar Ulang</h2>
          <div className="flex gap-2">
            {activeSubTab === 'submissions' && (
              <>
                <button
                  onClick={downloadExcel}
                  disabled={downloadingExcel}
                  className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all active:scale-95 duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {downloadingExcel ? 'Downloading...' : 'Excel'}
                </button>
                <button
                  onClick={downloadPDF}
                  disabled={downloadingPDF}
                  className="px-4 py-2 border border-rose-600 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50 transition-all active:scale-95 duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                  {downloadingPDF ? 'Downloading...' : 'PDF'}
                </button>
              </>
            )}
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 duration-200 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="mb-4 overflow-x-auto pb-1.5 scrollbar-hide">
          <nav className="flex gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-max" aria-label="Sub-tabs">
            <button
              onClick={() => setActiveSubTab('submissions')}
              className={cn(
                "flex items-center gap-2 py-2.5 px-5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300",
                activeSubTab === 'submissions'
                  ? "bg-white text-green-900 shadow-sm border border-green-900/10"
                  : "text-gray-500 hover:text-green-800 hover:bg-white/50"
              )}
            >
              <List className="w-4 h-4" />
              Submissions
            </button>
            <button
              onClick={() => setActiveSubTab('halaqah')}
              className={cn(
                "flex items-center gap-2 py-2.5 px-5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300",
                activeSubTab === 'halaqah'
                  ? "bg-white text-green-900 shadow-sm border border-green-900/10"
                  : "text-gray-500 hover:text-green-800 hover:bg-white/50"
              )}
            >
              <FolderTree className="w-4 h-4" />
              Per Halaqah
            </button>
            <button
              onClick={() => setActiveSubTab('per_juz')}
              className={cn(
                "flex items-center gap-2 py-2.5 px-5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300",
                activeSubTab === 'per_juz'
                  ? "bg-white text-green-900 shadow-sm border border-green-900/10"
                  : "text-gray-500 hover:text-green-800 hover:bg-white/50"
              )}
            >
              <BookOpen className="w-4 h-4" />
              Per Juz
            </button>
          </nav>
        </div>
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'halaqah' ? (
        <DaftarUlangHalaqahTab batchId={localBatchId} />
      ) : activeSubTab === 'per_juz' ? (
        <>
          {/* Per Juz View */}
          {juzGroupsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : Object.keys(juzGroups).length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Belum ada data per juz</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(juzGroups)
                .sort(([a], [b]) => {
                  const aNum = parseInt(a.replace(/\D/g, '')) || 999;
                  const bNum = parseInt(b.replace(/\D/g, '')) || 999;
                  return aNum - bNum;
                })
                .map(([juz, submissions]) => {
                  const draftCount = submissions.filter((s: any) => s.status === 'draft').length;
                  const submittedCount = submissions.filter((s: any) => s.status === 'submitted').length;
                  const approvedCount = submissions.filter((s: any) => s.status === 'approved').length;
                  const rejectedCount = submissions.filter((s: any) => s.status === 'rejected').length;
                  const withHalaqah = submissions.filter((s: any) => s.ujian_halaqah_id || s.tashih_halaqah_id).length;

                  return (
                    <div key={juz} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      {/* Juz Header */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-green-600" />
                            <h3 className="text-lg font-semibold text-gray-900">{juz}</h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">Total: {submissions.length}</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-blue-600">Submitted: {submittedCount}</span>
                            <span className="text-green-600">Approved: {approvedCount}</span>
                            <span className="text-purple-600">Dengan Halaqah: {withHalaqah}</span>
                          </div>
                        </div>
                      </div>

                      {/* Submissions Table for this Juz */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleJuzSort('name')}
                              >
                                <div className="flex items-center gap-1">
                                  Nama
                                  {getJuzSortIcon('name')}
                                </div>
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleJuzSort('status')}
                              >
                                <div className="flex items-center gap-1">
                                  Status
                                  {getJuzSortIcon('status')}
                                </div>
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleJuzSort('halaqah')}
                              >
                                <div className="flex items-center gap-1">
                                  Halaqah
                                  {getJuzSortIcon('halaqah')}
                                </div>
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleJuzSort('partner')}
                              >
                                <div className="flex items-center gap-1">
                                  Partner
                                  {getJuzSortIcon('partner')}
                                </div>
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleJuzSort('submitted_at')}
                              >
                                <div className="flex items-center gap-1">
                                  Submit Date
                                  {getJuzSortIcon('submitted_at')}
                                </div>
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {sortJuzSubmissions(submissions, juzSortField, juzSortOrder).map((submission: any) => {
                              const user = submission.user || {};
                              const ujianHalaqah = submission.ujian_halaqah || {};
                              const tashihHalaqah = submission.tashih_halaqah || {};
                              const whatsapp = user.whatsapp || user.phone || '-';

                              return (
                                <tr key={submission.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-gray-900">
                                      {submission.confirmed_full_name || user.full_name || '-'}
                                    </div>
                                    <div className="text-xs text-gray-500">{user.email || '-'}</div>
                                  </td>
                                   <td className="px-4 py-3">
                                    {getWhatsAppButton(whatsapp, submission.confirmed_full_name || user.full_name)}
                                   </td>
                                  <td className="px-4 py-3">
                                    {getStatusBadge(submission.status)}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <div className="space-y-1">
                                      {ujianHalaqah.name && (
                                        <div className="text-gray-900">
                                          <span className="text-xs text-gray-500">Ujian:</span> {ujianHalaqah.name}
                                        </div>
                                      )}
                                      {tashihHalaqah.name && (
                                        <div className="text-gray-900">
                                          <span className="text-xs text-gray-500">Tashih:</span> {tashihHalaqah.name}
                                        </div>
                                      )}
                                      {submission.is_tashih_umum && (
                                        <div className="text-gray-900">
                                          <span className="text-xs text-gray-500">Tashih:</span> Umum
                                        </div>
                                      )}
                                      {!ujianHalaqah.name && !tashihHalaqah.name && !submission.is_tashih_umum && (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {submission.partner_name || submission.partner_user?.full_name || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-500">
                                    {formatDate(submission.submitted_at || '')}
                                  </td>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => setSelectedSubmission(submission)}
                                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 mb-6">
            {/* Total */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors">Total</p>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {statsLoading ? '-' : submissionStats.total}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl text-white bg-blue-500 shadow-lg shadow-blue-200 transition-transform duration-300 group-hover:scale-110">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>

            {/* Draft */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors">Draft</p>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {statsLoading ? '-' : submissionStats.draft}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl text-white bg-gray-500 shadow-lg shadow-gray-200 transition-transform duration-300 group-hover:scale-110">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>

            {/* Submitted */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors">Submit</p>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {statsLoading ? '-' : submissionStats.submitted}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl text-white bg-indigo-500 shadow-lg shadow-indigo-200 transition-transform duration-300 group-hover:scale-110">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>

            {/* Approved */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors">Approve</p>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {statsLoading ? '-' : submissionStats.approved}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl text-white bg-emerald-500 shadow-lg shadow-emerald-200 transition-transform duration-300 group-hover:scale-110">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>

            {/* Rejected */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors">Reject</p>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {statsLoading ? '-' : submissionStats.rejected}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl text-white bg-red-500 shadow-lg shadow-red-200 transition-transform duration-300 group-hover:scale-110">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>

            {/* Dengan Halaqah */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors">Halaqah</p>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {statsLoading ? '-' : submissionStats.withHalaqah}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl text-white bg-purple-500 shadow-lg shadow-purple-200 transition-transform duration-300 group-hover:scale-110">
                <FolderTree className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>

            {/* Dengan Akad */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors">Akad</p>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {statsLoading ? '-' : submissionStats.withAkad}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl text-white bg-amber-500 shadow-lg shadow-amber-200 transition-transform duration-300 group-hover:scale-110">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>

            {/* Per Juz */}
            <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm col-span-2 md:col-span-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Per Juz</p>
              <div className="text-[10px] font-bold space-y-0.5 max-h-[48px] overflow-y-auto scrollbar-thin">
                {statsLoading ? (
                  <p className="text-gray-400">Loading...</p>
                ) : Object.keys(submissionStats.juzCount).length > 0 ? (
                  Object.entries(submissionStats.juzCount).sort(([a], [b]) => a.localeCompare(b)).map(([juz, count]) => (
                    <div key={juz} className="flex justify-between border-b border-gray-50 pb-0.5 last:border-0 text-gray-600">
                      <span>Juz {juz}:</span>
                      <span className="font-extrabold text-gray-900">{count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No data</p>
                )}
              </div>
            </div>
          </div>

          {/* Submissions List View */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery ? 'Tidak ada submission yang cocok dengan pencarian' : 'No submissions found'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
              <thead>
                <tr>
                  <th
                    className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Thalibah
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">
                    Partner
                  </th>
                  <th
                    className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                    onClick={() => handleSort('halaqah')}
                  >
                    <div className="flex items-center gap-1">
                      Halaqah
                      {getSortIcon('halaqah')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">
                    Akad Files
                  </th>
                  <th
                    className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                    onClick={() => handleSort('submitted_at')}
                  >
                    <div className="flex items-center gap-1">
                      Submitted
                      {getSortIcon('submitted_at')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">
                    WhatsApp
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {submission.confirmed_full_name || submission.user?.full_name || '-'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {submission.confirmed_chosen_juz || '-'} | {submission.confirmed_main_time_slot || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {getPartnerLabel(submission)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {submission.partner_type || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-900 space-y-0.5">
                        <div>Ujian: {submission.ujian_halaqah?.name || (submission.is_tashih_umum ? '-' : 'Not selected')}</div>
                        <div>Tashih: {submission.is_tashih_umum ? 'Umum' : (submission.tashih_halaqah?.name || 'Not selected')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const files = parseAkadFiles(submission.akad_files);
                        return files.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {files.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <FileText className="w-3 h-3" />
                                {file.name || `File ${idx + 1}`}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No files</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(submission.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500">
                        {formatDate(submission.submitted_at || submission.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getWhatsAppButton(
                        submission.user?.whatsapp,
                        submission.confirmed_full_name || submission.user?.full_name
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs flex items-center gap-1.5 transition-colors border border-blue-100"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                          Detail
                        </button>
                        {submission.status === 'draft' && (submission.ujian_halaqah_id || submission.tashih_halaqah_id) && (
                          <button
                            onClick={() => handleResetHalaqah(submission.id)}
                            disabled={resettingId === submission.id}
                            className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium text-xs flex items-center gap-1.5 transition-colors border border-orange-100"
                            title="Reset halaqah selection"
                          >
                            {resettingId === submission.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                            Reset
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>

              {/* Pagination */}
              {!searchQuery && pagination && pagination.totalPages > 1 ? (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                  <div className="text-xs font-semibold text-gray-500">
                    Menampilkan {submissionStats.showing} dari {pagination.total} submissions
                    (Halaman {currentPage} dari {pagination.totalPages})
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Pertama
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Prev
                    </button>
                    <span className="px-3 py-1.5 text-xs font-extrabold text-gray-700 bg-gray-50 border border-gray-100 rounded-lg">
                      {currentPage} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(pagination.totalPages)}
                      disabled={currentPage === pagination.totalPages}
                      className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Terakhir
                    </button>
                  </div>
                </div>
              ) : searchQuery && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                  <div className="text-xs font-semibold text-gray-500">
                    Menampilkan {filteredSubmissions.length} hasil pencarian dari seluruh data
                  </div>
                </div>
              )}
              </>
            )}
          </div>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-gray-900">Submission Details</h3>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Thalibah Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Thalibah Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-sm font-medium">{selectedSubmission.confirmed_full_name || selectedSubmission.user?.full_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm">{selectedSubmission.user?.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Juz Pilihan</p>
                      <p className="text-sm font-medium">
                        {selectedSubmission.confirmed_chosen_juz || '-'} 
                        {selectedSubmission.registration?.final_juz ? ` (Turun ke: ${selectedSubmission.registration.final_juz})` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Time Slot</p>
                      <p className="text-sm">{selectedSubmission.confirmed_main_time_slot || '-'} {selectedSubmission.confirmed_backup_time_slot ? `(${selectedSubmission.confirmed_backup_time_slot})` : ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Partner Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Partner Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Partner Type</p>
                      <p className="text-sm font-medium">{selectedSubmission.partner_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Partner Name</p>
                      <p className="text-sm">
                        {selectedSubmission.partner_type === 'self_match' && selectedSubmission.partner_user
                          ? selectedSubmission.partner_user.full_name
                          : selectedSubmission.partner_name || '-'}
                      </p>
                    </div>
                    {selectedSubmission.partner_relationship && (
                      <div>
                        <p className="text-xs text-gray-500">Relationship</p>
                        <p className="text-sm">{selectedSubmission.partner_relationship}</p>
                      </div>
                    )}
                    {selectedSubmission.partner_wa_phone && (
                      <div>
                        <p className="text-xs text-gray-500">WhatsApp</p>
                        <p className="text-sm">{selectedSubmission.partner_wa_phone}</p>
                      </div>
                    )}
                  </div>
                  {selectedSubmission.partner_notes && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="text-sm">{selectedSubmission.partner_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Halaqah Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Halaqah Selection</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Ujian Halaqah</p>
                    <p className="text-sm font-medium">
                      {selectedSubmission.ujian_halaqah?.name || (selectedSubmission.is_tashih_umum ? '-' : 'Not selected')}
                    </p>
                    {selectedSubmission.ujian_halaqah && (
                      <p className="text-xs text-gray-500">
                        {selectedSubmission.ujian_halaqah.day_of_week !== undefined && `Day ${selectedSubmission.ujian_halaqah.day_of_week}, `}
                        {selectedSubmission.ujian_halaqah.start_time} - {selectedSubmission.ujian_halaqah.end_time}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tashih Halaqah</p>
                    <p className="text-sm font-medium">
                      {selectedSubmission.is_tashih_umum
                        ? 'Kelas Tashih Umum'
                        : (selectedSubmission.tashih_halaqah?.name || 'Not selected')}
                    </p>
                    {selectedSubmission.tashih_halaqah && (
                      <p className="text-xs text-gray-500">
                        {selectedSubmission.tashih_halaqah.day_of_week !== undefined && `Day ${selectedSubmission.tashih_halaqah.day_of_week}, `}
                        {selectedSubmission.tashih_halaqah.start_time} - {selectedSubmission.tashih_halaqah.end_time}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Akad Files */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Akad Files</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {(() => {
                    const files = parseAkadFiles(selectedSubmission.akad_files);
                    return files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-white rounded border hover:border-blue-300 transition-colors"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-sm flex-1">{file.name || `File ${idx + 1}`}</span>
                            <Download className="w-4 h-4 text-gray-400" />
                          </a>
                        ))}
                        <p className="text-xs text-gray-500 mt-2">
                          Submitted: {formatDate(selectedSubmission.akad_submitted_at || '')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No files uploaded</p>
                    );
                  })()}
                </div>
              </div>

              {/* Status */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Status & Timestamps</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedSubmission.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p>{formatDate(selectedSubmission.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Updated</p>
                      <p>{formatDate(selectedSubmission.updated_at)}</p>
                    </div>
                    {selectedSubmission.submitted_at && (
                      <div>
                        <p className="text-gray-500">Submitted</p>
                        <p>{formatDate(selectedSubmission.submitted_at)}</p>
                      </div>
                    )}
                    {selectedSubmission.reviewed_at && (
                      <div>
                        <p className="text-gray-500">Reviewed</p>
                        <p>{formatDate(selectedSubmission.reviewed_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
