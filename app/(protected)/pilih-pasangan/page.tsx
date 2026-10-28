'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Clock, Users, ChevronRight, ChevronLeft, Info, Calendar, Upload } from 'lucide-react'
import { submitPilihPasangan } from './actions'

interface HalaqahData {
  id: string
  name: string
  description: string | null
  day_of_week: number | null
  start_time: string | null
  end_time: string | null
  location: string | null
  total_current_students: number
  total_max_students: number
  available_slots: number
  is_full: boolean
  class_type: string
  program_class_type?: string
  class_types: Array<{
    class_type: string
    label: string
  }>
  muallimah_preferred_juz: string | null
  muallimah_schedule: string | null
  mentors: Array<{
    mentor_id: string
    role: string
    is_primary: boolean
    users: {
      full_name: string
    } | null
  }>
}

type Step = 'halaqah' | 'partner'

const formatPartnerTimeSlot = (slot?: string) => {
  if (!slot) return '-'
  const slots: Record<string, string> = {
    pagi_1: 'Pagi (05.00-07.00)', pagi_2: 'Pagi (07.00-09.00)', pagi_3: 'Pagi (09.00-11.30)',
    siang_1: 'Siang (12.30-14.30)', sore_1: 'Sore (15.30-17.30)',
    malam_1: 'Malam (18.30-20.30)', malam_2: 'Malam (20.30-22.30)'
  }
  return slots[slot] || slot.replace(/:/g, '.')
}

const displayPartnerTime = (slot?: string, timezone?: string) => {
  const formatted = formatPartnerTimeSlot(slot)
  if (formatted === '-' || /\bWI[BT]\b/i.test(formatted)) return formatted
  return `${formatted} ${timezone || 'WIB'}`
}

