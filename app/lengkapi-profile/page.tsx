'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { safeRedirectPath } from '@/lib/utils/safe-redirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LengkapiProfilePage() {
  const router = useRouter()
  const [isClientAuthenticated, setIsClientAuthenticated] = useState<boolean | null>(null)
  const [clientAuthUser, setClientAuthUser] = useState<any | null>(null)

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
    setujuSyarat: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [returnUrl, setReturnUrl] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setIsClientAuthenticated(false)
        router.push('/login?redirect=/lengkapi-profile')
      } else {
        setClientAuthUser(authUser)
        setIsClientAuthenticated(true)
      }
    }
    checkAuth()
  }, [router])

  // Check if user came from a registration page and store return URL
  useEffect(() => {
    // Check URL params for return URL
    const params = new URLSearchParams(window.location.search)
    const returnTo = params.get('returnTo')
    if (returnTo) {
      setReturnUrl(safeRedirectPath(returnTo))
    }
  }, [])

  // Load existing user profile if available
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!clientAuthUser) return

      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const result = await response.json()
          const userData = result.data || result.user || result

          // Pre-fill form with existing data
          if (userData) {
            setFormData(prev => ({
              ...prev,
              namaLengkap: userData.full_name || clientAuthUser.user_metadata?.full_name || prev.namaLengkap,
              negara: userData.negara || prev.negara,
              provinsi: userData.provinsi || prev.provinsi,
              kota: userData.kota || prev.kota,
              alamat: userData.alamat || prev.alamat,
              whatsapp: userData.whatsapp || prev.whatsapp,
              telegram: userData.telegram || prev.telegram,
              zonaWaktu: userData.zona_waktu || prev.zonaWaktu,
              tanggalLahir: userData.tanggal_lahir ? new Date(userData.tanggal_lahir).toISOString().split('T')[0] : prev.tanggalLahir,
              tempatLahir: userData.tempat_lahir || prev.tempatLahir,
              jenisKelamin: userData.jenis_kelamin || prev.jenisKelamin,
              pekerjaan: userData.pekerjaan || prev.pekerjaan,
              alasanDaftar: userData.alasan_daftar || prev.alasanDaftar
            }))
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    if (isClientAuthenticated) {
      loadUserProfile()
    }
  }, [clientAuthUser, isClientAuthenticated])

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

    // Agreement checkbox
    if (!formData.setujuSyarat) {
      newErrors.setujuSyarat = '<em>Ukhti</em> harus menyetujui syarat dan ketentuan'
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
      const requestData = {
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
        role: 'thalibah'
      }

      const response = await fetch('/api/user/profile/complete', {
        method: 'POST',
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
          setErrorMessage(result.error?.message || result.error || 'Gagal melengkapi profil')
        }
        setSubmitStatus('error')
        return
      }

      setSubmitStatus('success')

      // Redirect after success with cache busting
      setTimeout(() => {
        // If user came from a registration page, return there with section=1 to show data diri
        if (returnUrl) {
          // Add timestamp to prevent caching
          const url = returnUrl.includes('?')
            ? `${returnUrl}&t=${Date.now()}`
            : `${returnUrl}?t=${Date.now()}`
          router.push(url)
        } else {
          router.push('/dashboard')
        }
      }, 1500)

    } catch (error) {
      console.error('Error submitting profile:', error)
      setErrorMessage('Terjadi kesalahan. Silakan coba lagi.')
      setSubmitStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  if (isClientAuthenticated === null || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Memuat...</p>
        </div>
      </div>
    )
  }

  if (isClientAuthenticated === false) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Lengkapi Profil <em>Ukhti</em>
          </h1>
          <p className="text-gray-600">
            Silakan lengkapi data profil <em>Ukhti</em> untuk melanjutkan
          </p>
        </div>

        {submitStatus === 'success' && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Profil berhasil dilengkapi! {returnUrl ? 'Mengalihkan kembali ke form pendaftaran...' : 'Mengalihkan ke dashboard...'}
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

        <Card className="p-8">
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

            {/* Tanggal Lahir */}
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

            {/* Tempat Lahir */}
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

            {/* Jenis Kelamin */}
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

            {/* Kota */}
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

            {/* Alamat */}
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

            {/* Pekerjaan */}
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

            {/* Alasan Daftar */}
            <div>
              <Label htmlFor="alasanDaftar">
                Alasan Mendaftar <span className="text-red-500">*</span>
              </Label>
              <Input
                id="alasanDaftar"
                value={formData.alasanDaftar}
                onChange={(e) => handleInputChange('alasanDaftar', e.target.value)}
                placeholder="Ceritakan alasan <em>Ukhti</em> mendaftar"
                className={errors.alasanDaftar ? 'border-red-500' : ''}
              />
              {errors.alasanDaftar && (
                <p className="text-red-500 text-sm mt-1">{errors.alasanDaftar}</p>
              )}
            </div>

            {/* Agreement */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="setujuSyarat"
                checked={formData.setujuSyarat}
                onCheckedChange={(checked) => handleInputChange('setujuSyarat', checked)}
              />
              <Label
                htmlFor="setujuSyarat"
                className="text-sm cursor-pointer"
              >
                Saya menyetujui bahwa data yang saya isi adalah benar dan dapat dipertanggungjawabkan
              </Label>
            </div>
            {errors.setujuSyarat && (
              <p className="text-red-500 text-sm">{errors.setujuSyarat}</p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
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
                'Simpan Profil'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
