'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PhoneInput } from '@/components/ui/phone-input'
import { validatePhoneNumberFormat } from '@/lib/utils/sanitize'
import { negaraList, provinsiList, zonaWaktuList } from '@/lib/data/registration-data'
import { AlertCircle, CheckCircle, Loader2, User, Mail, MapPin, Calendar, Phone, Clock, Briefcase, Edit3, X, GraduationCap, Award, Users, Shield, Key, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Textarea } from '@/components/ui/textarea'
import { hasRequiredRank, ROLE_RANKS } from '@/lib/roles'

type ProfileMode = 'view' | 'edit'

// Role-specific profile data types
interface MuallimahProfile {
  education?: string
  occupation?: string
  memorization_level?: string
  memorized_juz?: string
  preferred_juz?: string
  teaching_experience?: string
  teaching_years?: string
  teaching_institutions?: string
  preferred_schedule?: string
  backup_schedule?: string
  motivation?: string
  special_skills?: string
  health_condition?: string
  tajweed_institution?: string
  quran_institution?: string
  teaching_communities?: string
  memorized_tajweed_matan?: string
  studied_matan_exegesis?: string
  examined_juz?: string
  certified_juz?: string
  paid_class_interest?: string
  class_type?: string
  preferred_max_thalibah?: number
  status?: string
}

interface MusyrifahProfile {
  education?: string
  occupation?: string
  leadership_experience?: string
  leadership_years?: string
  leadership_roles?: string
  management_skills?: string[]
  team_management_experience?: string
  preferred_schedule?: string
  backup_schedule?: string
  motivation?: string
  leadership_philosophy?: string
  special_achievements?: string
  status?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()

  const [mode, setMode] = useState<ProfileMode>('view')
  const [userRole, setUserRole] = useState<string>('')
  const [formData, setFormData] = useState({
    namaKunyah: '',
    namaLengkap: '',
    negara: '',
    provinsi: '',
    kota: '',
    alamat: '',
    whatsapp: '',
    telegram: '',
    zonaWaktu: '',
    tanggalLahir: '',
    tempatLahir: '',
    jenisKelamin: '',
    pekerjaan: '',
    alasanDaftar: '',
  })

