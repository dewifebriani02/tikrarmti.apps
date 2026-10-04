'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  HeartHandshake,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Award,
  Star,
  MessageSquareQuote,
  Filter,
  ArrowUpRight,
  Activity,
  FileText,
  Headphones,
  BookCheck,
  ChevronRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BatchItem {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface DashboardData {
  selectedBatchId: string;
  batches: BatchItem[];
  counts: {
    totalBatches: number;
    totalHalaqah: number;
    totalHalaqahStudents: number;
    totalCapacity: number;
    totalUsers: number;
    totalThalibah: number;
    totalMuallimah: number;
    totalMusyrifah: number;
    totalAdmin: number;
    totalRegistrations: number;
    totalDaftarUlang: number;
    totalStudyPartners: number;
    totalJurnal: number;
    totalTashih: number;
    totalExamAttempts: number;
    totalTestimonials: number;
  };
  rolesDistribution: {
    thalibah: number;
    muallimah: number;
    musyrifah: number;
    admin: number;
  };
  funnelSeleksi: {
    totalRegistrations: number;
    approvedRegistrations: number;
    pendingRegistrations: number;
    rejectedRegistrations: number;
    oralPass: number;
    oralFail: number;
    oralPending: number;
    oralNotSubmitted: number;
    selectedCount: number;
    waitlistCount: number;
    notSelectedCount: number;
    selectionPending: number;
    daftarUlangApproved: number;
    daftarUlangDraft: number;
  };
  targetJuzDistribution: {
    juz: string;
    count: number;
  }[];
  timezoneDistribution: {
    timezone: string;
    count: number;
  }[];
  halaqahMetrics: {
    totalHalaqah: number;
    totalCapacity: number;
    totalAssigned: number;
    withMuallimah: number;
    withoutMuallimah: number;
    utilizationRate: number;
  };
  studyPartnerMetrics: {
    totalPartnerships: number;
    activePairs: number;
    pendingPairs: number;
    selfMatch: number;
    systemMatch: number;
    tarteel: number;
    family: number;
  };
  jurnalCompliance: {
    totalRecords: number;
    totalMurajaah: number;
    tashihDone: number;
    tashihPercentage: number;
    simakDone: number;
    simakPercentage: number;
    nadzarDone: number;
    nadzarPercentage: number;
    rabthDone: number;
    rabthPercentage: number;
    tafsirDone: number;
    tafsirPercentage: number;
    menulisDone: number;
    menulisPercentage: number;
  };
  tashihStats: {
    totalTashih: number;
    uniqueThalibah: number;
    uniqueMuallimah: number;
    avgKesalahan: number;
  };
  examStats: {
    totalAttempts: number;
    avgScore: number;
    passedCount: number;
    passRate: number;
    scoreDistribution: {
      score90_100: number;
      score80_89: number;
      score70_79: number;
      score60_69: number;
      scoreUnder60: number;
    };
  };
  satisfactionStats: {
    totalTestimonials: number;
    avgRating: number;
    fiveStar: number;
    fourStar: number;
    belowFourStar: number;
    recentTestimonials: {
      id: string;
      content: string;
      rating: number;
      program_name?: string;
      batch_name?: string;
      created_at: string;
    }[];
  };
  pendingApprovals: {
    registrations: number;
    oralAssessment: number;
    daftarUlang: number;
    transfer: number;
    muallimah: number;
  };
  registrationTrend: {
    date: string;
    count: number;
  }[];
}

type TabType = 'overview' | 'funnel' | 'halaqah' | 'learning' | 'feedback';

export function AdminStatistik() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchStatistik = useCallback(async (batchId = 'all', isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = batchId && batchId !== 'all'
        ? `/api/admin/statistik-dashboard?batch_id=${encodeURIComponent(batchId)}`
        : '/api/admin/statistik-dashboard';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Gagal mengambil data statistik dashboard');
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setLastUpdated(
          new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        if (isRefresh) {
          toast.success('Data statistik berhasil diperbarui');
        }
      } else {
        throw new Error(result.error || 'Terjadi kesalahan sistem');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistik(selectedBatch);
  }, [fetchStatistik, selectedBatch]);

  if (loading) {
    return (
      <div className="flex flex-col h-96 items-center justify-center gap-4 bg-white/50 backdrop-blur rounded-2xl border border-gray-100">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center animate-spin">
          <RefreshCw className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800">Menyusun Data Analitik...</p>
          <p className="text-xs text-gray-400 mt-0.5">Menghitung metrik & agregasi dari database PostgreSQL</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Chart 1: Trend Pendaftaran
  const trendData = {
    labels: data.registrationTrend.map((t) => {
      const d = new Date(t.date);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }),
    datasets: [
      {
        label: 'Pendaftaran Harian',
        data: data.registrationTrend.map((t) => t.count),
        borderColor: '#059669', // emerald-600
        backgroundColor: 'rgba(5, 150, 105, 0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#059669',
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: '#111827',
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f3f4f6' },
        ticks: { precision: 0, font: { size: 11 } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 45 },
      },
    },
  };

  // Chart 2: Komposisi Role
  const rolesData = {
    labels: ['Thalibah', 'Muallimah', 'Musyrifah', 'Admin'],
    datasets: [
      {
        data: [
          data.rolesDistribution.thalibah,
          data.rolesDistribution.muallimah,
          data.rolesDistribution.musyrifah,
          data.rolesDistribution.admin,
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const rolesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 14,
          font: { size: 11, weight: 'bold' as const },
        },
      },
    },
    cutout: '72%',
  };

  // Chart 3: Target Juz Distribution
  const juzData = {
    labels: data.targetJuzDistribution.map((j) => `Juz ${j.juz}`),
    datasets: [
      {
        label: 'Jumlah Santri',
        data: data.targetJuzDistribution.map((j) => j.count),
        backgroundColor: [
          '#10b981',
          '#06b6d4',
          '#3b82f6',
          '#6366f1',
          '#8b5cf6',
          '#ec4899',
          '#f43f5e',
          '#f59e0b',
        ],
        borderRadius: 6,
      },
    ],
  };

  const juzOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f3f4f6' },
        ticks: { precision: 0 },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, weight: 'bold' as const } },
      },
    },
  };

  // Chart 4: Exam Score Distribution
  const examScoreData = {
    labels: ['90-100', '80-89', '70-79', '60-69', '< 60'],
    datasets: [
      {
        label: 'Jumlah Peserta',
        data: [
          data.examStats.scoreDistribution.score90_100,
          data.examStats.scoreDistribution.score80_89,
          data.examStats.scoreDistribution.score70_79,
          data.examStats.scoreDistribution.score60_69,
          data.examStats.scoreDistribution.scoreUnder60,
        ],
        backgroundColor: ['#10b981', '#34d399', '#3b82f6', '#f59e0b', '#ef4444'],
        borderRadius: 6,
      },
    ],
  };

  // Chart 5: Partner Matching Method
  const partnerData = {
    labels: ['Sistem Admin', 'Pilihan Mandiri', 'Tarteel AI', 'Keluarga/Kerabat'],
    datasets: [
      {
        data: [
          data.studyPartnerMetrics.systemMatch,
          data.studyPartnerMetrics.selfMatch,
          data.studyPartnerMetrics.tarteel,
          data.studyPartnerMetrics.family,
        ],
        backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const totalPendingActions =
    data.pendingApprovals.registrations +
    data.pendingApprovals.oralAssessment +
    data.pendingApprovals.daftarUlang +
    data.pendingApprovals.transfer +
    data.pendingApprovals.muallimah;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filter & Action Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Batch Filter Selector */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <Filter className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              aria-label="Pilih Batch untuk filter statistik"
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer truncate"
            >
              <option value="all">Semua Batch (Akumulatif)</option>
              {data.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.status === 'open' ? '🟢 Aktif' : 'Tutup'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Refresh Action & Timestamp */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {lastUpdated && (
            <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">
              Update: {lastUpdated} WIB
            </span>
          )}
          <button
            onClick={() => fetchStatistik(selectedBatch, true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-bold text-xs border border-gray-200 hover:border-emerald-200 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{refreshing ? 'Memuat...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Action Center: Pending Verification Tasks */}
      {totalPendingActions > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-200/80 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 leading-tight">
                    Pusat Tindakan & Verifikasi Admin
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] sm:text-[10px] font-extrabold">
                    {totalPendingActions} Menunggu
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5 leading-snug">
                  Terdapat pengajuan santri & calon pengajar yang membutuhkan persetujuan tim administrator.
                </p>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 pt-1 sm:pt-0">
              {data.pendingApprovals.registrations > 0 && (
                <Link
                  href="/admin/tikrar"
                  className="flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-amber-200 text-[11px] sm:text-xs font-bold text-gray-800 hover:text-emerald-700 hover:border-emerald-300 shadow-xs transition-all"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate">Pendaftar</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[10px] sm:text-[11px]">
                    {data.pendingApprovals.registrations}
                  </span>
                </Link>
              )}
              {data.pendingApprovals.oralAssessment > 0 && (
                <Link
                  href="/admin/tikrar"
                  className="flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-amber-200 text-[11px] sm:text-xs font-bold text-gray-800 hover:text-emerald-700 hover:border-emerald-300 shadow-xs transition-all"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                    <span className="truncate">Tugas Lisan</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-800 font-extrabold text-[10px] sm:text-[11px]">
                    {data.pendingApprovals.oralAssessment}
                  </span>
                </Link>
              )}
              {data.pendingApprovals.daftarUlang > 0 && (
                <Link
                  href="/admin/daftar-ulang"
                  className="flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-amber-200 text-[11px] sm:text-xs font-bold text-gray-800 hover:text-emerald-700 hover:border-emerald-300 shadow-xs transition-all"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="truncate">Daftar Ulang</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold text-[10px] sm:text-[11px]">
                    {data.pendingApprovals.daftarUlang}
                  </span>
                </Link>
              )}
              {data.pendingApprovals.transfer > 0 && (
                <Link
                  href="/admin/halaqah"
                  className="flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-amber-200 text-[11px] sm:text-xs font-bold text-gray-800 hover:text-emerald-700 hover:border-emerald-300 shadow-xs transition-all"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <span className="truncate">Pindah Jadwal</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 font-extrabold text-[10px] sm:text-[11px]">
                    {data.pendingApprovals.transfer}
                  </span>
                </Link>
              )}
              {data.pendingApprovals.muallimah > 0 && (
                <Link
                  href="/admin/muallimah"
                  className="flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-amber-200 text-[11px] sm:text-xs font-bold text-gray-800 hover:text-emerald-700 hover:border-emerald-300 shadow-xs transition-all"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Akad Muallimah</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] sm:text-[11px]">
                    {data.pendingApprovals.muallimah}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top 6 Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        {/* KPI 1: Pengguna */}
        <Card className="bg-white border-gray-100 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all group">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">Pengguna</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{data.counts.totalUsers}</div>
            <div className="text-[9px] sm:text-[10px] text-gray-400 mt-1.5 font-medium flex items-center gap-1 truncate">
              <span className="text-emerald-600 font-bold">{data.counts.totalThalibah}</span> Thalibah
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Pendaftar */}
        <Card className="bg-white border-gray-100 shadow-xs hover:shadow-md hover:border-blue-200 transition-all group">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">Pendaftar</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{data.counts.totalRegistrations}</div>
            <div className="text-[9px] sm:text-[10px] text-gray-400 mt-1.5 font-medium flex items-center gap-1 truncate">
              <span className="text-blue-600 font-bold">{data.funnelSeleksi.selectedCount}</span> Lolos Seleksi
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Daftar Ulang */}
        <Card className="bg-white border-gray-100 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">Daftar Ulang</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{data.counts.totalDaftarUlang}</div>
            <div className="text-[9px] sm:text-[10px] text-gray-400 mt-1.5 font-medium flex items-center gap-1 truncate">
              <span className="text-indigo-600 font-bold">{data.funnelSeleksi.daftarUlangApproved}</span> Disetujui
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Halaqah */}
        <Card className="bg-white border-gray-100 shadow-xs hover:shadow-md hover:border-purple-200 transition-all group">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">Halaqah</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{data.counts.totalHalaqah}</div>
            <div className="text-[9px] sm:text-[10px] text-gray-400 mt-1.5 font-medium flex items-center gap-1 truncate">
              <span className="text-purple-600 font-bold">{data.counts.totalHalaqahStudents}</span> Santri Aktif
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Jurnal Harian */}
        <Card className="bg-white border-gray-100 shadow-xs hover:shadow-md hover:border-amber-200 transition-all group">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">Setoran Jurnal</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{data.counts.totalJurnal.toLocaleString('id-ID')}</div>
            <div className="text-[9px] sm:text-[10px] text-gray-400 mt-1.5 font-medium flex items-center gap-1 truncate">
              <span className="text-amber-600 font-bold">{data.counts.totalTashih}</span> Sesi Tashih
            </div>
          </CardContent>
        </Card>

        {/* KPI 6: Kepuasan Santri */}
        <Card className="bg-white border-gray-100 shadow-xs hover:shadow-md hover:border-rose-200 transition-all group">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">Kepuasan</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-rose-500" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 flex items-baseline gap-1 leading-none">
              <span>{data.satisfactionStats.avgRating}</span>
              <span className="text-[10px] text-gray-400 font-normal">/5.0</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-400 mt-1.5 font-medium flex items-center gap-1 truncate">
              <span className="text-rose-600 font-bold">{data.satisfactionStats.totalTestimonials}</span> Testimoni
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Ringkasan & Tren</span>
        </button>

        <button
          onClick={() => setActiveTab('funnel')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'funnel'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Funnel Seleksi & Juz</span>
        </button>

        <button
          onClick={() => setActiveTab('halaqah')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'halaqah'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Halaqah & Partner</span>
        </button>

        <button
          onClick={() => setActiveTab('learning')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'learning'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Pembelajaran & Tashih</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'feedback'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>Ujian & Testimoni</span>
        </button>
      </div>
      {/* TAB CONTENT 1: OVERVIEW & TRENDS */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Registration Trend (30 Days) */}
            <Card className="lg:col-span-2 bg-white border border-gray-100 shadow-xs">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                      Tren Pendaftaran 30 Hari Terakhir
                    </CardTitle>
                    <CardDescription className="text-[11px] sm:text-xs">
                      Grafik volume pendaftaran harian thalibah
                    </CardDescription>
                  </div>
                  <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[10px] sm:text-[11px] font-bold text-emerald-700">
                    Real-time
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0">
                <div className="h-[200px] sm:h-[280px] w-full">
                  <Line data={trendData} options={trendOptions} />
                </div>
              </CardContent>
            </Card>

            {/* Roles Composition Doughnut */}
            <Card className="bg-white border border-gray-100 shadow-xs flex flex-col">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                  Komposisi Role Pengguna
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs">
                  Distribusi akun terdaftar di sistem
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0 flex-1 flex flex-col justify-between">
                <div className="h-[170px] sm:h-[200px] w-full relative">
                  <Doughnut data={rolesData} options={rolesOptions} />
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-gray-100 text-xs">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-gray-500 text-[9px] sm:text-[10px] block">Thalibah</span>
                    <strong className="text-xs sm:text-sm text-emerald-800 font-extrabold">
                      {data.rolesDistribution.thalibah}
                    </strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                    <span className="text-gray-500 text-[9px] sm:text-[10px] block">Muallimah</span>
                    <strong className="text-xs sm:text-sm text-blue-800 font-extrabold">
                      {data.rolesDistribution.muallimah}
                    </strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                    <span className="text-gray-500 text-[9px] sm:text-[10px] block">Musyrifah</span>
                    <strong className="text-xs sm:text-sm text-amber-800 font-extrabold">
                      {data.rolesDistribution.musyrifah}
                    </strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-purple-50/60 border border-purple-100">
                    <span className="text-gray-500 text-[9px] sm:text-[10px] block">Admin</span>
                    <strong className="text-xs sm:text-sm text-purple-800 font-extrabold">
                      {data.rolesDistribution.admin}
                    </strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Row: Timezone & Batch Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Timezone Distribution */}
            <Card className="bg-white border border-gray-100 shadow-xs">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                  Sebaran Zona Waktu Santri
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs">
                  Domisili waktu pendaftar program
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0 space-y-2.5 sm:space-y-3">
                {data.timezoneDistribution.map((tz) => {
                  const pct = Math.round(
                    (tz.count / (data.counts.totalRegistrations || 1)) * 100
                  );
                  return (
                    <div key={tz.timezone} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-700">{tz.timezone}</span>
                        <span className="text-gray-500">
                          {tz.count} santri ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Batch Status & Info */}
            <Card className="lg:col-span-2 bg-white border border-gray-100 shadow-xs">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                  Status Angkatan / Batches
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs">
                  Riwayat angkatan program Tikrar Tahfidz MTI
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0">
                <div className="divide-y divide-gray-100">
                  {data.batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            batch.status === 'open'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">
                            {batch.name}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-gray-400">
                            Periode: {batch.start_date || 'N/A'} s/d {batch.end_date || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center self-start sm:self-auto">
                        <span
                          className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${
                            batch.status === 'open'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {batch.status === 'open' ? '🟢 Sedang Berjalan' : 'Selesai'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: FUNNEL SELEKSI & JUZ */}
      {activeTab === 'funnel' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Visual Funnel Cards */}
          <Card className="bg-white border border-gray-100 shadow-xs">
            <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                Alur Konversi Seleksi Santri
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-xs">
                Tahapan funneling mulai dari formulir awal hingga konfirmasi daftar ulang
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 relative">
                {/* Step 1 */}
                <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200/80 relative">
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                    Tahap 1
                  </span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">Pendaftar Masuk</h4>
                  <div className="text-xl sm:text-2xl font-black text-gray-900 my-1 sm:my-2">
                    {data.funnelSeleksi.totalRegistrations}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-gray-500">
                    Formulir terisi lengkap
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3 sm:p-4 rounded-2xl bg-blue-50/70 border border-blue-100 relative">
                  <span className="text-[9px] sm:text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-0.5">
                    Tahap 2
                  </span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-blue-950 truncate">Lulus Ujian Lisan</h4>
                  <div className="text-xl sm:text-2xl font-black text-blue-800 my-1 sm:my-2">
                    {data.funnelSeleksi.oralPass}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-blue-600">
                    {Math.round(
                      (data.funnelSeleksi.oralPass /
                        (data.funnelSeleksi.totalRegistrations || 1)) *
                        100
                    )}
                    % kelulusan lisan
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3 sm:p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 relative">
                  <span className="text-[9px] sm:text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-0.5">
                    Tahap 3
                  </span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-indigo-950 truncate">Diterima / Selected</h4>
                  <div className="text-xl sm:text-2xl font-black text-indigo-800 my-1 sm:my-2">
                    {data.funnelSeleksi.selectedCount}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-indigo-600">
                    Berhak daftar ulang
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-3 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 relative">
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">
                    Tahap 4
                  </span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 truncate">Daftar Ulang Final</h4>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 my-1 sm:my-2">
                    {data.funnelSeleksi.daftarUlangApproved}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium">
                    {Math.round(
                      (data.funnelSeleksi.daftarUlangApproved /
                        (data.funnelSeleksi.selectedCount || 1)) *
                        100
                    )}
                    % kesiapan santri
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Juz Chart & Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="bg-white border border-gray-100 shadow-xs">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                  Pilihan Target Juz Terbanyak
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs">
                  Distribusi juz yang diminati para santri
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0">
                <div className="h-[200px] sm:h-[280px] w-full">
                  <Bar data={juzData} options={juzOptions} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-100 shadow-xs">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                  Rincian Status Seleksi & Evaluasi
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs">
                  Detail status penerimaan pendaftar
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0 space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-gray-800">Santri Diterima (Selected)</span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-emerald-700">
                    {data.funnelSeleksi.selectedCount} santri
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold text-gray-800">Daftar Tunggu (Waitlist)</span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-amber-700">
                    {data.funnelSeleksi.waitlistCount} santri
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-rose-50/70 border border-rose-100">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-xs font-bold text-gray-800">Belum Lolos (Not Selected)</span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-rose-700">
                    {data.funnelSeleksi.notSelectedCount} santri
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-xs font-bold text-gray-800">Menunggu Penilaian Lisan</span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-gray-700">
                    {data.funnelSeleksi.oralPending} santri
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: HALAQAH & PARTNER BELAJAR */}
      {activeTab === 'halaqah' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Halaqah Utilization Card */}
            <Card className="lg:col-span-2 bg-white border border-gray-100 shadow-xs">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                  Kapasitas & Alokasi Halaqah
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs">
                  Tingkat keterisian kursi santri dalam kelompok halaqah
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="p-2.5 sm:p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-[9px] sm:text-[11px] font-bold text-gray-400 uppercase block truncate">Total Halaqah</span>
                    <div className="text-lg sm:text-2xl font-black text-gray-900 mt-0.5 sm:mt-1">
                      {data.halaqahMetrics.totalHalaqah}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-gray-500 block truncate">Kelompok</span>
                  </div>

                  <div className="p-2.5 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[9px] sm:text-[11px] font-bold text-emerald-600 uppercase block truncate">Kapasitas</span>
                    <div className="text-lg sm:text-2xl font-black text-emerald-900 mt-0.5 sm:mt-1">
                      {data.halaqahMetrics.totalCapacity}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-emerald-600 block truncate">Kuota Santri</span>
                  </div>

                  <div className="p-2.5 sm:p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <span className="text-[9px] sm:text-[11px] font-bold text-blue-600 uppercase block truncate">Terploting</span>
                    <div className="text-lg sm:text-2xl font-black text-blue-900 mt-0.5 sm:mt-1">
                      {data.halaqahMetrics.totalAssigned}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-blue-600 block truncate">Santri Aktif</span>
                  </div>
                </div>

                {/* Progress Bar of Capacity */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-700">Okupansi Halaqah</span>
                    <span className="text-emerald-700">{data.halaqahMetrics.utilizationRate}% Terisi</span>
                  </div>
                  <div className="w-full h-2.5 sm:h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(data.halaqahMetrics.utilizationRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Muallimah Assignment Badge */}
                <div className="p-3 sm:p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h5 className="text-xs font-extrabold text-gray-900 leading-tight">
                        Cakupan Pengajar Muallimah
                      </h5>
                      <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                        Seluruh {data.halaqahMetrics.withMuallimah} halaqah telah memiliki Ustadzah pembimbing.
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] sm:text-xs">
                    100% Terisi
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Study Partner Methods Doughnut */}
            <Card className="bg-white border border-gray-100 shadow-xs">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                  Metode Partner Belajar
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs">
                  Sebaran preferensi pairing partner thalibah
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0">
                <div className="h-[170px] sm:h-[200px] w-full relative">
                  <Doughnut
                    data={partnerData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                          labels: { font: { size: 10, weight: 'bold' as const }, padding: 8 },
                        },
                      },
                      cutout: '70%',
                    }}
                  />
                </div>

                <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-gray-100 space-y-1.5 sm:space-y-2 text-xs font-semibold">
                  <div className="flex justify-between text-gray-600">
                    <span>Pasangan Aktif (Paired):</span>
                    <strong className="text-emerald-700">{data.studyPartnerMetrics.totalPartnerships} Pasang</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Self-Match (Mandiri):</span>
                    <strong className="text-gray-900">{data.studyPartnerMetrics.selfMatch}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>System-Match (Otomatis):</span>
                    <strong className="text-gray-900">{data.studyPartnerMetrics.systemMatch}</strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: PEMBELAJARAN & TASHIH */}
      {activeTab === 'learning' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Top Row: Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-100">
                    Total Setoran Jurnal
                  </span>
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
                </div>
                <div className="text-2xl sm:text-3xl font-black">{data.jurnalCompliance.totalRecords.toLocaleString('id-ID')}</div>
                <p className="text-[10px] sm:text-xs text-emerald-100 mt-1.5 sm:mt-2 font-medium">
                  Catatan disiplin harian santri
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-100 shadow-xs">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
                    Total Sesi Tashih
                  </span>
                  <BookCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900">{data.tashihStats.totalTashih.toLocaleString('id-ID')}</div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2 font-medium">
                  Oleh <strong>{data.tashihStats.uniqueMuallimah} Muallimah</strong>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-100 shadow-xs">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
                    Rata-rata Kesalahan
                  </span>
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900">{data.tashihStats.avgKesalahan}</div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2 font-medium">
                  Catatan perbaikan per sesi
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Jurnal Activity Compliance Breakdown */}
          <Card className="bg-white border border-gray-100 shadow-xs">
            <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                Tingkat Kepatuhan 6 Komponen Tikrar Harian
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-xs">
                Persentase penyelesaian elemen tugas wajib dalam jurnal harian thalibah
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                {/* 1. Tashih */}
                <div className="p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center text-xs font-extrabold">
                    <span className="text-gray-900">1. Sesi Tashih</span>
                    <span className="text-emerald-600">{data.jurnalCompliance.tashihPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${data.jurnalCompliance.tashihPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 block">
                    {data.jurnalCompliance.tashihDone.toLocaleString('id-ID')} setoran
                  </span>
                </div>

                {/* 2. Simak Rekaman */}
                <div className="p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center text-xs font-extrabold">
                    <span className="text-gray-900">2. Simak Rekaman</span>
                    <span className="text-blue-600">{data.jurnalCompliance.simakPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${data.jurnalCompliance.simakPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 block">
                    {data.jurnalCompliance.simakDone.toLocaleString('id-ID')} setoran
                  </span>
                </div>

                {/* 3. Tikrar Bi An-Nadzhar */}
                <div className="p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center text-xs font-extrabold">
                    <span className="text-gray-900">3. Tikrar Bi An-Nadzhar</span>
                    <span className="text-indigo-600">{data.jurnalCompliance.nadzarPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${data.jurnalCompliance.nadzarPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 block">
                    {data.jurnalCompliance.nadzarDone.toLocaleString('id-ID')} setoran
                  </span>
                </div>

                {/* 4. Rabth */}
                <div className="p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center text-xs font-extrabold">
                    <span className="text-gray-900">4. Rabth (Pengait Ayat)</span>
                    <span className="text-purple-600">{data.jurnalCompliance.rabthPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${data.jurnalCompliance.rabthPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 block">
                    {data.jurnalCompliance.rabthDone.toLocaleString('id-ID')} setoran
                  </span>
                </div>

                {/* 5. Tafsir */}
                <div className="p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center text-xs font-extrabold">
                    <span className="text-gray-900">5. Membaca Tafsir</span>
                    <span className="text-amber-600">{data.jurnalCompliance.tafsirPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${data.jurnalCompliance.tafsirPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 block">
                    {data.jurnalCompliance.tafsirDone.toLocaleString('id-ID')} setoran
                  </span>
                </div>

                {/* 6. Menulis */}
                <div className="p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center text-xs font-extrabold">
                    <span className="text-gray-900">6. Menulis Ayat</span>
                    <span className="text-rose-600">{data.jurnalCompliance.menulisPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${data.jurnalCompliance.menulisPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 block">
                    {data.jurnalCompliance.menulisDone.toLocaleString('id-ID')} setoran
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 5: UJIAN & TESTIMONI */}
      {activeTab === 'feedback' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Exam Metrics Card */}
            <Card className="lg:col-span-2 bg-white border border-gray-100 shadow-xs">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                      Performa & Distribusi Nilai Ujian
                    </CardTitle>
                    <CardDescription className="text-[11px] sm:text-xs">
                      Hasil ujian evaluasi hafalan juz thalibah
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] sm:text-xs text-gray-400 font-semibold block">Kelulusan</span>
                    <strong className="text-base sm:text-lg font-black text-emerald-700">
                      {data.examStats.passRate}%
                    </strong>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase block truncate">Total Ujian</span>
                    <div className="text-base sm:text-xl font-black text-gray-900 mt-0.5">
                      {data.examStats.totalAttempts}
                    </div>
                  </div>
                  <div className="p-2.5 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase block truncate">Rata Skor</span>
                    <div className="text-base sm:text-xl font-black text-emerald-900 mt-0.5">
                      {data.examStats.avgScore}
                    </div>
                  </div>
                  <div className="p-2.5 sm:p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase block truncate">Lulus</span>
                    <div className="text-base sm:text-xl font-black text-blue-900 mt-0.5">
                      {data.examStats.passedCount}
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-extrabold text-gray-700 mb-2 sm:mb-3">Distribusi Rentang Nilai</h5>
                  <div className="h-[170px] sm:h-[200px] w-full">
                    <Bar
                      data={examScoreData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                          x: { grid: { display: false } },
                        },
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonials & Satisfaction Banner */}
            <Card className="bg-white border border-gray-100 shadow-xs flex flex-col">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900">
                  Kepuasan & Suara Thalibah
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs">
                  Feedback dari {data.satisfactionStats.totalTestimonials} testimoni santri
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                {/* Big Rating Banner */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 mb-1.5 sm:mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white" />
                    ))}
                  </div>
                  <div className="text-3xl sm:text-4xl font-black tracking-tight">5.0 / 5.0</div>
                  <p className="text-[11px] sm:text-xs text-amber-100 mt-1 font-medium">
                    100% dari 233 Thalibah memberikan Bintang 5!
                  </p>
                </div>

                {/* Recent Testimonial Snippet */}
                {data.satisfactionStats.recentTestimonials.length > 0 && (
                  <div className="p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <MessageSquareQuote className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Testimoni Terbaru</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-700 italic line-clamp-3 leading-relaxed">
                      &ldquo;{data.satisfactionStats.recentTestimonials[0].content}&rdquo;
                    </p>
                    <div className="flex justify-between items-center pt-1 text-[9px] sm:text-[10px] text-gray-400">
                      <span>{data.satisfactionStats.recentTestimonials[0].batch_name || 'MTI Tikrar'}</span>
                      <Link
                        href="/admin"
                        className="text-emerald-700 font-bold hover:underline"
                      >
                        Lihat Semua &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
