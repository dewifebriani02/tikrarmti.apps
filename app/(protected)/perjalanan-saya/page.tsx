'use client';

import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useMyRegistrations, useAllRegistrations } from '@/hooks/useRegistrations';
import { useActiveBatch } from '@/hooks/useBatches';
import { useDashboardStats, useLearningJourney, useUserProgress, useJurnalStatus } from '@/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { CheckCircle, AlertCircle, BookOpen, Award, Target, Calendar, TrendingUp, Edit, Clock, Phone, MapPin, Ban, Info, RotateCcw, FileText, HeartHandshake, Star, Sparkles, User, BadgeCheck, Zap, Eye, Play, FileCheck, Lock, Circle, Heart, AppWindow, Users } from 'lucide-react';
import { SWRLoadingFallback, SWRErrorFallback } from '@/lib/swr/providers';
import { ReviewSubmissionModal } from '@/components/ReviewSubmissionModal';
import { FinalExamPortalModal } from '@/components/dashboard/FinalExamPortalModal';
import { Pendaftaran } from '@/types/database';
import { ExamEligibility } from '@/types/exam';
import { TimelineItem, TimelineItemWithStatus } from '@/components/TimelineMilestone';
import { useBatchTimeline } from '@/hooks/useBatchTimeline';
import { formatFullDateIndo, formatDateIndo, getDayNameIndo, toHijri } from '@/lib/utils/date-helpers';
import { getRoleRank, ROLE_RANKS, isStaff } from '@/lib/roles';
import { cn } from '@/lib/utils';

// Extended type for tikrar registration with all fields from pendaftaran_tikrar_tahfidz table
interface TikrarRegistration extends Pendaftaran {
  chosen_juz?: string;
  main_time_slot?: string;
  backup_time_slot?: string;
  full_name?: string;
  wa_phone?: string;
  address?: string;
  motivation?: string;
  oral_submission_url?: string;
  oral_submitted_at?: string;
  oral_score?: number;
  oral_assessment_status?: string;
  exam_score?: number;
  written_quiz_submitted_at?: string;
  selection_status?: 'pending' | 'selected' | 'not_selected' | 'waitlist';
  final_juz?: string;
  oral_total_score?: number;
  needs_revision?: boolean;
  // daftar_ulang is now inherited from Pendaftaran interface
}

// Pairing data interface
interface PairingData {
  submission_id?: string;
  current_user: {
    id: string;
    full_name: string;
    email: string;
    zona_waktu: string;
    whatsapp: string | null;
    tanggal_lahir: string | null;
    chosen_juz: string;
    main_time_slot: string;
    backup_time_slot: string;
  };
  pairing: {
    id: string;
    pairing_type: string;
    paired_at: string;
    is_group_of_3: boolean;
    user_role: 'user_1' | 'user_2' | 'user_3' | null;
  };
  user_1: {
    id: string;
    full_name: string;
    email: string;
    zona_waktu: string;
    whatsapp: string | null;
    tanggal_lahir: string | null;
    chosen_juz: string;
    main_time_slot: string;
    backup_time_slot: string;
  };
  user_2: {
    id: string;
    full_name: string;
    email: string;
    zona_waktu: string;
    whatsapp: string | null;
    tanggal_lahir: string | null;
    chosen_juz: string;
    main_time_slot: string;
    backup_time_slot: string;
  };
  user_3: {
    id: string;
    full_name: string;
    email: string;
    zona_waktu: string;
    whatsapp: string | null;
    tanggal_lahir: string | null;
    chosen_juz: string;
    main_time_slot: string;
    backup_time_slot: string;
  } | null;
  partner_details?: {
    partner_name: string | null;
    partner_relationship: string | null;
    partner_notes: string | null;
    partner_wa_phone: string | null;
    is_mutual_match?: boolean;
    partner_type?: string;
    partner_user_id?: string;
  } | null;
}

// Helper functions for formatting
const getJuzLabel = (juz: string | undefined | null) => {
  if (!juz) return '-';
  const cleanJuz = juz.toUpperCase();
  if (cleanJuz.endsWith('A') || cleanJuz.endsWith('B')) {
    return `Juz ${cleanJuz.slice(0, -1)} (Bagian ${cleanJuz.slice(-1)})`;
  }
  return `Juz ${cleanJuz}`;
};

const getDayNameFromNumber = (dayNum: number | string | undefined | null) => {
  if (dayNum === undefined || dayNum === null) return '-';
  const num = typeof dayNum === 'string' ? parseInt(dayNum) : dayNum;
  const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[num] || '-';
};