  const [muallimahData, setMuallimahData] = useState<MuallimahProfile>({})
  const [musyrifahData, setMusyrifahData] = useState<MusyrifahProfile>({})
  const [hasMuallimahReg, setHasMuallimahReg] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/profile')
    }
  }, [authLoading, isAuthenticated, router])

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id || !isAuthenticated) return

      try {
        const response = await fetch(`/api/user/profile?userId=${user.id}`)
        if (response.ok) {
          const responseData = await response.json()
          // Extract data from standard API wrapper envelope
          const data = responseData?.data || responseData;

          // Set simplified user role
          const userRoles = data.roles || []
          const primaryRole = hasRequiredRank(userRoles, ROLE_RANKS.admin) ? 'admin' : 'thalibah'
          setUserRole(primaryRole)

          // Pre-fill form with existing data
          setFormData(prev => ({
            ...prev,
            namaKunyah: data.nama_kunyah || '',
            namaLengkap: data.full_name || '',
            negara: data.negara || '',
            provinsi: data.provinsi || '',
            kota: data.kota || '',
            alamat: data.alamat || '',
            whatsapp: data.whatsapp || '',
            telegram: data.telegram || '',
            zonaWaktu: data.zona_waktu || '',
            tanggalLahir: data.tanggal_lahir ? new Date(data.tanggal_lahir).toISOString().split('T')[0] : '',
            tempatLahir: data.tempat_lahir || '',
            jenisKelamin: data.jenis_kelamin || '',
            pekerjaan: data.pekerjaan || '',
            alasanDaftar: data.alasan_daftar || '',
          }))

          // Note: Legacy muallimah/musyrifah profile data loading removed
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
        setErrorMessage('Gagal memuat data profil')
        setSubmitStatus('error')
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadUserProfile()
  }, [user?.id, isAuthenticated])

  // Load Mu'allimah registration if exists
  useEffect(() => {
    const loadMuallimahData = async () => {
      if (!user?.id || !isAuthenticated) return
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('muallimah_registrations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (data) {
          setHasMuallimahReg(true)
          setMuallimahData(data)
        }
      } catch (err) {
        console.error('Error loading muallimah profile data:', err)
      }
    }
    loadMuallimahData()
  }, [user?.id, isAuthenticated])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Required fields
    if (!formData.namaLengkap.trim()) newErrors.namaLengkap = 'Nama lengkap harus diisi'
    if (!formData.negara) newErrors.negara = 'Negara harus dipilih'
    if (!formData.kota.trim()) newErrors.kota = 'Kota harus diisi'
    if (!formData.alamat.trim()) newErrors.alamat = 'Alamat harus diisi'
    if (!formData.zonaWaktu) newErrors.zonaWaktu = 'Zona waktu harus dipilih'
    if (!formData.tanggalLahir) newErrors.tanggalLahir = 'Tanggal lahir harus diisi'
    if (!formData.tempatLahir.trim()) newErrors.tempatLahir = 'Tempat lahir harus diisi'
    if (!formData.jenisKelamin) newErrors.jenisKelamin = 'Jenis kelamin harus dipilih'
    if (!formData.pekerjaan.trim()) newErrors.pekerjaan = 'Pekerjaan harus diisi'
    if (!formData.alasanDaftar.trim()) newErrors.alasanDaftar = 'Alasan mendaftar harus diisi'

    // Validate phone number
    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'Nomor WhatsApp harus diisi'
    } else {
      const isValid = validatePhoneNumberFormat(formData.whatsapp, formData.negara)
      if (!isValid) {
        newErrors.whatsapp = 'Format nomor WhatsApp tidak valid'
      }
    }

    // Validate telegram if provided
    if (formData.telegram && formData.telegram.trim()) {
      const isValid = validatePhoneNumberFormat(formData.telegram, formData.negara)
      if (!isValid) {
        newErrors.telegram = 'Format nomor Telegram tidak valid'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      setErrorMessage('Mohon lengkapi semua field yang wajib diisi')
      setSubmitStatus('error')
      return
    }

    setIsLoading(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const requestData: any = {
        nama_kunyah: formData.namaKunyah || undefined,
        full_name: formData.namaLengkap,
        negara: formData.negara,
        provinsi: formData.provinsi || undefined,
        kota: formData.kota,
        alamat: formData.alamat,
        whatsapp: formData.whatsapp,
        telegram: formData.telegram || undefined,
        zona_waktu: formData.zonaWaktu,
        tanggal_lahir: new Date(formData.tanggalLahir).toISOString(),
        tempat_lahir: formData.tempatLahir,
        jenis_kelamin: formData.jenisKelamin,
        pekerjaan: formData.pekerjaan,
        alasan_daftar: formData.alasanDaftar,
      }

      if (hasMuallimahReg) {
        requestData.education = muallimahData.education || undefined
        requestData.occupation = muallimahData.occupation || undefined
        requestData.memorization_level = muallimahData.memorization_level || undefined
        requestData.memorized_juz = Array.isArray(muallimahData.memorized_juz) ? muallimahData.memorized_juz.join(', ') : (muallimahData.memorized_juz || undefined)
        requestData.preferred_juz = Array.isArray(muallimahData.preferred_juz) ? muallimahData.preferred_juz.join(', ') : (muallimahData.preferred_juz || undefined)
        requestData.teaching_experience = muallimahData.teaching_experience || undefined
        requestData.teaching_years = muallimahData.teaching_years || undefined
        requestData.teaching_institutions = muallimahData.teaching_institutions || undefined
        requestData.preferred_schedule = muallimahData.preferred_schedule || undefined
        requestData.backup_schedule = muallimahData.backup_schedule || undefined
        requestData.motivation = muallimahData.motivation || undefined
        requestData.special_skills = muallimahData.special_skills || undefined
        requestData.health_condition = muallimahData.health_condition || undefined
        requestData.tajweed_institution = muallimahData.tajweed_institution || undefined
        requestData.quran_institution = muallimahData.quran_institution || undefined
        requestData.teaching_communities = muallimahData.teaching_communities || undefined
        requestData.memorized_tajweed_matan = muallimahData.memorized_tajweed_matan || undefined
        requestData.studied_matan_exegesis = muallimahData.studied_matan_exegesis || undefined
        requestData.examined_juz = Array.isArray(muallimahData.examined_juz) ? muallimahData.examined_juz.join(', ') : (muallimahData.examined_juz || undefined)
        requestData.certified_juz = Array.isArray(muallimahData.certified_juz) ? muallimahData.certified_juz.join(', ') : (muallimahData.certified_juz || undefined)
        requestData.paid_class_interest = muallimahData.paid_class_interest || undefined
        requestData.class_type = muallimahData.class_type || undefined
        requestData.preferred_max_thalibah = muallimahData.preferred_max_thalibah !== undefined ? Number(muallimahData.preferred_max_thalibah) : undefined
      }

      const response = await fetch('/api/user/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle validation errors
        if (result.error?.details?.issues) {
          const validationErrors: Record<string, string> = {}
          result.error.details.issues.forEach((issue: any) => {
            validationErrors[issue.field] = issue.message
          })
          setErrors(validationErrors)
          setErrorMessage('Terdapat kesalahan pada form. Silakan periksa kembali.')
        } else {
          setErrorMessage(result.error?.message || result.error || 'Gagal memperbarui profil')
        }
        setSubmitStatus('error')
        return
      }

      setSubmitStatus('success')

      // Reset mode to view after success
      setTimeout(() => {
        setMode('view')
        // Reload page to show updated data
        window.location.reload()
      }, 1500)

    } catch (error) {
      console.error('Error submitting profile:', error)
      setErrorMessage('Terjadi kesalahan. Silakan coba lagi.')
      setSubmitStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setMode('view')
    setErrors({})
    setErrorMessage('')
  }

  // Calculate age
  const calculateAge = (dateString: string) => {
    if (!dateString) return '-'
    const birthDate = new Date(dateString)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  if (authLoading || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              Profil <em>Ukhti</em>
            </h1>
            <p className="text-gray-600 text-sm">
              {mode === 'view' ? 'Lihat dan kelola data profil' : 'Edit data profil'}
            </p>
          </div>
          {mode === 'view' && (
            <Button
              onClick={() => setMode('edit')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profil
            </Button>
          )}
        </div>

        {submitStatus === 'success' && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Profil berhasil diperbarui!
            </AlertDescription>
          </Alert>
        )}

        {submitStatus === 'error' && errorMessage && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {mode === 'view' ? (
          // VIEW MODE
          <div className="space-y-6">
            {/* Profile Header Card */}
            <Card className="p-6 bg-gradient-to-r from-green-900 to-green-800 text-white">
              <div className="flex items-center space-x-4">
                {/* Actual Avatar instead of generic icon */}
                <div className="flex-shrink-0">
                  {(user as any)?.photoURL || user?.avatar_url ? (
                    <Image
                      src={(user as any)?.photoURL || user?.avatar_url || ''}
                      alt="Profile"
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full border-4 border-white/30 shadow-xl object-cover"
                      unoptimized
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || 'User')}&background=ffffff&color=15803d&size=128&bold=true`;
                      }}
                    />
                  ) : user?.email ? (
                    <Image
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email)}&background=ffffff&color=15803d&size=128&bold=true`}
                      alt="Profile"
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full border-4 border-white/30 shadow-xl"
                      unoptimized
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30 shadow-xl">
                      <User className="h-10 w-10 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{formData.namaLengkap || '-'}</h2>
                  {formData.namaKunyah && (
                    <p className="text-green-100 text-sm">{formData.namaKunyah}</p>
                  )}
                  <p className="text-green-100 text-sm flex items-center mt-1">
                    <Mail className="h-3 w-3 mr-1" />
                    {user?.email || '-'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Profile Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pribadi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  icon={<User className="h-4 w-4" />}
                  label="Nama Lengkap"
                  value={formData.namaLengkap || '-'}
                />
                <InfoItem
                  icon={<User className="h-4 w-4" />}
                  label="Nama Kunyah"
                  value={formData.namaKunyah || '-'}
                />
                <InfoItem
                  icon={<Calendar className="h-4 w-4" />}
                  label="Tanggal Lahir"
                  value={formData.tanggalLahir ? new Date(formData.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'}
                />
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Tempat Lahir"
                  value={formData.tempatLahir || '-'}
                />
                <InfoItem
                  icon={<User className="h-4 w-4" />}
                  label="Jenis Kelamin"
                  value={formData.jenisKelamin || '-'}
                />
                <InfoItem
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Pekerjaan"
                  value={formData.pekerjaan || '-'}
                />
                <InfoItem
                  icon={<Calendar className="h-4 w-4" />}
                  label="Usia"
                  value={`${calculateAge(formData.tanggalLahir)} tahun`}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Kontak</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  icon={<Phone className="h-4 w-4" />}
                  label="WhatsApp"
                  value={formData.whatsapp || '-'}
                />
                <InfoItem
                  icon={<Phone className="h-4 w-4" />}
                  label="Telegram"
                  value={formData.telegram || '-'}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lokasi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Negara"
                  value={formData.negara || '-'}
                />
                {formData.negara === 'Indonesia' && (
                  <InfoItem
                    icon={<MapPin className="h-4 w-4" />}
                    label="Provinsi"
                    value={formData.provinsi || '-'}
                  />
                )}
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Kota"
                  value={formData.kota || '-'}
                />
                <div className="md:col-span-2">
                  <InfoItem
                    icon={<MapPin className="h-4 w-4" />}
                    label="Alamat Lengkap"
                    value={formData.alamat || '-'}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lainnya</h3>
              <div className="grid grid-cols-1 gap-4">
                <InfoItem
                  icon={<Clock className="h-4 w-4" />}
                  label="Zona Waktu"
                  value={formData.zonaWaktu || '-'}
                />
                <InfoItem
                  icon={<User className="h-4 w-4" />}
                  label="Alasan Mendaftar"
                  value={formData.alasanDaftar || '-'}
                />
              </div>
            </Card>

            {hasMuallimahReg && <MuallimahProfileView data={muallimahData} />}
            {/* Account Security Section */}
            {mode === 'view' && <AccountSecurity />}
          </div>
        ) : (
          // EDIT MODE
          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nama Kunyah (Optional) */}
              <div>
                <Label htmlFor="namaKunyah">
                  Nama Kunyah <span className="text-gray-400 text-sm">(Opsional)</span>
                </Label>
                <Input
                  id="namaKunyah"
                  value={formData.namaKunyah}
                  onChange={(e) => handleInputChange('namaKunyah', e.target.value)}
                  placeholder="Contoh: Ummu Aisyah"
                />
              </div>

              {/* Nama Lengkap */}
              <div>
                <Label htmlFor="namaLengkap">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="namaLengkap"
                  value={formData.namaLengkap}
                  onChange={(e) => handleInputChange('namaLengkap', e.target.value)}
                  placeholder="Nama lengkap sesuai KTP"
                  className={errors.namaLengkap ? 'border-red-500' : ''}
                />
                {errors.namaLengkap && (
                  <p className="text-red-500 text-sm mt-1">{errors.namaLengkap}</p>
                )}
              </div>

              {/* Tanggal & Tempat Lahir */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tanggalLahir">
                    Tanggal Lahir <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tanggalLahir"
                    type="date"
                    value={formData.tanggalLahir}
                    onChange={(e) => handleInputChange('tanggalLahir', e.target.value)}
                    className={errors.tanggalLahir ? 'border-red-500' : ''}
                  />
                  {errors.tanggalLahir && (
                    <p className="text-red-500 text-sm mt-1">{errors.tanggalLahir}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="tempatLahir">
                    Tempat Lahir <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tempatLahir"
                    value={formData.tempatLahir}
                    onChange={(e) => handleInputChange('tempatLahir', e.target.value)}
                    placeholder="Kota tempat lahir"
                    className={errors.tempatLahir ? 'border-red-500' : ''}
                  />
                  {errors.tempatLahir && (
                    <p className="text-red-500 text-sm mt-1">{errors.tempatLahir}</p>
                  )}
                </div>
              </div>

              {/* Jenis Kelamin & Pekerjaan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jenisKelamin">
                    Jenis Kelamin <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.jenisKelamin}
                    onValueChange={(value) => handleInputChange('jenisKelamin', value)}
                  >
                    <SelectTrigger className={errors.jenisKelamin ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.jenisKelamin && (
                    <p className="text-red-500 text-sm mt-1">{errors.jenisKelamin}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="pekerjaan">
                    Pekerjaan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pekerjaan"
                    value={formData.pekerjaan}
                    onChange={(e) => handleInputChange('pekerjaan', e.target.value)}
                    placeholder="Contoh: Guru, IRT, Mahasiswa"
                    className={errors.pekerjaan ? 'border-red-500' : ''}
                  />
                  {errors.pekerjaan && (
                    <p className="text-red-500 text-sm mt-1">{errors.pekerjaan}</p>
                  )}
                </div>
              </div>

              {/* Negara */}
              <div>
                <Label htmlFor="negara">
                  Negara <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.negara}
                  onValueChange={(value) => handleInputChange('negara', value)}
                >
                  <SelectTrigger className={errors.negara ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Pilih negara" />
                  </SelectTrigger>
                  <SelectContent>
                    {negaraList.map((negara) => (
                      <SelectItem key={negara} value={negara}>
                        {negara}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.negara && (
                  <p className="text-red-500 text-sm mt-1">{errors.negara}</p>
                )}
              </div>

              {/* Provinsi (for Indonesia only) */}
              {formData.negara === 'Indonesia' && (
                <div>
                  <Label htmlFor="provinsi">Provinsi</Label>
                  <Select
                    value={formData.provinsi}
                    onValueChange={(value) => handleInputChange('provinsi', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih provinsi" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinsiList.map((provinsi) => (
                        <SelectItem key={provinsi} value={provinsi}>
                          {provinsi}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Kota & Alamat */}
              <div>
                <Label htmlFor="kota">
                  Kota <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="kota"
                  value={formData.kota}
                  onChange={(e) => handleInputChange('kota', e.target.value)}
                  placeholder="Kota tempat tinggal"
                  className={errors.kota ? 'border-red-500' : ''}
                />
                {errors.kota && (
                  <p className="text-red-500 text-sm mt-1">{errors.kota}</p>
                )}
              </div>

              <div>
                <Label htmlFor="alamat">
                  Alamat Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="alamat"
                  value={formData.alamat}
                  onChange={(e) => handleInputChange('alamat', e.target.value)}
                  placeholder="Alamat lengkap"
                  className={errors.alamat ? 'border-red-500' : ''}
                />
                {errors.alamat && (
                  <p className="text-red-500 text-sm mt-1">{errors.alamat}</p>
                )}
              </div>

              {/* WhatsApp */}
              <div>
                <Label htmlFor="whatsapp">
                  Nomor WhatsApp <span className="text-red-500">*</span>
                </Label>
                <div className={errors.whatsapp ? 'border border-red-500 rounded-md' : ''}>
                  <PhoneInput
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(value) => handleInputChange('whatsapp', value)}
                    placeholder="Contoh: 081234567890"
                    error={errors.whatsapp}
                  />
                </div>
                {errors.whatsapp && (
                  <p className="text-red-500 text-sm mt-1">{errors.whatsapp}</p>
                )}
              </div>

              {/* Telegram */}
              <div>
                <Label htmlFor="telegram">
                  Nomor Telegram <span className="text-gray-400 text-sm">(Opsional)</span>
                </Label>
                <div className={errors.telegram ? 'border border-red-500 rounded-md' : ''}>
                  <PhoneInput
                    id="telegram"
                    value={formData.telegram}
                    onChange={(value) => handleInputChange('telegram', value)}
                    placeholder="Contoh: 081234567890"
                    error={errors.telegram}
                  />
                </div>
                {errors.telegram && (
                  <p className="text-red-500 text-sm mt-1">{errors.telegram}</p>
                )}
              </div>

              {/* Zona Waktu */}
              <div>
                <Label htmlFor="zonaWaktu">
                  Zona Waktu <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.zonaWaktu}
                  onValueChange={(value) => handleInputChange('zonaWaktu', value)}
                >
                  <SelectTrigger className={errors.zonaWaktu ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Pilih zona waktu" />
                  </SelectTrigger>
                  <SelectContent>
                    {zonaWaktuList.map((zona) => (
                      <SelectItem key={zona.value} value={zona.value}>
                        {zona.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.zonaWaktu && (
                  <p className="text-red-500 text-sm mt-1">{errors.zonaWaktu}</p>
                )}
              </div>

              {/* Alasan Daftar */}
              <div>
                <Label htmlFor="alasanDaftar">
                  Alasan Mendaftar <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="alasanDaftar"
                  value={formData.alasanDaftar}
                  onChange={(e) => handleInputChange('alasanDaftar', e.target.value)}
                  placeholder="Ceritakan alasan Ukhti mendaftar"
                  className={errors.alasanDaftar ? 'border-red-500' : ''}
                />
                {errors.alasanDaftar && (
                  <p className="text-red-500 text-sm mt-1">{errors.alasanDaftar}</p>
                )}
              </div>

              {/* Role-specific sections */}
              {hasMuallimahReg && (
                <MuallimahProfileFields
                  data={muallimahData}
                  onChange={setMuallimahData}
                  errors={errors}
                  onInputChange={handleInputChange}
                />
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isLoading || submitStatus === 'success'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : submitStatus === 'success' ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Berhasil!
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Batal
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}

// Helper component for info items
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0 text-green-900 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value}</p>
      </div>
    </div>
  )
}

// Muallimah-specific profile fields component
function MuallimahProfileFields({
  data,
  onChange,
  errors,
  onInputChange
}: {
  data: MuallimahProfile
  onChange: (data: MuallimahProfile) => void
  errors: Record<string, string>
  onInputChange: (field: string, value: any) => void
}) {
  const handleChange = (field: keyof MuallimahProfile, value: any) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6 pt-6 border-t border-gray-200">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-green-600" />
          Profil Muallimah
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="muallimah_education">Pendidikan Terakhir</Label>
          <Input
            id="muallimah_education"
            value={data.education || ''}
            onChange={(e) => handleChange('education', e.target.value)}
            placeholder="Contoh: S1 Pendidikan Islam"
          />
        </div>

        <div>
          <Label htmlFor="muallimah_occupation">Pekerjaan Saat Ini</Label>
          <Input
            id="muallimah_occupation"
            value={data.occupation || ''}
            onChange={(e) => handleChange('occupation', e.target.value)}
            placeholder="Contoh: Guru Tahfidz"
          />
        </div>

        <div>
          <Label htmlFor="memorization_level">Tingkat Hafalan</Label>
          <Select
            value={data.memorization_level || ''}
            onValueChange={(value) => handleChange('memorization_level', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih tingkat hafalan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="juz_30">Juz 30</SelectItem>
              <SelectItem value="juz_29_30">Juz 29-30</SelectItem>
              <SelectItem value="juz_1_30">Juz 1 (Al-Fatihah) + Juz 30</SelectItem>
              <SelectItem value="5_juz_terakhir">5 Juz Terakhir</SelectItem>
              <SelectItem value="10_juz_terakhir">10 Juz Terakhir</SelectItem>
              <SelectItem value="15_juz">15 Juz</SelectItem>
              <SelectItem value="20_juz">20 Juz</SelectItem>
              <SelectItem value="25_juz">25 Juz</SelectItem>
              <SelectItem value="30_juz">30 Juz (Seluruh Al-Quran)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="memorized_juz">Juz yang Dihafal (Sebutkan)</Label>
          <Input
            id="memorized_juz"
            value={data.memorized_juz || ''}
            onChange={(e) => handleChange('memorized_juz', e.target.value)}
            placeholder="Contoh: Juz 1, 29, 30"
          />
        </div>

        <div>
          <Label htmlFor="preferred_juz">Juz yang Ingin Dibimbing</Label>
          <Select
            value={data.preferred_juz || ''}
            onValueChange={(value) => handleChange('preferred_juz', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih juz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30A">Juz 30A</SelectItem>
              <SelectItem value="30B">Juz 30B</SelectItem>
              <SelectItem value="29A">Juz 29A</SelectItem>
              <SelectItem value="29B">Juz 29B</SelectItem>
              <SelectItem value="28">Juz 28</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="teaching_years">Pengalaman Mengajar (Tahun)</Label>
          <Input
            id="teaching_years"
            type="number"
            value={data.teaching_years || ''}
            onChange={(e) => handleChange('teaching_years', e.target.value)}
            placeholder="Contoh: 2"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="teaching_institutions">Institusi Pengalaman Mengajar</Label>
          <Input
            id="teaching_institutions"
            value={data.teaching_institutions || ''}
            onChange={(e) => handleChange('teaching_institutions', e.target.value)}
            placeholder="Sebutkan lembaga/tempat mengajar sebelumnya"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="teaching_experience">Deskripsi Pengalaman Mengajar</Label>
          <Textarea
            id="teaching_experience"
            value={data.teaching_experience || ''}
            onChange={(e) => handleChange('teaching_experience', e.target.value)}
            placeholder="Ceritakan pengalaman mengajar Ukhti"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="preferred_schedule">Jadwal Utama yang Diinginkan</Label>
          <Input
            id="preferred_schedule"
            value={data.preferred_schedule || ''}
            onChange={(e) => handleChange('preferred_schedule', e.target.value)}
            placeholder="Contoh: Senin-Kamis, 19:00-21:00 WIB"
          />
        </div>

        <div>
          <Label htmlFor="backup_schedule">Jadwal Cadangan</Label>
          <Input
            id="backup_schedule"
            value={data.backup_schedule || ''}
            onChange={(e) => handleChange('backup_schedule', e.target.value)}
            placeholder="Contoh: Sabtu-Minggu, 09:00-11:00 WIB"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="motivation">Motivasi Menjadi Muallimah</Label>
          <Textarea
            id="motivation"
            value={data.motivation || ''}
            onChange={(e) => handleChange('motivation', e.target.value)}
            placeholder="Ceritakan motivasi Ukhti"
            rows={3}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="special_skills">Keahlian Khusus</Label>
          <Textarea
            id="special_skills"
            value={data.special_skills || ''}
            onChange={(e) => handleChange('special_skills', e.target.value)}
            placeholder="Keahlian lain yang relevan (bahasa arab, ilmu tajwid, dll)"
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}

// Musyrifah-specific profile fields component
function MusyrifahProfileFields({
  data,
  onChange,
  errors,
  onInputChange
}: {
  data: MusyrifahProfile
  onChange: (data: MusyrifahProfile) => void
  errors: Record<string, string>
  onInputChange: (field: string, value: any) => void
}) {
  const handleChange = (field: keyof MusyrifahProfile, value: any) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6 pt-6 border-t border-gray-200">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          Profil Musyrifah
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="musyrifah_education">Pendidikan Terakhir</Label>
          <Input
            id="musyrifah_education"
            value={data.education || ''}
            onChange={(e) => handleChange('education', e.target.value)}
            placeholder="Contoh: S1 Manajemen"
          />
        </div>

        <div>
          <Label htmlFor="musyrifah_occupation">Pekerjaan Saat Ini</Label>
          <Input
            id="musyrifah_occupation"
            value={data.occupation || ''}
            onChange={(e) => handleChange('occupation', e.target.value)}
            placeholder="Contoh: HRD, Manager, dll"
          />
        </div>

        <div>
          <Label htmlFor="leadership_years">Pengalaman Kepemimpinan (Tahun)</Label>
          <Input
            id="leadership_years"
            type="number"
            value={data.leadership_years || ''}
            onChange={(e) => handleChange('leadership_years', e.target.value)}
            placeholder="Contoh: 3"
          />
        </div>

        <div>
          <Label htmlFor="preferred_schedule">Jadwal Utama yang Diinginkan</Label>
          <Input
            id="preferred_schedule"
            value={data.preferred_schedule || ''}
            onChange={(e) => handleChange('preferred_schedule', e.target.value)}
            placeholder="Contoh: Senin-Kamis, 19:00-21:00 WIB"
          />
        </div>

        <div>
          <Label htmlFor="backup_schedule">Jadwal Cadangan</Label>
          <Input
            id="backup_schedule"
            value={data.backup_schedule || ''}
            onChange={(e) => handleChange('backup_schedule', e.target.value)}
            placeholder="Contoh: Sabtu-Minggu, 09:00-11:00 WIB"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="leadership_experience">Deskripsi Pengalaman Kepemimpinan</Label>
          <Textarea
            id="leadership_experience"
            value={data.leadership_experience || ''}
            onChange={(e) => handleChange('leadership_experience', e.target.value)}
            placeholder="Ceritakan pengalaman kepemimpinan Ukhti"
            rows={3}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="leadership_roles">Peran Kepemimpinan yang Pernah Diemban</Label>
          <Input
            id="leadership_roles"
            value={data.leadership_roles || ''}
            onChange={(e) => handleChange('leadership_roles', e.target.value)}
            placeholder="Contoh: Ketua Panitia, Koordinator Divisi, dll"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="team_management_experience">Pengalaman Manajemen Tim</Label>
          <Textarea
            id="team_management_experience"
            value={data.team_management_experience || ''}
            onChange={(e) => handleChange('team_management_experience', e.target.value)}
            placeholder="Ceritakan pengalaman mengelola tim"
            rows={3}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="motivation">Motivasi Menjadi Musyrifah</Label>
          <Textarea
            id="motivation"
            value={data.motivation || ''}
            onChange={(e) => handleChange('motivation', e.target.value)}
            placeholder="Ceritakan motivasi Ukhti"
            rows={3}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="leadership_philosophy">Filosofi Kepemimpinan</Label>
          <Textarea
            id="leadership_philosophy"
            value={data.leadership_philosophy || ''}
            onChange={(e) => handleChange('leadership_philosophy', e.target.value)}
            placeholder="Bagaimana pendekatan Ukhti dalam memimpin?"
            rows={2}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="special_achievements">Pencapaian Khusus</Label>
          <Textarea
            id="special_achievements"
            value={data.special_achievements || ''}
            onChange={(e) => handleChange('special_achievements', e.target.value)}
            placeholder="Pencapaian atau penghargaan yang relevan"
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}

// Muallimah profile view component
function MuallimahProfileView({ data }: { data: MuallimahProfile }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-green-600" />
        Profil Muallimah
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoItem
          icon={<GraduationCap className="h-4 w-4" />}
          label="Pendidikan Terakhir"
          value={data.education || '-'}
        />
        <InfoItem
          icon={<Briefcase className="h-4 w-4" />}
          label="Pekerjaan"
          value={data.occupation || '-'}
        />
        <InfoItem
          icon={<Award className="h-4 w-4" />}
          label="Tingkat Hafalan"
          value={data.memorization_level || '-'}
        />
        <InfoItem
          icon={<Award className="h-4 w-4" />}
          label="Juz yang Dihafal"
          value={data.memorized_juz || '-'}
        />
        <InfoItem
          icon={<Award className="h-4 w-4" />}
          label="Juz yang Dibimbing"
          value={data.preferred_juz || '-'}
        />
        <InfoItem
          icon={<Calendar className="h-4 w-4" />}
          label="Pengalaman Mengajar"
          value={data.teaching_years ? `${data.teaching_years} tahun` : '-'}
        />
        <InfoItem
          icon={<Clock className="h-4 w-4" />}
          label="Jadwal Utama"
          value={data.preferred_schedule || '-'}
        />
        <InfoItem
          icon={<Clock className="h-4 w-4" />}
          label="Jadwal Cadangan"
          value={data.backup_schedule || '-'}
        />
        <div className="md:col-span-2">
          <InfoItem
            icon={<User className="h-4 w-4" />}
            label="Motivasi"
            value={data.motivation || '-'}
          />
        </div>
        <div className="md:col-span-2">
          <InfoItem
            icon={<User className="h-4 w-4" />}
            label="Keahlian Khusus"
            value={data.special_skills || '-'}
          />
        </div>
      </div>
    </Card>
  )
}

// Musyrifah profile view component
function MusyrifahProfileView({ data }: { data: MusyrifahProfile }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-green-600" />
        Profil Musyrifah
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoItem
          icon={<GraduationCap className="h-4 w-4" />}
          label="Pendidikan Terakhir"
          value={data.education || '-'}
        />
        <InfoItem
          icon={<Briefcase className="h-4 w-4" />}
          label="Pekerjaan"
          value={data.occupation || '-'}
        />
        <InfoItem
          icon={<Users className="h-4 w-4" />}
          label="Pengalaman Kepemimpinan"
          value={data.leadership_years ? `${data.leadership_years} tahun` : '-'}
        />
        <InfoItem
          icon={<Clock className="h-4 w-4" />}
          label="Jadwal Utama"
          value={data.preferred_schedule || '-'}
        />
        <InfoItem
          icon={<Clock className="h-4 w-4" />}
          label="Jadwal Cadangan"
          value={data.backup_schedule || '-'}
        />
        <div className="md:col-span-2">
          <InfoItem
            icon={<User className="h-4 w-4" />}
            label="Peran Kepemimpinan"
            value={data.leadership_roles || '-'}
          />
        </div>
        <div className="md:col-span-2">
          <InfoItem
            icon={<User className="h-4 w-4" />}
            label="Motivasi"
            value={data.motivation || '-'}
          />
        </div>
        <div className="md:col-span-2">
          <InfoItem
            icon={<User className="h-4 w-4" />}
            label="Filosofi Kepemimpinan"
            value={data.leadership_philosophy || '-'}
          />
        </div>
      </div>
    </Card>
  )
}

// Account security component for password changes
function AccountSecurity() {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwords.newPassword.length < 8) {
      toast.error('Password minimal 8 karakter')
      return
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
        currentPassword: passwords.currentPassword,
      })

      if (error) throw error

      toast.success('Password berhasil diperbarui!')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setIsChangingPassword(false)
    } catch (error: any) {
      console.error('Password change error:', error)
      toast.error(error.message || 'Gagal memperbarui password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6 border-orange-100 bg-orange-50/30">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-orange-600" />
        Keamanan Akun
      </h3>

      {!isChangingPassword ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Kata Sandi</p>
            <p className="text-sm text-gray-500">Ubah kata sandi Ukhti secara berkala untuk keamanan.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsChangingPassword(true)}
            className="border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
          >
            <Key className="h-4 w-4 mr-2" />
            Ubah Password
          </Button>
        </div>
      ) : (
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Password Lama</Label>
            <Input
              id="currentPassword"
              type={showPassword ? "text" : "password"}
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              placeholder="Masukkan password saat ini"
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                placeholder="Ulangi password baru"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsChangingPassword(false)
                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
              }}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Password'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
