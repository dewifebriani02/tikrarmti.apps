'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import PublicLayout from './PublicLayout';
import DonasiAuthenticatedLayout from './DonasiAuthenticatedLayout';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const pathname = usePathname() || '';
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth routes that don't need any wrapper (login, register)
  const authRoutes = [
    '/login', 
    '/register', 
    '/auth', 
    '/lupa-password', 
    '/reset-password', 
    '/verifikasi-otp',
    '/forgot-password',
    '/ganti-password',
    '/maintenance'
  ];

  // Pendaftaran routes that need authentication
  const pendaftaranRoutes = ['/pendaftaran', '/lengkapi-profile'];

  // Authenticated routes with sidebar (dashboard and other app pages)
  const authenticatedRoutes = [
    '/dashboard',
    '/jurnal-harian',
    '/jurnal-pra-tikrar',
    '/tashih',
    '/perjalanan-saya',
    '/jadwal-harian',
    '/daftar-ulang',
    '/pilih-pasangan',
    '/seleksi',
    '/ujian',
    '/alumni',
    '/murojaah',
    '/murajaah',
    '/sit-in',
    '/statistik',
    '/infaq-donasi',
    '/donasi-dashboard',
    '/pengaturan',
    '/profile',
    '/admin',
    '/muallimah',
    '/panel-musyrifah',
    '/panel-muallimah',
    '/presensi-jurnal',
    '/exam',
    '/kelulusan-sertifikat',
  ];

  // Check if current route is an auth route
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Check if current route is a pendaftaran route
  const isPendaftaranRoute = pendaftaranRoutes.some(route => pathname.startsWith(route));

  // Check if current route is an authenticated route
  const isAuthenticatedRoute = authenticatedRoutes.some(route => pathname.startsWith(route));

  // Combine pendaftaran routes with authenticated routes
  const requiresAuth = isAuthenticatedRoute || isPendaftaranRoute;

  // Use donasi layout for donasi dashboard
  if (pathname === '/donasi-dashboard') {
    return <DonasiAuthenticatedLayout title={title}>{children}</DonasiAuthenticatedLayout>;
  }

  // For auth routes (login, register), render children without any wrapper
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // For authenticated routes and pendaftaran routes, render children without wrapper (they have their own layout with sidebar)
  if (requiresAuth) {
    return <>{children}</>;
  }

  // Use public layout for all other routes (landing page, etc.)
  return <PublicLayout>{children}</PublicLayout>;
}
