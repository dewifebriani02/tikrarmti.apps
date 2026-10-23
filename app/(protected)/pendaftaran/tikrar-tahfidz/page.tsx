'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useActiveBatch, useBatch } from '@/hooks/useBatches'
import { useMyRegistrations } from '@/hooks/useRegistrations'
import { useJuzOptions } from '@/hooks/useJuzOptions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Send, Info, CheckCircle, AlertCircle, ExternalLink, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { submitTikrarRegistration, getRegistrationQuestions } from './actions'
import { cn } from '@/lib/utils'

interface FormData {
  // Section 1 - Komitmen & Pemahaman
  understands_commitment: boolean
  tried_simulation: boolean
  no_negotiation: boolean
  has_telegram: boolean
  saved_contact: boolean

  // Section 2 - Izin & Pilihan Program
  has_permission: 'yes' | 'janda' | ''
  permission_name: string
  permission_phone: string
  permission_phone_validation: string
  chosen_juz: string
  no_travel_plans: boolean
  motivation: string
  ready_for_team: string
  infaq_amount: string

  // Section 3 - Waktu Setoran
  main_time_slot: string
  backup_time_slot: string
  time_commitment: boolean

  // Section 4 - Pemahaman Program
  understands_program: boolean
  questions: string
}

interface Question {
  id: string
  field_key: string
  section: number
  label: string
  description: string | null
  warning_text: string | null
  is_active: boolean
  is_required: boolean
  sort_order: number
}

interface NaikJuzEligibility {
  is_alumni: boolean
  previous_juz: string | null
  previous_batch_name: string | null
  chosen_juz: string | null
  is_naik_juz: boolean
  is_repeating: boolean
  total_completed: number
  target_completed: number
  is_40x_completed: boolean
  is_warrior_eligible: boolean
  can_proceed: boolean
  is_deadline_strict: boolean
  deadline_message: string | null
}

const FALLBACK_QUESTIONS: Record<string, { label: string; description: string | null; warning_text: string | null; is_required: boolean }> = {
  intro_text: {
    label: "Bismillah.. Hayyakillah Ahlan wasahlan kakak-kakak calon hafidzah..",
    description: "📝 Formulir ini adalah formulir pendaftaran untuk kelas hafalan Al-Qur'an gratis (syarat dan ketentuan berlaku) khusus akhawat, menggunakan metode pengulangan (tikrar) sebanyak 40 kali.\n\n📆 Durasi program: InsyaAllah selama 13 Pekan untuk target hafalan 1/2 juz.\n\nStruktur Program:\n📅 Pekan Pertama: Tashih\n📖 Pekan Selanjutnya: Ziyadah\n🕌 (Catatan: Hari libur akan disesuaikan dengan kalender nasional/MTI)\n📚 Pekan Terakhir: Muroja'ah dan Ujian\n\n🎯 Target hafalan harian: 1 halaman perpekan (1/4 halaman per hari, 4 hari dalam sepekan)\n\nKewajiban Program:\n✅ Tashih wajib sekali sepekan untuk kurikulum ziyadah pekan depan, jadwal menyesuaikan\n✅ Ujian wajib sekali sepekan untuk kurikulum selesai ziyadah pekanan, jadwal menyesuaikan\n✅ Setoran 40X boleh memilih mau bersama pasangan atau tidak (yang memilih tidak berpasangan hanya untuk yang bacaan sudah benar-benar mutqin)\n✅ Jadwal setoran pasangan boleh pilih opsi yang sudah ditentukan, akan kami carikan pasangan setoran semaksimal mungkin yang sama waktu dan zona waktu\n\n👨‍👩‍👧 Izin Keluarga/Wali\nUntuk mengikuti program ini, wajib mendapatkan izin dari suami, orang tua, majikan, atau wali, karena waktu Ukhti akan lebih banyak digunakan untuk menghafal. Jika sewaktu-waktu mereka mencabut izinnya, merekalah yang harus menghubungi pihak MTI untuk menyampaikan permohonan pengunduran diri.\n\n⚙️ Tentang Program\nSeluruh aturan kami susun demi kebaikan dan kelancaran program ini, bukan untuk mempersulit siapapun. Kami ingin menciptakan lingkungan yang serius dan kondusif bagi para penghafal Qur'an.\n\n⏳ Komitmen Waktu\nProgram ini membutuhkan komitmen waktu minimal 2 jam per hari membersamai Al Quran. Jika Ukhti memiliki jadwal yang padat, banyak tanggungan, atau merasa tidak bisa konsisten, kami sarankan untuk tidak mendaftar dulu. Tujuan kami adalah agar program ini berjalan dengan zero dropout dan zero blacklist.\n\n💡 Tentang Metode\nMetode Tikrar MTI kami rancang berdasarkan pengalaman para ibu yang mengajar dan belajar Al-Qur'an di tengah rutinitas rumah tangga. Metode ini cocok untuk emak-emak yang menghafal di rumah sambil mencuci, masak, mengurus anak dan suami.\n\n🚫 Tidak cocok untuk:\n• Tholibah yang bekerja full-time dan hanya memiliki waktu malam untuk keluarga\n• Mu'allimah yang sudah mutqin tapi tidak bisa menyelesaikan program karena kesibukan mengajar, belajar atau kesibukan pribadi\nNamun, jika ingin mengadopsi metode ini untuk diterapkan di halaqah masing-masing, silakan. Metode ini bebas dipakai, dimodifikasi, dan disebarluaskan.\n\n🧪 Simulasi Sebelum Daftar\nKarena metode pengulangan 40 kali bisa terasa berat, lama, dan membosankan, kami mensyaratkan calon peserta untuk mencoba simulasi:\n📖 Bacalah Surah An-Naba' ayat 1–11 sebanyak 40 kali.\nJika merasa sanggup, silakan lanjut mengisi formulir. Jika tidak, sebaiknya undur diri dari sekarang.\n\n🎯 Tujuan Program\nKami tidak mengejar kuantitas peserta, tetapi lebih fokus pada tholibah yang ikhlas, istiqamah, dan bersungguh-sungguh untuk menghafal dan menebar manfaat. Bagi yang masih banyak agenda dan belum bisa konsisten, lebih baik menunggu angkatan berikutnya.\n\n⚠️ Program Blacklist\nProgram ini menerapkan sistem Blacklist permanen bagi peserta yang mundur di tengah jalan tanpa alasan yang dapat kami terima, demi menjaga hak pasangan setoran dan stabilitas Nasional Markaz Tikrar Indonesia.",
    warning_text: "Bagi kakak-kakak yang sibuk, banyak kelas, ga bisa atur waktu dengan pasangan silahkan pilih program tanpa pasangan.\n\nJika Ukhti dinyatakan lolos seleksi administrasi dan tes bacaan, dan sudah daftar ulang, kami tidak meridhoi Ukhti keluar dari program tanpa udzur syar'i. Alasan seperti \"sibuk\", \"ada kerjaan\", atau \"ikut kelas lain\" tidak kami terima.\n\n✅ Alasan yang DITERIMA untuk mundur dari program:\n• Qadarullah, diri sendiri/orang tua/mertua/suami/anak sakit dan butuh perawatan intensif\n• Qadarullah, hamil muda dan mengalami ngidam atau mual berat yang menyulitkan untuk mengikuti program\n• Qadarullah, terjadi bencana alam yang menghambat kelanjutan program\n• Udzur lain yang darurat, mendesak, dan tidak terduga, yang dapat kami maklumi\n\n🚩 Peringatan Serius: Kami tidak ridho jika Ukhti submit formulir pendaftaran ini hanya untuk iseng atau kepo saja, karena hanya merepotkan proses seleksi. Jika hanya ingin kepo saja silahkan baca di Web markaztikrar.id.",
    is_required: false
  },
  commitment_info: {
    label: "🤝 Komitmen & Etika",
    description: "• Program ini melibatkan banyak pihak dan pasangan setoran. Kami berusaha menyesuaikan jadwal dengan pilihan Ukhti sendiri.\n• Harap meluruskan niat, menjaga komitmen, tidak banyak mengeluh, dan tidak mementingkan diri sendiri\n• Jaga adab kepada seluruh tim Tikrar MTI dan pasangan setoran masing-masing\n• Keputusan kelulusan tes administrasi dan bacaan bersifat final dan tidak dapat diganggu gugat\n• Program ini baru 3 angkatan, kami akui masih banyak kekurangan/ketidaksempurnaan di sana-sini, kami berusaha melakukan semaksimal mungkin energi kami untuk program ini.\n• Kami tidak melayani tuntutan professionalisme berlebih atau kesempurnaan seakan kami menjual jasa dengan harga tarif professional, kami hanya kumpulan emak-emak yang berkomitmen ingin emak-emak se-bumi Allah merasakan nikmatnya berproses menghafal Al Quran dengan metode tikrar, merasakan nikmatnya berkomunitas dengan sahabat-sahabat Al Quran. Sebagaimana yang telah kami rasakan dari guru-guru kami.\n• MTI adalah rumah bagi kita, yang anggotanya adalah keluarga bagaikan ibu dengan anak, kakak dengan adik, yang saling melengkapi kelemahan dan kekurangan masing-masing untuk kebaikan denqan target berkumpul di Jannah Firdaus Al-'Ala. (No Baper, No Drama).",
    warning_text: null,
    is_required: false
  },
  understands_commitment: {
    label: "Apakah Ukhti sudah faham dengan semua poin di atas dan bersedia menerima segala komitmen?",
    description: "Bismillah.. Alhamdulillah ana sudah dengar dan sudah paham dan insyaAllah ikhlas menerima segala komitmen dan berusaha menjalankannya semaksimal mungkin.",
    warning_text: null,
    is_required: true
  },
  tried_simulation: {
    label: "Apakah Ukhti sudah mencoba simulasi mengulang membaca Surat An-Naba' ayat 1-11 sebanyak 40X (Jika belum silahkan coba dulu, sebelum melanjutkan)",
    description: "Alhamdulillah saya sudah mencoba simulasi mengulang membaca Surat An-Naba' ayat 1-11 sebanyak 40X",
    warning_text: "Kami tidak melayani calon tolibah yang nego-nego jumlah tikrar, walaupun Ukhti hanya ingin murojaah/sudah pernah hafal.",
    is_required: true
  },
  no_negotiation: {
    label: "Saya berjanji ga akan nego-nego jumlah tikrar",
    description: "Bismillah.. Alhamdulillah sudah dan saya berjanji ga akan nego-nego jumlah tikrar",
    warning_text: "Kami tidak melayani calon tolibah yang nego-nego jumlah tikrar, walaupun Ukhti hanya ingin muroja'ah/sudah pernah hafal.",
    is_required: true
  },
  has_telegram: {
    label: "Apakah Ukhti sudah faham jika program ini juga mewajibkan tholibah untuk mempunyai aplikasi telegram untuk proses seleksi?",
    description: "Bismillah.. Alhamdulillah saya sudah download telegram di hp saya",
    warning_text: "Mohon maaf kami tidak akan mengecek VN seleksi yang dikirim lewat whatsapp jika ada kendala pada aplikasi, karena keterbatasan memori hp admin.",
    is_required: true
  },
  saved_contact: {
    label: "Apakah Ukhti sudah simpan nomor Whatsapp Admin Kak Mara 0813-1365-0842, Uni Dewi 0856-771-2914, Kak Dewi Nurhayati 0895-1898-4279, Kak Donna 0812-1224-0079, Kak Ucy 0822-2937-0282, Kak Lina 0853-4011-4111, Kak Vivi 0857-0623-2865, Kak Wara 0822-2010-0262?",
    description: "Bismillah.. Alhamdulillah saya sudah simpan nomor hp Kak Mara, Uni Dewi, dan admin lainnya.",
    warning_text: "Yang akan di-add ke grup hanya yang bisa langsung kak Mara add saja.. kami tidak akan mengirimkan invitation link bagi yang tidak bisa di-add karena tidak mau save nomor admin.",
    is_required: true
  },
  has_permission: {
    label: "Apakah Ukhti sudah meminta izin kepada suami/ orang tua/majikan/wali yang bertanggung jawab atas diri Ukhti?",
    description: "(Jika belum silahkan minta izin, jika tidak diizinkan mohon bersabar, berdoa kepada Allah semoga Allah mudahkan pada angkatan selanjutnya)",
    warning_text: null,
    is_required: true
  },
  permission_name: {
    label: "Nama suami/ orang tua/majikan/wali yang bertanggung jawab atas diri Ukhti dan yang sudah memberikan izin Ukhti untuk ikut program ini",
    description: "Ketik nama sesuai KTP",
    warning_text: null,
    is_required: true
  },
  permission_phone: {
    label: "No HP suami/ orang tua/majikan/wali yang bertanggung jawab atas diri Ukhti dan yang sudah memberikan izin Ukhti untuk ikut program ini",
    description: "08xx-xxxx-xxxx",
    warning_text: null,
    is_required: true
  },
  chosen_juz: {
    label: "Pilihan juz yang akan dihafalkan",
    description: "Pilih salah satu pilihan juz",
    warning_text: null,
    is_required: true
  },
  no_travel_plans: {
    label: "Apakah Ukhti sudah merencanakan atau safar, mudik, umrah atau liburan di luar jadwal liburan MTI?",
    description: "InsyaAllah saya tidak ada rencana safar, kalaupun tiba-tiba safar saya akan bertanggungjawab memprioritaskan waktu untuk memenuhi kewajiban setoran kepada pasangan",
    warning_text: "Program ini akan insyaAllah biidznillah akan dilaksanakan selama 13 pekan. Apabila Ukhti sudah merencanakan atau safar, mudik, umrah atau liburan di luar jadwal liburan MTI yang menyesuaikan dengan liburan anak-anak sekolah, kami sarankan menunda pendaftaran pada angkatan berikutnya. Kami tidak menerima alasan mudik/safar yang mendzholimi jadwal pasangan setoran Ukhti.",
    is_required: true
  },
  motivation: {
    label: "Ketikkan secara singkat apa motivasi terbesar Ukhti untuk menghafal Al-Quran sehingga Ukhti rela mengikuti program ini dan ikhlas menjalankan semua aturan-peraturan dari MTI?",
    description: "Jelaskan motivasi Ukhti...",
    warning_text: null,
    is_required: true
  },
  ready_for_team: {
    label: "Apakah Ukhti siap dan bersedia menjadi bagian tim MTI apabila kami anggap sudah layak menjadi khadimat Al-Quran sebagai mu'allimah atau musyrifah untuk turut membantu MTI dalam misi memberantas buta huruf Al-Quran di Indonesia?",
    description: "Opsi komitmen khidmat / infaq bulanan thalibah.",
    warning_text: null,
    is_required: true
  },
  main_time_slot: {
    label: "Pilih waktu utama untuk jadwal setoran dengan pasangan",
    description: "Pilih waktu utama",
    warning_text: null,
    is_required: true
  },
  backup_time_slot: {
    label: "Pilih waktu cadangan untuk jadwal setoran dengan pasangan",
    description: "Pilih waktu cadangan",
    warning_text: null,
    is_required: true
  },
  time_commitment: {
    label: "Akad waktu",
    description: "Saya sudah memilih jadwal waktu utama dan cadangan dengan mempertimbangkan jadwal harian dan kegiatan saya. Saya terima ini sebagai akad yang akan saya pertanggungjawabkan di hadapan Allah apabila saya mendzolimi waktu pasangan setoran saya dengan alasan-alasan yang tidak urgen.",
    warning_text: null,
    is_required: true
  },
  understands_program: {
    label: "Apakah Ukhti faham dengan poin-poin di atas?",
    description: "Memahami kewajiban tashih, ujian, ziyadah, murojaah, dan ketentuan Counter Manual / Al-Qur'an Tikrar.",
    warning_text: null,
    is_required: true
  },
  questions: {
    label: "Silahkan ketik pertanyaan Ukhti apabila ada yang masih kurang faham",
    description: "Ketik pertanyaan Ukhti di sini (kosongkan jika tidak ada)",
    warning_text: null,
    is_required: false
  }
}

