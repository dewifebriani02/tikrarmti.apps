'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  X, BookOpen, GraduationCap, Users, LogOut, ChevronLeft, ChevronRight, Eye,
  LayoutGrid, ClipboardList, FileText, UserCheck, BarChart3, Calendar, Shield, Settings,
  MessageSquare, HeartHandshake, HelpCircle, Award, ArrowRightLeft, Video
} from 'lucide-react';
import { ROLE_RANKS, hasRequiredRank, isStaff } from '@/lib/roles';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal';

interface UniversalSidebarProps {
  currentPath?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ isOpen = false, onClose }: UniversalSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout, user } = useAuth();
  
  // Use primaryRole if available, fallback to roles array
  const userRoles = (user as any)?.primaryRole ? [(user as any).primaryRole] : (user?.roles || []);
  
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

  // Role-based navigation items
  const getNavItems = () => {
    const isAdmin = hasRequiredRank(userRoles, ROLE_RANKS.admin);
    const isMusyrifahAndUp = hasRequiredRank(userRoles, ROLE_RANKS.musyrifah);
    const isStaffGroup = isStaff(userRoles);
    
    // Base items for the sidebar
    const baseItems: any[] = [];

    // Admin/Staff Content (Rank 60+)
    if (isStaffGroup) {
      // SECTION: MONITORING
      baseItems.push({ type: 'header', label: 'Monitoring' });
      baseItems.push({
        href: '/dashboard',
        label: 'Dashboard Personal',
        icon: <LayoutGrid className="h-5 w-5 text-emerald-600" />,
      });
      if (isAdmin) {
        baseItems.push({
          href: '/statistik',
          label: 'Ringkasan Statistik',
          icon: <BarChart3 className="h-5 w-5" />,
        });

        // SECTION: ALUR PENDAFTARAN (Admin Only)
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
      }

      // SECTION: ALUR PEMBELAJARAN
      baseItems.push({ type: 'header', label: 'Alur Pembelajaran' });
      
      if (isAdmin) {
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
      }
      
      baseItems.push({
        href: '/admin/jadwal-harian',
        label: 'Jadwal Harian',
        icon: <Calendar className="h-5 w-5" />,
      });

      if (isAdmin) {
        baseItems.push({
          href: '/admin/halaqah?action=analisis-zoom',
          label: 'Analisis Zoom',
          icon: <Video className="h-5 w-5" />,
        });
      }

      if (isAdmin) {
        baseItems.push({
          href: '/admin/mutasi-jadwal',
          label: 'Mutasi Jadwal',
          icon: <ArrowRightLeft className="h-5 w-5" />,
        });
      }

      baseItems.push({
        href: '/presensi-jurnal',
        label: 'Presensi & Jurnal',
        icon: <BookOpen className="h-5 w-5" />,
      });
      
      if (isAdmin) {
        baseItems.push({
          href: '/admin/exams',
          label: 'Manajemen Ujian',
          icon: <GraduationCap className="h-5 w-5" />,
        });

        // SECTION: ALUR KELULUSAN
        baseItems.push({ type: 'header', label: 'Alur Kelulusan' });
        baseItems.push({
          href: '/kelulusan-sertifikat',
          label: 'Penerbitan Syahadah',
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
      }
      // SECTION: PENGATURAN & DATA (Admin Only)
      if (isAdmin) {
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
          href: '/admin/pengaturan/faq',
          label: 'Pengaturan FAQ',
          icon: <HelpCircle className="h-5 w-5" />,
        });
      }
    } 
    // Thalibah / Calon Thalibah Content
    else {
      baseItems.push({ type: 'header', label: 'Menu Utama' });
      baseItems.push({
        href: '/dashboard',
        label: 'Dasbor',
        icon: <LayoutGrid className="h-5 w-5" />,
      });
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
        href: '/pendaftaran/muallimah',
        label: 'Daftar Muallimah',
        icon: <GraduationCap className="h-5 w-5 text-green-600" />,
        onClick: (e: any) => {
          if (!window.confirm("PERHATIAN!\n\nPendaftaran ini khusus untuk calon PENGAJAR (Mu'allimah), BUKAN untuk calon SANTRI (Thalibah).\n\nJika Ukhti ingin mendaftar sebagai santri, silakan pilih menu 'Pendaftaran' atau 'Tikrar Tahfidz'.\n\nApakah Ukhti yakin ingin melanjutkan mendaftar sebagai Mu'allimah?")) {
            e.preventDefault();
          }
        }
      });
      baseItems.push({
        href: '/tashih',
        label: 'Tashih Bacaan',
        icon: <FileText className="h-5 w-5" />,
      });
      baseItems.push({
        href: '/perjalanan-saya',
        label: 'Perjalanan Saya',
        icon: <BarChart3 className="h-5 w-5" />,
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

        {/* Navigation */}
        <nav className={`flex-1 py-4 sm:py-6 space-y-1 sm:space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-green-900/20 scrollbar-track-transparent -webkit-overflow-scrolling:touch ${isCollapsed ? 'px-2' : 'px-3 sm:px-4'}`}>
          {navItems.map((item, index) => {
            if (item.type === 'header') {
              if (isCollapsed) return <div key={`header-${index}`} className="h-px bg-green-900/5 my-4 mx-4" />;
              return (
                <div key={`header-${index}`} className="px-6 pt-6 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-900/40">
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
                    ${isCollapsed ? 'justify-center px-2 py-3 hover:bg-green-50/50' : 'px-4 py-3 hover:bg-green-50/50 hover:translate-x-1'}
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
                    isCollapsed ? '' : 'mr-4'
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


          {/* Logout Button */}
          <div className={`py-3 sm:py-4 border-t border-green-900/20 ${isCollapsed ? 'px-2' : 'px-3 sm:px-4'}`}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowLogoutModal(true);
              }}
              type="button"
              aria-label="Keluar dari akun"
              title="Keluar"
              className={`flex items-center w-full rounded-lg text-base sm:text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100 active:text-red-800 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 touch-manipulation min-h-[48px] sm:min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${
                isCollapsed ? 'justify-center px-2 py-3' : 'justify-center sm:justify-start px-4 py-4 sm:px-3 sm:py-2.5'
              }`}
            >
              <LogOut className={`w-6 h-6 sm:w-5 sm:h-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span>Keluar</span>}
            </button>
          </div>
        </nav>
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