export default function PilihPasanganPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const batchId = searchParams.get('batchId')

  const [currentStep, setCurrentStep] = useState<Step>('halaqah')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [halaqahData, setHalaqahData] = useState<HalaqahData[]>([])
  const [registrationData, setRegistrationData] = useState<any>(null)
  const [existingSubmission, setExistingSubmission] = useState<any>(null)
  
  const [partners, setPartners] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingPartner, setPendingPartner] = useState<{
    userId: string
    name: string
    whatsapp?: string
    registration?: any
    juzCompatible?: boolean
    timezoneCompatible?: boolean
  } | null>(null)

  const [formData, setFormData] = useState({
    ujian_halaqah_id: '',
    tashih_halaqah_id: '',
    partner_type: '' as 'self_match' | 'system_match' | 'family' | 'tarteel' | '',
    partner_user_id: '',
    partner_name: '',
    partner_relationship: '',
    partner_wa_phone: '',
    partner_notes: '',
  })

  const loadInitialData = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/daftar-ulang/data${batchId ? `?batchId=${batchId}` : ''}`)
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Gagal memuat data dari server');
      }

      if (response.ok && data.success) {
        setRegistrationData(data.data.registration)
        setHalaqahData(data.data.halaqah || [])
        setExistingSubmission(data.data.existingSubmission)

        if (data.data.existingSubmission) {
          const sub = data.data.existingSubmission;
          const isAkadSubmitted = sub.akad_status === 'submitted' || sub.akad_status === 'approved' || sub.status === 'submitted' || sub.status === 'approved';
          
          if (!isAkadSubmitted) {
            toast.error('Silakan selesaikan form Upload Akad terlebih dahulu');
            router.push('/perjalanan-saya');
            return;
          }

          setFormData(prev => ({
            ...prev,
            ujian_halaqah_id: data.data.existingSubmission.ujian_halaqah_id || '',
            tashih_halaqah_id: data.data.existingSubmission.tashih_halaqah_id || '',
            partner_type: data.data.existingSubmission.partner_type || '',
            partner_user_id: data.data.existingSubmission.partner_user_id || '',
            partner_name: data.data.existingSubmission.partner_name || '',
            partner_relationship: data.data.existingSubmission.partner_relationship || '',
            partner_wa_phone: data.data.existingSubmission.partner_wa_phone || '',
            partner_notes: data.data.existingSubmission.partner_notes || '',
          }))
        }
      } else {
        const errorMessage = typeof data.error === 'object' ? data.error.message : data.error;
        toast.error(errorMessage || 'Gagal memuat data pendaftaran')
        router.push('/perjalanan-saya')
      }
    } catch (error: any) {
      console.error('Load initial data error:', error)
      toast.error(error.message || 'Terjadi kesalahan saat memuat data')
      router.push('/perjalanan-saya')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, batchId])

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadInitialData()
    }
  }, [isAuthenticated, user?.id, loadInitialData])

  useEffect(() => {
    if (formData.partner_type === 'self_match' && registrationData?.id) {
      fetchPartners()
    }
  }, [formData.partner_type, registrationData?.id, batchId])

  const fetchPartners = async () => {
    try {
      const response = await fetch(`/api/daftar-ulang/partners${batchId ? `?batchId=${batchId}` : ''}`)
      if (response.ok) {
        const data = await response.json()
        setPartners(data.data?.all_available_partners || [])
      }
    } catch (error) {
      console.error('Fetch partners error:', error)
    }
  }

  const handleSubmit = async () => {
    if (!registrationData?.id) return

    setIsSubmitting(true)
    try {
      const result = await submitPilihPasangan(registrationData.id, formData as any)
      
      if (result.success) {
        toast.success(result.message)
        router.push('/perjalanan-saya')
      } else {
        toast.error(result.error)
      }
    } catch (error: any) {
      toast.error(error?.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !registrationData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const getLockStatus = () => {
    if (existingSubmission?.partner_status === 'submitted' || existingSubmission?.partner_status === 'approved' || existingSubmission?.status === 'submitted' || existingSubmission?.status === 'approved') {
      return { locked: true, reason: 'submitted' };
    }

    if (!registrationData?.batch?.opening_class_date) return { locked: false, reason: '' };
    const openingDate = new Date(registrationData.batch.opening_class_date);
    openingDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (today >= openingDate) {
      return { locked: true, reason: 'date' };
    }
    
    return { locked: false, reason: '' };
  };

  const lockStatus = getLockStatus();

  if (lockStatus.locked && existingSubmission?.ujian_halaqah_id) {
    const chosenHalaqah = halaqahData.find(h => h.id === existingSubmission.ujian_halaqah_id)
    
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card className="shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-blue-100" />
            <h2 className="text-2xl font-bold mb-2">Pilihan Ukhti Telah Terkunci</h2>
            <p className="text-blue-100 opacity-90">
              {lockStatus.reason === 'submitted' 
                ? 'Data pilihan Halaqah dan Pasangan Ukhti telah tersimpan (submitted). Jika ada perubahan, silakan hubungi admin untuk mereset status Ukhti.'
                : 'Masa belajar telah dimulai. Ukhti tidak dapat mengubah pilihan halaqah dan pasangan lagi.'}
            </p>
          </div>
          <CardContent className="p-6 md:p-8">
            <div className="space-y-6">
              <div className="bg-gray-50 border rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-4 border-b pb-2">Detail Pilihan Ukhti</h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Halaqah</span>
                    <div className="font-medium text-gray-900">{chosenHalaqah?.name || '-'}</div>
                    {(chosenHalaqah?.muallimah_schedule || (chosenHalaqah?.day_of_week !== null && chosenHalaqah?.start_time && chosenHalaqah?.end_time)) && (
                      <div className="text-sm text-gray-600 mt-1 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-amber-600" />
                        {(() => {
                          if (chosenHalaqah.muallimah_schedule) {
                            try {
                              const schedule = JSON.parse(chosenHalaqah.muallimah_schedule)
                              return `${schedule.day} • ${schedule.time_start} - ${schedule.time_end} WIB`
                            } catch {
                              return chosenHalaqah.muallimah_schedule
                            }
                          }
                          if (chosenHalaqah.day_of_week !== null && chosenHalaqah.start_time && chosenHalaqah.end_time) {
                            const DAY_NAMES = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad']
                            return `${DAY_NAMES[chosenHalaqah.day_of_week]} • ${chosenHalaqah.start_time} - ${chosenHalaqah.end_time} WIB`
                          }
                          return '-'
                        })()}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Pasangan Belajar</span>
                    <div className="font-medium text-gray-900">
                      {existingSubmission.partner_type === 'system_match' && 'Dipasangkan oleh Sistem'}
                      {existingSubmission.partner_type === 'self_match' && (existingSubmission.partner_name || 'Memilih Sendiri')}
                      {existingSubmission.partner_type === 'family' && `${existingSubmission.partner_name} (${existingSubmission.partner_relationship})`}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center pt-4">
                <Button onClick={() => router.push('/perjalanan-saya')} className="bg-emerald-600 hover:bg-emerald-700">
                  Kembali ke Perjalanan Saya
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (lockStatus.locked && !existingSubmission?.ujian_halaqah_id) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Masa Pemilihan Telah Berakhir</h2>
          <p className="text-gray-600 mb-8">
            {lockStatus.reason === 'submitted'
              ? 'Ukhti telah melakukan submit pilihan Ukhti.'
              : 'Masa belajar telah dimulai. Ukhti terlambat memilih halaqah dan pasangan. Silakan hubungi admin.'}
          </p>
        </div>
        <Button onClick={() => router.push('/perjalanan-saya')} className="bg-emerald-600 hover:bg-emerald-700">
          Kembali ke Perjalanan Saya
        </Button>
      </div>
    )
  }

  // UI Helpers
  const getClassTypeColor = (classType: string) => {
    switch (classType) {
      case 'tashih_ujian': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'tikrar_tahfidz': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'pra_tahfidz': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }
  const getClassTypeLabel = (classType: string) => {
    switch (classType) {
      case 'tashih_ujian': return 'Tashih + Ujian'
      case 'tikrar_tahfidz': return 'Tikrar Tahfidz'
      case 'pra_tahfidz': return 'Pra-Tikrar'
      default: return classType
    }
  }

  const isPraTikrar = registrationData?.selection_status === 'waitlist'
  const expectedProgramType = isPraTikrar ? 'pra_tahfidz' : 'tikrar_tahfidz'
  
  const sortedHalaqahData = [...halaqahData]
    .filter(h => h.program_class_type === expectedProgramType || !h.program_class_type)
    .sort((a, b) => (a.day_of_week || 0) - (b.day_of_week || 0))
  const selectedHalaqah = sortedHalaqahData.find(
    halaqah => halaqah.id === formData.ujian_halaqah_id && !halaqah.is_full
  )

  const continueToPartner = () => {
    if (!selectedHalaqah) {
      toast.error('Silakan pilih halaqah yang masih tersedia sebelum memilih pasangan.')
      return
    }
    setCurrentStep('partner')
  }

  const selectSelfMatchPartner = (partner: any) => {
    if (formData.partner_user_id === partner.user_id) return
    setPendingPartner({
      userId: partner.user_id,
      name: partner.users?.full_name || 'thalibah ini',
      whatsapp: partner.users?.whatsapp,
      registration: partner.registrations?.[0],
      juzCompatible: partner.juz_compatible,
      timezoneCompatible: partner.timezone_compatible
    })
  }

  const confirmSelfMatchPartner = () => {
    if (!pendingPartner) return
    setFormData(current => ({
      ...current,
      partner_user_id: pendingPartner.userId,
      partner_name: pendingPartner.name
    }))
    toast.success(
      pendingPartner.whatsapp
        ? `Ukhti dan ${pendingPartner.name} sudah sepakat. Silakan lanjutkan dan simpan pilihan.`
        : `${pendingPartner.name} dipilih. Simpan pilihan agar nomor WhatsApp bisa saling tampil.`
    )
    setPendingPartner(null)
  }

  const buildPartnerWhatsAppMessage = (partner: {
    name: string
    registration?: any
    juzCompatible?: boolean
    timezoneCompatible?: boolean
  }) => {
    const partnerRegistration = partner.registration
    const ownSlots = [registrationData?.main_time_slot, registrationData?.backup_time_slot].filter(Boolean)
    const mainTimeCompatible = Boolean(partnerRegistration?.main_time_slot && ownSlots.includes(partnerRegistration.main_time_slot))
    const backupTimeCompatible = Boolean(partnerRegistration?.backup_time_slot && ownSlots.includes(partnerRegistration.backup_time_slot))
    const mainMatchLabel = partnerRegistration?.main_time_slot === registrationData?.main_time_slot
      ? 'Cocok dengan Waktu Utama Ukhti'
      : partnerRegistration?.main_time_slot === registrationData?.backup_time_slot
        ? 'Cocok dengan Waktu Cadangan Ukhti'
        : 'Berbeda dengan jadwal Ukhti'
    const backupMatchLabel = partnerRegistration?.backup_time_slot === registrationData?.main_time_slot
      ? 'Cocok dengan Waktu Utama Ukhti'
      : partnerRegistration?.backup_time_slot === registrationData?.backup_time_slot
        ? 'Cocok dengan Waktu Cadangan Ukhti'
        : 'Berbeda dengan jadwal Ukhti'

    return `Assalamu'alaikum Ukhti ${partner.name}, perkenalkan saya ${registrationData?.full_name || 'peserta Tikrar'}, Thalibah Markaz Tikrar Indonesia, Juz ${registrationData?.chosen_juz || '-'}, Zona Waktu ${registrationData?.timezone || 'WIB'}.

