'use client'

import { ReactNode, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import DashboardSidebar from '@/components/DashboardSidebar'
import BottomNavbar from '@/components/BottomNavbar'
import GlobalAuthenticatedHeader from '@/components/GlobalAuthenticatedHeader'
import { isStaff } from '@/lib/roles'
import Footer from '@/components/Footer'

import { AuthProvider } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { useInfaqStatus } from '@/hooks/useInfaqStatus'
import { InfaqReminderBanner } from '@/components/InfaqReminderBanner'
import { InfaqSuspendGuard } from '@/components/InfaqSuspendGuard'

interface ProtectedClientLayoutProps {
  children: ReactNode
  user: {
    id: string
    email: string
    full_name: string
    primaryRole: string
    roles: string[]
    avatar_url?: string
    whatsapp?: string
    telegram?: string
    negara?: string
    provinsi?: string
    kota?: string
    alamat?: string
    zona_waktu?: string
    tanggal_lahir?: string
    tempat_lahir?: string
    jenis_kelamin?: string
    pekerjaan?: string
    alasan_daftar?: string
  }
}

export default function ProtectedClientLayout({ children, user }: ProtectedClientLayoutProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { status: infaqStatus, refreshStatus } = useInfaqStatus()

  // Routes that should not have header and footer
  const hideHeaderFooterRoutes: string[] = []
  const shouldHideHeaderFooter = hideHeaderFooterRoutes.some(route => pathname.startsWith(route))

  // Set mounted state after hydration - DEFERRED to prevent React Error #310
  useEffect(() => {
    const mountTimer = setTimeout(() => {
      setIsMounted(true)
    }, 0)

    return () => clearTimeout(mountTimer)
  }, [])

  // Close sidebar on mobile when route changes
  const handleCloseSidebar = () => setIsSidebarOpen(false)

  return (
    <AuthProvider serverUserData={{
      ...user,
      is_active: true,
      created_at: '',
      updated_at: ''
    } as any}>
      <div className="flex h-screen bg-gray-50 overflow-hidden relative">
        {/* Sidebar - Available for all roles */}
        <DashboardSidebar
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Global Header - Sticky at top */}
          {!shouldHideHeaderFooter && (
            <div className="sticky top-0 z-50">
              <GlobalAuthenticatedHeader
                onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                isSidebarOpen={isSidebarOpen}
                isMounted={isMounted}
                showSidebarToggle={true}
              />
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50 pt-0 pb-24 flex flex-col">

            <main className="p-3 sm:p-4 lg:p-6 flex-grow">
              <div className="max-w-full">
                {/* Infaq Reminder Banner (Tgl 1 - 10) */}
                {isMounted && <InfaqReminderBanner status={infaqStatus} />}

                {/* Infaq Suspend Guard (Lewat Tgl 10) */}
                {isMounted ? (
                  <InfaqSuspendGuard
                    status={infaqStatus}
                    user={user}
                    onStatusRefresh={refreshStatus}
                  >
                    {children}
                  </InfaqSuspendGuard>
                ) : (
                  children
                )}
              </div>
            </main>

          </div>
        </div>

        {/* Bottom Navbar - For all users on all platforms */}
        {isMounted && <BottomNavbar />}

      </div>
    </AuthProvider>
  )
}


