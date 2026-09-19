'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useActiveBatch } from '@/hooks/useBatches';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calendar, BookOpen, GraduationCap, Loader2, Info, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { submitMuallimahRegistration, getMuallimahRegistrationQuestions } from './actions';

interface Question {
  id?: string;
  field_key: string;
  section: number;
  label: string;
  description: string | null;
  warning_text: string | null;
  is_active: boolean;
  is_required: boolean;
  sort_order: number;
  options?: any;
}

type MuallimahFormData = {
  // Profile Data (Batch-independent)
  tajweed_institution: string;
  quran_institution: string;
  teaching_communities: string;
  memorized_tajweed_matan: string;
  studied_matan_exegesis: string;
  memorization_level: string;
  memorized_juz: string[];
  examined_juz: string[];
  certified_juz: string[];
  age?: number;
  
  // Akad Data (Batch-specific)
  preferred_juz: string[]; 
  class_tikrar: boolean;
  class_pratikrar: boolean;
  class_paid: boolean;
  paid_class_scheme: string;
  preferred_max_thalibah?: number;
  
  // Jadwal Terpisah
  schedule_tikrar_day: string;
  schedule_tikrar_time_start: string;
  schedule_tikrar_time_end: string;
  schedule_tikrar_day2: string;
  schedule_tikrar_time_start2: string;
  schedule_tikrar_time_end2: string;

  schedule_pratikrar_day: string;
  schedule_pratikrar_time_start: string;
  schedule_pratikrar_time_end: string;
  schedule_pratikrar_day2: string;
  schedule_pratikrar_time_start2: string;
  schedule_pratikrar_time_end2: string;

  schedule_paid_day: string;
  schedule_paid_time_start: string;
  schedule_paid_time_end: string;
  schedule_paid_day2: string;
  schedule_paid_time_start2: string;
  schedule_paid_time_end2: string;
  
  // Commitment
  understands_commitment: boolean;
  agreed_items: string[];
};

const dayOptions = [
  { value: 'senin', label: 'Senin' },
  { value: 'selasa', label: 'Selasa' },
  { value: 'rabu', label: 'Rabu' },
  { value: 'kamis', label: 'Kamis' },
  { value: 'jumat', label: 'Jumat' },
  { value: 'sabtu', label: 'Sabtu' },
  { value: 'ahad', label: 'Ahad' },
];

const allJuzOptions = Array.from({ length: 30 }, (_, i) => ({
  value: String(i + 1),
  label: `Juz ${i + 1}`
}));

const FALLBACK_QUESTIONS: Record<string, Omit<Question, 'field_key' | 'section' | 'sort_order'>> = {
  commitment_info: {
    label: "🤝 Akad Komitmen & Etika Mu'allimah",
    description: "Silakan baca dan centang setiap poin di bawah ini sebagai bentuk pemahaman dan kesepakatan Ukhti terhadap akad MTI:",
    warning_text: null,
    is_required: false,
    is_active: true,
  },
  tajweed_institution: {
    label: "Lembaga Belajar Tajwid",
    description: "e.g. MTI, LTQ, dsb",
    warning_text: null,
    is_required: true,
    is_active: true,
  },
  quran_institution: {
    label: "Lembaga Tahfidz",
    description: "e.g. Markaz Tikrar, dsb",
    warning_text: null,
    is_required: true,
    is_active: true,
  },
  teaching_communities: {
    label: "Komunitas / Tempat Mengajar Saat Ini",
    description: "e.g. LTQ A, Majelis Taklim B, dsb (kosongkan jika tidak ada)",
    warning_text: null,
    is_required: false,
    is_active: true,
  },
  memorized_tajweed_matan: {
    label: "Matan Tajwid yang Dihafal",
    description: "e.g. Tuhfatul Athfal, Jazariyah",
    warning_text: null,
    is_required: false,
    is_active: true,
  },
  studied_matan_exegesis: {
    label: "Syarah Matan yang Dipelajari",
    description: "e.g. Aisar, dsb",
    warning_text: null,
    is_required: false,
    is_active: true,
  },
  memorization_level: {
    label: "Jumlah Hafalan Al-Quran saat ini (Juz)",
    description: "Pilih jumlah hafalan antara 1 sampai 30 juz",
    warning_text: null,
    is_required: true,
    is_active: true,
  },
  memorized_juz: {
    label: "Juz yang Sudah Dihafal",
    description: "Centang juz yang sudah dihafal",
    warning_text: null,
    is_required: true,
    is_active: true,
  },
  examined_juz: {
    label: "Juz yang Sudah Diuji (Tashih/Imtihan)",
    description: "Centang juz yang sudah diuji",
    warning_text: null,
    is_required: false,
    is_active: true,
  },
  certified_juz: {
    label: "Juz yang Sudah Mendapat Sertifikat",
    description: "Centang juz yang sudah mendapat sertifikat",
    warning_text: null,
    is_required: false,
    is_active: true,
  },
  class_tikrar: {
    label: "Kelas Tikrar",
    description: "Kelas hafalan Al-Quran berulang (standard/ziyadah).",
    warning_text: null,
    is_required: true,
    is_active: true,
  },
  class_pratikrar: {
    label: "Kelas Pra-Tikrar",
    description: "Kelas persiapan dan pembekalan materi tajwid/tashih dasar.",
    warning_text: null,
    is_required: true,
    is_active: true,
  },
  class_paid: {
    label: "Kelas Berbayar (Opsional)",
    description: "Mengajar kelas berbayar komersial sesuai kebijakan MTI.",
    warning_text: null,
    is_required: false,
    is_active: true,
  },
  paid_class_scheme: {
    label: "Pengajuan Skema Kelas Berbayar",
    description: "Pilih skema pengajuan kelas berbayar yang diajukan",
    warning_text: null,
    is_required: false,
    is_active: true,
  },
  preferred_max_thalibah: {
    label: "Maksimal Tholibah per Kelas",
    description: "Pilih kapasitas maksimal tholibah per kelas",
    warning_text: null,
    is_required: true,
    is_active: true,
  },
  preferred_juz: {
    label: "Juz yang Bersedia Diampu",
    description: "Pilih minimal satu juz yang ingin diampu",
    warning_text: null,
    is_required: true,
    is_active: true,
  },
  teaching_schedule: {
    label: "Jadwal Mengajar per Program (WIB)",
    description: "Tentukan jadwal mengajar utama dan cadangan untuk masing-masing kelas yang diampu.",
    warning_text: null,
    is_required: true,
    is_active: true,
  },
};

const getFallbackIcon = (key: string): string => {
  switch (key) {
    case 'free_program': return '🎁';
    case 'standard_package': return '📦';
    case 'revenue_share': return '🤝';
    case 'complaints_mara': return '📞';
    case 'technical_ucy': return '💻';
    case 'permit_musyrifah': return '⏱️';
    case 'no_makeup_class': return '📅';
    case 'paid_class_incentive': return '🌟';
    case 'family_spirit': return '❤️';
    case 'batch_period': return '⏳';
    case 'freedom_to_continue': return '🕊️';
    default: return '📝';
  }
};

function MuallimahRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { activeBatch, isLoading: batchLoading } = useActiveBatch();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [batchId, setBatchId] = useState<string>('');
  const [batchInfo, setBatchInfo] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState<MuallimahFormData>({
    tajweed_institution: '',
    quran_institution: '',
    teaching_communities: '',
    memorized_tajweed_matan: '',
    studied_matan_exegesis: '',
    memorization_level: '',
    memorized_juz: [],
    examined_juz: [],
    certified_juz: [],
    age: undefined,
    
    preferred_juz: [], 
    class_tikrar: true,
    class_pratikrar: false,
    class_paid: false,
    paid_class_scheme: 'none',
    preferred_max_thalibah: 10,
    
    schedule_tikrar_day: '',
    schedule_tikrar_time_start: '',
    schedule_tikrar_time_end: '',
    schedule_tikrar_day2: '',
    schedule_tikrar_time_start2: '',
    schedule_tikrar_time_end2: '',

    schedule_pratikrar_day: '',
    schedule_pratikrar_time_start: '',
    schedule_pratikrar_time_end: '',
    schedule_pratikrar_day2: '',
    schedule_pratikrar_time_start2: '',
    schedule_pratikrar_time_end2: '',

    schedule_paid_day: '',
    schedule_paid_time_start: '',
    schedule_paid_time_end: '',
    schedule_paid_day2: '',
    schedule_paid_time_start2: '',
    schedule_paid_time_end2: '',

    understands_commitment: false,
    agreed_items: [],
  });

  // Fetch Questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        const result = await getMuallimahRegistrationQuestions();
        if (result.success && result.data) {
          setQuestions(result.data as Question[]);
        }
      } catch (error) {
        console.error('Error fetching muallimah questions:', error);
      } finally {
        setQuestionsLoading(false);
      }
    }
    loadQuestions();
  }, []);

  // Synchronize preferred_juz with memorized_juz (Mu'allimah cannot teach juz she hasn't memorized)
  useEffect(() => {
    if (formData.preferred_juz.length > 0) {
      const adjustedPreferred = formData.preferred_juz.filter(v => formData.memorized_juz.includes(v));
      if (adjustedPreferred.length !== formData.preferred_juz.length) {
        setFormData(prev => ({ ...prev, preferred_juz: adjustedPreferred }));
      }
    }
  }, [formData.memorized_juz, formData.preferred_juz]);

  const getQuestionMeta = (key: string) => {
    const dbQ = questions.find(q => q.field_key === key);
    if (dbQ) {
      return {
        label: dbQ.label,
        description: dbQ.description,
        warning_text: dbQ.warning_text,
        is_required: dbQ.is_required,
        is_active: dbQ.is_active
      };
    }
    const fallback = FALLBACK_QUESTIONS[key];
    return {
      ...fallback,
      is_active: true
    };
  };

  const commitmentQuestions = useMemo(() => {
    const activeCommitments = questions.filter(q => q.section === 3 && q.is_active && q.field_key !== 'commitment_info');
    if (activeCommitments.length > 0) return activeCommitments;
    // Fallback if DB questions are empty/not yet loaded
    return Object.entries(FALLBACK_QUESTIONS)
      .filter(([key]) => [
        'free_program', 'standard_package', 'revenue_share', 
        'complaints_mara', 'technical_ucy', 'permit_musyrifah', 
        'no_makeup_class', 'paid_class_incentive', 'family_spirit', 
        'batch_period', 'freedom_to_continue'
      ].includes(key))
      .map(([key, value]) => ({
        field_key: key,
        section: 3,
        label: value.label,
        description: value.description,
        warning_text: value.warning_text,
        is_active: value.is_active,
        is_required: value.is_required,
        sort_order: 0,
        options: { icon: getFallbackIcon(key) }
      }));
  }, [questions]);

  // Load agreed items if already submitted/signed
  useEffect(() => {
    if (formData.understands_commitment && formData.agreed_items.length === 0 && commitmentQuestions.length > 0) {
      setFormData(prev => ({
        ...prev,
        agreed_items: commitmentQuestions.map(q => q.field_key)
      }));
    }
  }, [formData.understands_commitment, commitmentQuestions]);

  // Check if user is an alumnus and has not filled in their testimonial
  useEffect(() => {
    async function checkAlumniStatus() {
      try {
        const res = await fetch('/api/alumni/testimonial/my');
        if (res.ok) {
          const data = await res.json();
          if (data.isAlumni && !data.testimonial) {
            toast.error('Afwan Ukhti, Ukhti harus mengisi testimoni alumni terlebih dahulu.');
            router.push('/alumni');
          }
        }
      } catch (err) {
        console.error('Error checking alumni status:', err);
      }
    }
    if (user) {
      checkAlumniStatus();
    }
  }, [user, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // AUTO-SAVE: Load draft from localStorage on mount
  useEffect(() => {
    if (user?.id && !isFormSubmitted) {
      const savedDraft = localStorage.getItem(`muallimah_draft_${user.id}`);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Only load if current formData is mostly empty to avoid overwriting DB data
          setFormData(prev => {
            // Check if we already have meaningful data (e.g. from DB)
            const hasExistingData = prev.tajweed_institution || prev.preferred_juz.length > 0;
            if (!hasExistingData) {
              return { ...prev, ...parsed };
            }
            return prev;
          });
        } catch (e) {
          console.error('Error loading draft:', e);
        }
      }
    }
  }, [user?.id, isFormSubmitted]);

  // AUTO-SAVE: Save to localStorage whenever formData changes
  useEffect(() => {
    if (user?.id && !isFormSubmitted && formData) {
      const timeoutId = setTimeout(() => {
        // Don't save if it's just the initial empty state
        const hasData = Object.values(formData).some(val => 
          Array.isArray(val) ? val.length > 0 : !!val
        );
        if (hasData) {
          localStorage.setItem(`muallimah_draft_${user.id}`, JSON.stringify(formData));
        }
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, user?.id, isFormSubmitted]);

  // Set batchId
  useEffect(() => {
    const batchFromUrl = searchParams.get('batchId') || searchParams.get('batch');
    if (batchFromUrl) {
      setBatchId(batchFromUrl);
      fetchBatchInfo(batchFromUrl);
    } else if (activeBatch?.id && !batchId) {
      setBatchId(activeBatch.id);
      setBatchInfo(activeBatch);
    }
  }, [searchParams, activeBatch]);

  // Load user data and existing registration/akad
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    if (user && batchId) {
      fetchProfileAndAkad();
    }
  }, [user, batchId]);

  const fetchProfileAndAkad = async () => {
    try {
      // 1. Fetch Profile (Batch-independent registration)
      const { data: profile, error: profileError } = await supabase
        .from('muallimah_registrations')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        setProfileExists(true);
        setFormData(prev => ({
          ...prev,
          tajweed_institution: profile.tajweed_institution || '',
          quran_institution: profile.quran_institution || '',
          teaching_communities: profile.teaching_communities || '',
          memorized_tajweed_matan: profile.memorized_tajweed_matan || '',
          studied_matan_exegesis: profile.studied_matan_exegesis || '',
          memorization_level: profile.memorization_level || '',
          memorized_juz: profile.memorized_juz ? (Array.isArray(profile.memorized_juz) ? profile.memorized_juz : profile.memorized_juz.split(', ')) : [],
          examined_juz: profile.examined_juz ? (Array.isArray(profile.examined_juz) ? profile.examined_juz : profile.examined_juz.split(', ')) : [],
          certified_juz: profile.certified_juz ? (Array.isArray(profile.certified_juz) ? profile.certified_juz : profile.certified_juz.split(', ')) : [],
          age: profile.age,
        }));
      }

      // 2. Fetch Akad for this batch
      const { data: akad, error: akadError } = await supabase
        .from('muallimah_akads')
        .select('*')
        .eq('user_id', user?.id)
        .eq('batch_id', batchId)
        .maybeSingle();

      if (akad) {
        if (akad.status === 'approved' || akad.status === 'rejected') {
          setIsFormSubmitted(true);
        } else {
          setIsEditMode(true);
        }

        const preferredSchedule = typeof akad.preferred_schedule === 'string'
          ? JSON.parse(akad.preferred_schedule)
          : akad.preferred_schedule;
        const backupSchedule = typeof akad.backup_schedule === 'string'
          ? JSON.parse(akad.backup_schedule)
          : akad.backup_schedule;

        const isNewFormat = preferredSchedule && (preferredSchedule.tikrar || preferredSchedule.pra_tahfidz || preferredSchedule.berbayar);
        
        let class_tikrar = false;
        let class_pratikrar = false;
        let class_paid = akad.paid_class_scheme && akad.paid_class_scheme !== 'none';
        
        let schedule_tikrar_day = '';
        let schedule_tikrar_time_start = '';
        let schedule_tikrar_time_end = '';
        let schedule_tikrar_day2 = '';
        let schedule_tikrar_time_start2 = '';
        let schedule_tikrar_time_end2 = '';

        let schedule_pratikrar_day = '';
        let schedule_pratikrar_time_start = '';
        let schedule_pratikrar_time_end = '';
        let schedule_pratikrar_day2 = '';
        let schedule_pratikrar_time_start2 = '';
        let schedule_pratikrar_time_end2 = '';

        let schedule_paid_day = '';
        let schedule_paid_time_start = '';
        let schedule_paid_time_end = '';
        let schedule_paid_day2 = '';
        let schedule_paid_time_start2 = '';
        let schedule_paid_time_end2 = '';

        if (isNewFormat) {
          class_tikrar = !!preferredSchedule.tikrar;
          class_pratikrar = !!preferredSchedule.pra_tahfidz;
          class_paid = !!preferredSchedule.berbayar;

          if (class_tikrar) {
            schedule_tikrar_day = preferredSchedule.tikrar.day || '';
            schedule_tikrar_time_start = preferredSchedule.tikrar.time_start || '';
            schedule_tikrar_time_end = preferredSchedule.tikrar.time_end || '';
            if (backupSchedule?.tikrar) {
              schedule_tikrar_day2 = backupSchedule.tikrar.day || '';
              schedule_tikrar_time_start2 = backupSchedule.tikrar.time_start2 || backupSchedule.tikrar.time_start || '';
              schedule_tikrar_time_end2 = backupSchedule.tikrar.time_end2 || backupSchedule.tikrar.time_end || '';
            }
          }
          if (class_pratikrar) {
            schedule_pratikrar_day = preferredSchedule.pra_tahfidz.day || '';
            schedule_pratikrar_time_start = preferredSchedule.pra_tahfidz.time_start || '';
            schedule_pratikrar_time_end = preferredSchedule.pra_tahfidz.time_end || '';
            if (backupSchedule?.pra_tahfidz) {
              schedule_pratikrar_day2 = backupSchedule.pra_tahfidz.day || '';
              schedule_pratikrar_time_start2 = backupSchedule.pra_tahfidz.time_start2 || backupSchedule.pra_tahfidz.time_start || '';
              schedule_pratikrar_time_end2 = backupSchedule.pra_tahfidz.time_end2 || backupSchedule.pra_tahfidz.time_end || '';
            }
          }
          if (class_paid) {
            schedule_paid_day = preferredSchedule.berbayar.day || '';
            schedule_paid_time_start = preferredSchedule.berbayar.time_start || '';
            schedule_paid_time_end = preferredSchedule.berbayar.time_end || '';
            if (backupSchedule?.berbayar) {
              schedule_paid_day2 = backupSchedule.berbayar.day || '';
              schedule_paid_time_start2 = backupSchedule.berbayar.time_start2 || backupSchedule.berbayar.time_start || '';
              schedule_paid_time_end2 = backupSchedule.berbayar.time_end2 || backupSchedule.berbayar.time_end || '';
            }
          }
        } else {
          // Legacy format mapping
          const legacyClassType = akad.class_type || '';
          if (legacyClassType.includes('tikrar_tahfidz')) {
            class_tikrar = true;
            schedule_tikrar_day = preferredSchedule?.day || '';
            schedule_tikrar_time_start = preferredSchedule?.time_start || '';
            schedule_tikrar_time_end = preferredSchedule?.time_end || '';
            schedule_tikrar_day2 = backupSchedule?.day || '';
            schedule_tikrar_time_start2 = backupSchedule?.time_start || '';
            schedule_tikrar_time_end2 = backupSchedule?.time_end || '';
          } else if (legacyClassType.includes('pra_tahfidz')) {
            class_pratikrar = true;
            schedule_pratikrar_day = preferredSchedule?.day || '';
            schedule_pratikrar_time_start = preferredSchedule?.time_start || '';
            schedule_pratikrar_time_end = preferredSchedule?.time_end || '';
            schedule_pratikrar_day2 = backupSchedule?.day || '';
            schedule_pratikrar_time_start2 = backupSchedule?.time_start || '';
            schedule_pratikrar_time_end2 = backupSchedule?.time_end || '';
          }
        }

        setFormData(prev => ({
          ...prev,
          preferred_juz: akad.preferred_juz ? (Array.isArray(akad.preferred_juz) ? akad.preferred_juz : akad.preferred_juz.split(', ')) : [],
          preferred_max_thalibah: akad.preferred_max_thalibah,
          class_tikrar,
          class_pratikrar,
          class_paid,
          paid_class_scheme: akad.paid_class_scheme || 'none',
          schedule_tikrar_day,
          schedule_tikrar_time_start,
          schedule_tikrar_time_end,
          schedule_tikrar_day2,
          schedule_tikrar_time_start2,
          schedule_tikrar_time_end2,
          schedule_pratikrar_day,
          schedule_pratikrar_time_start,
          schedule_pratikrar_time_end,
          schedule_pratikrar_day2,
          schedule_pratikrar_time_start2,
          schedule_pratikrar_time_end2,
          schedule_paid_day,
          schedule_paid_time_start,
          schedule_paid_time_end,
          schedule_paid_day2,
          schedule_paid_time_start2,
          schedule_paid_time_end2,
          understands_commitment: akad.understands_commitment || false,
        }));
      }
    } catch (error) {
      console.error('Error fetching profile/akad:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) throw new Error('Failed to fetch user data');
      const result = await response.json();
      if (result.success && result.data) {
        setUserData(result.data);
        if (result.data?.tanggal_lahir && !formData.age) {
          const birthDate = new Date(result.data.tanggal_lahir);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          setFormData(prev => ({ ...prev, age }));
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchBatchInfo = async (id: string) => {
    try {
      const { data, error } = await supabase.from('batches').select('*').eq('id', id).single();
      if (error) throw error;
      setBatchInfo(data);
    } catch (error) {
      console.error('Error fetching batch info:', error);
    }
  };

  const handleInputChange = (field: keyof MuallimahFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAgreedItemsToggle = (itemId: string) => {
    setFormData(prev => {
      const current = prev.agreed_items || [];
      const updated = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      
      return { 
        ...prev, 
        agreed_items: updated,
        understands_commitment: updated.length === commitmentQuestions.length
      };
    });
  };

  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const hasScheduleConflict = (
    dayA: string, startA: string, endA: string,
    dayB: string, startB: string, endB: string
  ): boolean => {
    if (!dayA || !startA || !endA || !dayB || !startB || !endB) return false;
    if (dayA.toLowerCase() !== dayB.toLowerCase()) return false;

    const startMinA = timeToMinutes(startA);
    const endMinA = timeToMinutes(endA);
    const startMinB = timeToMinutes(startB);
    const endMinB = timeToMinutes(endB);

    // Conflict if: startA < endB AND startB < endA
    return startMinA < endMinB && startMinB < endMinA;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const metaTajweed = getQuestionMeta('tajweed_institution');
    if (metaTajweed.is_active && metaTajweed.is_required && !formData.tajweed_institution?.trim()) {
      newErrors.tajweed_institution = `${metaTajweed.label} harus diisi`;
    }

    const metaQuran = getQuestionMeta('quran_institution');
    if (metaQuran.is_active && metaQuran.is_required && !formData.quran_institution?.trim()) {
      newErrors.quran_institution = `${metaQuran.label} harus diisi`;
    }

    const metaCommunities = getQuestionMeta('teaching_communities');
    if (metaCommunities.is_active && metaCommunities.is_required && !formData.teaching_communities?.trim()) {
      newErrors.teaching_communities = `${metaCommunities.label} harus diisi`;
    }

    const metaTajweedMatan = getQuestionMeta('memorized_tajweed_matan');
    if (metaTajweedMatan.is_active && metaTajweedMatan.is_required && !formData.memorized_tajweed_matan?.trim()) {
      newErrors.memorized_tajweed_matan = `${metaTajweedMatan.label} harus diisi`;
    }

    const metaMatanExegesis = getQuestionMeta('studied_matan_exegesis');
    if (metaMatanExegesis.is_active && metaMatanExegesis.is_required && !formData.studied_matan_exegesis?.trim()) {
      newErrors.studied_matan_exegesis = `${metaMatanExegesis.label} harus diisi`;
    }

    const metaLevel = getQuestionMeta('memorization_level');
    if (metaLevel.is_active && metaLevel.is_required && !formData.memorization_level) {
      newErrors.memorization_level = 'Pilih jumlah hafalan';
    }

    const metaMemorized = getQuestionMeta('memorized_juz');
    if (metaMemorized.is_active && metaMemorized.is_required && (!formData.memorized_juz || formData.memorized_juz.length === 0)) {
      newErrors.memorized_juz = 'Pilih minimal satu juz yang sudah dihafal';
    }

    const metaPreferred = getQuestionMeta('preferred_juz');
    if (metaPreferred.is_active && metaPreferred.is_required && (!formData.preferred_juz || formData.preferred_juz.length === 0)) {
      newErrors.preferred_juz = 'Pilih minimal satu juz yang ingin diampu';
    }
    
    // Validasi Pilihan Kelas Wajib
    const metaTikrar = getQuestionMeta('class_tikrar');
    const metaPratikrar = getQuestionMeta('class_pratikrar');
    const metaPaid = getQuestionMeta('class_paid');
    const metaPaidScheme = getQuestionMeta('paid_class_scheme');

    const activeRequiredClasses: string[] = [];
    if (metaTikrar.is_active) activeRequiredClasses.push('tikrar');
    if (metaPratikrar.is_active) activeRequiredClasses.push('pratikrar');

    if (activeRequiredClasses.length > 0) {
      const selectedTikrar = metaTikrar.is_active && formData.class_tikrar;
      const selectedPratikrar = metaPratikrar.is_active && formData.class_pratikrar;
      if (!selectedTikrar && !selectedPratikrar) {
        newErrors.class_selection = 'Pilih minimal salah satu kelas wajib yang aktif (Tikrar atau Pra-Tikrar)';
      }
    }

    // Validasi Detail Jadwal per Program
    if (metaTikrar.is_active && formData.class_tikrar) {
      if (!formData.schedule_tikrar_day) newErrors.schedule_tikrar_day = 'Pilih hari kelas Tikrar';
      if (!formData.schedule_tikrar_time_start) newErrors.schedule_tikrar_time_start = 'Pilih jam mulai kelas Tikrar';
      if (!formData.schedule_tikrar_time_end) newErrors.schedule_tikrar_time_end = 'Pilih jam selesai kelas Tikrar';
    }

    if (metaPratikrar.is_active && formData.class_pratikrar) {
      if (!formData.schedule_pratikrar_day) newErrors.schedule_pratikrar_day = 'Pilih hari kelas Pra-Tikrar';
      if (!formData.schedule_pratikrar_time_start) newErrors.schedule_pratikrar_time_start = 'Pilih jam mulai kelas Pra-Tikrar';
      if (!formData.schedule_pratikrar_time_end) newErrors.schedule_pratikrar_time_end = 'Pilih jam selesai kelas Pra-Tikrar';
    }

    if (metaPaid.is_active && formData.class_paid) {
      if (!formData.schedule_paid_day) newErrors.schedule_paid_day = 'Pilih hari kelas Berbayar';
      if (!formData.schedule_paid_time_start) newErrors.schedule_paid_time_start = 'Pilih jam mulai kelas Berbayar';
      if (!formData.schedule_paid_time_end) newErrors.schedule_paid_time_end = 'Pilih jam selesai kelas Berbayar';
      if (metaPaidScheme.is_active && (!formData.paid_class_scheme || formData.paid_class_scheme === 'none')) {
        newErrors.paid_class_scheme = 'Pilih skema kelas berbayar yang diajukan';
      }
    }

    // Deteksi Tumpang Tindih Jadwal (Schedule Conflict Detection)
    if (!newErrors.schedule_tikrar_day && !newErrors.schedule_pratikrar_day) {
      if (metaTikrar.is_active && formData.class_tikrar && metaPratikrar.is_active && formData.class_pratikrar) {
        if (hasScheduleConflict(
          formData.schedule_tikrar_day, formData.schedule_tikrar_time_start, formData.schedule_tikrar_time_end,
          formData.schedule_pratikrar_day, formData.schedule_pratikrar_time_start, formData.schedule_pratikrar_time_end
        )) {
          newErrors.schedule_conflict = 'Jadwal Utama kelas Tikrar and kelas Pra-Tikrar saling bertabrakan';
        }
      }
    }

    if (!newErrors.schedule_tikrar_day && !newErrors.schedule_paid_day) {
      if (metaTikrar.is_active && formData.class_tikrar && metaPaid.is_active && formData.class_paid) {
        if (hasScheduleConflict(
          formData.schedule_tikrar_day, formData.schedule_tikrar_time_start, formData.schedule_tikrar_time_end,
          formData.schedule_paid_day, formData.schedule_paid_time_start, formData.schedule_paid_time_end
        )) {
          newErrors.schedule_conflict = 'Jadwal Utama kelas Tikrar and kelas Berbayar saling bertabrakan';
        }
      }
    }

    if (!newErrors.schedule_pratikrar_day && !newErrors.schedule_paid_day) {
      if (metaPratikrar.is_active && formData.class_pratikrar && metaPaid.is_active && formData.class_paid) {
        if (hasScheduleConflict(
          formData.schedule_pratikrar_day, formData.schedule_pratikrar_time_start, formData.schedule_pratikrar_time_end,
          formData.schedule_paid_day, formData.schedule_paid_time_start, formData.schedule_paid_time_end
        )) {
          newErrors.schedule_conflict = 'Jadwal Utama kelas Pra-Tikrar and kelas Berbayar saling bertabrakan';
        }
      }
    }

    if (!formData.understands_commitment || formData.agreed_items.length < commitmentQuestions.length) {
      newErrors.understands_commitment = 'Harap setujui semua butir akad komitmen';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) {
      toast.error('Batch ID tidak ditemukan. Silakan kembali ke halaman pendaftaran.');
      return;
    }
    
    if (isFormSubmitted) return;
    
    if (!validateForm()) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      const result = await submitMuallimahRegistration(formData, userData, user, batchId);
      if (result.success) {
        setIsFormSubmitted(true);
        toast.success(result.message);
        // Clear auto-save draft on success
        if (user?.id) {
          localStorage.removeItem(`muallimah_draft_${user.id}`);
        }
        router.push('/dashboard');
      } else {
        toast.error(result.error || 'Gagal mengirim pendaftaran');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || batchLoading || questionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <Link href="/pendaftaran" className="text-sm text-gray-500 hover:text-green-600 mb-4 inline-block">
          ← Kembali ke Program
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Pendaftaran Mu'allimah</h1>
        <p className="text-gray-600 mt-2">
          {batchInfo?.name || 'Memuat...'} • Profil Permanen & Akad Batch
        </p>
      </div>

      {isFormSubmitted && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 font-medium">
            Pendaftaran Ukhti sedang dalam proses review. Data tidak dapat diubah saat ini.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Profile */}
        <Card className={profileExists ? "opacity-95 bg-gray-50/50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <GraduationCap className="w-6 h-6 text-green-600" />
              1. Profil & Latar Belakang
            </CardTitle>
            <CardDescription>
              Informasi ini disimpan secara permanen untuk semua batch di masa mendatang.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Read-only User Data from Profile */}
            <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 mb-2">
              <h3 className="text-sm font-bold text-green-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4" />
                Data Profil Dasar
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 uppercase">Nama Lengkap</Label>
                  <p className="text-sm font-medium">{userData?.full_name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 uppercase">Nama Kunyah</Label>
                  <p className="text-sm font-medium">{userData?.nama_kunyah || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 uppercase">Email</Label>
                  <p className="text-sm font-medium">{user?.email || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 uppercase">WhatsApp</Label>
                  <p className="text-sm font-medium">{userData?.whatsapp || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 uppercase">Telegram</Label>
                  <p className="text-sm font-medium">{userData?.telegram || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 uppercase">Pekerjaan</Label>
                  <p className="text-sm font-medium">{userData?.pekerjaan || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 uppercase">Tempat Lahir</Label>
                  <p className="text-sm font-medium">{userData?.tempat_lahir || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 uppercase">Zona Waktu</Label>
                  <p className="text-sm font-medium">{userData?.zona_waktu || 'WIB'}</p>
                </div>
                <div className="col-span-full space-y-1">
                  <Label className="text-xs text-gray-500 uppercase">Alamat Lengkap</Label>
                  <p className="text-sm font-medium">{userData?.alamat || '-'}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-green-100 flex items-center justify-between">
                <p className="text-[10px] text-green-600 italic">* Data di atas diambil dari profil akun Ukhti. Jika ingin mengubahnya, silakan hubungi admin.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getQuestionMeta('tajweed_institution').is_active && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {getQuestionMeta('tajweed_institution').label}
                    {getQuestionMeta('tajweed_institution').is_required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    placeholder={getQuestionMeta('tajweed_institution').description || "e.g. MTI, LTQ, dsb"} 
                    value={formData.tajweed_institution}
                    onChange={(e) => handleInputChange('tajweed_institution', e.target.value)}
                    disabled={isFormSubmitted}
                    className={errors.tajweed_institution ? "border-red-500" : ""}
                  />
                  {errors.tajweed_institution && <p className="text-xs text-red-500">{errors.tajweed_institution}</p>}
                  {getQuestionMeta('tajweed_institution').warning_text && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('tajweed_institution').warning_text}</p>
                  )}
                </div>
              )}
              {getQuestionMeta('quran_institution').is_active && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {getQuestionMeta('quran_institution').label}
                    {getQuestionMeta('quran_institution').is_required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    placeholder={getQuestionMeta('quran_institution').description || "e.g. Markaz Tikrar, dsb"}
                    value={formData.quran_institution}
                    onChange={(e) => handleInputChange('quran_institution', e.target.value)}
                    disabled={isFormSubmitted}
                    className={errors.quran_institution ? "border-red-500" : ""}
                  />
                  {errors.quran_institution && <p className="text-xs text-red-500">{errors.quran_institution}</p>}
                  {getQuestionMeta('quran_institution').warning_text && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('quran_institution').warning_text}</p>
                  )}
                </div>
              )}
              {getQuestionMeta('teaching_communities').is_active && (
                <div className="space-y-2 col-span-full">
                  <Label className="flex items-center gap-1">
                    {getQuestionMeta('teaching_communities').label}
                    {getQuestionMeta('teaching_communities').is_required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    placeholder={getQuestionMeta('teaching_communities').description || "e.g. LTQ A, Majelis Taklim B, dsb (kosongkan jika tidak ada)"}
                    value={formData.teaching_communities || ''}
                    onChange={(e) => handleInputChange('teaching_communities', e.target.value)}
                    disabled={isFormSubmitted}
                    className={errors.teaching_communities ? "border-red-500" : ""}
                  />
                  {errors.teaching_communities && <p className="text-xs text-red-500">{errors.teaching_communities}</p>}
                  {getQuestionMeta('teaching_communities').warning_text && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('teaching_communities').warning_text}</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getQuestionMeta('memorized_tajweed_matan').is_active && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {getQuestionMeta('memorized_tajweed_matan').label}
                    {getQuestionMeta('memorized_tajweed_matan').is_required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    placeholder={getQuestionMeta('memorized_tajweed_matan').description || "e.g. Tuhfatul Athfal, Jazariyah"}
                    value={formData.memorized_tajweed_matan}
                    onChange={(e) => handleInputChange('memorized_tajweed_matan', e.target.value)}
                    disabled={isFormSubmitted}
                    className={errors.memorized_tajweed_matan ? "border-red-500" : ""}
                  />
                  {errors.memorized_tajweed_matan && <p className="text-xs text-red-500">{errors.memorized_tajweed_matan}</p>}
                  {getQuestionMeta('memorized_tajweed_matan').warning_text && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('memorized_tajweed_matan').warning_text}</p>
                  )}
                </div>
              )}
              {getQuestionMeta('studied_matan_exegesis').is_active && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {getQuestionMeta('studied_matan_exegesis').label}
                    {getQuestionMeta('studied_matan_exegesis').is_required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    placeholder={getQuestionMeta('studied_matan_exegesis').description || "e.g. Aisar, dsb"}
                    value={formData.studied_matan_exegesis}
                    onChange={(e) => handleInputChange('studied_matan_exegesis', e.target.value)}
                    disabled={isFormSubmitted}
                    className={errors.studied_matan_exegesis ? "border-red-500" : ""}
                  />
                  {errors.studied_matan_exegesis && <p className="text-xs text-red-500">{errors.studied_matan_exegesis}</p>}
                  {getQuestionMeta('studied_matan_exegesis').warning_text && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('studied_matan_exegesis').warning_text}</p>
                  )}
                </div>
              )}
            </div>

            {getQuestionMeta('memorization_level').is_active && (
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-1">
                  {getQuestionMeta('memorization_level').label}
                  {getQuestionMeta('memorization_level').is_required && <span className="text-red-500">*</span>}
                </Label>
                <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-100 w-fit">
                  <Button
                    type="button"
                    onClick={() => {
                      const current = parseInt(formData.memorization_level) || 0;
                      if (current > 1) {
                        handleInputChange('memorization_level', String(current - 1));
                      } else if (current === 1) {
                        handleInputChange('memorization_level', '');
                      }
                    }}
                    disabled={isFormSubmitted || !formData.memorization_level}
                    className="h-10 w-10 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center font-bold text-xl transition-all active:scale-95 shadow-sm shrink-0"
                  >
                    -
                  </Button>
                  
                  <div className="flex flex-col items-center justify-center min-w-[120px]">
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      placeholder="Pilih Juz"
                      value={formData.memorization_level || ''}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        if (valStr === '') {
                          handleInputChange('memorization_level', '');
                          return;
                        }
                        let val = parseInt(valStr) || 1;
                        if (val < 1) val = 1;
                        if (val > 30) val = 30;
                        handleInputChange('memorization_level', String(val));
                      }}
                      disabled={isFormSubmitted}
                      className="h-10 w-20 text-center font-black text-lg border-gray-200 rounded-xl focus:ring-2 focus:ring-green-600/20 focus:border-green-600 bg-white"
                    />
                    <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                      {!formData.memorization_level ? 'Belum dipilih' : (parseInt(formData.memorization_level) === 30 ? '30 Juz (Kamil)' : `${formData.memorization_level} Juz`)}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      const current = parseInt(formData.memorization_level) || 0;
                      if (current < 30) {
                        handleInputChange('memorization_level', String(current + 1));
                      }
                    }}
                    disabled={isFormSubmitted || (parseInt(formData.memorization_level) || 0) >= 30}
                    className="h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center font-bold text-xl transition-all active:scale-95 shadow-md shrink-0"
                  >
                    +
                  </Button>
                </div>
                {errors.memorization_level && <p className="text-xs text-red-500 font-bold">{errors.memorization_level}</p>}
                {getQuestionMeta('memorization_level').warning_text && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('memorization_level').warning_text}</p>
                )}
              </div>
            )}

            <div className="space-y-6">
              {(getQuestionMeta('memorized_juz').is_active || getQuestionMeta('examined_juz').is_active || getQuestionMeta('certified_juz').is_active) && (
                <Label className="text-base font-semibold">Kompetensi Hafalan (Juz)</Label>
              )}
              
              <div className="space-y-4">
                {getQuestionMeta('memorized_juz').is_active && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      {getQuestionMeta('memorized_juz').label}
                      {getQuestionMeta('memorized_juz').is_required && <span className="text-red-500">*</span>}
                    </p>
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2 p-3 border rounded-xl bg-gray-50/30">
                      {allJuzOptions.map(juz => {
                        const isChecked = formData.memorized_juz.includes(juz.value);
                        return (
                          <label 
                            key={juz.value} 
                            className={`flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all border text-sm font-bold ${isChecked ? 'bg-green-700 border-green-700 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700'}`}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const newJuz = checked 
                                  ? [...formData.memorized_juz, juz.value]
                                  : formData.memorized_juz.filter(v => v !== juz.value);
                                handleInputChange('memorized_juz', newJuz);
                              }}
                              disabled={isFormSubmitted}
                              className="hidden"
                            />
                            {juz.value}
                          </label>
                        );
                      })}
                    </div>
                    {errors.memorized_juz && <p className="text-xs text-red-500 font-bold">{errors.memorized_juz}</p>}
                    {getQuestionMeta('memorized_juz').warning_text && (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('memorized_juz').warning_text}</p>
                    )}
                  </div>
                )}

                {getQuestionMeta('examined_juz').is_active && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      {getQuestionMeta('examined_juz').label}
                      {getQuestionMeta('examined_juz').is_required && <span className="text-red-500">*</span>}
                    </p>
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2 p-3 border rounded-xl bg-gray-50/30">
                      {allJuzOptions.map(juz => {
                        const isChecked = formData.examined_juz.includes(juz.value);
                        return (
                          <label 
                            key={`exm-${juz.value}`} 
                            className={`flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all border text-sm font-bold ${isChecked ? 'bg-amber-600 border-amber-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-amber-500 hover:text-amber-600'}`}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const newJuz = checked 
                                  ? [...formData.examined_juz, juz.value]
                                  : formData.examined_juz.filter(v => v !== juz.value);
                                handleInputChange('examined_juz', newJuz);
                              }}
                              disabled={isFormSubmitted}
                              className="hidden"
                            />
                            {juz.value}
                          </label>
                        );
                      })}
                    </div>
                    {getQuestionMeta('examined_juz').warning_text && (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('examined_juz').warning_text}</p>
                    )}
                  </div>
                )}

                {getQuestionMeta('certified_juz').is_active && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {getQuestionMeta('certified_juz').label}
                      {getQuestionMeta('certified_juz').is_required && <span className="text-red-500">*</span>}
                    </p>
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2 p-3 border rounded-xl bg-gray-50/30">
                      {allJuzOptions.map(juz => {
                        const isChecked = formData.certified_juz.includes(juz.value);
                        return (
                          <label 
                            key={`cert-${juz.value}`} 
                            className={`flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all border text-sm font-bold ${isChecked ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-500'}`}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const newJuz = checked 
                                  ? [...formData.certified_juz, juz.value]
                                  : formData.certified_juz.filter(v => v !== juz.value);
                                handleInputChange('certified_juz', newJuz);
                              }}
                              disabled={isFormSubmitted}
                              className="hidden"
                            />
                            {juz.value}
                          </label>
                        );
                      })}
                    </div>
                    {getQuestionMeta('certified_juz').warning_text && (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('certified_juz').warning_text}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Akad */}
        <Card className="shadow-md border-amber-200">
          <CardHeader className="bg-amber-50/50">
            <CardTitle className="flex items-center gap-2 text-xl text-amber-900">
              <Calendar className="w-6 h-6 text-amber-600" />
              2. Akad & Pilihan Program (Batch {batchInfo?.name || '...'})
            </CardTitle>
            <CardDescription className="text-amber-800/70">
              Pilih satu atau lebih program kelas yang bersedia Ukhti ampu serta tentukan jadwal masing-masing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            
            {/* Pemilihan Program Kelas (Checkbox Group) */}
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <Label className="text-base font-bold text-gray-900 block mb-2">Program Kelas yang Ingin Diampu</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Checkbox Kelas Tikrar */}
                {getQuestionMeta('class_tikrar').is_active && (
                  <div className="flex items-start space-x-3 p-4 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-colors">
                    <input 
                      type="checkbox"
                      id="class_tikrar"
                      checked={formData.class_tikrar}
                      onChange={(e) => handleInputChange('class_tikrar', e.target.checked)}
                      disabled={isFormSubmitted}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0 accent-green-600"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="class_tikrar" className="text-sm font-bold text-gray-800 cursor-pointer">
                        {getQuestionMeta('class_tikrar').label}
                      </Label>
                      <p className="text-xs text-gray-500">{getQuestionMeta('class_tikrar').description || "Kelas hafalan Al-Quran berulang (standard/ziyadah)."}</p>
                    </div>
                  </div>
                )}

                {/* Checkbox Kelas Pra-Tikrar */}
                {getQuestionMeta('class_pratikrar').is_active && (
                  <div className="flex items-start space-x-3 p-4 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-colors">
                    <input 
                      type="checkbox"
                      id="class_pratikrar"
                      checked={formData.class_pratikrar}
                      onChange={(e) => handleInputChange('class_pratikrar', e.target.checked)}
                      disabled={isFormSubmitted}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0 accent-green-600"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="class_pratikrar" className="text-sm font-bold text-gray-800 cursor-pointer">
                        {getQuestionMeta('class_pratikrar').label}
                      </Label>
                      <p className="text-xs text-gray-500">{getQuestionMeta('class_pratikrar').description || "Kelas persiapan dan pembekalan materi tajwid/tashih dasar."}</p>
                    </div>
                  </div>
                )}

                {/* Checkbox Kelas Berbayar */}
                {getQuestionMeta('class_paid').is_active && (
                  <div className="flex items-start space-x-3 p-4 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-colors">
                    <input 
                      type="checkbox"
                      id="class_paid"
                      checked={formData.class_paid}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleInputChange('class_paid', checked);
                        if (!checked) {
                          handleInputChange('paid_class_scheme', 'none');
                        }
                      }}
                      disabled={isFormSubmitted}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0 accent-green-600"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="class_paid" className="text-sm font-bold text-gray-800 cursor-pointer">
                        {getQuestionMeta('class_paid').label}
                      </Label>
                      <p className="text-xs text-gray-500">{getQuestionMeta('class_paid').description || "Mengajar kelas berbayar komersial sesuai kebijakan MTI."}</p>
                    </div>
                  </div>
                )}

              </div>
              {errors.class_selection && <p className="text-sm text-red-500 font-bold mt-2">{errors.class_selection}</p>}
            </div>

            {/* Jika Kelas Berbayar Aktif, Tampilkan Skema */}
            {getQuestionMeta('class_paid').is_active && formData.class_paid && getQuestionMeta('paid_class_scheme').is_active && (
              <div className="space-y-3 bg-amber-50/40 p-5 rounded-2xl border border-amber-100 animate-in slide-in-from-top-4 duration-200">
                <Label className="text-sm font-bold text-amber-900">{getQuestionMeta('paid_class_scheme').label}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select 
                    value={formData.paid_class_scheme} 
                    onValueChange={(v) => handleInputChange('paid_class_scheme', v)}
                    disabled={isFormSubmitted}
                  >
                    <SelectTrigger className="rounded-xl border-amber-200 bg-white">
                      <SelectValue placeholder="Pilih skema pengajuan kelas berbayar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="berbayar_100">Berbayar (100% Muallimah - Mengelola Mandiri)</SelectItem>
                      <SelectItem value="berbayar_80_20">Berbayar (Skema 80:20 - Didampingi Musyrifah)</SelectItem>
                      <SelectItem value="berbayar_60_40">Berbayar (Skema 60:40 - Insentif Khusus)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center">
                    <p className="text-xs text-amber-700 italic">
                      {getQuestionMeta('paid_class_scheme').description || "* Skema akan divalidasi lebih lanjut oleh tim manajemen."}
                    </p>
                  </div>
                </div>
                {errors.paid_class_scheme && <p className="text-xs text-red-500 font-medium">{errors.paid_class_scheme}</p>}
                {getQuestionMeta('paid_class_scheme').warning_text && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('paid_class_scheme').warning_text}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getQuestionMeta('preferred_max_thalibah').is_active && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">{getQuestionMeta('preferred_max_thalibah').label}</Label>
                  <Select 
                    value={String(formData.preferred_max_thalibah || 10)} 
                    onValueChange={(v) => handleInputChange('preferred_max_thalibah', parseInt(v))}
                    disabled={isFormSubmitted}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                      <SelectValue placeholder="Pilih maksimal tholibah" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((num) => (
                        <SelectItem key={num} value={String(num)}>{num} Orang</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getQuestionMeta('preferred_max_thalibah').warning_text && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('preferred_max_thalibah').warning_text}</p>
                  )}
                </div>
              )}
            </div>

            {getQuestionMeta('preferred_juz').is_active && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  {getQuestionMeta('preferred_juz').label}
                  {getQuestionMeta('preferred_juz').is_required && <span className="text-red-500">*</span>}
                </Label>
                {formData.memorized_juz.length === 0 ? (
                  <p className="text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-4">
                    ⚠️ Silakan pilih Juz yang sudah dihafal terlebih dahulu di bagian "Informasi Hafalan" di atas untuk dapat memilih Juz yang ingin diampu.
                  </p>
                ) : (
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2 p-3 border rounded-xl bg-white">
                    {allJuzOptions
                      .filter(juz => formData.memorized_juz.includes(juz.value))
                      .map(juz => {
                        const isChecked = formData.preferred_juz.includes(juz.value);
                        return (
                          <label 
                            key={`pref-${juz.value}`} 
                            className={`flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all border text-sm font-bold ${isChecked ? 'bg-green-700 border-green-700 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700'}`}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const newJuz = checked 
                                  ? [...formData.preferred_juz, juz.value]
                                  : formData.preferred_juz.filter(v => v !== juz.value);
                                handleInputChange('preferred_juz', newJuz);
                              }}
                              disabled={isFormSubmitted}
                              className="hidden"
                            />
                            {juz.value}
                          </label>
                        );
                      })}
                  </div>
                )}
                {errors.preferred_juz && <p className="text-xs text-red-500 font-medium">{errors.preferred_juz}</p>}
                {getQuestionMeta('preferred_juz').warning_text && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-1">{getQuestionMeta('preferred_juz').warning_text}</p>
                )}
              </div>
            )}

            {/* DYNAMIC JADWAL SECTION */}
            {getQuestionMeta('teaching_schedule').is_active && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <Label className="text-lg font-bold text-amber-900">{getQuestionMeta('teaching_schedule').label}</Label>
                </div>

                {errors.schedule_conflict && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-bold flex items-center gap-2 animate-bounce">
                    <Info className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{errors.schedule_conflict}</span>
                  </div>
                )}

                {/* JADWAL KELAS TIKRAR */}
                {getQuestionMeta('class_tikrar').is_active && formData.class_tikrar && (
                  <div className="space-y-4 bg-emerald-50/20 p-6 rounded-2xl border border-emerald-100/50 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                      <h3 className="text-base font-bold text-emerald-900">🗓️ Jadwal Kelas Tikrar</h3>
                      <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Aktif</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Tikrar Utama */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Jadwal Pilihan Utama</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-white rounded-xl border border-emerald-100/50">
                          <div>
                            <Label className="text-[10px] font-bold text-gray-500">Hari</Label>
                            <Select 
                              value={formData.schedule_tikrar_day} 
                              onValueChange={(v) => handleInputChange('schedule_tikrar_day', v)}
                              disabled={isFormSubmitted}
                            >
                              <SelectTrigger className={`h-9 bg-white border-gray-200 text-xs ${errors.schedule_tikrar_day ? "border-red-500" : ""}`}>
                                <SelectValue placeholder="Hari" />
                              </SelectTrigger>
                              <SelectContent>
                                {dayOptions.map(d => (
                                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-500">Jam Mulai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_tikrar_time_start}
                              onChange={(e) => handleInputChange('schedule_tikrar_time_start', e.target.value)}
                              disabled={isFormSubmitted}
                              className={`h-9 bg-white border-gray-200 text-xs ${errors.schedule_tikrar_time_start ? "border-red-500" : ""}`}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-500">Jam Selesai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_tikrar_time_end}
                              onChange={(e) => handleInputChange('schedule_tikrar_time_end', e.target.value)}
                              disabled={isFormSubmitted}
                              className={`h-9 bg-white border-gray-200 text-xs ${errors.schedule_tikrar_time_end ? "border-red-500" : ""}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tikrar Cadangan */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jadwal Cadangan (Opsional)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-white rounded-xl border border-gray-100">
                          <div>
                            <Label className="text-[10px] font-bold text-gray-400">Hari</Label>
                            <Select 
                              value={formData.schedule_tikrar_day2} 
                              onValueChange={(v) => handleInputChange('schedule_tikrar_day2', v)}
                              disabled={isFormSubmitted}
                            >
                              <SelectTrigger className="h-9 bg-white border-gray-200 text-xs">
                                <SelectValue placeholder="Hari" />
                              </SelectTrigger>
                              <SelectContent>
                                {dayOptions.map(d => (
                                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-400">Jam Mulai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_tikrar_time_start2}
                              onChange={(e) => handleInputChange('schedule_tikrar_time_start2', e.target.value)}
                              disabled={isFormSubmitted}
                              className="h-9 bg-white border-gray-200 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-400">Jam Selesai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_tikrar_time_end2}
                              onChange={(e) => handleInputChange('schedule_tikrar_time_end2', e.target.value)}
                              disabled={isFormSubmitted}
                              className="h-9 bg-white border-gray-200 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {(errors.schedule_tikrar_day || errors.schedule_tikrar_time_start || errors.schedule_tikrar_time_end) && (
                      <p className="text-xs text-red-500 font-bold mt-1">Harap lengkapi semua field Jadwal Utama kelas Tikrar.</p>
                    )}
                  </div>
                )}

                {/* JADWAL KELAS PRA-TIKRAR */}
                {getQuestionMeta('class_pratikrar').is_active && formData.class_pratikrar && (
                  <div className="space-y-4 bg-blue-50/20 p-6 rounded-2xl border border-blue-100/50 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                      <h3 className="text-base font-bold text-blue-900">🗓️ Jadwal Kelas Pra-Tikrar</h3>
                      <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Aktif</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Pra-Tikrar Utama */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Jadwal Pilihan Utama</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-white rounded-xl border border-blue-100/50">
                          <div>
                            <Label className="text-[10px] font-bold text-gray-500">Hari</Label>
                            <Select 
                              value={formData.schedule_pratikrar_day} 
                              onValueChange={(v) => handleInputChange('schedule_pratikrar_day', v)}
                              disabled={isFormSubmitted}
                            >
                              <SelectTrigger className={`h-9 bg-white border-gray-200 text-xs ${errors.schedule_pratikrar_day ? "border-red-500" : ""}`}>
                                <SelectValue placeholder="Hari" />
                              </SelectTrigger>
                              <SelectContent>
                                {dayOptions.map(d => (
                                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-500">Jam Mulai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_pratikrar_time_start}
                              onChange={(e) => handleInputChange('schedule_pratikrar_time_start', e.target.value)}
                              disabled={isFormSubmitted}
                              className={`h-9 bg-white border-gray-200 text-xs ${errors.schedule_pratikrar_time_start ? "border-red-500" : ""}`}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-500">Jam Selesai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_pratikrar_time_end}
                              onChange={(e) => handleInputChange('schedule_pratikrar_time_end', e.target.value)}
                              disabled={isFormSubmitted}
                              className={`h-9 bg-white border-gray-200 text-xs ${errors.schedule_pratikrar_time_end ? "border-red-500" : ""}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Pra-Tikrar Cadangan */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jadwal Cadangan (Opsional)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-white rounded-xl border border-gray-100">
                          <div>
                            <Label className="text-[10px] font-bold text-gray-400">Hari</Label>
                            <Select 
                              value={formData.schedule_pratikrar_day2} 
                              onValueChange={(v) => handleInputChange('schedule_pratikrar_day2', v)}
                              disabled={isFormSubmitted}
                            >
                              <SelectTrigger className="h-9 bg-white border-gray-200 text-xs">
                                <SelectValue placeholder="Hari" />
                              </SelectTrigger>
                              <SelectContent>
                                {dayOptions.map(d => (
                                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-400">Jam Mulai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_pratikrar_time_start2}
                              onChange={(e) => handleInputChange('schedule_pratikrar_time_start2', e.target.value)}
                              disabled={isFormSubmitted}
                              className="h-9 bg-white border-gray-200 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-400">Jam Selesai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_pratikrar_time_end2}
                              onChange={(e) => handleInputChange('schedule_pratikrar_time_end2', e.target.value)}
                              disabled={isFormSubmitted}
                              className="h-9 bg-white border-gray-200 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {(errors.schedule_pratikrar_day || errors.schedule_pratikrar_time_start || errors.schedule_pratikrar_time_end) && (
                      <p className="text-xs text-red-500 font-bold mt-1">Harap lengkapi semua field Jadwal Utama kelas Pra-Tikrar.</p>
                    )}
                  </div>
                )}

                {/* JADWAL KELAS BERBAYAR */}
                {getQuestionMeta('class_paid').is_active && formData.class_paid && (
                  <div className="space-y-4 bg-amber-50/20 p-6 rounded-2xl border border-amber-100/50 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                      <h3 className="text-base font-bold text-amber-900">🗓️ Jadwal Kelas Berbayar</h3>
                      <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Aktif</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Berbayar Utama */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Jadwal Pilihan Utama</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-white rounded-xl border border-amber-100/50">
                          <div>
                            <Label className="text-[10px] font-bold text-gray-500">Hari</Label>
                            <Select 
                              value={formData.schedule_paid_day} 
                              onValueChange={(v) => handleInputChange('schedule_paid_day', v)}
                              disabled={isFormSubmitted}
                            >
                              <SelectTrigger className={`h-9 bg-white border-gray-200 text-xs ${errors.schedule_paid_day ? "border-red-500" : ""}`}>
                                <SelectValue placeholder="Hari" />
                              </SelectTrigger>
                              <SelectContent>
                                {dayOptions.map(d => (
                                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-500">Jam Mulai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_paid_time_start}
                              onChange={(e) => handleInputChange('schedule_paid_time_start', e.target.value)}
                              disabled={isFormSubmitted}
                              className={`h-9 bg-white border-gray-200 text-xs ${errors.schedule_paid_time_start ? "border-red-500" : ""}`}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-500">Jam Selesai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_paid_time_end}
                              onChange={(e) => handleInputChange('schedule_paid_time_end', e.target.value)}
                              disabled={isFormSubmitted}
                              className={`h-9 bg-white border-gray-200 text-xs ${errors.schedule_paid_time_end ? "border-red-500" : ""}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Berbayar Cadangan */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jadwal Cadangan (Opsional)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-white rounded-xl border border-gray-100">
                          <div>
                            <Label className="text-[10px] font-bold text-gray-400">Hari</Label>
                            <Select 
                              value={formData.schedule_paid_day2} 
                              onValueChange={(v) => handleInputChange('schedule_paid_day2', v)}
                              disabled={isFormSubmitted}
                            >
                              <SelectTrigger className="h-9 bg-white border-gray-200 text-xs">
                                <SelectValue placeholder="Hari" />
                              </SelectTrigger>
                              <SelectContent>
                                {dayOptions.map(d => (
                                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-400">Jam Mulai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_paid_time_start2}
                              onChange={(e) => handleInputChange('schedule_paid_time_start2', e.target.value)}
                              disabled={isFormSubmitted}
                              className="h-9 bg-white border-gray-200 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-gray-400">Jam Selesai</Label>
                            <Input 
                              type="time" 
                              value={formData.schedule_paid_time_end2}
                              onChange={(e) => handleInputChange('schedule_paid_time_end2', e.target.value)}
                              disabled={isFormSubmitted}
                              className="h-9 bg-white border-gray-200 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {(errors.schedule_paid_day || errors.schedule_paid_time_start || errors.schedule_paid_time_end) && (
                      <p className="text-xs text-red-500 font-bold mt-1">Harap lengkapi semua field Jadwal Utama kelas Berbayar.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-6">
              <div className="p-6 bg-green-50/50 rounded-2xl border border-green-100/50">
                <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  Akad Komitmen & Etika Mu'allimah
                </h3>
                
                <div className="space-y-4">
                  {getQuestionMeta('commitment_info').is_active && (
                    <div className="text-sm text-green-800 font-medium mb-4 bg-green-100/30 p-4 rounded-xl border border-green-100/50 whitespace-pre-line">
                      <p className="font-bold mb-2 flex items-center gap-1.5">{getQuestionMeta('commitment_info').label}</p>
                      <p className="italic">{getQuestionMeta('commitment_info').description}</p>
                    </div>
                  )}
                  
                  {commitmentQuestions.map((item, index) => {
                    const icon = item.options && typeof item.options === 'object' && !Array.isArray(item.options) ? item.options.icon : '📝';
                    return (
                      <div key={item.field_key} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white/40 rounded-xl hover:bg-white/80 transition-colors group border border-transparent hover:border-green-200 hover:shadow-sm">
                        <div className="flex gap-4 items-start flex-1 cursor-pointer w-full" onClick={() => !isFormSubmitted && handleAgreedItemsToggle(item.field_key)}>
                          <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold shadow-sm border border-green-200">
                              {index + 1}
                            </div>
                            <span className="text-2xl" aria-hidden="true">{icon}</span>
                          </div>
                          <div className="flex-1 pt-2 min-w-0">
                            <Label 
                              htmlFor={`akad-${item.field_key}`}
                              className="text-sm sm:text-base text-green-800 leading-relaxed cursor-pointer group-hover:text-green-950 block"
                            >
                              <span className="font-normal block break-words">{item.label}</span>
                            </Label>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto flex justify-end">
                          <input 
                            type="checkbox"
                            id={`akad-${item.field_key}`}
                            checked={formData.agreed_items?.includes(item.field_key)}
                            onChange={() => handleAgreedItemsToggle(item.field_key)}
                            disabled={isFormSubmitted}
                            className="h-6 w-6 rounded border-green-400 text-green-600 focus:ring-green-500 cursor-pointer shrink-0 accent-green-600 shadow-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t border-green-100 flex items-center gap-3">
                   <div className={`w-3 h-3 rounded-full ${formData.understands_commitment ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-300'}`}></div>
                   <p className="text-sm font-bold text-green-900">
                     {formData.understands_commitment 
                       ? 'Bismillah, saya menyetujui seluruh akad di atas.' 
                       : `Harap centang ${commitmentQuestions.length - (formData.agreed_items?.length || 0)} butir akad lagi.`}
                   </p>
                </div>
                
                {errors.understands_commitment && (
                  <p className="mt-4 text-sm text-red-600 font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                    {errors.understands_commitment}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {!isFormSubmitted && (
          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
            <Button type="button" variant="ghost" onClick={() => router.push('/pendaftaran')} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white px-10 h-12 text-lg font-bold">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isEditMode ? 'Simpan Perubahan' : 'Kirim Pendaftaran & Akad'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

export default function MuallimahRegistrationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>}>
      <MuallimahRegistrationContent />
    </Suspense>
  );
}
