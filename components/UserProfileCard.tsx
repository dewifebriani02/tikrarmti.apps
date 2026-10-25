'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { User, Mail, Phone, Calendar, MapPin, Users } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import { formatDynamicNit } from '@/lib/nit'

interface UserProfile {
  full_name?: string
  student_id_number?: string
  current_juz?: string
  email?: string
  whatsapp?: string
  telegram?: string
  tanggal_lahir?: string
  tempat_lahir?: string
  jenis_kelamin?: string
  negara?: string
  pekerjaan?: string
  alasan_daftar?: string
}

interface UserProfileCardProps {
  userId?: string
  className?: string
  showTitle?: boolean
  showAlert?: boolean
}

export function UserProfileCard({
  userId,
  className = '',
  showTitle = true,
  showAlert = true
}: UserProfileCardProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (userId) {
        try {
          const response = await fetch('/api/auth/me')
          if (response.ok) {
            const result = await response.json()
            const userData = result.data || result.user || result
            setUserProfile(userData)
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    fetchUserProfile()
  }, [userId])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!userProfile) {
    return null
  }

  const isProfileComplete = userProfile.full_name && userProfile.tanggal_lahir &&
    userProfile.tempat_lahir && userProfile.pekerjaan && userProfile.alasan_daftar &&
    userProfile.jenis_kelamin && userProfile.negara

  return (
    <div className={className}>
      {showAlert && !isProfileComplete && (
        <Alert className="bg-red-50 border-red-200 mb-4">
          <Info className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <p className="font-semibold mb-2">Profil Ukhti belum lengkap!</p>
            <p className="text-sm">Silakan lengkapi data diri untuk pengalaman yang lebih baik.</p>
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4 sm:p-6">
          {showTitle && (
            <h3 className="font-bold text-lg sm:text-xl text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              Data Diri
            </h3>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-sm">
            {userProfile.student_id_number && (
              <div className="space-y-1 md:col-span-2 bg-white/80 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-emerald-700 font-bold text-xs uppercase tracking-wider">Nomor Induk Tholibah (NIT)</p>
                  <p className="text-gray-900 font-mono font-bold text-base sm:text-lg">{formatDynamicNit(userProfile.student_id_number, userProfile.current_juz)}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Resmi & Permanen
                </span>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-gray-600 font-medium text-xs sm:text-sm">Nama Lengkap</p>
              <p className="text-gray-900 font-semibold text-sm sm:text-base">{userProfile.full_name || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium text-xs sm:text-sm flex items-center gap-1">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                Email
              </p>
              <p className="text-gray-900 font-semibold text-sm sm:text-base">{userProfile.email || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium text-xs sm:text-sm flex items-center gap-1">
                <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                No. WhatsApp
              </p>
              <p className="text-gray-900 font-semibold text-sm sm:text-base">{userProfile.whatsapp || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium text-xs sm:text-sm flex items-center gap-1">
                <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                No. Telegram
              </p>
              <p className="text-gray-900 font-semibold text-sm sm:text-base">{userProfile.telegram || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium text-xs sm:text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                Tanggal Lahir
              </p>
              <p className="text-gray-900 font-semibold text-sm sm:text-base">{userProfile.tanggal_lahir || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium text-xs sm:text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                Tempat Lahir
              </p>
              <p className="text-gray-900 font-semibold text-sm sm:text-base">{userProfile.tempat_lahir || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium text-xs sm:text-sm">Jenis Kelamin</p>
              <p className="text-gray-900 font-semibold text-sm sm:text-base">{userProfile.jenis_kelamin || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 font-medium text-xs sm:text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                Negara
              </p>
              <p className="text-gray-900 font-semibold text-sm sm:text-base">{userProfile.negara || '-'}</p>
            </div>
            {userProfile.pekerjaan && (
              <div className="space-y-1 md:col-span-2">
                <p className="text-gray-600 font-medium text-xs sm:text-sm">Pekerjaan</p>
                <p className="text-gray-900 font-semibold text-sm sm:text-base">{userProfile.pekerjaan}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