Saya melihat data Ukhti di halaman Pilih Pasangan:

Juz Pilihan
*${partnerRegistration?.chosen_juz || '-'}*
${partner.juzCompatible ? 'Sama dengan Ukhti' : 'Berbeda dengan Ukhti'}

Zona Waktu
*${partnerRegistration?.timezone || 'WIB'}*
${partner.timezoneCompatible ? 'Sama dengan Ukhti' : 'Berbeda dengan Ukhti'}

Waktu Utama
*${displayPartnerTime(partnerRegistration?.main_time_slot, partnerRegistration?.timezone)}*
${mainTimeCompatible ? mainMatchLabel : 'Berbeda dengan jadwal Ukhti'}

Waktu Cadangan
*${displayPartnerTime(partnerRegistration?.backup_time_slot, partnerRegistration?.timezone)}*
${backupTimeCompatible ? backupMatchLabel : 'Berbeda dengan jadwal Ukhti'}

Saya ingin memastikan apakah Ukhti berkenan menjadi pasangan belajar saya. Jika sepakat, mohon pilih nama saya juga di halaman Pilih Pasangan ya.`
  }

  const contactPendingPartner = () => {
    if (!pendingPartner?.whatsapp) {
      toast.error('Nomor WhatsApp thalibah ini belum tersedia.')
      return
    }
    const phone = pendingPartner.whatsapp.replace(/[^0-9]/g, '')
    const message = encodeURIComponent(buildPartnerWhatsAppMessage(pendingPartner))
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer')
  }
  
  const filteredPartners = partners
    .filter((partner) => {
      const fullName = partner.users?.full_name || ''
      return fullName.toLowerCase().includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => {
      const getPriority = (partner: any) => {
        const partnerRegistration = partner.registrations?.[0]
        const matchesMainTime = Boolean(partnerRegistration?.main_time_slot && [registrationData?.main_time_slot, registrationData?.backup_time_slot].includes(partnerRegistration.main_time_slot))
        const matchesBackupTime = Boolean(partnerRegistration?.backup_time_slot && [registrationData?.main_time_slot, registrationData?.backup_time_slot].includes(partnerRegistration.backup_time_slot))
        const mainMatchesOwnMain = Boolean(registrationData?.main_time_slot && partnerRegistration?.main_time_slot === registrationData.main_time_slot)
        const backupMatchesOwnMain = Boolean(registrationData?.main_time_slot && partnerRegistration?.backup_time_slot === registrationData.main_time_slot)
        const matchCount = Number(partner.juz_compatible) + Number(partner.timezone_compatible) + Number(matchesMainTime) + Number(matchesBackupTime)

        return {
          matchCount,
          mainMatchesOwnMain,
          backupMatchesOwnMain,
          selectedCurrentUser: Boolean(partner.has_user_selected_them)
        }
      }

      const priorityA = getPriority(a)
      const priorityB = getPriority(b)

      // Kecocokan lengkap selalu paling atas.
      const completeA = priorityA.matchCount === 4
      const completeB = priorityB.matchCount === 4
      if (completeA !== completeB) return Number(completeB) - Number(completeA)
      // Jika tidak lengkap, kesamaan Waktu Utama menjadi patokan pertama.
      if (priorityA.mainMatchesOwnMain !== priorityB.mainMatchesOwnMain) return Number(priorityB.mainMatchesOwnMain) - Number(priorityA.mainMatchesOwnMain)
      if (priorityA.matchCount !== priorityB.matchCount) return priorityB.matchCount - priorityA.matchCount
      if (priorityA.backupMatchesOwnMain !== priorityB.backupMatchesOwnMain) return Number(priorityB.backupMatchesOwnMain) - Number(priorityA.backupMatchesOwnMain)
      if (priorityA.selectedCurrentUser !== priorityB.selectedCurrentUser) return Number(priorityB.selectedCurrentUser) - Number(priorityA.selectedCurrentUser)

      return (a.users?.full_name || '').localeCompare(b.users?.full_name || '')
    })

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Card className="shadow-lg border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Pilih Halaqah & Pasangan</h1>
              <p className="text-emerald-50 text-lg opacity-90">
                Tahap 3: Memilih jadwal dan pasangan belajar
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-2 bg-black/20 rounded-lg p-2 backdrop-blur-sm">
              <div className={`px-4 py-2 rounded-md flex items-center ${currentStep === 'halaqah' ? 'bg-white text-emerald-700 font-semibold shadow-sm' : 'text-emerald-100'}`}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2 border border-current">1</span>
                Halaqah
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-200" />
              <div className={`px-4 py-2 rounded-md flex items-center ${currentStep === 'partner' ? 'bg-white text-emerald-700 font-semibold shadow-sm' : 'text-emerald-100'}`}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2 border border-current">2</span>
                Pasangan
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6 md:p-8">
          {currentStep === 'halaqah' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-6 text-white mb-6">
                <h2 className="text-2xl font-bold mb-2">Pilih Jadwal Halaqah</h2>
                <p className="text-emerald-50">Pilih jadwal untuk kelas ujian dan tashih. Waktu yang ditampilkan dalam WIB.</p>
              </div>

              <div className="space-y-4">
                {sortedHalaqahData.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <Info className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-yellow-900 mb-2">Belum Ada Jadwal Halaqah</h3>
                    <p className="text-sm text-yellow-700">Jadwal halaqah belum tersedia. Silakan hubungi admin.</p>
                  </div>
                ) : (
                  sortedHalaqahData.map(halaqah => {
                    const selected = formData.ujian_halaqah_id === halaqah.id
                    const muallimahNames = halaqah.mentors
                      ?.filter((mentor: any) => mentor.role === 'muallimah' || mentor.role === 'ustadzah')
                      .map((mentor: any) => `Ustadzah ${mentor.users?.full_name}`)
                      .join(', ') || '-'
                    const formatTime = (time: string) => time?.slice(0, 5).replace(':', '.')
                    const scheduleLabel = (() => {
                      if (halaqah.muallimah_schedule) {
                        try {
                          const schedule = JSON.parse(halaqah.muallimah_schedule)
                          return `${schedule.day} • ${formatTime(schedule.time_start)} - ${formatTime(schedule.time_end)} WIB`
                        } catch {
                          return halaqah.muallimah_schedule
                        }
                      }
                      if (halaqah.day_of_week !== null && halaqah.start_time && halaqah.end_time) {
                        const dayNames = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad']
                        return `${dayNames[halaqah.day_of_week]} • ${formatTime(halaqah.start_time)} - ${formatTime(halaqah.end_time)} WIB`
                      }
                      return '-'
                    })()
                    return (
                      <div
                        key={halaqah.id}
                        onClick={() => !halaqah.is_full && setFormData(p => ({ ...p, ujian_halaqah_id: halaqah.id, tashih_halaqah_id: halaqah.id }))}
                        className={`relative border-2 rounded-xl overflow-hidden transition-all shadow-sm hover:shadow-md cursor-pointer
                          ${halaqah.is_full && !selected ? 'bg-gray-50 border-gray-300 opacity-75' : 'bg-white border-gray-200 hover:border-emerald-300'}
                          ${selected ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}
                        `}
                      >
                        <div className={`absolute top-4 right-4 flex items-center justify-center w-6 h-6 rounded-full border-2 bg-white z-10 ${selected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                          {selected && <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                        </div>
                        <div className={`px-4 py-3 flex items-center justify-between ${selected ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-gray-50 to-gray-100'}`}>
                          <div className="flex items-center space-x-3">
                            <h4 className={`font-semibold ${selected ? 'text-white' : 'text-gray-900'}`}>
                              Tahfidz Tikrar MTI - {muallimahNames} - {scheduleLabel}
                            </h4>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getClassTypeColor(halaqah.class_type)}`}>
                              {getClassTypeLabel(halaqah.class_type)}
                            </span>
                            {halaqah.is_full && <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">Penuh</span>}
                          </div>
                        </div>

                        <div className="p-4">
                          {/* Quota Progress Bar - Moved to top */}
                          {halaqah.total_max_students !== undefined && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-xs mb-2">
                                <span className="text-gray-500 font-medium">Kapasitas Terisi</span>
                                <span className="font-bold text-gray-900">
                                  {halaqah.total_current_students || 0} dari {halaqah.total_max_students}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    halaqah.is_full
                                      ? 'bg-red-500'
                                      : (halaqah.available_slots || 0) <= 3
                                      ? 'bg-orange-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{ width: `${((halaqah.total_current_students || 0) / halaqah.total_max_students) * 100}%` }}
                                ></div>
                              </div>
                              {halaqah.is_full && (
                                <p className="text-xs text-red-600 mt-1">Kelas penuh</p>
                              )}
                            </div>
                          )}

                          {/* Juz */}
                          {halaqah.muallimah_preferred_juz && (
                            <div className="flex items-center space-x-3 text-sm mb-3">
                              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                <Info className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="text-gray-700">
                                <span className="font-semibold">Juz: </span>{halaqah.muallimah_preferred_juz}
                              </span>
                            </div>
                          )}

                          {/* Muallimah */}
                          <div className="flex items-center space-x-3 text-sm mb-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                              <span className="font-semibold text-emerald-700">U</span>
                            </div>
                            <span className="text-gray-700">
                              <span className="font-semibold">Muallimah: </span>{muallimahNames}
                            </span>
                          </div>

                          {/* Jadwal */}
                          {scheduleLabel !== '-' && (
                            <div className="flex items-center space-x-3 text-sm mb-4 bg-amber-50 p-3 rounded-lg border border-amber-100">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <span className="text-gray-700">
                                <span className="font-semibold block text-amber-900 mb-0.5">Jadwal Kelas</span>
                                {scheduleLabel}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button 
                  type="button"
                  onClick={continueToPartner}
                  disabled={!selectedHalaqah}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                >
                  Selanjutnya <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'partner' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-6 text-white mb-6">
                <h2 className="text-2xl font-bold mb-2">Pilih Pasangan Belajar</h2>
                <p className="text-purple-50">Silakan pilih skema pasangan belajar.</p>
              </div>

                {/* System Match */}
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    formData.partner_type === 'system_match'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (formData.partner_type !== 'system_match') {
                      setFormData(p => ({ ...p, partner_type: 'system_match', partner_user_id: '', partner_name: '', partner_relationship: '', partner_wa_phone: '', partner_notes: '' }))
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg mt-0.5">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Dipasangkan oleh Sistem</h3>
                      <p className="text-sm text-gray-500 mt-1">Ukhti akan dipasangkan secara otomatis dengan peserta lain berdasarkan jadwal utama, zona waktu, dan juz.</p>
                    </div>
                    <input
                      type="radio"
                      checked={formData.partner_type === 'system_match'}
                      readOnly
                      className="w-5 h-5 text-purple-600 mt-2"
                    />
                  </div>
                </div>

                {/* Self Match */}
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    formData.partner_type === 'self_match'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (formData.partner_type !== 'self_match') {
                      setFormData(p => ({ ...p, partner_type: 'self_match', partner_user_id: '', partner_name: '', partner_relationship: '', partner_wa_phone: '', partner_notes: '' }))
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <Users className="w-6 h-6 text-purple-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Memilih Sendiri</h3>
                      <p className="text-sm text-gray-500 mt-1">Cari dan pilih pasangan dari daftar peserta yang tersedia dan cocok dengan Ukhti.</p>
                    </div>
                    <input
                      type="radio"
                      checked={formData.partner_type === 'self_match'}
                      readOnly
                      className="w-5 h-5 text-purple-600 mt-2"
                    />
                  </div>
              {formData.partner_type === 'self_match' && (
                <div className="bg-purple-50 rounded-lg p-5 border border-purple-100">
                  <h3 className="font-medium text-purple-900 mb-4">Cari Pasangan</h3>
                  <div className="mb-4 rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-purple-900">Data Ukhti</p>
                        <p className="text-xs text-gray-500">Data ini menjadi pembanding kecocokan pasangan.</p>
                      </div>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                        {registrationData?.full_name || 'Thalibah'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                      <div className="rounded-lg border border-purple-100 bg-purple-50 p-2">
                        <span className="block text-gray-500">Juz Pilihan</span>
                        <span className="font-semibold text-purple-900">{registrationData?.chosen_juz || '-'}</span>
                      </div>
                      <div className="rounded-lg border border-purple-100 bg-purple-50 p-2">
                        <span className="block text-gray-500">Zona Waktu</span>
                        <span className="font-semibold text-purple-900">{registrationData?.timezone || 'WIB'}</span>
                      </div>
                      <div className="rounded-lg border border-purple-100 bg-purple-50 p-2">
                        <span className="block text-gray-500">Waktu Utama</span>
                        <span className="font-semibold text-purple-900">{displayPartnerTime(registrationData?.main_time_slot, registrationData?.timezone)}</span>
                      </div>
                      <div className="rounded-lg border border-purple-100 bg-purple-50 p-2">
                        <span className="block text-gray-500">Waktu Cadangan</span>
                        <span className="font-semibold text-purple-900">{displayPartnerTime(registrationData?.backup_time_slot, registrationData?.timezone)}</span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Ketik nama untuk mencari..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-purple-500 mb-4"
                  />
                  <div className="max-h-[500px] overflow-y-auto mt-4 pr-2">
                    {filteredPartners.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 bg-white rounded-lg border">
                        {searchQuery ? 'Tidak ada peserta dengan nama tersebut.' : 'Tidak ada peserta yang tersedia.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredPartners.map((p) => {
                          const reg = p.registrations?.[0]
                          
                          // Age is computed server-side; the exact birth date is not sent
                          const ageText = typeof reg?.age === 'number' ? `${reg.age} thn` : '-'

                          const ownSlots = [registrationData?.main_time_slot, registrationData?.backup_time_slot].filter(Boolean)
                          const mainTimeCompatible = Boolean(reg?.main_time_slot && ownSlots.includes(reg.main_time_slot))
                          const backupTimeCompatible = Boolean(reg?.backup_time_slot && ownSlots.includes(reg.backup_time_slot))
                          const mainMatchLabel = reg?.main_time_slot === registrationData?.main_time_slot
                            ? 'Cocok dengan Waktu Utama Ukhti'
                            : reg?.main_time_slot === registrationData?.backup_time_slot
                              ? 'Cocok dengan Waktu Cadangan Ukhti'
                              : 'Tidak sama dengan jadwal Ukhti'
                          const backupMatchLabel = reg?.backup_time_slot === registrationData?.main_time_slot
                            ? 'Cocok dengan Waktu Utama Ukhti'
                            : reg?.backup_time_slot === registrationData?.backup_time_slot
                              ? 'Cocok dengan Waktu Cadangan Ukhti'
                              : 'Tidak sama dengan jadwal Ukhti'

                          const matchCount = Number(p.juz_compatible)
                            + Number(p.timezone_compatible)
                            + Number(mainTimeCompatible)
                            + Number(backupTimeCompatible)

                          // "Kalau tiga2nya sesuai hijau. Kalau sesuai 2 kuning kalau 2nya ga termasuk jadwal. Kalau jadwal termasuk dari 2 yhvsesuai biru."
                          let baseBgClass = 'bg-white border-gray-200 hover:border-purple-300';
                          if (matchCount === 4) {
                            baseBgClass = 'bg-emerald-50 border-emerald-400 hover:border-emerald-500 shadow-sm';
                          } else if (matchCount >= 2) {
                            if (mainTimeCompatible) {
                              baseBgClass = 'bg-blue-50 border-blue-400 hover:border-blue-500 shadow-sm';
                            } else {
                              baseBgClass = 'bg-amber-50 border-amber-400 hover:border-amber-500 shadow-sm';
                            }
                          }

                          return (
                            <div
                              key={p.user_id}
                              onClick={() => selectSelfMatchPartner(p)}
                              className={`relative p-4 border rounded-xl cursor-pointer transition-all flex flex-col justify-between hover:shadow-md
                                ${formData.partner_user_id === p.user_id ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : baseBgClass}
                              `}
                            >
                              <div className="absolute top-3 right-3 flex flex-col items-end space-y-1">
                                {formData.partner_user_id === p.user_id && (
                                  <div className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center space-x-1">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Dipilih</span>
                                  </div>
                                )}
                                {p.has_user_selected_them && (
                                  <div className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                                    Memilih Ukhti
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="flex items-center space-x-3 mb-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-lg">
                                    {p.users?.full_name?.charAt(0) || '?'}
                                  </div>
                                  <div className="pr-16">
                                    <h4 className="font-semibold text-gray-900 leading-tight">
                                      {p.users?.full_name}
                                    </h4>
                                    <p className="text-xs text-gray-500">{ageText} • {reg?.domicile || 'Lokasi tidak diketahui'}</p>
                                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      matchCount === 4
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : mainTimeCompatible
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {matchCount} dari 4 cocok
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                  <div className={`rounded p-2 border ${p.juz_compatible ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <span className="block text-gray-500 mb-1">Juz Pilihan</span>
                                    <span className={`font-medium ${p.juz_compatible ? 'text-green-700' : 'text-amber-800'}`}>{reg?.chosen_juz || '-'}</span>
                                    <span className={`block mt-0.5 text-[10px] ${p.juz_compatible ? 'text-green-600' : 'text-amber-700'}`}>
                                      {p.juz_compatible ? 'Sama dengan Ukhti' : 'Berbeda dengan Ukhti'}
                                    </span>
                                  </div>
                                  <div className={`rounded p-2 border ${p.timezone_compatible ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <span className="block text-gray-500 mb-1">Zona Waktu</span>
                                    <span className={`font-medium ${p.timezone_compatible ? 'text-green-700' : 'text-amber-800'}`}>{reg?.timezone || 'WIB'}</span>
                                    <span className={`block mt-0.5 text-[10px] ${p.timezone_compatible ? 'text-green-600' : 'text-amber-700'}`}>
                                      {p.timezone_compatible ? 'Sama dengan Ukhti' : 'Berbeda dengan Ukhti'}
                                    </span>
                                  </div>
                                  <div className={`rounded p-2 border ${mainTimeCompatible ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <span className="block text-gray-500 mb-1">Waktu Utama</span>
                                    <span className={`font-medium ${mainTimeCompatible ? 'text-emerald-700' : 'text-amber-800'}`}>
                                      {displayPartnerTime(reg?.main_time_slot, reg?.timezone)}
                                    </span>
                                    <span className={`block mt-0.5 text-[10px] ${mainTimeCompatible ? 'text-green-600' : 'text-amber-700'}`}>
                                      {mainMatchLabel}
                                    </span>
                                  </div>
                                  <div className={`rounded p-2 border ${backupTimeCompatible ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <span className="block text-gray-500 mb-1">Waktu Cadangan</span>
                                    <span className={`font-medium ${backupTimeCompatible ? 'text-emerald-700' : 'text-amber-800'}`}>
                                      {displayPartnerTime(reg?.backup_time_slot, reg?.timezone)}
                                    </span>
                                    <span className={`block mt-0.5 text-[10px] ${backupTimeCompatible ? 'text-green-600' : 'text-amber-700'}`}>
                                      {backupMatchLabel}
                                    </span>
                                  </div>
                                  {p.schedule_compatible && (
                                    <span className="col-span-2 text-[10px] text-emerald-600 -mt-1">
                                      Jadwal cocok dengan Ukhti
                                    </span>
                                  )}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center space-x-2 mt-2 pt-3 border-t border-gray-100">
                                  {!p.users?.whatsapp && (
                                    <span className="flex-1 text-center text-[11px] leading-tight text-gray-400">
                                      No WA tampil setelah salah satu memilih
                                    </span>
                                  )}
                                  {p.users?.whatsapp && (
                                    <a
                                      href={`https://wa.me/${p.users.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(buildPartnerWhatsAppMessage({
                                        name: p.users.full_name,
                                        registration: reg,
                                        juzCompatible: p.juz_compatible,
                                        timezoneCompatible: p.timezone_compatible
                                      }))}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md text-xs font-medium transition-colors border border-green-200"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                      </svg>
                                      <span>Hubungi</span>
                                    </a>
                                  )}
                                  <div className="flex-1">
                                    <button
                                      type="button"
                                      className={`w-full px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        formData.partner_user_id === p.user_id
                                          ? 'bg-purple-100 text-purple-700'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      {formData.partner_user_id === p.user_id ? 'Terpilih' : 'Pilih'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
                </div>

                {/* Family */}
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    formData.partner_type === 'family'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (formData.partner_type !== 'family') {
                      setFormData(p => ({ ...p, partner_type: 'family', partner_user_id: '', partner_name: '', partner_relationship: '', partner_wa_phone: '', partner_notes: '' }))
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <Users className="w-6 h-6 text-purple-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Keluarga (Mahram)</h3>
                      <p className="text-sm text-gray-500 mt-1">Setoran kepada keluarga (Ayah, Ibu, anak, atau saudara mahram).</p>
                    </div>
                    <input
                      type="radio"
                      checked={formData.partner_type === 'family'}
                      readOnly
                      className="w-5 h-5 text-purple-600 mt-2"
                    />
                  </div>

                  {formData.partner_type === 'family' && (
                    <div className="mt-4 space-y-3 pl-9">
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
                        <div className="flex">
                          <Info className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-800">
                            <strong>Penting:</strong> Nama yang diinput di sini <strong>BUKAN</strong> nama Thalibah yang terdaftar di angkatan ini. Jika keluarga Ukhti juga peserta MTI di angkatan ini, silakan gunakan opsi <strong>Memilih Sendiri</strong> di atas.
                          </p>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Nama lengkap keluarga"
                        value={formData.partner_name}
                        onChange={e => setFormData(p => ({ ...p, partner_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <select
                        value={formData.partner_relationship}
                        onChange={e => setFormData(p => ({ ...p, partner_relationship: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Pilih hubungan</option>
                        <option value="ayah">Ayah</option>
                        <option value="ibu">Ibu</option>
                        <option value="suami">Suami</option>
                        <option value="anak">Anak</option>
                        <option value="saudara">Saudara (Mahram)</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Nomor WhatsApp keluarga (opsional)"
                        value={formData.partner_wa_phone}
                        onChange={e => setFormData(p => ({ ...p, partner_wa_phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <textarea
                        placeholder="Catatan tambahan (opsional)"
                        value={formData.partner_notes}
                        onChange={e => setFormData(p => ({ ...p, partner_notes: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>

                {/* Tarteel */}
                <div
                  className={`border rounded-lg p-4 transition-all ${
                    !((registrationData?.oral_total_score ?? (registrationData as any)?.oral_score ?? 0) >= 90)
                      ? 'border-gray-100 bg-gray-50/50 cursor-not-allowed opacity-60' 
                      : formData.partner_type === 'tarteel'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500 cursor-pointer'
                      : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}
                  onClick={() => {
                    const oralScore = registrationData?.oral_total_score ?? (registrationData as any)?.oral_score ?? 0;
                    if (oralScore >= 90) {
                      if (formData.partner_type !== 'tarteel') {
                        setFormData(p => ({ ...p, partner_type: 'tarteel', partner_user_id: '', partner_name: '', partner_relationship: '', partner_wa_phone: '', partner_notes: '' }))
                      }
                    } else {
                      toast.error('Pilihan Tarteel hanya tersedia untuk thalibah dengan nilai seleksi lisan minimal 90.')
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <Upload className="w-6 h-6 text-orange-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        Aplikasi Tarteel
                        {!((registrationData?.oral_total_score ?? (registrationData as any)?.oral_score ?? 0) >= 90) && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
                            Nilai &lt; 90
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Setoran mandiri menggunakan aplikasi Tarteel dengan lampiran screenshot penggunaan.</p>
                      {!((registrationData?.oral_total_score ?? (registrationData as any)?.oral_score ?? 0) >= 90) && (
                        <p className="text-xs text-red-600 mt-2 font-semibold">
                          *Hanya untuk thalibah dengan nilai seleksi lisan minimal 90 (Nilai seleksi Ukhti: {registrationData?.oral_total_score ?? (registrationData as any)?.oral_score ?? 0})
                        </p>
                      )}
                    </div>
                    <input
                      type="radio"
                      checked={formData.partner_type === 'tarteel'}
                      disabled={!((registrationData?.oral_total_score ?? (registrationData as any)?.oral_score ?? 0) >= 90)}
                      readOnly
                      className="w-5 h-5 text-purple-600 mt-2"
                    />
                  </div>

                  {((registrationData?.oral_total_score ?? (registrationData as any)?.oral_score ?? 0) >= 90) && formData.partner_type === 'tarteel' && (
                    <div className="mt-4 space-y-3 pl-9">
                      <input
                        type="text"
                        placeholder="Username atau nama di aplikasi Tarteel"
                        value={formData.partner_name}
                        onChange={e => setFormData(p => ({ ...p, partner_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <textarea
                        placeholder="Catatan tambahan (opsional)"
                        value={formData.partner_notes}
                        onChange={e => setFormData(p => ({ ...p, partner_notes: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>



              <div className="flex justify-between pt-6 border-t">
                <Button variant="outline" onClick={() => setCurrentStep('halaqah')}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Kembali
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.partner_type || isSubmitting || (formData.partner_type === 'self_match' && !formData.partner_user_id) || (formData.partner_type === 'family' && (!formData.partner_name || !formData.partner_relationship)) || (formData.partner_type === 'tarteel' && !formData.partner_name)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? 'Memproses...' : 'Simpan & Selesai'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {pendingPartner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setPendingPartner(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-2xl">
              ❤️
            </div>
            {pendingPartner.whatsapp ? (
              <>
                <h3 className="text-center text-xl font-bold text-gray-900">Sudah Menghubungi dan Sepakat?</h3>
                <p className="mt-3 text-center text-sm leading-6 text-gray-600">
                  Pastikan Ukhti sudah menghubungi <strong>{pendingPartner.name}</strong> dan beliau setuju menjadi pasangan belajar Ukhti. Self match baru lengkap setelah beliau memilih Ukhti kembali.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-center text-xl font-bold text-gray-900">Pilih {pendingPartner.name}?</h3>
                <p className="mt-3 text-center text-sm leading-6 text-gray-600">
                  Untuk menjaga privasi, nomor WhatsApp baru tampil setelah salah satu memilih. Setelah Ukhti menyimpan pilihan ini, nomor <strong>{pendingPartner.name}</strong> akan tampil untuk Ukhti dan nomor Ukhti tampil untuk beliau, sehingga bisa saling menghubungi. Self match baru lengkap setelah beliau memilih Ukhti kembali.
                </p>
              </>
            )}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={confirmSelfMatchPartner}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {pendingPartner.whatsapp ? 'Ya, Kami Sudah Sepakat' : 'Ya, Pilih Beliau'}
              </button>
              {pendingPartner.whatsapp && (
                <button
                  type="button"
                  onClick={contactPendingPartner}
                  className="w-full rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100"
                >
                  Belum, Hubungi via WhatsApp
                </button>
              )}
              <button
                type="button"
                onClick={() => setPendingPartner(null)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckCircle(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