const STORAGE_KEY = 'tikrar_registration_draft'

export default function ThalibahBatch2Page() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(true)

  useEffect(() => {
    async function loadQuestions() {
      try {
        const result = await getRegistrationQuestions()
        if (result.success && result.data) {
          setQuestions(result.data as Question[])
        }
      } catch (error) {
        console.error('Error fetching questions:', error)
      } finally {
        setQuestionsLoading(false)
      }
    }
    loadQuestions()
  }, [])

  const getQuestionMeta = (key: string) => {
    const dbQ = questions.find(q => q.field_key === key)
    if (dbQ) {
      return {
        label: dbQ.label,
        description: dbQ.description,
        warning_text: dbQ.warning_text,
        is_required: dbQ.is_required,
        is_active: dbQ.is_active
      }
    }
    const fallback = FALLBACK_QUESTIONS[key]
    return {
      ...fallback,
      is_active: true
    }
  }
  const { user, isLoading, isAuthenticated, isUnauthenticated } = useAuth()
  const { activeBatch, isLoading: activeBatchLoading } = useActiveBatch()
  const searchParams = useSearchParams()
  const urlBatchId = searchParams.get('batchId')
  const urlProgramId = searchParams.get('programId')
  const editModeParam = searchParams.get('edit') === 'true'

  // Use specific batch from URL if provided, otherwise fallback to activeBatch
  const { batch: urlBatch, isLoading: urlBatchLoading } = useBatch(urlBatchId || undefined)
  
  const activeBatchData = urlBatch || activeBatch
  const batchLoading = activeBatchLoading || urlBatchLoading

  const { juzOptions, isLoading: juzLoading } = useJuzOptions()
  const { registrations, mutate: mutateRegistrations } = useMyRegistrations()
  const supabase = createClient()
  const [isCreating, setIsCreating] = useState(false)
  const [isAlumni, setIsAlumni] = useState(false)
  const [naikJuzEligibility, setNaikJuzEligibility] = useState<NaikJuzEligibility | null>(null)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [murojaahCommitmentChecked, setMurojaahCommitmentChecked] = useState(false)


  // Check if user is an alumnus and has not filled in their testimonial
  useEffect(() => {
    async function checkAlumniStatus() {
      try {
        const res = await fetch('/api/alumni/testimonial/my')
        if (res.ok) {
          const data = await res.json()
          if (data.isAlumni) {
            setIsAlumni(true)
            if (!data.testimonial) {
              toast.error('Afwan Ukhti, Ukhti harus mengisi testimoni alumni terlebih dahulu.')
              router.push('/alumni')
            }
          }
        }
      } catch (err) {
        console.error('Error checking alumni status:', err)
      }
    }
    if (user) {
      checkAlumniStatus()
    }
  }, [user, router])

  const [isMounted, setIsMounted] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [currentSection, setCurrentSection] = useState(0) // Start at section 0 for data diri confirmation
  const [isEditMode, setIsEditMode] = useState(editModeParam)
  const [existingRegistrationId, setExistingRegistrationId] = useState<string | null>(null)
  // Guards against re-prefilling (and clobbering in-progress edits) if `tikrarRegistration`
  // reference changes later (e.g. SWR revalidation after mutateRegistrations()).
  const hasPrefilledRef = React.useRef(false)

  // Check if user is already registered for Tikrah Tahfidz program
  const tikrarRegistration = useMemo(() => {
    return registrations.find(reg =>
      reg.batch_id === activeBatchData?.id &&
      (reg.status === 'approved' || reg.status === 'pending')
    )
  }, [registrations, activeBatchData])

  // Check if user can register (not registered or in edit mode)
  const canRegister = useMemo(() => {
    return !tikrarRegistration || isEditMode
  }, [tikrarRegistration, isEditMode])

  // Check if user profile is complete
  const isProfileComplete = useMemo(() => {
    return userProfile?.full_name && userProfile?.tanggal_lahir && userProfile?.tempat_lahir &&
      userProfile?.pekerjaan && userProfile?.alasan_daftar && userProfile?.jenis_kelamin && userProfile?.negara
  }, [userProfile])

  // Load existing registration data or draft from localStorage on mount.
  // NOTE: previously gated on `!isEditMode`, which meant this never ran when the user
  // arrived via the "Edit" link (which sets ?edit=true, so isEditMode starts as true) —
  // the form rendered empty and, since existingRegistrationId stayed null, submitting
  // would INSERT a brand new registration instead of UPDATE-ing the existing one.
  // Fixed by prefilling whenever a registration exists, guarded by a ref so it only
  // runs once and doesn't clobber in-progress edits on later SWR revalidations.
  useEffect(() => {
    if (tikrarRegistration && !hasPrefilledRef.current) {
      hasPrefilledRef.current = true
      // User has existing registration, populate form for editing
      setExistingRegistrationId(tikrarRegistration.id)
      setIsEditMode(true)

      const registrationData = tikrarRegistration as any
      setFormData({
        understands_commitment: registrationData.understands_commitment || false,
        tried_simulation: registrationData.tried_simulation || false,
        no_negotiation: registrationData.no_negotiation || false,
        has_telegram: registrationData.has_telegram || false,
        saved_contact: registrationData.saved_contact || false,
        has_permission: registrationData.has_permission || '',
        permission_name: registrationData.permission_name || '',
        permission_phone: registrationData.permission_phone || '',
        permission_phone_validation: '',
        chosen_juz: registrationData.chosen_juz || '',
        no_travel_plans: registrationData.no_travel_plans || false,
        motivation: registrationData.motivation || '',
        ready_for_team: registrationData.ready_for_team || '',
        infaq_amount: registrationData.infaq_amount || '',
        main_time_slot: registrationData.main_time_slot || '',
        backup_time_slot: registrationData.backup_time_slot || '',
        time_commitment: registrationData.time_commitment || false,
        understands_program: registrationData.understands_program || false,
        questions: registrationData.questions || ''
      })
    } else if (typeof window !== 'undefined' && !tikrarRegistration && !hasPrefilledRef.current) {
      try {
        const savedDraft = localStorage.getItem(STORAGE_KEY)
        if (savedDraft) {
          const draft = JSON.parse(savedDraft)
          // Only restore if it's from the same user
          if (draft.user_id === user?.id) {
            // Convert old boolean format to new string format for has_permission
            const formData = draft.formData
            if (typeof formData.has_permission === 'boolean') {
              formData.has_permission = formData.has_permission ? 'yes' : ''
            }
            setFormData(formData)
            setCurrentSection(draft.currentSection || 1)
          }
        }
      } catch (error) {
        console.error('Error loading draft:', error)
      }
    }
  }, [tikrarRegistration, user?.id])

  // Fetch user profile data from users table
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id && isAuthenticated) {
        try {
          const response = await fetch('/api/auth/me')
          if (response.ok) {
            const result = await response.json()
            // The result contains user data in result.data or result.user
            const userData = result.data || result.user || result
            setUserProfile(userData)
            console.log('User profile loaded:', userData)
          } else {
            console.error('Failed to fetch user profile:', response.status)
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
        }
      }
    }
    fetchUserProfile()
  }, [user?.id, isAuthenticated])

  const [formData, setFormData] = useState<FormData>({
    understands_commitment: false,
    tried_simulation: false,
    no_negotiation: false,
    has_telegram: false,
    saved_contact: false,
    has_permission: '',
    permission_name: '',
    permission_phone: '',
    permission_phone_validation: '',
    chosen_juz: '',
    no_travel_plans: false,
    motivation: '',
    ready_for_team: '',
    infaq_amount: '',
    main_time_slot: '',
    backup_time_slot: '',
    time_commitment: false,
    understands_program: false,
    questions: ''
  })

  // Check eligibility for naik juz (Murojaah 40X requirement)
  useEffect(() => {
    async function checkNaikJuzEligibility() {
      if (!formData.chosen_juz || !user) {
        setNaikJuzEligibility(null)
        return
      }
      setCheckingEligibility(true)
      try {
        const batchParam = activeBatchData?.id ? '&batch_id=' + encodeURIComponent(activeBatchData.id) : ''
        const res = await fetch('/api/alumni/murojaah-40x/eligibility-naik-juz?chosen_juz=' + encodeURIComponent(formData.chosen_juz) + batchParam)
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setNaikJuzEligibility(json.data)
          }
        }
      } catch (err) {
        console.error('Error checking naik juz eligibility:', err)
      } finally {
        setCheckingEligibility(false)
      }
    }

    checkNaikJuzEligibility()
  }, [formData.chosen_juz, activeBatchData?.id, user])


  // Auto-save to localStorage
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try {
        const draft = {
          user_id: user?.id,
          formData,
          currentSection,
          timestamp: new Date().toISOString()
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
      } catch (error) {
        console.error('Error saving draft:', error)
      }
    }
  }, [formData, currentSection, isMounted, user?.id])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'success_update' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string>('')
  const [redirectTimer, setRedirectTimer] = useState<NodeJS.Timeout | null>(null)

  const totalSections = 5 // Section 0 (Data Diri) + Sections 1-4
  const progressPercentage = ((currentSection) / (totalSections - 1)) * 100

  // Handle component mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Auto-scroll to first error field when validation fails
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      // Small delay to ensure error messages are rendered
      const timer = setTimeout(() => {
        // Find first error message (text-red-500 class is used for errors)
        const errorMessages = document.querySelectorAll('.text-red-500')
        if (errorMessages.length > 0) {
          const firstError = errorMessages[0] as HTMLElement
          // Get the parent container that contains the field
          const fieldContainer = firstError.closest('.space-y-2, .space-y-3') as HTMLElement
          if (fieldContainer) {
            fieldContainer.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Try to focus the input/select inside the container
            const inputElement = fieldContainer.querySelector('input, select, textarea') as HTMLElement
            if (inputElement && typeof inputElement.focus === 'function') {
              inputElement.focus()
            }
          }
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [errors])

  // Cleanup redirect timer when component unmounts or status changes
  React.useEffect(() => {
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer)
      }
    }
  }, [redirectTimer])

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', { day: 'numeric',
        month: 'long',
        year: 'numeric', timeZone: 'Asia/Jakarta' });
    } catch (e) {
      return dateString || '';
    }
  };

  const formatDateRange = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start || !end) return '';
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const validateSection = (section: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (section === 0) {
      // Section 0 is data diri confirmation - just check if profile is complete
      if (!isProfileComplete) {
        newErrors.profile = 'Profil belum lengkap. Silakan lengkapi profil terlebih dahulu.'
      }
    }

    if (section === 1) {
      const qCommitment = getQuestionMeta('understands_commitment')
      if (qCommitment.is_active && qCommitment.is_required && !formData.understands_commitment) {
        newErrors.understands_commitment = 'Wajib menyetujui komitmen program'
      }
      
      const qSimulation = getQuestionMeta('tried_simulation')
      if (qSimulation.is_active && qSimulation.is_required && !formData.tried_simulation) {
        newErrors.tried_simulation = 'Wajib mencoba simulasi terlebih dahulu'
      }
      
      const qNoNeg = getQuestionMeta('no_negotiation')
      if (qNoNeg.is_active && qNoNeg.is_required && !formData.no_negotiation) {
        newErrors.no_negotiation = 'Wajib menyetujui tidak menego jumlah tikrar'
      }
      
      const qTelegram = getQuestionMeta('has_telegram')
      if (qTelegram.is_active && qTelegram.is_required && !formData.has_telegram) {
        newErrors.has_telegram = 'Wajib memiliki aplikasi Telegram'
      }
      
      const qContact = getQuestionMeta('saved_contact')
      if (qContact.is_active && qContact.is_required && !formData.saved_contact) {
        newErrors.saved_contact = 'Wajib menyimpan nomor kontak admin'
      }
    }

    if (section === 2) {
      const qPermission = getQuestionMeta('has_permission')
      if (qPermission.is_active) {
        if (qPermission.is_required && !formData.has_permission) {
          newErrors.has_permission = 'Wajib memiliki izin dari yang bertanggung jawab'
        }
        
        // For janda, permission fields are optional
        const isJanda = formData.has_permission === 'janda'
        if (!isJanda) {
          const qPermName = getQuestionMeta('permission_name')
          if (qPermName.is_active && qPermName.is_required && !formData.permission_name.trim()) {
            newErrors.permission_name = 'Nama pemberi izin harus diisi'
          }
          const qPermPhone = getQuestionMeta('permission_phone')
          if (qPermPhone.is_active) {
            if (qPermPhone.is_required && !formData.permission_phone.trim()) {
              newErrors.permission_phone = 'Nomor HP pemberi izin harus diisi'
            }
            if (formData.permission_phone !== formData.permission_phone_validation) {
              newErrors.permission_phone_validation = 'Validasi nomor HP tidak cocok'
            }
          }
        }
      }
      
      const qChosenJuz = getQuestionMeta('chosen_juz')
      if (qChosenJuz.is_active && qChosenJuz.is_required && !formData.chosen_juz) {
        newErrors.chosen_juz = 'Pilih salah satu pilihan juz'
      } else if (naikJuzEligibility?.is_alumni && naikJuzEligibility.is_naik_juz && !naikJuzEligibility.is_40x_completed) {
        if (naikJuzEligibility.is_deadline_strict) {
          newErrors.chosen_juz = 'Syarat naik juz belum terpenuhi: Murojaah 40X untuk juz sebelumnya wajib diselesaikan tuntas (40 putaran) mulai Batch 4 ke atas.'
        } else if (!murojaahCommitmentChecked) {
          newErrors.murojaah_commitment = 'Ukhti wajib menyetujui komitmen menyelesaikan Murojaah 40X sebelum pembukaan Batch 4.'
        }
      }
      
      const qTravel = getQuestionMeta('no_travel_plans')
      if (qTravel.is_active && qTravel.is_required && !formData.no_travel_plans) {
        newErrors.no_travel_plans = 'Wajib menyetujui tidak ada rencana safar'
      }
      
      const qMotivation = getQuestionMeta('motivation')
      if (qMotivation.is_active && qMotivation.is_required && !formData.motivation.trim()) {
        newErrors.motivation = 'Motivasi harus diisi'
      }
      
      const qReady = getQuestionMeta('ready_for_team')
      if (qReady.is_active) {
        if (qReady.is_required && !formData.ready_for_team) {
          newErrors.ready_for_team = 'Pilih salah satu opsi'
        } else if (formData.ready_for_team === 'infaq' && !formData.infaq_amount) {
          newErrors.infaq_amount = 'Pilih nominal infaq bulanan'
        }
      }
    }

    if (section === 3) {
      const qMainSlot = getQuestionMeta('main_time_slot')
      if (qMainSlot.is_active && qMainSlot.is_required && !formData.main_time_slot) {
        newErrors.main_time_slot = 'Pilih waktu utama'
      }
      const qBackupSlot = getQuestionMeta('backup_time_slot')
      if (qBackupSlot.is_active && qBackupSlot.is_required && !formData.backup_time_slot) {
        newErrors.backup_time_slot = 'Pilih waktu cadangan'
      }
      const qTimeCommit = getQuestionMeta('time_commitment')
      if (qTimeCommit.is_active && qTimeCommit.is_required && !formData.time_commitment) {
        newErrors.time_commitment = 'Wajib menyetujui komitmen waktu'
      }
    }

    if (section === 4) {
      const qUnderstandsProg = getQuestionMeta('understands_program')
      if (qUnderstandsProg.is_active && qUnderstandsProg.is_required && !formData.understands_program) {
        newErrors.understands_program = 'Wajib memahami program'
      }
      const qQuestions = getQuestionMeta('questions')
      if (qQuestions.is_active && qQuestions.is_required && !formData.questions.trim()) {
        newErrors.questions = 'Pertanyaan wajib diisi'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateSection(currentSection)) {
      if (currentSection < totalSections) {
        setCurrentSection(currentSection + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1)
    }
  }

  // Scroll to top of form when section changes
  useEffect(() => {
    if (isMounted) {
      const timer = setTimeout(() => {
        const formElement = document.querySelector('form') as HTMLElement
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentSection, isMounted])

  const handleSubmit = async () => {
    if (!validateSection(currentSection)) return
    if (!user?.id || !activeBatchData) {
      toast.error('User atau batch tidak ditemukan')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      // Use Server Action for mutation (follows arsitektur.md)
      const result = await submitTikrarRegistration(
        formData,
        userProfile,
        user,
        activeBatchData,
        isEditMode,
        existingRegistrationId || undefined
      )

      if (result.success) {
        toast.success(result.message)
        setSubmitStatus((result.status || 'success') as 'idle' | 'success' | 'success_update' | 'error')

        // Clear draft after successful submission
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
        }

        // Refresh registrations cache
        mutateRegistrations()

        // Redirect to dashboard after 3 seconds
        const timer = setTimeout(() => {
          router.push('/dashboard')
        }, 3000)

        setRedirectTimer(timer)
      } else {
        toast.error(result.error || 'Gagal mengirim pendaftaran')
        setSubmitError(result.error || 'Terjadi kesalahan saat mengirim formulir')
        setSubmitStatus('error')
      }
    } catch (error: any) {
      console.error('Submit error:', error)
      const errorMessage = error?.message || 'Terjadi kesalahan tidak terduga'
      toast.error(errorMessage)
      setSubmitError(errorMessage)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderSection0 = () => (
    <div className="space-y-4 sm:space-y-6">
      <Alert className="bg-green-50 border-green-200">
        <Info className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
        <AlertDescription className="text-green-800 text-sm sm:text-base font-medium">
          Konfirmasi Data Diri
        </AlertDescription>
      </Alert>

      {!isProfileComplete ? (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <p className="font-semibold mb-2">Profil <em>Ukhti</em> belum lengkap!</p>
            <p className="mb-3">Silakan lengkapi data diri <em>Ukhti</em> terlebih dahulu sebelum mendaftar.</p>
            <Button
              onClick={() => router.push('/lengkapi-profile?returnTo=/pendaftaran/tikrar-tahfidz')}
              className="bg-red-600 hover:bg-red-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Lengkapi Profil Sekarang
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4 bg-gray-50 p-4 sm:p-6 rounded-lg">
          <h3 className="font-bold text-lg sm:text-xl text-gray-800 mb-4">Konfirmasi Data Diri</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">Nama Lengkap</p>
              <p className="text-gray-900 font-semibold">{userProfile?.full_name || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">Email</p>
              <p className="text-gray-900 font-semibold">{user?.email || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">No. WhatsApp</p>
              <p className="text-gray-900 font-semibold">{userProfile?.whatsapp || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">No. Telegram</p>
              <p className="text-gray-900 font-semibold">{userProfile?.telegram || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">Tanggal Lahir</p>
              <p className="text-gray-900 font-semibold">{userProfile?.tanggal_lahir || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">Tempat Lahir</p>
              <p className="text-gray-900 font-semibold">{userProfile?.tempat_lahir || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">Jenis Kelamin</p>
              <p className="text-gray-900 font-semibold">{userProfile?.jenis_kelamin || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">Pekerjaan</p>
              <p className="text-gray-900 font-semibold">{userProfile?.pekerjaan || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">Negara</p>
              <p className="text-gray-900 font-semibold">{userProfile?.negara || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">Provinsi</p>
              <p className="text-gray-900 font-semibold">{userProfile?.provinsi || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">Kota</p>
              <p className="text-gray-900 font-semibold">{userProfile?.kota || '-'}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-gray-600 font-medium">Alamat Lengkap</p>
              <p className="text-gray-900 font-semibold">{userProfile?.alamat || '-'}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-gray-600 font-medium">Alasan Mendaftar</p>
              <p className="text-gray-900 font-semibold">{userProfile?.alasan_daftar || '-'}</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm font-medium">
              Data diri <em>Ukhti</em> sudah lengkap. Silakan lanjut ke section berikutnya untuk mengisi formulir pendaftaran.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const renderSection1 = () => (
    <div className="space-y-4 sm:space-y-6">
      <Alert className="bg-green-50 border-green-200">
        <Info className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
        <AlertDescription className="text-green-800 text-sm sm:text-base font-medium uppercase">
          FORMULIR PENDAFTARAN TIKRAR MTI {activeBatchData?.name || '...'}
        </AlertDescription>
      </Alert>
 
      {getQuestionMeta('intro_text').is_active && (
        <div className="bg-blue-50 p-4 sm:p-6 md:p-8 rounded-2xl border border-blue-100 shadow-sm space-y-5 animate-in fade-in duration-300">
          <h3 className="font-bold text-lg sm:text-xl text-green-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-600" />
            {getQuestionMeta('intro_text').label}
          </h3>
          
          {getQuestionMeta('intro_text').description && (
            <div className="text-sm sm:text-base text-gray-700 leading-relaxed space-y-4 whitespace-pre-wrap">
              {getQuestionMeta('intro_text').description}
            </div>
          )}

          {getQuestionMeta('intro_text').warning_text && (
            <div className="mt-6 p-5 bg-amber-50 rounded-xl border border-amber-200 shadow-inner">
              <p className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Peringatan Penting
              </p>
              <div className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                {getQuestionMeta('intro_text').warning_text}
              </div>
            </div>
          )}
        </div>
      )}
 
      {getQuestionMeta('commitment_info').is_active && (
        <div className="mt-4 p-5 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg">
          <p className="text-center text-base text-green-800 font-medium mb-3">
            {getQuestionMeta('commitment_info').label}
          </p>
          <div className="text-sm text-gray-700 space-y-2 whitespace-pre-line">
            {getQuestionMeta('commitment_info').description}
          </div>
        </div>
      )}
 
      <div className="space-y-6 sm:space-y-8">
        {getQuestionMeta('understands_commitment').is_active && (
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm sm:text-base font-semibold text-gray-800">
              {getQuestionMeta('understands_commitment').label}
              {getQuestionMeta('understands_commitment').is_required && <span className="text-red-500">*</span>}
            </Label>
            {getQuestionMeta('understands_commitment').warning_text && (
              <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border-2 border-yellow-300">
                <p className="text-xs sm:text-sm text-yellow-800 font-semibold mb-1.5 sm:mb-2">⚠️ Peringatan Penting:</p>
                <p className="text-xs sm:text-sm text-yellow-700">{getQuestionMeta('understands_commitment').warning_text}</p>
              </div>
            )}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start space-x-2 sm:space-x-4 p-3 sm:p-4 border-2 rounded-lg hover:bg-green-50 transition-all duration-200 cursor-pointer hover:border-green-300">
                <input
                  type="radio"
                  name="understands_commitment"
                  id="understands_commitment_yes"
                  value="yes"
                  checked={formData.understands_commitment}
                  onChange={() => handleInputChange('understands_commitment', true)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="understands_commitment_yes" className="text-sm sm:text-base font-medium text-gray-700 cursor-pointer flex-1">
                  {getQuestionMeta('understands_commitment').description}
                </Label>
              </div>
            </div>
            {errors.understands_commitment && (
              <p className="text-red-500 text-xs sm:text-sm font-medium">{errors.understands_commitment}</p>
            )}
          </div>
        )}
 
        {getQuestionMeta('tried_simulation').is_active && (
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm sm:text-base font-semibold text-gray-800">
              {getQuestionMeta('tried_simulation').label}
              {getQuestionMeta('tried_simulation').is_required && <span className="text-red-500">*</span>}
            </Label>
            {getQuestionMeta('tried_simulation').warning_text && (
              <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border-2 border-yellow-300">
                <p className="text-xs sm:text-sm text-yellow-800 font-semibold mb-1.5 sm:mb-2">⚠️ Peringatan Penting:</p>
                <p className="text-xs sm:text-sm text-yellow-700">{getQuestionMeta('tried_simulation').warning_text}</p>
              </div>
            )}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start space-x-2 sm:space-x-4 p-3 sm:p-4 border-2 rounded-lg hover:bg-green-50 transition-all duration-200 cursor-pointer hover:border-green-300">
                <input
                  type="radio"
                  name="tried_simulation"
                  id="tried_simulation_yes"
                  value="yes"
                  checked={formData.tried_simulation}
                  onChange={() => handleInputChange('tried_simulation', true)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="tried_simulation_yes" className="text-sm sm:text-base font-medium text-gray-700 cursor-pointer flex-1">
                  {getQuestionMeta('tried_simulation').description}
                </Label>
              </div>
            </div>
            {errors.tried_simulation && (
              <p className="text-red-500 text-xs sm:text-sm font-medium">{errors.tried_simulation}</p>
            )}
          </div>
        )}
 
        {getQuestionMeta('no_negotiation').is_active && (
          <div className="space-y-2 sm:space-y-3">
            {getQuestionMeta('no_negotiation').warning_text && (
              <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border-2 border-yellow-300 mb-2">
                <p className="text-xs sm:text-sm text-yellow-800 font-semibold mb-1.5 sm:mb-2">⚠️ Peringatan Penting:</p>
                <p className="text-xs sm:text-sm text-yellow-700">{getQuestionMeta('no_negotiation').warning_text}</p>
              </div>
            )}
            <Label className="text-sm sm:text-base font-semibold text-gray-800">
              {getQuestionMeta('no_negotiation').label}
              {getQuestionMeta('no_negotiation').is_required && <span className="text-red-500">*</span>}
            </Label>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start space-x-2 sm:space-x-4 p-3 sm:p-4 border-2 rounded-lg hover:bg-green-50 transition-all duration-200 cursor-pointer hover:border-green-300">
                <input
                  type="radio"
                  name="no_negotiation"
                  id="no_negotiation_yes"
                  value="yes"
                  checked={formData.no_negotiation}
                  onChange={() => handleInputChange('no_negotiation', true)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="no_negotiation_yes" className="text-sm sm:text-base font-medium text-gray-700 cursor-pointer flex-1">
                  {getQuestionMeta('no_negotiation').description}
                </Label>
              </div>
            </div>
            {errors.no_negotiation && (
              <p className="text-red-500 text-xs sm:text-sm font-medium">{errors.no_negotiation}</p>
            )}
          </div>
        )}
 
        {getQuestionMeta('has_telegram').is_active && (
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm sm:text-base font-semibold text-gray-800">
              {getQuestionMeta('has_telegram').label}
              {getQuestionMeta('has_telegram').is_required && <span className="text-red-500">*</span>}
            </Label>
            {getQuestionMeta('has_telegram').warning_text && (
              <p className="text-xs sm:text-sm text-gray-500 italic mb-2">
                {getQuestionMeta('has_telegram').warning_text}
              </p>
            )}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start space-x-2 sm:space-x-4 p-3 sm:p-4 border-2 rounded-lg hover:bg-green-50 transition-all duration-200 cursor-pointer hover:border-green-300">
                <input
                  type="radio"
                  name="has_telegram"
                  id="has_telegram_yes"
                  value="yes"
                  checked={formData.has_telegram}
                  onChange={() => handleInputChange('has_telegram', true)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="has_telegram_yes" className="text-sm sm:text-base font-medium text-gray-700 cursor-pointer flex-1">
                  {getQuestionMeta('has_telegram').description}
                </Label>
              </div>
            </div>
            {errors.has_telegram && (
              <p className="text-red-500 text-xs sm:text-sm font-medium">{errors.has_telegram}</p>
            )}
          </div>
        )}
 
        {getQuestionMeta('saved_contact').is_active && (
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm sm:text-base font-semibold text-gray-800">
              {getQuestionMeta('saved_contact').label}
              {getQuestionMeta('saved_contact').is_required && <span className="text-red-500">*</span>}
            </Label>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start space-x-2 sm:space-x-4 p-3 sm:p-4 border-2 rounded-lg hover:bg-green-50 transition-all duration-200 cursor-pointer hover:border-green-300">
                <input
                  type="radio"
                  name="saved_contact"
                  id="saved_contact_yes"
                  value="yes"
                  checked={formData.saved_contact}
                  onChange={() => handleInputChange('saved_contact', true)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="saved_contact_yes" className="text-sm sm:text-base font-medium text-gray-700 cursor-pointer flex-1">
                  {getQuestionMeta('saved_contact').description}
                </Label>
              </div>
            </div>
            {getQuestionMeta('saved_contact').warning_text && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                ⚠️ {getQuestionMeta('saved_contact').warning_text}
              </p>
            )}
            {errors.saved_contact && (
              <p className="text-red-500 text-xs sm:text-sm font-medium">{errors.saved_contact}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const renderSection2 = () => (
    <div className="space-y-4 sm:space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm sm:text-base font-medium">
          Izin & Pilihan Program
        </AlertDescription>
      </Alert>
 
      <div className="space-y-6 sm:space-y-8">
        {getQuestionMeta('has_permission').is_active && (
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-800">
              {getQuestionMeta('has_permission').label}
              {getQuestionMeta('has_permission').is_required && <span className="text-red-500">*</span>}
            </Label>
            {getQuestionMeta('has_permission').description && (
              <p className="text-sm text-gray-500 italic">
                {getQuestionMeta('has_permission').description}
              </p>
            )}
            {getQuestionMeta('has_permission').warning_text && (
              <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border-2 border-yellow-300">
                <p className="text-xs sm:text-sm text-yellow-800 font-semibold mb-1.5 sm:mb-2">⚠️ Peringatan Penting:</p>
                <p className="text-xs sm:text-sm text-yellow-700">{getQuestionMeta('has_permission').warning_text}</p>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-start space-x-4 p-4 border-2 rounded-lg hover:bg-green-50 transition-all duration-200 cursor-pointer hover:border-green-300">
                <input
                  type="radio"
                  name="has_permission"
                  id="has_permission_yes"
                  value="yes"
                  checked={formData.has_permission === 'yes'}
                  onChange={() => handleInputChange('has_permission', 'yes' as const)}
                  className="mt-1 w-5 h-5 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="has_permission_yes" className="text-base font-medium text-gray-700 cursor-pointer flex-1">
                  Bismillah.. Alhamdulillah sudah (ini jawaban saya sejujur-jujurnya yang akan saya pertanggungjawabkan di akhirat nanti)
                </Label>
              </div>
              <div className="flex items-start space-x-4 p-4 border-2 rounded-lg hover:bg-green-50 transition-all duration-200 cursor-pointer hover:border-green-300">
                <input
                  type="radio"
                  name="has_permission"
                  id="has_permission_janda"
                  value="janda"
                  checked={formData.has_permission === 'janda'}
                  onChange={() => handleInputChange('has_permission', 'janda' as const)}
                  className="mt-1 w-5 h-5 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="has_permission_janda" className="text-base font-medium text-gray-700 cursor-pointer flex-1">
                  Bismillah.. Saya seorang janda yang mandiri, tidak terikat, tidak perlu persetujuan siapapun dan mengikuti program ini tidak akan mempengaruhi siapapun
                </Label>
              </div>
            </div>
            {errors.has_permission && (
              <p className="text-red-500 text-sm font-medium">{errors.has_permission}</p>
            )}
          </div>
        )}
 
        {/* Permission fields - only show if not janda and has_permission is active */}
        {formData.has_permission !== 'janda' && getQuestionMeta('has_permission').is_active && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getQuestionMeta('permission_name').is_active && (
                <div className="space-y-2">
                  <Label htmlFor="permission_name" className="text-base font-semibold text-gray-800">
                    {getQuestionMeta('permission_name').label}
                    {getQuestionMeta('permission_name').is_required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="permission_name"
                    value={formData.permission_name}
                    onChange={(e) => handleInputChange('permission_name', e.target.value)}
                    placeholder={getQuestionMeta('permission_name').description || "Ketik nama sesuai KTP"}
                    className="text-base py-3"
                  />
                  {errors.permission_name && (
                    <p className="text-red-500 text-sm font-medium">{errors.permission_name}</p>
                  )}
                </div>
              )}
 
              {getQuestionMeta('permission_phone').is_active && (
                <div className="space-y-2">
                  <Label htmlFor="permission_phone" className="text-base font-semibold text-gray-800">
                    {getQuestionMeta('permission_phone').label}
                    {getQuestionMeta('permission_phone').is_required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="permission_phone"
                    value={formData.permission_phone}
                    onChange={(e) => handleInputChange('permission_phone', e.target.value)}
                    placeholder={getQuestionMeta('permission_phone').description || "08xx-xxxx-xxxx"}
                    className="text-base py-3"
                  />
                  {errors.permission_phone && (
                    <p className="text-red-500 text-sm font-medium">{errors.permission_phone}</p>
                  )}
                </div>
              )}
            </div>
 
            {getQuestionMeta('permission_phone').is_active && (
              <div className="space-y-3">
                <Label htmlFor="permission_phone_validation" className="text-base font-semibold text-gray-800">
                  Validasi isi sekali lagi {getQuestionMeta('permission_phone').label}
                  {getQuestionMeta('permission_phone').is_required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="permission_phone_validation"
                  value={formData.permission_phone_validation}
                  onChange={(e) => handleInputChange('permission_phone_validation', e.target.value)}
                  placeholder="Ketik ulang nomor HP"
                  className="text-base py-3"
                />
                {errors.permission_phone_validation && (
                  <p className="text-red-500 text-sm font-medium">{errors.permission_phone_validation}</p>
                )}
              </div>
            )}
          </>
        )}
 
        {/* Info message for janda */}
        {formData.has_permission === 'janda' && getQuestionMeta('has_permission').is_active && (
          <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
            <p className="text-sm text-green-800">
              ✓ Sebagai janda yang mandiri, Ukhti tidak perlu mengisi data suami/wali. Data diri Ukhti akan digunakan sebagai kontak penanggung jawab.
            </p>
          </div>
        )}
 
        {getQuestionMeta('chosen_juz').is_active && (
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-800">
              {getQuestionMeta('chosen_juz').label}
              {getQuestionMeta('chosen_juz').is_required && <span className="text-red-500">*</span>}
            </Label>
            {getQuestionMeta('chosen_juz').description && (
              <p className="text-sm text-gray-400">
                {getQuestionMeta('chosen_juz').description}
              </p>
            )}
            <Select value={formData.chosen_juz} onValueChange={(value) => handleInputChange('chosen_juz', value)} disabled={juzLoading}>
              <SelectTrigger className="text-base py-3">
                <SelectValue placeholder={juzLoading ? "Memuat pilihan juz..." : "Pilih juz"} />
              </SelectTrigger>
              <SelectContent>
                {juzOptions
                  .filter((juz) => isAlumni || juz.code.endsWith('A') || juz.code.endsWith('a'))
                  .map((juz) => (
                    <SelectItem key={juz.id} value={juz.code}>
                      {juz.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.chosen_juz && (
              <p className="text-red-500 text-sm font-medium">{errors.chosen_juz}</p>
            )}

            {/* Status & Banner Validasi Naik Juz (Murojaah 40X) */}
            {checkingEligibility && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground py-1">
                <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Memeriksa kelayakan syarat naik juz (Murojaah 40X)...</span>
              </div>
            )}

            {!checkingEligibility && naikJuzEligibility?.is_alumni && (
              <div className="mt-2 space-y-2">
                {/* Kasus 1: Naik Juz & Sudah Tuntas 40X */}
                {naikJuzEligibility.is_naik_juz && naikJuzEligibility.is_40x_completed && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-sm">
                    <div className="flex items-center space-x-2 font-semibold">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span>Syarat Naik Juz Terpenuhi!</span>
                      {naikJuzEligibility.is_warrior_eligible && (
                        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          🏆 Murojaah Warrior
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-emerald-800">
                      Alhamdulillah! Ukhti telah menuntaskan Murojaah 40X untuk juz sebelumnya ({naikJuzEligibility.previous_juz}) sebanyak <strong>{naikJuzEligibility.total_completed}/40 putaran</strong>. Ukhti memenuhi syarat untuk melanjutkan ke <strong>{formData.chosen_juz}</strong>.
                    </p>
                  </div>
                )}

                {/* Kasus 2: Naik Juz & Belum Tuntas 40X, tapi SEBELUM Batch 4 (Boleh Dicicil dengan Komitmen) */}
                {naikJuzEligibility.is_naik_juz && !naikJuzEligibility.is_40x_completed && !naikJuzEligibility.is_deadline_strict && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 text-sm space-y-3">
                    <div className="flex items-center space-x-2 font-semibold text-amber-900">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span>Catatan Syarat Naik Juz (Murojaah 40X)</span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-900">
                      Ukhti mendaftar naik juz dari <strong>{naikJuzEligibility.previous_juz}</strong> ke <strong>{formData.chosen_juz}</strong>. Progres Murojaah 40X Ukhti saat ini tercatat <strong>{naikJuzEligibility.total_completed} dari 40 putaran</strong>.
                    </p>
                    <p className="text-xs sm:text-sm text-amber-800 bg-amber-100/60 p-2.5 rounded border border-amber-200">
                      💡 <strong>Aturan Program:</strong> Murojaah 40X adalah syarat wajib naik juz, namun dapat dicicil dan wajib tuntas sebelum pembukaan <strong>Batch 4</strong>. Ukhti dapat melanjutkan pendaftaran ini dengan menyetujui komitmen di bawah.
                    </p>

                    <div className="flex items-start space-x-3 p-3 bg-white/80 border border-amber-300 rounded-md">
                      <Checkbox
                        id="murojaah_commitment"
                        checked={murojaahCommitmentChecked}
                        onCheckedChange={(checked) => {
                          setMurojaahCommitmentChecked(!!checked)
                          if (errors.murojaah_commitment) {
                            setErrors(prev => ({ ...prev, murojaah_commitment: '' }))
                          }
                        }}
                        className="mt-0.5"
                      />
                      <Label htmlFor="murojaah_commitment" className="text-xs sm:text-sm font-medium text-amber-950 cursor-pointer">
                        Saya memahami bahwa Murojaah 40X adalah syarat wajib naik juz dan berkomitmen menuntaskan sisa {40 - naikJuzEligibility.total_completed} putaran di Ruang Alumni sebelum pembukaan Batch 4.
                      </Label>
                    </div>
                    {errors.murojaah_commitment && (
                      <p className="text-red-500 text-xs sm:text-sm font-medium">{errors.murojaah_commitment}</p>
                    )}

                    <div>
                      <a
                        href="/alumni"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-amber-800 underline font-medium hover:text-amber-950"
                      >
                        Buka Ruang Alumni untuk mencatat putaran Murojaah 40X <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Kasus 3: Naik Juz & Belum Tuntas 40X di BATCH 4 KE ATAS (Hard Block) */}
                {naikJuzEligibility.is_naik_juz && !naikJuzEligibility.is_40x_completed && naikJuzEligibility.is_deadline_strict && (
                  <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-950 text-sm space-y-2">
                    <div className="flex items-center space-x-2 font-semibold text-red-900">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span>Belum Memenuhi Syarat Naik Juz (Wajib Tuntas 40X Mulai Batch 4)</span>
                    </div>
                    <p className="text-xs sm:text-sm text-red-900">
                      Pendaftaran Batch 4 ke atas mewajibkan penyelesaian tuntas 40 putaran Murojaah 40X untuk juz sebelumnya (<strong>{naikJuzEligibility.previous_juz}</strong>) sebelum dapat naik ke <strong>{formData.chosen_juz}</strong>.
                    </p>
                    <p className="text-xs sm:text-sm text-red-800">
                      Progres tercatat: <strong>{naikJuzEligibility.total_completed}/40 putaran</strong> (kurang {40 - naikJuzEligibility.total_completed} putaran lagi).
                    </p>
                    <div className="pt-1">
                      <a
                        href="/alumni"
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition"
                      >
                        Tuntaskan Putaran di Ruang Alumni <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Kasus 4: Mengulang Juz Yang Sama */}
                {naikJuzEligibility.is_repeating && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs sm:text-sm flex items-start space-x-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      Ukhti memilih untuk mengulang juz <strong>{formData.chosen_juz}</strong> (sama dengan {naikJuzEligibility.previous_batch_name}). Murojaah 40X sangat dianjurkan untuk memperkokoh hafalan, namun bukan syarat wajib untuk mengulang juz yang sama.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
 
        {getQuestionMeta('no_travel_plans').is_active && (
          <div className="space-y-2">
            {getQuestionMeta('no_travel_plans').warning_text && (
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300 mb-2">
                <p className="text-sm text-blue-800 font-semibold mb-2">Informasi Program:</p>
                <p className="text-sm text-blue-700">
                  {getQuestionMeta('no_travel_plans').warning_text}
                </p>
              </div>
            )}
            <Label className="text-sm font-medium text-gray-700">
              {getQuestionMeta('no_travel_plans').label}
              {getQuestionMeta('no_travel_plans').is_required && <span className="text-red-500">*</span>}
            </Label>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="no_travel_plans"
                  id="no_travel_plans_yes"
                  value="yes"
                  checked={formData.no_travel_plans}
                  onChange={() => handleInputChange('no_travel_plans', true)}
                  className="mt-1 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="no_travel_plans_yes" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                  {getQuestionMeta('no_travel_plans').description}
                </Label>
              </div>
            </div>
            {errors.no_travel_plans && (
              <p className="text-red-500 text-xs">{errors.no_travel_plans}</p>
            )}
          </div>
        )}
 
        {getQuestionMeta('motivation').is_active && (
          <div className="space-y-2">
            <Label htmlFor="motivation" className="text-sm font-medium text-gray-700">
              {getQuestionMeta('motivation').label}
              {getQuestionMeta('motivation').is_required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="motivation"
              value={formData.motivation}
              onChange={(e) => handleInputChange('motivation', e.target.value)}
              rows={3}
              placeholder={getQuestionMeta('motivation').description || "Jelaskan motivasi Ukhti..."}
              className="text-sm"
            />
            {errors.motivation && (
              <p className="text-red-500 text-xs">{errors.motivation}</p>
            )}
          </div>
        )}
 
        {getQuestionMeta('ready_for_team').is_active && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              {getQuestionMeta('ready_for_team').label}
              {getQuestionMeta('ready_for_team').is_required && <span className="text-red-500">*</span>}
            </Label>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="ready_for_team"
                  id="ready"
                  value="ready"
                  checked={formData.ready_for_team === 'ready'}
                  onChange={() => handleInputChange('ready_for_team', 'ready')}
                  className="mt-1 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="ready" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                  InsyaAllah siapppp (jawaban ini kami catat sebagai akad)
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="ready_for_team"
                  id="infaq"
                  value="infaq"
                  checked={formData.ready_for_team === 'infaq'}
                  onChange={() => {
                    handleInputChange('ready_for_team', 'infaq');
                    if (!formData.infaq_amount) {
                      handleInputChange('infaq_amount', '25.000');
                    }
                  }}
                  className="mt-1 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="infaq" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                  Afwan saya tidak bisa menjadi tim MTI dikarenakan kesibukan dan komitmen di lembaga lain, sebagai gantinya saya akan akad infaq wajib perbulan dengan pilihan 25, 50, 100 atau lebih dari 100 ribu rupiah perbulan sesuai dengan kemampuan saya, selama saya masih aktif pada {activeBatchData?.name || 'Batch Aktif'} MTI
                </Label>
              </div>
 
              {formData.ready_for_team === 'infaq' && (
                <div className="mt-3 ml-8 p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Label className="text-sm font-bold text-emerald-950 block mb-1">
                    Nominal Infaq Wajib Per Bulan<span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['25.000', '50.000', '100.000', 'Lainnya'].map((val) => {
                      const isSelected = val === 'Lainnya' 
                        ? !['25.000', '50.000', '100.000'].includes(formData.infaq_amount)
                        : formData.infaq_amount === val;
                      
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            if (val === 'Lainnya') {
                              handleInputChange('infaq_amount', '');
                            } else {
                              handleInputChange('infaq_amount', val);
                            }
                          }}
                          className={cn(
                            "py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg border transition-all duration-200 text-center",
                            isSelected 
                              ? "bg-green-600 text-white border-green-600 shadow-sm"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          )}
                        >
                          {val === 'Lainnya' ? 'Lainnya' : `Rp ${val}`}
                        </button>
                      );
                    })}
                  </div>
                  
                  {(!['25.000', '50.000', '100.000'].includes(formData.infaq_amount)) && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-250">
                      <Label htmlFor="custom_infaq" className="text-xs font-semibold text-emerald-800">Masukkan Nominal Infaq Lainnya (Rp)</Label>
                      <Input
                        id="custom_infaq"
                        type="text"
                        value={formData.infaq_amount.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                        onChange={(e) => {
                          const rawVal = e.target.value.replace(/\D/g, '');
                          const formatted = rawVal.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                          handleInputChange('infaq_amount', formatted);
                        }}
                        placeholder="Contoh: 150.000"
                        className="text-base py-3"
                      />
                    </div>
                  )}
                  
                  {errors.infaq_amount && (
                    <p className="text-red-500 text-xs sm:text-sm font-medium">{errors.infaq_amount}</p>
                  )}
                </div>
              )}
            </div>
            {errors.ready_for_team && (
              <p className="text-red-500 text-xs">{errors.ready_for_team}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const renderSection3 = () => (
    <div className="space-y-6">
      <Alert className="bg-purple-50 border-purple-200">
        <Info className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800 font-medium">
          Waktu Setoran
        </AlertDescription>
      </Alert>
 
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800 mb-4">
          <strong>Informasi Penting:</strong> Data diri Ukhti (nama, email, alamat, dll) sudah diambil dari data registrasi. Silakan lengkapi jadwal setoran di bawah ini.
        </p>
      </div>
 
      <div className="space-y-4">
        {getQuestionMeta('main_time_slot').is_active && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              {getQuestionMeta('main_time_slot').label}
              {getQuestionMeta('main_time_slot').is_required && <span className="text-red-500">*</span>}
            </Label>
            <Select value={formData.main_time_slot} onValueChange={(value) => handleInputChange('main_time_slot', value)}>
              <SelectTrigger>
                <SelectValue placeholder={getQuestionMeta('main_time_slot').description || "Pilih waktu utama"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="04-06">04.00 - 06.00 WIB</SelectItem>
                <SelectItem value="06-09">06.00 - 09.00 WIB</SelectItem>
                <SelectItem value="09-12">09.00 - 12.00 WIB</SelectItem>
                <SelectItem value="12-15">12.00 - 15.00 WIB</SelectItem>
                <SelectItem value="15-18">15.00 - 18.00 WIB</SelectItem>
                <SelectItem value="18-21">18.00 - 21.00 WIB</SelectItem>
                <SelectItem value="21-24">21.00 - 24.00 WIB</SelectItem>
              </SelectContent>
            </Select>
            {errors.main_time_slot && (
              <p className="text-red-500 text-xs">{errors.main_time_slot}</p>
            )}
          </div>
        )}
 
        {getQuestionMeta('backup_time_slot').is_active && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              {getQuestionMeta('backup_time_slot').label}
              {getQuestionMeta('backup_time_slot').is_required && <span className="text-red-500">*</span>}
            </Label>
            <Select value={formData.backup_time_slot} onValueChange={(value) => handleInputChange('backup_time_slot', value)}>
              <SelectTrigger>
                <SelectValue placeholder={getQuestionMeta('backup_time_slot').description || "Pilih waktu cadangan"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="04-06">04.00 - 06.00 WIB</SelectItem>
                <SelectItem value="06-09">06.00 - 09.00 WIB</SelectItem>
                <SelectItem value="09-12">09.00 - 12.00 WIB</SelectItem>
                <SelectItem value="12-15">12.00 - 15.00 WIB</SelectItem>
                <SelectItem value="15-18">15.00 - 18.00 WIB</SelectItem>
                <SelectItem value="18-21">18.00 - 21.00 WIB</SelectItem>
                <SelectItem value="21-24">21.00 - 24.00 WIB</SelectItem>
              </SelectContent>
            </Select>
            {errors.backup_time_slot && (
              <p className="text-red-500 text-xs">{errors.backup_time_slot}</p>
            )}
          </div>
        )}
 
        {getQuestionMeta('time_commitment').is_active && (
          <div className="flex items-start space-x-3">
            <Checkbox
              id="time_commitment"
              checked={formData.time_commitment}
              onCheckedChange={(checked) => handleInputChange('time_commitment', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="time_commitment" className="text-sm font-medium text-gray-700">
                {getQuestionMeta('time_commitment').label}
                {getQuestionMeta('time_commitment').is_required && <span className="text-red-500">*</span>}
              </Label>
              {getQuestionMeta('time_commitment').description && (
                <p className="text-xs text-gray-500 italic">
                  {getQuestionMeta('time_commitment').description}
                </p>
              )}
              {errors.time_commitment && (
                <p className="text-red-500 text-xs">{errors.time_commitment}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderSection4 = () => (
    <div className="space-y-6">
      <Alert className="bg-orange-50 border-orange-200">
        <Info className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 font-medium">
          Program Tikrar MTI
        </AlertDescription>
      </Alert>
 
      <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
        <h3 className="font-bold text-lg mb-4 text-green-900">📚 Program Hafalan Al-Qur'an MTI (Metode Tikrar 40 Kali)</h3>
 
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p><strong>🗓 Durasi Program:</strong> Program ini insyaAllah biidznillah akan berlangsung selama 13 pekan.</p>
          </div>
 
          <div>
            <p><strong>🎯 Target dan Struktur Program:</strong></p>
            <ul className="ml-4 mt-2 space-y-1">
              <li>• Target hafalan: 1 halaman per pekan, dibagi menjadi 4 blok (¼ halaman per hari)</li>
              <li>• Setoran ziyadah (penambahan hafalan): hanya dilakukan 4 hari per pekan</li>
            </ul>
          </div>
 
          <div>
            <p><strong>📌 Kewajiban Mingguan:</strong></p>
            <ul className="ml-4 mt-2 space-y-1">
              <li>• Mendengarkan atau membaca tafsir 1 halaman hafalan</li>
              <li>• Menulis tangan 1 halaman yang dihafalkan pekan tersebut</li>
              <li>• Mengikuti 2 kelas pertemuan bersama mu'allimah:</li>
              <li>  - Kelas Tashih</li>
              <li>  - Kelas Ujian (Jadwal menyusul)</li>
            </ul>
          </div>
 
          <div className="p-4 bg-yellow-100 rounded-lg">
            <p className="font-semibold text-yellow-800 mb-2">📌 Kewajiban Harian Saat Ziyadah (Penambahan Hafalan)</p>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Mendengarkan murottal ¼ halaman minimal 3 kali</li>
              <li>• Membaca ¼ halaman sebanyak 40 kali</li>
              <li>• Merekam hafalan ¼ halaman sebanyak 3 kali berturut-turut, lalu dengarkan sambil melihat mushaf</li>
              <li>➤ Jika masih ada kesalahan, ulangi proses ini sampai bacaan benar-benar sempurna</li>
            </ul>
          </div>
 
          <div>
            <p><strong>👥 Setoran kepada Pasangan:</strong></p>
            <ul className="ml-4 mt-2 space-y-1">
              <li>• Menyetorkan hafalan ¼ halaman sebanyak 40 kali</li>
              <li>• Menyimak hafalan pasangan sebanyak 40 kali</li>
            </ul>
          </div>
 
          <div>
            <p><strong>🔄 Rabth (Penguatan Hafalan):</strong></p>
            <p className="ml-4">Jika sudah menambah hafalan, wajib menyetorkan 10 blok hafalan sebelumnya (10 hari terakhir) sebelum memulai setoran 40 kali untuk hafalan baru (ziyadah).</p>
          </div>
 
          <div>
            <p><strong>🔁 Ulangan Ziyadah Sebelumnya:</strong></p>
            <p className="ml-4">Menyetorkan hafalan ziyadah dari hari sebelumnya sebanyak 5 kali.</p>
          </div>
 
          <div>
            <p><strong>☎️ Ketentuan Teknis Setoran:</strong></p>
            <p className="ml-4">Jika tidak memungkinkan menyetor secara langsung (misalnya via telepon karena waktu terbatas), maka diperbolehkan dengan format:</p>
            <ul className="ml-8 mt-1 space-y-1">
              <li>• 20 kali setoran via WA Call, dan</li>
              <li>• 20 kali setoran via Voice Note (VN)</li>
              <li>➤ Total: 40 kali</li>
            </ul>
          </div>
 
          <div className="p-4 bg-green-100 rounded-lg">
            <p className="font-semibold text-green-800 mb-2">📖 Tentang Metode MTI (Tikrar 40 Kali)</p>
            <p className="text-sm text-green-700">
              Program ini menggunakan metode Tikrar 40 kali. Karena ini inti dari program, maka:
            </p>
            <ul className="text-sm text-green-700 mt-2 ml-4 space-y-1">
              <li>• Tidak diperbolehkan dikurangi atau ditawar-tawar</li>
            </ul>
          </div>
 
          <div className="p-4 bg-blue-100 rounded-lg">
            <p className="font-semibold text-blue-800 mb-2">🧰 Perlengkapan Wajib:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Al-Qur'an Tikrar</strong> ➤ Jika belum memiliki, bisa dibeli di toko buku atau toko online (tautan tersedia di deskripsi grup pendaftaran)</li>
              <li>• <strong>Counter Manual (alat penghitung)</strong> ➤ Bisa dibeli di toko alat tulis atau toko online (tautan juga tersedia di deskripsi grup)</li>
            </ul>
          </div>
 
          <div className="p-4 bg-purple-100 rounded-lg">
            <p className="font-semibold text-purple-800 mb-2">📝 Laporan:</p>
            <p className="text-sm text-purple-700">
              Wajib melaporkan semua poin yang telah dikerjakan sesuai arahan musyrifah MTI.
            </p>
          </div>
        </div>
      </div>
 
      <div className="space-y-4">
        {getQuestionMeta('understands_program').is_active && (
          <div className="flex items-start space-x-3">
            <Checkbox
              id="understands_program"
              checked={formData.understands_program}
              onCheckedChange={(checked) => handleInputChange('understands_program', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="understands_program" className="text-sm font-medium text-gray-700">
                {getQuestionMeta('understands_program').label}
                {getQuestionMeta('understands_program').is_required && <span className="text-red-500">*</span>}
              </Label>
              {getQuestionMeta('understands_program').description && (
                <p className="text-xs text-gray-500 italic">
                  {getQuestionMeta('understands_program').description}
                </p>
              )}
              {errors.understands_program && (
                <p className="text-red-500 text-xs">{errors.understands_program}</p>
              )}
            </div>
          </div>
        )}
 
        {getQuestionMeta('questions').is_active && (
          <div className="space-y-2">
            <Label htmlFor="questions" className="text-sm font-medium text-gray-700">
              {getQuestionMeta('questions').label}
              {getQuestionMeta('questions').is_required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="questions"
              value={formData.questions}
              onChange={(e) => handleInputChange('questions', e.target.value)}
              rows={4}
              placeholder={getQuestionMeta('questions').description || "Ketik pertanyaan Ukhti di sini (kosongkan jika tidak ada)"}
              className="text-sm"
            />
            {errors.questions && (
              <p className="text-red-500 text-xs">{errors.questions}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )


  // Don't render until component is mounted to prevent hydration issues
  if (!isMounted || questionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-900 mb-2 sm:mb-3">
              Formulir Pendaftaran MTI {activeBatchData?.name || '...'}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              Program Hafalan Al-Qur'an Gratis Khusus Akhawat<br/>
              <span className="text-xs sm:text-sm md:text-base text-green-700 font-medium">Metode Tikrar 40 Kali - Juz 1, 2, 27, 28, 29, 30</span>
            </p>
          </div>

          <Card className="shadow-lg border-green-100">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 px-3 sm:px-6 py-3 sm:py-4">
              {isEditMode && (
                <Alert className="bg-blue-50 border-blue-200 mb-4">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>Edit Mode:</strong> Ukhti sedang mengedit data pendaftaran yang sudah ada. Perubahan akan disimpan setelah menekan tombol "Update Pendaftaran".
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                <CardTitle className="text-base sm:text-lg md:text-xl text-green-900">
                  Section {currentSection + 1} of {totalSections}
                </CardTitle>
                <span className="text-sm sm:text-base text-gray-600">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
              <Progress value={progressPercentage} className="w-full h-2 sm:h-3 mt-2" />
            </CardHeader>

            <CardContent className="px-3 sm:px-6 pt-4 sm:pt-6">
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4 sm:space-y-6">
                {currentSection === 0 && renderSection0()}
                {currentSection === 1 && renderSection1()}
                {currentSection === 2 && renderSection2()}
                {currentSection === 3 && renderSection3()}
                {currentSection === 4 && renderSection4()}

                {/* Show submit status messages */}
                {submitStatus === 'success' && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Alhamdulillah!</strong> Formulir pendaftaran Ukhti telah berhasil dikirim.                       <br /><br />
                      <strong>Jangan lupa:</strong> Persiapkan diri untuk tes bacaan Al-Qur'an dan simak informasi selanjutnya di Telegram.
                      <br /><br />
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                        <span className="text-sm">Ukhti akan dialihkan ke dashboard otomatis...</span>
                      </div>
                      <Button
                        onClick={() => router.push('/dashboard')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        Pergi ke Dashboard Sekarang
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {submitStatus === 'success_update' && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Alhamdulillah!</strong> Data pendaftaran Ukhti telah berhasil diperbarui.
                      <br /><br />
                      Perubahan data telah tersimpan. Tim kami akan menggunakan data terbaru untuk proses seleksi.
                      <br /><br />
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm">Ukhti akan dialihkan ke dashboard otomatis...</span>
                      </div>
                      <Button
                        onClick={() => router.push('/dashboard')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        Pergi ke Dashboard Sekarang
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {submitStatus === 'error' && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <div className="space-y-2">
                        <p className="font-semibold">Terjadi kesalahan saat mengirim formulir</p>
                        <p>Silakan coba lagi atau hubungi admin Kak Dewi Nurhayati.</p>
                        {submitError && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm underline">Lihat Detail Error</summary>
                            <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                              {submitError}
                            </pre>
                          </details>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Hide navigation buttons on success */}
                {submitStatus !== 'success' && submitStatus !== 'success_update' && (
                  <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentSection === 0 || isSubmitting}
                      className="flex items-center justify-center space-x-2 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 text-sm sm:text-base py-2 sm:py-2.5 px-3 sm:px-4 w-full sm:w-auto"
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Previous</span>
                    </Button>

                    {currentSection < totalSections - 1 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 text-sm sm:text-base py-2 sm:py-2.5 px-3 sm:px-4 w-full sm:w-auto"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 text-sm sm:text-base py-2 sm:py-2.5 px-3 sm:px-4 w-full sm:w-auto"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                            <span>{isEditMode ? 'Updating...' : 'Submitting...'}</span>
                          </>
                        ) : (
                          <>
                            <span>{isEditMode ? 'Update Pendaftaran' : 'Submit Application'}</span>
                            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>


        </div>
      </div>
  )
}