export default function PerjalananSaya() {
  const { user, isLoading: authLoading, isAuthenticated, isUnauthenticated } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [examEligibility, setExamEligibility] = useState<ExamEligibility | null>(null);
  const [hasSessionError, setHasSessionError] = useState(false);
  const [pairingData, setPairingData] = useState<PairingData | null>(null);
  const [isLoadingPairing, setIsLoadingPairing] = useState(false);
  const [finalExams, setFinalExams] = useState<any[]>([]);
  const [isAlumnus, setIsAlumnus] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

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
  
  useEffect(() => {
    fetch('/api/alumni/testimonial/my')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.isAlumni === 'boolean') {
          setIsAlumnus(data.isAlumni);
        }
      })
      .catch(err => console.error('Error fetching alumni status:', err));
  }, []);
  
  // Review Modal States
  const [reviewType, setReviewType] = useState<'written' | 'oral' | 'akad' | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isExamPortalOpen, setIsExamPortalOpen] = useState(false);

  // Fetch Akad Quiz status
  const { data: akadQuizData, isLoading: akadQuizLoading } = useSWR('/api/akad-quiz/attempts', (url: string) => fetch(url).then(r => r.json()));
  const hasPassedAkadQuiz = akadQuizData?.data?.[0]?.passed === true;

  // Identify if user is Admin/Staff for preview mode
  const isAdmin = useMemo(() => {
    const primaryRole = (user as any)?.primaryRole;
    return getRoleRank(primaryRole) >= ROLE_RANKS.admin;
  }, [user]);

  // SWR hooks for data fetching - useAllRegistrations to show ALL registrations (no batch filter)
  const { registrations, isLoading: registrationsLoading, error: registrationsError } = useAllRegistrations();
  const { activeBatch, isLoading: activeBatchLoading } = useActiveBatch();
  const { progress } = useUserProgress();
  const { journey } = useLearningJourney();
  
  // Compute list of all available batches for this user (Active + any registered)
  const availableBatches = useMemo(() => {
    const batchesMap = new Map<string, { id: string, name: string }>();
    
    // Add active batch if it exists
    if (activeBatch) {
      batchesMap.set(activeBatch.id, { 
        id: activeBatch.id, 
        name: activeBatch.name || `Batch ${(activeBatch as any).batch_number}`
      });
    }
    
    // Add all batches from user's registrations
    if (registrations && registrations.length > 0) {
      registrations.forEach(reg => {
        if (reg.batch_id && !batchesMap.has(reg.batch_id)) {
          batchesMap.set(reg.batch_id, {
            id: reg.batch_id,
            name: (reg as any).batch_name || `Batch (Dari Pendaftaran)`
          });
        }
      });
    }
    
    return Array.from(batchesMap.values());
  }, [activeBatch, registrations]);

  // Get batch_id: Priority is User Selected -> Active Batch -> Latest Registration
  const batchId = useMemo(() => {
    if (selectedBatchId) {
      return selectedBatchId;
    }
    // Priority 1: Active Batch (Always show the currently running/open batch)
    if (activeBatch) {
      return activeBatch.id;
    }
    // Priority 2: Registration from DB
    if (registrations && registrations.length > 0 && registrations[0].batch_id) {
      return registrations[0].batch_id;
    }
    return null;
  }, [selectedBatchId, registrations, activeBatch]);

  const userRole = (user as any)?.primaryRole || 'thalibah';
  const canSeeAdminStats = isStaff(userRole);
  const { stats, isLoading: statsLoading } = useDashboardStats(canSeeAdminStats);
  const { jurnalStatus, isLoading: jurnalLoading } = useJurnalStatus(undefined, batchId || undefined);

  // Unified Statistics Logic (Same as Dashboard)
  const statsOverview = useMemo(() => {
    const totalHariTarget = canSeeAdminStats ? (stats?.totalHariTarget || 0) : (jurnalStatus?.summary.total_blocks || 0);
    const hariAktual = canSeeAdminStats ? (stats?.hariAktual || 0) : (jurnalStatus?.summary.completed_blocks || 0);
    const percentage = totalHariTarget > 0 ? Math.round((hariAktual / totalHariTarget) * 100) : 0;
    
    return {
      totalHariTarget,
      hariAktual,
      percentage
    };
  }, [canSeeAdminStats, stats, jurnalStatus]);

  const percentage = statsOverview.percentage;
  const completedCount = statsOverview.hariAktual;
  const totalCount = statsOverview.totalHariTarget;

  const isMurajaahCompleted = useMemo(() => {
    if (!jurnalStatus || !jurnalStatus.blocks) return false;
    const murajaahBlocks = jurnalStatus.blocks.filter((b: any) => b.week_number === 11 || b.block_code?.startsWith('M'));
    if (murajaahBlocks.length === 0) return false;
    return murajaahBlocks.every((b: any) => b.is_completed);
  }, [jurnalStatus]);

  // Fetch batch timeline data - safely handle undefined registrations
  const { batch, timeline: batchTimeline, isLoading: batchLoading } = useBatchTimeline(batchId, {
    registrationStatus: registrations && (registrations[0]?.selection_status === 'selected' || registrations[0]?.status === 'completed') ? 'approved' : registrations?.[0]?.status as any,
    selectionStatus: registrations?.[0]?.selection_status
  });

  // Calculate registration status from SWR data - safely handle undefined registrations
  const registrationStatus = useMemo(() => {
    if (!user || !registrations || registrations.length === 0) {
      return { hasRegistered: false };
    }

    // Filter registrations to only those matching the current batchId
    const batchRegistrations = batchId 
      ? registrations.filter(reg => reg.batch_id === batchId)
      : registrations;

    if (batchRegistrations.length === 0) {
      return { hasRegistered: false };
    }

    // hasRegistered = true for anyone with registration (except withdrawn)
    // This allows rejected users to still see their journey timeline
    const hasAnyRegistration = batchRegistrations.some(reg => reg.status !== 'withdrawn');
    const hasActiveRegistration = batchRegistrations.some(reg => ['approved', 'pending'].includes(reg.status));
    const approvedRegistration = batchRegistrations.find(reg => reg.selection_status === 'selected');
    const registration = (approvedRegistration || batchRegistrations[0]) as TikrarRegistration;

    const showSelectionResult = (() => {
      if (!batch?.selection_result_date) return false;
      const today = new Date();
      const announcementDate = new Date(batch.selection_result_date);
      today.setHours(0, 0, 0, 0);
      announcementDate.setHours(0, 0, 0, 0);
      return today >= announcementDate;
    })();

    const displaySelectionStatus = showSelectionResult ? (registration?.selection_status || 'pending') : 'pending';
    const displayStatus = showSelectionResult ? (registration?.status || 'pending') : 'pending';

    return {
      hasRegistered: hasAnyRegistration, // Show timeline for all registered users (including rejected)
      registration: registration ? { ...registration, status: displayStatus, selection_status: displaySelectionStatus } : undefined,
      hasActiveRegistration,
      pendingApproval: registrations.some(reg => reg.selection_status === 'pending') || !showSelectionResult,
      approved: showSelectionResult && !!approvedRegistration,
      rejected: showSelectionResult && registrations.some(reg => reg.selection_status === 'not_selected'),
      isAlumnus,
      // Consider having oral assessment as having submitted (even without url if admin input score manually)
      hasOralSubmission: !!(
        (registration?.oral_submission_url ||
        (registration?.oral_assessment_status && registration?.oral_assessment_status !== 'pending' && registration?.oral_assessment_status !== 'not_submitted') ||
        (registration?.oral_total_score != null && registration?.oral_total_score > 0) ||
        (registration?.oral_score != null && registration?.oral_score > 0)) &&
        !((registration as any)?.needs_revision || (registration as any)?.oral_assessment_notes === 'NEEDS_REVISION')
      ),
      oralSubmissionUrl: registration?.oral_submission_url,
      oralSubmittedAt: registration?.oral_submitted_at,
      oralAssessmentStatus: registration?.oral_assessment_status || 'pending',
      oralScore: registration?.oral_total_score || (registration as any)?.oral_score,
      registrationId: registration?.id,
      chosenJuz: registration?.chosen_juz,
      examStatus: (registration as any)?.exam_status,
      examScore: registration?.exam_score,
      examSubmittedAt: (registration as any)?.exam_submitted_at,
      needsRevision: (registration as any)?.needs_revision || (registration as any)?.oral_assessment_notes === 'NEEDS_REVISION',
      writtenQuizSubmittedAt: registration?.written_quiz_submitted_at || (registration as any)?.written_submitted_at,
      selectionStatus: displaySelectionStatus,
      showSelectionResult,
      oralAssessmentAudioUrl: (registration as any)?.oral_assessment_audio_url,
      oralAssessmentNotes: (registration as any)?.oral_assessment_notes,
    };
  }, [user, registrations, batch, isAlumnus, batchId]);

  const isJuz30 = registrationStatus?.chosenJuz?.startsWith('30') || false;

  const isLoading = authLoading || registrationsLoading || akadQuizLoading;

  const daftarUlangArray = registrationStatus?.registration?.daftar_ulang;
  const daftarUlangData = Array.isArray(daftarUlangArray) ? daftarUlangArray[0] : daftarUlangArray;
  // Check individual completion of each sub-step from daftar_ulang data
  const hasAkadFiles = !!(daftarUlangData?.akad_files && daftarUlangData.akad_files.length > 0);
  const isAkadSubmitted = !!(daftarUlangData && (
    daftarUlangData.akad_status === 'submitted' || 
    daftarUlangData.akad_status === 'approved' || 
    (daftarUlangData.status === 'approved' && !daftarUlangData.akad_status) ||
    (daftarUlangData.status === 'submitted' && !daftarUlangData.akad_status)
  ));
  // hasAkad = akad files uploaded AND status is submitted/approved
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
  const isMutualSelfMatch = !!(pairingData as any)?.partner_details?.is_mutual_match;
  const isPartnerComplete = (isPartnerSubmitted && (!isSelfMatch || isMutualSelfMatch)) || daftarUlangData?.pairing_status === 'paired';
  
  const hasPhase3 = hasAkad && hasHalaqah && isPartnerComplete;
  const hasPartner = !!(pairingData) || (hasHalaqah && hasPartnerSelection && isPartnerSubmitted);
  
  const partner = [pairingData?.user_1, pairingData?.user_2, pairingData?.user_3].find(p => p && p.id !== user?.id);
  const partnerName = partner ? partner.full_name : pairingData?.partner_details?.partner_name;

  // PHASE TRACKER LOGIC
  const phases = useMemo(() => {
    if (!user || isLoading) return [];

    const isProfileComplete = !!(user.full_name && user.whatsapp && (user as any).tanggal_lahir);
    const isSelectionDone = registrationStatus?.selectionStatus && registrationStatus.selectionStatus !== 'pending';
    const isPraTikrar = (registrationStatus?.registration?.program as any)?.class_type === 'pra_tahfidz' || registrationStatus?.selectionStatus === 'waitlist';
    // Lulus jika nilai oral assessment >= 80 atau jika status seleksi sudah 'selected' (misal: alumni yang diluluskan otomatis)
    const isSelectionPassed = (registrationStatus?.oralScore != null && registrationStatus.oralScore >= 80) || registrationStatus?.selectionStatus === 'selected';
    // Pra-Tikrar tidak melalui Daftar Ulang/Akad sama sekali (langsung Jurnal Harian &
    // Tashih begitu periode mulai), jadi "enrollment" mereka dianggap selesai begitu
    // masuk status Pra-Tikrar, tanpa menunggu re_enrollment_completed dari form Daftar Ulang.
    const isEnrollmentDone = isPraTikrar || registrationStatus?.registration?.re_enrollment_completed === true;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getIsDatePassed = (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return false;
      
      const yyyymmdd = dateMatch[1];
      const deadlineWIB = new Date(`${yyyymmdd}T23:59:59+07:00`);
      const now = new Date();
      return now > deadlineWIB;
    };

    const getIsDateStarted = (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return false;
      
      const yyyymmdd = dateMatch[1];
      const startWIB = new Date(`${yyyymmdd}T00:00:00+07:00`);
      const now = new Date();
      return now >= startWIB;
    };

    const formatDateShort = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return '';
      const d = new Date(dateMatch[1]);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d.getDate()} ${months[d.getMonth()]}`;
    };

    const formatDateRangeShort = (startStr: string | null | undefined, endStr: string | null | undefined) => {
      if (!startStr) return '';
      if (!endStr) return formatDateShort(startStr);
      return `${formatDateShort(startStr)} - ${formatDateShort(endStr)}`;
    };

    const reviewWeekEnd = batch?.review_week_end_date ? new Date(batch.review_week_end_date) : null;
    const isLearningDone = isEnrollmentDone && getIsDatePassed(batch?.review_week_end_date);

    const isRegistrationStarted = getIsDateStarted(batch?.registration_start_date);
    const isRegistrationDone = getIsDatePassed(batch?.registration_end_date);
    const isSelectionStarted = getIsDateStarted(batch?.selection_start_date);
    const isSelectionDoneByDate = getIsDateStarted(batch?.re_enrollment_date) || getIsDatePassed(batch?.selection_result_date);
    const isReEnrollmentStarted = getIsDateStarted(batch?.re_enrollment_date);
    const isReEnrollmentDoneByDate = getIsDatePassed(batch?.opening_class_date);
    const isLearningDoneByDate = getIsDateStarted(batch?.final_exam_start_date) || getIsDatePassed(batch?.review_week_end_date);
    const isGraduationDoneByDate = getIsDatePassed(batch?.graduation_end_date);
    const isFinalExamStarted = getIsDateStarted(batch?.final_exam_start_date);
    
    // Check if user has registered for the current batch
    const hasFormPendaftaran = !!registrationStatus?.registration?.id;
    const isEditModeUrl = hasFormPendaftaran && !isReEnrollmentDoneByDate;

    const oralExam = finalExams.find(r => r.schedule?.exam_type === 'oral');
    const writtenExam = finalExams.find(r => r.schedule?.exam_type === 'written');

    // Graduation is done only when both oral and written exams have been graded
    const isGraduationDone = !!(oralExam?.status === 'graded' && writtenExam?.status === 'graded');


    // Sub-phase detailed logic & data formatting
    const hasOral = !!(registrationStatus?.hasOralSubmission);
    const hasWritten = !!(registrationStatus?.examStatus === 'completed');

    return [
      { 
        id: 1, name: 'Pendaftaran', status: isRegistrationDone ? 'completed' : 'current', 
        desc: batch?.registration_start_date ? `${formatDateIndo(batch.registration_start_date)} - ${formatDateIndo(batch.registration_end_date || '')}` : 'Lengkapi Profil', 
        icon: <User className="w-4 h-4" />,
        subPhases: [
          { name: 'Lengkapi Profil', done: isProfileComplete, data: isProfileComplete ? `${user.full_name} (${user.whatsapp})` : 'Belum lengkap', reviewType: isProfileComplete ? 'profile' : null },
          { 
            name: 'Form Pendaftaran', 
            date: formatDateRangeShort(batch?.registration_start_date, batch?.registration_end_date),
            done: hasFormPendaftaran, 
            data: hasFormPendaftaran ? 'Pendaftaran Berhasil' : 'Belum daftar', 
            reviewType: hasFormPendaftaran ? 'registration' : null, 
            isEditAction: !isRegistrationDone || isEditModeUrl, 
            isEditDisabled: hasFormPendaftaran ? isReEnrollmentDoneByDate : isRegistrationDone,
            editUrl: `/pendaftaran/tikrar-tahfidz?edit=true`
          },
          { 
            name: 'Test Lisan', 
            date: formatDateRangeShort(batch?.registration_start_date, batch?.registration_end_date),
            done: hasFormPendaftaran && hasOral, 
            data: hasFormPendaftaran && hasOral 
              ? (registrationStatus.oralAssessmentStatus === 'pending'
                  ? 'Sudah Rekaman (Belum Dinilai)'
                  : (isSelectionDone 
                      ? (isSelectionPassed 
                          ? `Lulus ✓${registrationStatus.oralScore != null ? ` | Nilai: ${registrationStatus.oralScore}` : ''}` 
                          : `Tidak Lulus${registrationStatus.oralScore != null ? ` | Nilai: ${registrationStatus.oralScore}` : ''}`)
                      : 'Sudah Dinilai (Menunggu Pengumuman)'
                    )
                )
              : (registrationStatus.needsRevision ? 'Perlu Rekam Ulang' : (hasFormPendaftaran ? 'Belum rekaman' : 'Isi form dahulu')), 
            reviewType: hasFormPendaftaran && hasOral ? 'oral' : null,
            isLocked: !hasFormPendaftaran,
            // Show recording button if: has form AND (hasn't recorded yet, OR registration is still open allowing re-record, OR needs revision)
            isTestAction: hasFormPendaftaran && (!hasOral || (isRegistrationStarted && !isRegistrationDone) || registrationStatus.needsRevision),
            isTestDisabled: !isRegistrationStarted || (isRegistrationDone && !registrationStatus.needsRevision),
            testUrl: `/seleksi/rekam-suara?batchId=${batchId}`
          },
        ]
      },
      { 
        id: 2, name: 'Seleksi', status: isSelectionDoneByDate ? 'completed' : (isRegistrationDone ? 'current' : 'future'), 
        desc: batch?.selection_start_date ? `${formatDateIndo(batch.selection_start_date)} - ${formatDateIndo(batch.selection_end_date || '')}` : 'Penilaian & Hasil', 
        icon: <FileText className="w-4 h-4" />,
        subPhases: [
          { name: 'Penilaian Seleksi', date: formatDateRangeShort(batch?.selection_start_date, batch?.selection_end_date), done: isSelectionDone, data: isSelectionDone ? 'Selesai ✓' : 'Proses Penilaian oleh Admin' },
          { 
            name: 'Pengumuman', 
            date: batch?.selection_result_date ? formatDateShort(batch.selection_result_date) : '', 
            done: isSelectionDone, 
            data: isSelectionDone 
              ? (isSelectionPassed 
                  ? `Lulus ✓ | Juz ${registrationStatus.registration?.final_juz || registrationStatus.chosenJuz}${registrationStatus.oralScore != null ? ` | Nilai: ${registrationStatus.oralScore}` : ''}` 
                  : (registrationStatus.selectionStatus === 'waitlist' 
                      ? 'Masuk Pra-Tikrar ✓' 
                      : `Tidak Lulus${registrationStatus.oralScore != null ? ` | Nilai: ${registrationStatus.oralScore}` : ''}`))
              : (batch?.selection_result_date ? `Mulai ${formatDateIndo(batch.selection_result_date)}` : 'Menunggu hasil') 
          }
        ]
      },
      { 
        id: 3, name: 'Daftar Ulang', status: (!isSelectionDone || (!isSelectionPassed && registrationStatus?.selectionStatus !== 'waitlist')) ? 'future' : (isReEnrollmentDoneByDate ? 'completed' : (isSelectionDoneByDate ? 'current' : 'future')), 
        desc: batch?.re_enrollment_date ? `Mulai ${formatDateIndo(batch.re_enrollment_date)}` : 'Akad & Pasangan', 
        icon: <CheckCircle className="w-4 h-4" />,
        subPhases: [
          { 
            name: 'Test Tertulis', 
            date: formatDateRangeShort(batch?.re_enrollment_date, batch?.opening_class_date),
            done: isAlumnus || isPraTikrar || isJuz30 || (hasFormPendaftaran && hasWritten), 
            data: (isAlumnus || isPraTikrar || isJuz30) ? `Tidak wajib (${isPraTikrar ? 'Pra-Tikrar' : (isJuz30 ? 'Juz 30' : 'Alumni')}) ✓` : (hasFormPendaftaran && hasWritten ? 'Selesai ✓' : (registrationStatus?.examScore != null ? `Nilai: ${registrationStatus.examScore} (Belum Lulus)` : (hasFormPendaftaran ? 'Penempatan juz (bukan kelulusan)' : 'Isi form dahulu'))), 
            reviewType: hasFormPendaftaran && (hasWritten || registrationStatus?.examScore != null) ? 'written' : null,
            isLocked: !hasFormPendaftaran || !isSelectionDone || (!isSelectionPassed && !isPraTikrar),
            isTestAction: hasFormPendaftaran && !isAlumnus && !isPraTikrar && !isJuz30 && !hasWritten && isSelectionDone && isSelectionPassed,
            // Uploading the akad must not close the written-exam portal. The exam
            // remains available independently until the re-enrollment period ends.
            isTestDisabled: !isSelectionDone || !isSelectionPassed || !isReEnrollmentStarted || isReEnrollmentDoneByDate,
            testUrl: `/seleksi/pilihan-ganda?batchId=${batchId}`
          },
          {
            name: 'Kuis Pemahaman Akad',
            date: formatDateRangeShort(batch?.re_enrollment_date, batch?.opening_class_date),
            done: isPraTikrar || hasPassedAkadQuiz,
            data: isPraTikrar ? 'Tidak wajib (Pra-Tikrar) ✓' : (hasPassedAkadQuiz ? 'Selesai ✓' : 'Wajib lulus 100'),
            isLocked: !isSelectionDone || !isSelectionPassed,
            isTestAction: !isPraTikrar && !hasPassedAkadQuiz && isSelectionDone && isSelectionPassed,
            isTestDisabled: !isSelectionDone || !isSelectionPassed || !isReEnrollmentStarted || isReEnrollmentDoneByDate,
            testUrl: `/seleksi/kuis-akad?batchId=${batchId}`
          },
          {
            name: 'Upload Akad',
            date: formatDateRangeShort(batch?.re_enrollment_date, batch?.opening_class_date),
            done: isPraTikrar || hasAkad,
            data: isPraTikrar ? 'Tidak wajib (Pra-Tikrar) ✓' : (hasAkad ? ((daftarUlangData?.akad_status === 'approved' || daftarUlangData?.status === 'approved') ? 'Sudah disetujui' : 'Sudah dikirim') : (hasAkadFiles ? 'Draft (belum dikirim)' : 'Belum ada data')),
            reviewType: hasAkadFiles ? 'akad' : null,
            isLocked: !isSelectionDone || !isSelectionPassed || !hasPassedAkadQuiz,
            isTestAction: !isPraTikrar && !hasAkadFiles && isSelectionDone && isSelectionPassed && hasPassedAkadQuiz,
            isTestDisabled: !isSelectionDone || !isSelectionPassed || !hasPassedAkadQuiz || !isReEnrollmentStarted || isReEnrollmentDoneByDate,
            testUrl: `/daftar-ulang?batchId=${batchId}`,
            // Once akad is uploaded, let her come back and add a file she missed —
            // but only until Fase 4 (Masa Belajar) actually starts.
            isEditAction: !isPraTikrar && hasAkadFiles,
            isEditDisabled: isReEnrollmentDoneByDate || isAkadSubmitted,
            editUrl: hasAkad ? `/daftar-ulang?editAkad=true` : `/daftar-ulang?batchId=${batchId}`,
            editLabel: 'Edit',
            editActiveTitle: hasAkad ? 'Tambah/Ubah file akad' : 'Lanjutkan pengisian daftar ulang',
            editDisabledTitle: isAkadSubmitted ? 'Data akad telah dikirim/disetujui. Hubungi admin untuk mengubah.' : 'Sudah masuk Masa Belajar, upload akad tidak bisa diubah lagi'
          },
          {
            name: 'Pilih Halaqah & Pasangan',
            date: formatDateRangeShort(batch?.re_enrollment_date, batch?.opening_class_date),
            done: isPraTikrar || (hasHalaqah && hasPartnerSelection && isPartnerComplete),
            data: isPraTikrar ? 'Tidak wajib (Pra-Tikrar) ✓' : (() => {
              if (!hasAkadFiles) return 'Belum submit akad';
              if (!isAkadSubmitted) return 'Silakan klik Mulai di Upload Akad terlebih dahulu';
              if (!isAlumnus && !isPraTikrar && !isJuz30 && !hasWritten) return 'Selesaikan Test Tertulis terlebih dahulu';
              // Build detailed status showing what's done and what's missing
              const parts: string[] = [];
              parts.push(hasHalaqah ? `Halaqah: ✓` : `Halaqah belum dipilih`);
              if (hasPartnerSelection) {
                parts.push(partnerName ? partnerName : 'Menunggu Dipasangkan');
              } else {
                parts.push('Pasangan belum dipilih');
              }
              
              const pStatus = daftarUlangData?.partner_status || daftarUlangData?.status;
              if (pStatus === 'draft' && hasHalaqah && hasPartnerSelection) {
                parts.push('(Perlu Diperbaiki)');
              } else if (isSelfMatch && isPartnerSubmitted && !isMutualSelfMatch) {
                parts.push('(Menunggu dipilih kembali)');
              } else if (pStatus === 'submitted' || pStatus === 'approved') {
                parts.push('✓');
              }
              
              return parts.join(' · ');
            })(),
            pairingType: pairingData?.partner_details?.partner_type,
            reviewType: hasPartner ? 'pairing' : null,
            isLocked: !hasAkad || (!isAlumnus && !isPraTikrar && !isJuz30 && !hasWritten),
            isTestAction: !isPraTikrar && hasAkad && (isAlumnus || isPraTikrar || isJuz30 || hasWritten) && !(hasHalaqah && hasPartnerSelection),
            isTestDisabled: !hasAkad || (!isAlumnus && !isPraTikrar && !isJuz30 && !hasWritten) || isReEnrollmentDoneByDate,
            testUrl: `/pilih-pasangan?batchId=${batchId}`,
            isEditAction: !isPraTikrar && hasAkad && hasHalaqah && hasPartnerSelection,
            isEditDisabled: isReEnrollmentDoneByDate || isPartnerSubmitted,
            editUrl: `/pilih-pasangan?batchId=${batchId}`,
            editLabel: 'Edit',
            editActiveTitle: 'Ubah Pilihan Halaqah & Pasangan',
            editDisabledTitle: isPartnerSubmitted ? 'Data pilihan Halaqah & Pasangan telah terkirim/disetujui. Hubungi admin untuk mereset status.' : 'Sudah masuk Masa Belajar, halaqah tidak bisa diubah lagi'
          },
          { 
            name: 'Verifikasi', 
            date: formatDateRangeShort(batch?.re_enrollment_date, batch?.opening_class_date), 
            done: isEnrollmentDone, 
            data: isEnrollmentDone ? 'Selesai ✓' : 'Belum terverifikasi', 
            isLocked: !(hasPhase3 && hasPartnerSelection)
          }
        ]
      },
      { 
        id: 4, name: 'Masa Belajar', status: isLearningDoneByDate ? 'completed' : (isReEnrollmentDoneByDate ? 'current' : 'future'), 
        desc: batch?.opening_class_date ? `Aktif s/d ${formatDateIndo(batch.review_week_end_date || '')}` : 'Pekan 1 - 12', 
        icon: <BookOpen className="w-4 h-4" />,
        subPhases: [
          { name: 'Opening Class', date: batch?.opening_class_date ? formatDateShort(batch.opening_class_date) : '', done: isEnrollmentDone && today > new Date(batch?.opening_class_date || ''), data: batch?.opening_class_date ? formatDateIndo(batch.opening_class_date) : '-' },
          { name: 'Jurnal Tikrar', date: formatDateRangeShort(batch?.opening_class_date, batch?.review_week_end_date), done: isEnrollmentDone && percentage >= 80, data: isEnrollmentDone ? `Progres: ${percentage}%` : 'Belum mulai' },
          { name: 'Muraja’ah', date: formatDateRangeShort(batch?.review_week_start_date, batch?.review_week_end_date), done: isLearningDone, data: isLearningDone ? 'Selesai' : (today > (reviewWeekEnd || new Date()) ? 'Berlangsung' : 'Akan datang') }
        ]
      },
      { 
        id: 5, name: 'Kelulusan', status: isGraduationDoneByDate ? 'completed' : (isLearningDoneByDate ? 'current' : 'future'), 
        desc: batch?.graduation_start_date ? formatDateIndo(batch.graduation_start_date) : 'Wisuda & Sertifikat', 
        icon: <Award className="w-4 h-4" />,
        subPhases: [
          { name: 'Ujian Tulis', date: formatDateRangeShort(batch?.final_exam_start_date, batch?.final_exam_end_date), done: !!writtenExam, data: writtenExam ? (writtenExam.status === 'graded' ? `Nilai: ${writtenExam.score_tulisan}` : 'Sudah terdaftar') : 'Belum ujian', isPortalAction: false, isLocked: !writtenExam },
          { name: 'Ujian Lisan', date: formatDateRangeShort(batch?.final_exam_start_date, batch?.final_exam_end_date), done: !!oralExam, data: oralExam ? (oralExam.status === 'graded' ? `Nilai: ${oralExam.score_lisan}` : `${formatDateIndo(oralExam.schedule?.exam_date || '')}`) : 'Belum memilih jadwal', isPortalAction: isLearningDone || isAdmin, isPortalDisabled: !isFinalExamStarted },
          { name: 'Wisuda', date: batch?.graduation_start_date ? formatDateShort(batch.graduation_start_date) : '', done: isGraduationDone, data: batch?.graduation_start_date ? formatDateIndo(batch.graduation_start_date) : '-' },
          { name: 'Sertifikat', date: batch?.graduation_start_date ? formatDateShort(batch.graduation_start_date) : '', done: isGraduationDone, data: isGraduationDone ? 'Sudah terbit' : 'Menunggu wisuda' }
        ]
      },
    ].filter(phase => !(isPraTikrar && phase.id === 5));
  }, [user, isLoading, registrationStatus, batch, percentage, pairingData, finalExams, isAdmin, hasPassedAkadQuiz, hasAkad, hasAkadFiles, isAkadSubmitted, hasHalaqah, hasPartnerSelection, hasPhase3, hasPartner, isAlumnus, isJuz30, partnerName, daftarUlangData]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper to get icon based on type
  const getIconForType = (type: string) => {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  // Function to parse Indonesian date string
  const parseIndonesianDate = (dateStr: string): Date => {
    if (dateStr.includes('Pekan')) {
      return new Date('2026-01-12');
    }

    const months: { [key: string]: number } = {
      'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5,
      'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
    };

    const parts = dateStr.split(' ');
    const day = parseInt(parts[0]);
    const month = months[parts[1]];
    const year = parseInt(parts[2]);

    return new Date(year, month, day);
  };

  // Create timeline data from batch or fallback to hardcoded data
  const baseTimelineData: TimelineItem[] = useMemo(() => {
    if (batch && (batch.registration_start_date || batch.re_enrollment_date || batch.opening_class_date)) {
      const formatDateRange = (start: string | null | undefined, end: string | null | undefined): string => {
        if (!start || !end) return '';
        return `${formatDateIndo(start)} - ${formatDateIndo(end)}`;
      };

      const items: TimelineItem[] = [];

      if (batch.registration_start_date && batch.registration_end_date) {
        items.push({
          id: 1,
          date: formatDateRange(batch.registration_start_date, batch.registration_end_date),
          day: 'Senin - Ahad',
          hijriDate: batch.registration_start_date ? toHijri(batch.registration_start_date) : '6 - 19 Jumadil Akhir 1446',
          title: 'Mendaftar Program',
          description: 'Pendaftaran awal program tahfidz',
          icon: getIconForType('registration'),
          hasSelectionTasks: true,
          startDateIso: batch.registration_start_date,
          endDateIso: batch.registration_end_date
        });
      }

      if (batch.selection_start_date && batch.selection_end_date) {
        items.push({
          id: 2,
          date: formatDateRange(batch.selection_start_date, batch.selection_end_date),
          day: 'Senin - Ahad',
          hijriDate: batch.selection_start_date ? toHijri(batch.selection_start_date) : '20 Jumadil Akhir - 3 Rajab 1446',
          title: 'Seleksi',
          description: 'Proses penilaian dan peninjauan hasil ujian seleksi oleh admin.',
          icon: getIconForType('selection'),
          hasSelectionTasks: false,
          startDateIso: batch.selection_start_date,
          endDateIso: batch.selection_end_date
        });
      }

      if (batch.selection_result_date) {
        items.push({
          id: 3,
          date: formatDateIndo(batch.selection_result_date),
          day: getDayNameIndo(batch.selection_result_date),
          hijriDate: toHijri(batch.selection_result_date),
          title: 'Pengumuman Hasil Seleksi',
          description: 'Pengumuman hasil seleksi.',
          icon: getIconForType('result'),
          hasSelectionTasks: false,
          startDateIso: batch.selection_result_date,
          endDateIso: batch.selection_result_date
        });
      }

      if (batch.re_enrollment_date) {
        items.push({
          id: 4,
          date: formatDateIndo(batch.re_enrollment_date),
          day: getDayNameIndo(batch.re_enrollment_date),
          hijriDate: toHijri(batch.re_enrollment_date),
          title: 'Mendaftar Ulang',
          description: 'Konfirmasi keikutsertaan dan pengumpulan akad daftar ulang.',
          icon: getIconForType('enrollment'),
          startDateIso: batch.re_enrollment_date,
          endDateIso: batch.opening_class_date || batch.re_enrollment_date
        });
      }

      if (batch.opening_class_date) {
        items.push({
          id: 5,
          date: formatDateIndo(batch.opening_class_date),
          day: getDayNameIndo(batch.opening_class_date),
          hijriDate: toHijri(batch.opening_class_date),
          title: 'Kelas Perdana Gabungan',
          description: 'Awal resmi program tahfidz dengan orientasi dan penentuan target.',
          icon: getIconForType('opening'),
          startDateIso: batch.opening_class_date,
          endDateIso: batch.opening_class_date
        });
      }

      return items;
    }
    return [];
  }, [batch]);

  // Calculate timeline status dynamically based on current date and registration status
  const timelineData = useMemo((): TimelineItemWithStatus[] => {
    if (!isClient) {
      return baseTimelineData.map(item => ({ ...item, status: 'future' as const }));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return baseTimelineData.map((item, index) => {
      if (index === 0 && registrationStatus?.hasRegistered) return { ...item, status: 'completed' as const };
      
      const isSelected = registrationStatus?.selectionStatus === 'selected';
      const isNotSelected = registrationStatus?.selectionStatus === 'not_selected';
      const isWaitlist = registrationStatus?.selectionStatus === 'waitlist';

      if (item.id === 2 && (isSelected || isNotSelected || isWaitlist)) return { ...item, status: 'completed' as const };
      if (item.id === 3 && (isSelected || isNotSelected || isWaitlist)) return { ...item, status: 'completed' as const };

      let startDate = today;
      let endDate = today;

      if (item.startDateIso) {
        startDate = new Date(item.startDateIso);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = parseIndonesianDate(item.date);
        startDate.setHours(0, 0, 0, 0);
      }

      if (item.endDateIso) {
        endDate = new Date(item.endDateIso);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(startDate.getTime());
        endDate.setHours(23, 59, 59, 999);
      }

      let status: 'completed' | 'current' | 'future' = 'future';
      const todayTime = today.getTime();
      
      if (todayTime > endDate.getTime()) {
        status = 'completed';
      } else if (todayTime >= startDate.getTime() && todayTime <= endDate.getTime()) {
        status = 'current';
      } else if (todayTime < startDate.getTime()) {
        status = 'future';
      }

      // Keep previous completed logic for active phases if user is selected/rejected
      if (status === 'current' && item.id === 2 && (isSelected || isNotSelected || isWaitlist)) {
        status = 'completed';
      }
      if (status === 'current' && item.id === 3 && (isSelected || isNotSelected || isWaitlist)) {
        status = 'completed';
      }

      return {
        ...item,
        status
      };
    });
  }, [isClient, registrationStatus, baseTimelineData]);

  const estimationFinish = useMemo(() => {
    if (batch && batch.graduation_end_date) {
      return { greg: formatDateIndo(batch.graduation_end_date), hijri: toHijri(batch.graduation_end_date) };
    }
    return { greg: '-', hijri: '-' };
  }, [batch]);

  useEffect(() => {
    if (registrationsError && (registrationsError as any).code === 'SESSION_EXPIRED') {
      setHasSessionError(true);
      const timer = setTimeout(() => {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [registrationsError]);

  const fetchPairingData = async (currentBatchId: string | null) => {
    if (!user || !currentBatchId) return;
    setIsLoadingPairing(true);
    try {
      const response = await fetch(`/api/user/pairing?batch_id=${currentBatchId}`, { cache: 'no-store' });
      const result = await response.json();
      if (result.success) setPairingData(result.data);
    } catch (error) {
      console.error('Error fetching pairing data:', error);
    } finally {
      setIsLoadingPairing(false);
    }
  };

  const fetchFinalExams = async (currentBatchId: string | null) => {
    if (!currentBatchId) return;
    try {
      const response = await fetch(`/api/exams/final-exams/registrations?batch_id=${currentBatchId}`, { cache: 'no-store' });
      const result = await response.json();
      if (result.success) {
        setFinalExams(Array.isArray(result.data) ? result.data : result.data ? [result.data] : []);
      }
    } catch (error) {
      console.error('Error fetching final exams:', error);
    }
  };

  useEffect(() => {
    if (batchId && user) {
      fetchPairingData(batchId);
      fetchFinalExams(batchId);
    }
  }, [batchId, user]);

  const handleEditSuccess = () => window.location.reload();

  const getStatusStyles = (status: 'completed' | 'current' | 'future') => {
    switch (status) {
      case 'completed': return { cardBg: 'bg-white', cardBorder: 'border-emerald-100', textColor: 'text-emerald-900', iconBg: 'bg-emerald-100/50', iconColor: 'text-emerald-600', dotColor: 'bg-emerald-500', lineColor: 'bg-emerald-500' };
      case 'current': return { cardBg: 'bg-gradient-to-br from-yellow-50 to-white', cardBorder: 'border-yellow-200 shadow-yellow-100', textColor: 'text-yellow-900', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', dotColor: 'bg-yellow-500', lineColor: 'bg-yellow-200' };
      default: return { cardBg: 'bg-gray-50/50', cardBorder: 'border-gray-100 opacity-60', textColor: 'text-gray-400', iconBg: 'bg-gray-100', iconColor: 'text-gray-400', dotColor: 'bg-gray-200', lineColor: 'bg-gray-100' };
    }
  };

  const getPairingTypeLabel = (pairingType: string) => {
    switch (pairingType) {
      case 'self_match': return { label: 'Self Match' };
      case 'family': return { label: 'Family' };
      case 'tarteel': return { label: 'Tarteel' };
      case 'system_match': return { label: 'System Match' };
      default: return { label: pairingType };
    }
  };

  const getTimeSlotLabel = (slotValue: string | undefined) => {
    if (!slotValue) return '-';
    const slotLabels: Record<string, string> = {
      '04-06': '04-06 WIB', '06-09': '06-09 WIB', '09-12': '09-12 WIB', '12-15': '12-15 WIB',
      '15-18': '15-18 WIB', '18-21': '18-21 WIB', '21-24': '21-24 WIB'
    };
    return slotLabels[slotValue] || `${slotValue} WIB`;
  };

  const hasFormPendaftaran = useMemo(() => {
    return !!registrationStatus?.registration?.id;
  }, [registrationStatus]);

  if (hasSessionError) return <div className="p-12 text-center">Sesi berakhir, mengalihkan...</div>;

  if (!isClient) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="space-y-10 sm:space-y-16 animate-fadeIn pb-20">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 p-8 sm:p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight">Perjalanan Hafalan <span className="text-emerald-300 italic">Ukhti</span></h1>
            
            {availableBatches.length > 0 && (
              <div className="relative inline-block">
                <select 
                  id="batch-selector"
                  className="bg-emerald-800/80 border border-emerald-700 text-emerald-100 text-sm font-bold rounded-full px-5 py-2.5 outline-none appearance-none cursor-pointer pr-10 hover:bg-emerald-700/80 transition-colors"
                  value={batchId || ''}
                  onChange={(e) => handleSelectBatch(e.target.value)}
                >
                  {availableBatches.map(b => (
                    <option key={b.id} value={b.id} className="bg-emerald-900 text-white font-medium">
                      {b.name} {b.id === activeBatch?.id ? ' (Aktif)' : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-emerald-300">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5-Phase Premium Progress Tracker */}
      <div className="max-w-6xl mx-auto w-full px-4">
        <div className="relative bg-white/40 backdrop-blur-md border border-white shadow-xl rounded-[2rem] p-6 sm:p-10">
          <h2 className="text-center text-emerald-900 font-black text-lg mb-10 uppercase tracking-widest">Fase Perjalanan Ukhti</h2>
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 sm:gap-10 xl:gap-6">
            {/* Timeline Connecting Lines */}
            <div className="absolute top-6 left-6 right-6 h-1 bg-emerald-100/50 xl:block hidden z-0 rounded-full" />
            <div className="absolute left-6 top-6 bottom-6 w-1 bg-emerald-100/50 xl:hidden block z-0 rounded-full" />

            {phases.map((phase, idx) => (
              <div key={phase.id} className="relative flex xl:flex-col items-start xl:items-center gap-4 xl:gap-3 w-full xl:w-[18%] z-10">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg shrink-0 mt-0.5 relative z-10", phase.status === 'completed' ? "bg-emerald-500 text-white" : phase.status === 'current' ? "bg-yellow-400 text-yellow-900" : "bg-white text-gray-300")}>
                  {phase.status === 'completed' ? <CheckCircle className="w-6 h-6" /> : phase.icon}
                </div>
                <div className="flex flex-col xl:items-center text-left min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fase {phase.id}</p>
                  <h4 className="text-sm font-bold text-gray-900">{phase.name}</h4>
                  <div className="mt-2 space-y-1.5 w-full">
                    {phase.subPhases.map((sub, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-2 pt-0.5">
                        <div className="flex-shrink-0 mt-0.5">
                          {sub.done ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 group min-w-0 flex-1">
                          <span className="text-xs font-bold text-gray-800">{sub.name}</span>
                          {(sub as any).date && (
                            <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50/60 px-1 py-0.5 rounded border border-emerald-100/50 shrink-0">
                              {(sub as any).date}
                            </span>
                          )}
                          <span className="text-xs font-medium text-gray-300">—</span>
                          <span className="text-xs font-medium text-gray-500 break-words flex items-center gap-1.5">
                            {sub.data}
                            {(() => {
                              const pType = (sub as any).pairingType;
                              if (!pType) return null;
                              if (pType === 'self_match') return (
                                <span title="Mutual Self Match (Jodoh)" className="inline-flex"><Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" /></span>
                              );
                              if (pType === 'system_match') return (
                                <span title="System Match" className="inline-flex"><Heart className="w-3.5 h-3.5 text-blue-500 fill-blue-500" /></span>
                              );
                              if (pType === 'tarteel') return (
                                <span title="Tarteel Match" className="inline-flex"><AppWindow className="w-3.5 h-3.5 text-indigo-500" /></span>
                              );
                              if (pType === 'family') return (
                                <span title="Family Match" className="inline-flex"><Users className="w-3.5 h-3.5 text-orange-500" /></span>
                              );
                              return null;
                            })()}
                          </span>
                          {(sub as any).reviewType && (
                            <button 
                              onClick={() => { 
                                setReviewType((sub as any).reviewType); 
                                setIsReviewModalOpen(true); 
                              }} 
                              className="ml-1 text-emerald-600 hover:text-emerald-800 transition-colors p-1"
                              title={`Review ${sub.name}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(sub as any).isEditAction && (
                            <button
                              disabled={(sub as any).isEditDisabled}
                              onClick={() => router.push((sub as any).editUrl ? `${(sub as any).editUrl}&batchId=${batchId}` : `/pendaftaran/tikrar-tahfidz?batchId=${batchId}`)}
                              className={cn(
                                "ml-1 flex items-center gap-1 transition-colors p-1",
                                (sub as any).isEditDisabled
                                  ? "text-gray-400 cursor-not-allowed opacity-50"
                                  : "text-emerald-600 hover:text-emerald-800"
                              )}
                              title={
                                (sub as any).isEditDisabled
                                  ? ((sub as any).editDisabledTitle || `Pendaftaran belum dibuka (Mulai ${batch?.registration_start_date ? formatDateIndo(batch.registration_start_date) : ''})`)
                                  : ((sub as any).editActiveTitle || (hasFormPendaftaran ? `Edit Pendaftaran` : `Daftar Sekarang`))
                              }
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold underline">{(sub as any).editLabel || (hasFormPendaftaran ? 'Edit' : 'Daftar')}</span>
                            </button>
                          )}
                          {(sub as any).isTestAction && (
                            <button 
                              disabled={(sub as any).isTestDisabled}
                              onClick={() => router.push((sub as any).testUrl)}
                              className={cn(
                                "ml-2 px-3 py-1.5 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-md",
                                (sub as any).isTestDisabled 
                                  ? "bg-gray-300 shadow-none cursor-not-allowed text-gray-500" 
                                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                              )}
                              title={(sub as any).isTestDisabled ? "Tahapan belum dimulai" : "Mulai"}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Mulai
                            </button>
                          )}
                          {(sub as any).isPortalAction && (
                            <button 
                              disabled={(sub as any).isPortalDisabled}
                              onClick={() => setIsExamPortalOpen(true)} 
                              className={cn(
                                "ml-1 px-3 py-1 text-white rounded-full text-[10px] font-bold transition-colors",
                                (sub as any).isPortalDisabled 
                                  ? "bg-gray-300 cursor-not-allowed text-gray-500" 
                                  : "bg-emerald-600 hover:bg-emerald-700"
                              )}
                              title={(sub as any).isPortalDisabled ? "Portal ujian belum dibuka" : "Buka"}
                            >
                              BUKA
                            </button>
                          )}
                          {(sub as any).isLocked && (
                            <span className="inline-flex items-center ml-1 text-gray-400" title={hasFormPendaftaran ? "Dikerjakan via Google Form" : "Silakan isi form pendaftaran terlebih dahulu"}>
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Modals */}


      {/* Global Review Modal */}
      <ReviewSubmissionModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        type={reviewType}
        registrationStatus={registrationStatus}
        pairingData={pairingData}
        user={user}
      />

      <FinalExamPortalModal 
        isOpen={isExamPortalOpen}
        onClose={() => setIsExamPortalOpen(false)}
        hariAktual={completedCount || 0}
        percentage={percentage}
        isAdmin={isAdmin}
        batchName={batch?.name || ((batch as any)?.batch_number ? `Batch ${(batch as any).batch_number}` : undefined)}
        batchId={batchId || undefined}
        isMurajaahCompleted={isMurajaahCompleted}
      />
    </div>
  );
}
