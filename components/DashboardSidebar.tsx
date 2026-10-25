'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  X, BookOpen, GraduationCap, Users, LogOut, ChevronLeft, ChevronRight, Eye,
  LayoutGrid, ClipboardList, FileText, UserCheck, BarChart3, Calendar, Shield, Settings,
  MessageSquare, HeartHandshake, HelpCircle, Award, ArrowRightLeft, Video, Database, RotateCcw, Sparkles
} from 'lucide-react';
import { ROLE_RANKS, hasRequiredRank, isStaff } from '@/lib/roles';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal';
import { usePersona } from '@/hooks/usePersona';
import { formatDynamicNit } from '@/lib/nit';

interface UniversalSidebarProps {
  currentPath?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ isOpen = false, onClose }: UniversalSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout, user } = useAuth();
  const {
    activePersona,
    isAdminPersona,
    isMusyrifahPersona,
    isMuallimahPersona,
    isRaisahPersona,
    isThalibahPersona,
  } = usePersona();
  
  const [isMounted, setIsMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Set mounted state after hydration
  useEffect(() => {
    const mountTimer = setTimeout(() => {
      setIsMounted(true);
      setIsMobile(window.innerWidth < 1024);
    }, 0);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(mountTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Role-based navigation items powered by Active Persona and MTI Journey Flow
  const getNavItems = () => {
    const baseItems: any[] = [];

    // 1. ADMIN / SUPER ADMIN PERSONA
    if (isAdminPersona) {
      baseItems.push({
        href: '/dashboard',
        label: 'Dasbor Admin',
        icon: <LayoutGrid className="h-5 w-5 text-emerald-600" />,
      });
      baseItems.push({
        href: '/statistik',
        label: 'Ringkasan Statistik',
        icon: <BarChart3 className="h-5 w-5" />,
      });

      baseItems.push({ type: 'header', label: 'Alur Pendaftaran' });
      baseItems.push({
        href: '/admin/muallimah',
        label: 'Daftar Muallimah',
        icon: <GraduationCap className="h-5 w-5 text-green-600" />,
      });
      baseItems.push({
        href: '/admin/tikrar',
        label: 'Pendaftaran & Seleksi',
        icon: <ClipboardList className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/admin/daftar-ulang',
        label: 'Daftar Ulang',
        icon: <UserCheck className="h-5 w-5" />,
      });

      baseItems.push({ type: 'header', label: 'Alur Pembelajaran' });
      baseItems.push({
        href: '/admin/halaqah',
        label: 'Manajemen Halaqah',
        icon: <Users className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/admin/partner',
        label: 'Manajemen Partner',
        icon: <HeartHandshake className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/admin/jadwal-harian',
        label: 'Jadwal Harian',
        icon: <Calendar className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/admin/halaqah/analisis-zoom',
        label: 'Analisis Zoom',
        icon: <Video className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/admin/mutasi-jadwal',
        label: 'Mutasi Jadwal',
        icon: <ArrowRightLeft className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/presensi-jurnal',
        label: 'Presensi & Jurnal',
        icon: <BookOpen className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/jurnal-harian',
        label: 'Pratinjau Jurnal Harian',
        icon: <BookOpen className="h-5 w-5 text-indigo-600" />,
      });
      baseItems.push({
        href: '/admin/exams',
        label: 'Manajemen Ujian',
        icon: <GraduationCap className="h-5 w-5" />,
      });

      baseItems.push({ type: 'header', label: 'Alur Kelulusan' });
      baseItems.push({
        href: '/admin/sertifikat',
        label: 'Manajemen Syahadah',
        icon: <Award className="h-5 w-5 text-amber-600" />,
      });
      baseItems.push({
        href: '/admin/testimonials',
        label: 'Testimoni Alumni',
        icon: <MessageSquare className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/admin/donations',
        label: 'Infaq Bulanan',
        icon: <HeartHandshake className="h-5 w-5" />,
      });

      baseItems.push({ type: 'header', label: 'Pengaturan & Data' });
      baseItems.push({
        href: '/admin/batch-program',
        label: 'Batch & Program',
        icon: <Calendar className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/admin/users',
        label: 'Manajemen Users',
        icon: <Shield className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/admin/whatsapp',
        label: 'Broadcast WhatsApp',
        icon: <MessageSquare className="h-5 w-5 text-emerald-600" />,
      });
      baseItems.push({
        href: '/admin/pengaturan/faq',
        label: 'Pengaturan FAQ',
        icon: <HelpCircle className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/admin/backup',
        label: 'Backup Database',
        icon: <Database className="h-5 w-5 text-emerald-600" />,
      });
      baseItems.push({
        href: '/pengaturan',
        label: 'Pengaturan Akun',
        icon: <Settings className="h-5 w-5" />,
      });
    }
    // 2. MUSYRIFAH PERSONA (Pengawas Lapangan Multi-Halaqah)
    else if (isMusyrifahPersona) {
      baseItems.push({
        href: '/dashboard',
        label: 'Dasbor Pengawas',
        icon: <LayoutGrid className="h-5 w-5 text-blue-600" />,
      });

      baseItems.push({ type: 'header', label: 'Pengawasan Halaqah' });
      baseItems.push({
        href: '/admin/jadwal-harian',
        label: 'Jadwal Harian',
        icon: <Calendar className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/presensi-jurnal',
        label: 'Presensi & Jurnal Multi-Kelas',
        icon: <BookOpen className="h-5 w-5 text-blue-600" />,
      });
      baseItems.push({
        href: '/admin/halaqah/analisis-zoom',
        label: 'Analisis Zoom',
        icon: <Video className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/admin/mutasi-jadwal',
        label: 'Mutasi Jadwal',
        icon: <ArrowRightLeft className="h-5 w-5" />,
      });

      baseItems.push({ type: 'header', label: 'Profil & Akun' });
      baseItems.push({
        href: '/profile',
        label: 'Edit Profil',
        icon: <UserCheck className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/pengaturan',
        label: 'Pengaturan Akun',
        icon: <Settings className="h-5 w-5" />,
      });
    }
    // 3. MU'ALLIMAH PERSONA (Pengajar / Pengampu Halaqah)
    else if (isMuallimahPersona) {
      baseItems.push({
        href: '/dashboard',
        label: 'Dasbor Pengajar',
        icon: <LayoutGrid className="h-5 w-5 text-emerald-600" />,
      });

      baseItems.push({ type: 'header', label: 'Pengajaran & Bimbingan' });
      baseItems.push({
        href: '/admin/jadwal-harian',
        label: 'Jadwal Mengajar',
        icon: <Calendar className="h-5 w-5 text-emerald-600" />,
      });
      baseItems.push({
        href: '/presensi-jurnal',
        label: 'Bimbingan & Presensi',
        icon: <BookOpen className="h-5 w-5 text-emerald-600" />,
      });
      baseItems.push({
        href: '/tashih',
        label: 'Tashih Bacaan Santri',
        icon: <FileText className="h-5 w-5 text-emerald-600" />,
      });

      baseItems.push({ type: 'header', label: 'Profil & Akun' });
      baseItems.push({
        href: '/profile',
        label: 'Edit Profil',
        icon: <UserCheck className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/pengaturan',
        label: 'Pengaturan Akun',
        icon: <Settings className="h-5 w-5" />,
      });
    }
    // 4. RAISAH PERSONA (Ketua Kelas Santri)
    else if (isRaisahPersona) {
      baseItems.push({
        href: '/dashboard',
        label: 'Dasbor',
        icon: <LayoutGrid className="h-5 w-5 text-purple-600" />,
      });
      baseItems.push({
        href: '/perjalanan-saya',
        label: 'Perjalanan Saya',
        icon: <BarChart3 className="h-5 w-5" />,
      });

      baseItems.push({ type: 'header', label: 'Halaqah & Pembelajaran' });
      baseItems.push({
        href: '/jadwal-harian',
        label: 'Jadwal Harian',
        icon: <Calendar className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/jurnal-harian',
        label: 'Jurnal Harian',
        icon: <BookOpen className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/presensi-jurnal',
        label: 'Presensi Halaqah Saya',
        icon: <BookOpen className="h-5 w-5 text-purple-600" />,
      });
      baseItems.push({
        href: '/tashih',
        label: 'Tashih Bacaan',
        icon: <FileText className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/sit-in',
        label: 'Sit-In Kelas',
        icon: <ArrowRightLeft className="h-5 w-5 text-rose-600" />,
      });

      baseItems.push({ type: 'header', label: 'Evaluasi & Syahadah' });
      baseItems.push({
        href: '/ujian',
        label: 'Ujian Akhir',
        icon: <GraduationCap className="h-5 w-5 text-indigo-600" />,
      });
      baseItems.push({
        href: '/kelulusan-sertifikat',
        label: 'Syahadah & Kelulusan',
        icon: <Award className="h-5 w-5 text-amber-600" />,
      });

      baseItems.push({ type: 'header', label: 'Lanjutan & Alumni' });
      baseItems.push({
        href: '/murojaah',
        label: "Muraja'ah 40x",
        icon: <RotateCcw className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/alumni',
        label: 'Ruang Alumni',
        icon: <Users className="h-5 w-5" />,
      });

      baseItems.push({ type: 'header', label: 'Profil' });
      baseItems.push({
        href: '/profile',
        label: 'Edit Profil',
        icon: <UserCheck className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/pengaturan',
        label: 'Pengaturan',
        icon: <Settings className="h-5 w-5" />,
      });
    }
    // 5. THALIBAH / CALON THALIBAH PERSONA (Alur Lengkap Santriwati MTI)
    else {
      // 1. Pintu Utama (Dasbor & Peta Perjalanan) - Langsung tanpa header "Menu Utama"
      baseItems.push({
        href: '/dashboard',
        label: 'Dasbor',
        icon: <LayoutGrid className="h-5 w-5 text-emerald-600" />,
      });
      baseItems.push({
        href: '/perjalanan-saya',
        label: 'Perjalanan Saya',
        icon: <BarChart3 className="h-5 w-5" />,
      });

      // 2. Alur Pembelajaran Aktif
      baseItems.push({ type: 'header', label: 'Pembelajaran' });
      baseItems.push({
        href: '/jadwal-harian',
        label: 'Jadwal Harian',
        icon: <Calendar className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/jurnal-harian',
        label: 'Jurnal Harian',
        icon: <BookOpen className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/tashih',
        label: 'Tashih Bacaan',
        icon: <FileText className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/sit-in',
        label: 'Sit-In Kelas',
        icon: <ArrowRightLeft className="h-5 w-5 text-rose-600" />,
      });

      // 3. Alur Evaluasi & Kelulusan
      baseItems.push({ type: 'header', label: 'Evaluasi & Syahadah' });
      baseItems.push({
        href: '/ujian',
        label: 'Ujian Akhir',
        icon: <GraduationCap className="h-5 w-5 text-indigo-600" />,
      });
      baseItems.push({
        href: '/kelulusan-sertifikat',
        label: 'Syahadah & Kelulusan',
        icon: <Award className="h-5 w-5 text-amber-600" />,
      });

      // 4. Alur Lanjutan, Komunitas & Pengabdian
      baseItems.push({ type: 'header', label: 'Lanjutan & Alumni' });
      baseItems.push({
        href: '/murojaah',
        label: "Muraja'ah 40x",
        icon: <RotateCcw className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/alumni',
        label: 'Ruang Alumni',
        icon: <Users className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/pendaftaran/muallimah',
        label: 'Daftar Muallimah',
        icon: <GraduationCap className="h-5 w-5 text-green-600" />,
      });

      // 5. Akun & Profil
      baseItems.push({ type: 'header', label: 'Profil' });
      baseItems.push({
        href: '/profile',
        label: 'Edit Profil',
        icon: <UserCheck className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/pengaturan',
        label: 'Pengaturan',
        icon: <Settings className="h-5 w-5" />,
      });
    }

    return baseItems;
  };
  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href.includes('?tab=')) {
      const [path, query] = href.split('?');
      const tabParam = new URLSearchParams(query).get('tab');
      return pathname === path && searchParams.get('tab') === tabParam;
    }
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  };

  return (
    <>
      {/* Mobile overlay - Only render after mount to prevent hydration mismatch */}
      {isMounted && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden transition-opacity duration-500"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Ensure consistent className between server and client */}
      <aside className={`
        fixed lg:sticky inset-y-0 lg:top-0 left-0 z-[100] lg:z-20 border-r border-gray-100
        transform transition-all duration-500 ease-in-out lg:h-screen shadow-[0_0_20px_rgba(0,0,0,0.05)]
        ${isMounted && isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-60'}
      `}>
        <div className="flex flex-col h-full bg-white">

        {/* Logo */}
        <div className="flex items-center justify-between h-16 border-b border-green-900/20 px-3 flex-shrink-0">
          {!isCollapsed ? (
            <Link href="/" className="flex items-center space-x-2 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10">
                <Image
                    src="https://github.com/dewifebriani-project/File-Public/blob/main/Markaz%20Tikrar%20Indonesia.jpg?raw=true"
                    alt="Tikrar MTI"
                    width={40}
                    height={40}
                    className="object-contain w-full h-full"
                    sizes="40px"
                    priority
                    unoptimized
                  />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-base font-bold text-green-900 leading-tight truncate">Tikrar MTI Apps</span>
              </div>
            </Link>
          ) : (
            <Link href="/" className="flex items-center justify-center w-full">
              <div className="flex-shrink-0 w-10 h-10">
                <Image
                    src="https://github.com/dewifebriani-project/File-Public/blob/main/Markaz%20Tikrar%20Indonesia.jpg?raw=true"
                    alt="Tikrar MTI"
                    width={40}
                    height={40}
                    className="object-contain w-full h-full"
                    sizes="40px"
                    priority
                    unoptimized
                  />
              </div>
            </Link>
          )}

          {/* Close button for mobile, Collapse button for desktop/tablet */}
          <button
            onClick={() => {
              if (isMobile) {
                onClose?.();
              } else {
                setIsCollapsed(!isCollapsed);
              }
            }}
            className="p-2 rounded-lg hover:bg-green-50 transition-colors duration-200"
            title={isMobile ? 'Close menu' : (isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          >
            {isMobile ? (
              <X className="w-5 h-5 text-green-900" />
            ) : isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-green-900" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-green-900" />
            )}
          </button>
        </div>

        {/* Navigation - Space kosong dihilangkan, Dasbor langsung tampil di bagian atas */}
        <nav className={`flex-1 pt-2 sm:pt-3 pb-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-green-900/20 scrollbar-track-transparent -webkit-overflow-scrolling:touch ${isCollapsed ? 'px-2' : 'px-3 sm:px-4'}`}>
          {navItems.map((item, index) => {
            if (item.type === 'header') {
              if (isCollapsed) return <div key={`header-${index}`} className="h-px bg-green-900/10 my-3 mx-2" />;
              return (
                <div key={`header-${index}`} className="px-3 pt-4 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-green-900/40">
                    {item.label}
                  </span>
                </div>
              );
            }

            return (
              <div key={item.href} className="relative">
                <Link
                  href={item.href}
                  className={`
                    flex items-center rounded-xl text-sm font-medium transition-all duration-300 relative min-w-0 touch-manipulation group
                    ${isCollapsed ? 'justify-center px-2 py-3 hover:bg-green-50/50' : 'px-4 py-2.5 hover:bg-green-50/50 hover:translate-x-1'}
                    ${isActive(item.href)
                      ? 'bg-green-50 text-green-900 shadow-sm border border-green-900/5'
                      : 'text-gray-500 hover:text-green-900'
                    }
                  `}
                  onClick={(e) => {
                    if (item.onClick) {
                      item.onClick(e);
                    }
                    if (isMobile) {
                      onClose?.();
                    }
                  }}
                  title={isCollapsed ? item.label : ''}
                >
                  {/* Active Indicator Accent */}
                  {!isCollapsed && isActive(item.href) && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-green-600 rounded-r-full" />
                  )}

                  <div className={`w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ${
                    isCollapsed ? '' : 'mr-3.5'
                  } ${
                    isActive(item.href)
                      ? 'bg-green-600/10'
                      : 'bg-gray-100'
                    }`}>
                    <div className={
                      isActive(item.href)
                        ? 'text-green-700'
                        : 'text-gray-400 group-hover:text-green-700'
                    }>
                      {item.icon}
                    </div>
                  </div>
                  {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                  </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer: Compact Name & NIT with Icon Logout Button */}
        {isMounted && (
          <div className="border-t border-gray-100 bg-gray-50/70 p-2.5 flex-shrink-0">
            {isCollapsed ? (
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLogoutModal(true);
                  }}
                  type="button"
                  aria-label="Keluar dari akun"
                  title="Keluar"
                  className="p-2 rounded-xl text-red-600 hover:bg-red-100/80 hover:text-red-700 active:bg-red-200 transition-colors border border-red-200/50 shadow-2xs group focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate" title={user?.full_name || "Hamba Allah"}>
                    {user?.full_name || "Hamba Allah"}
                  </p>
                  {user?.student_id_number && (
                    <p className="text-[10px] font-mono font-bold text-emerald-800 truncate mt-0.5" title="Nomor Induk Tholibah">
                      NIT: {formatDynamicNit(user.student_id_number, (user as any)?.current_juz)}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLogoutModal(true);
                  }}
                  type="button"
                  aria-label="Keluar dari akun"
                  title="Keluar"
                  className="p-2 rounded-xl text-red-600 hover:bg-red-100/80 hover:text-red-700 active:bg-red-200 transition-colors border border-red-200/50 shadow-2xs group focus:outline-none focus:ring-2 focus:ring-red-500 shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <LogoutConfirmModal 
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } catch (error) {
            console.error('Logout error:', error);
            setIsLoggingOut(false);
            setShowLogoutModal(false);
          }
        }}
        isLoggingOut={isLoggingOut}
      />
    </aside>
    </>
  );
}
