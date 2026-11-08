'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Shield, Flame, BookOpen, CheckCircle2, Clock, 
  Search, Users, Award, AlertCircle, RefreshCw, MessageSquare,
  Sparkles, Check, X, Bell, BellOff, ChevronRight, Phone
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BatchItem {
  id: string;
  name: string;
  status: string;
}

interface WeeklyMurojaahItem {
  userId: string;
  fullName: string;
  whatsapp: string;
  juzCode: string;
  halaqahName: string;
  completedCodes: string[];
  completedCount: number;
  totalRequired: number;
  isComplete: boolean;
}

interface WarriorMurojaahItem {
  progressId: string;
  userId: string;
  fullName: string;
  whatsapp: string;
  batchName: string;
  batchId: string;
  juzCode: string;
  totalCompleted: number;
  daysElapsed: number;
  daysRemaining: number;
  hasWarriorBadge: boolean;
  isCompleted: boolean;
  isExpired: boolean;
  isReminderActive: boolean;
  lastSetoran?: string | null;
  debt: {
    todayCount: number;
    todayRemaining: number;
    previousDebt: number;
    totalDebt: number;
  };
}

export default function AdminMurojaahMonitoringPage() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'warrior'>('weekly');
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [weeklyData, setWeeklyData] = useState<WeeklyMurojaahItem[]>([]);
  const [warriorData, setWarriorData] = useState<WarriorMurojaahItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMonitoringData();
  }, [selectedBatchId]);

  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true);
      const url = selectedBatchId 
        ? `/api/admin/murojaah/monitoring?batch_id=${selectedBatchId}`
        : '/api/admin/murojaah/monitoring';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setBatches(json.data.batches || []);
        if (!selectedBatchId && json.data.selectedBatchId) {
          setSelectedBatchId(json.data.selectedBatchId);
        }
        setWeeklyData(json.data.weeklyMurojaah || []);
        setWarriorData(json.data.warriorMurojaah || []);
      } else {
        toast.error(json.error || 'Gagal memuat data monitoring');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  };

  // Weekly Stats
  const weeklyCompleteCount = weeklyData.filter(w => w.isComplete).length;
  const weeklyInProgressCount = weeklyData.filter(w => w.completedCount > 0 && !w.isComplete).length;
  const weeklyZeroCount = weeklyData.filter(w => w.completedCount === 0).length;

  // Warrior Stats
  const warriorBadgeCount = warriorData.filter(w => w.hasWarriorBadge).length;
  const warriorActiveCount = warriorData.filter(w => !w.isCompleted && !w.isExpired).length;
  const warriorTotalRounds = warriorData.reduce((acc, w) => acc + w.totalCompleted, 0);

  // Filtered lists
  const filteredWeekly = weeklyData.filter(w => 
    w.fullName.toLowerCase().includes(search.toLowerCase()) ||
    w.halaqahName.toLowerCase().includes(search.toLowerCase()) ||
    w.juzCode.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWarrior = warriorData.filter(w => 
    w.fullName.toLowerCase().includes(search.toLowerCase()) ||
    w.batchName.toLowerCase().includes(search.toLowerCase()) ||
    w.juzCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 mb-6 sticky top-0 z-20 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 uppercase tracking-[0.2em] mb-0.5">
                  <Shield className="h-3 w-3" />
                  <span>Authority Console</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                  Monitoring Muroja'ah
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-100">
                    Live Panel
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-full sm:w-64">
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                    <SelectValue placeholder="Pilih Angkatan" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.status === 'ongoing' ? '🟢 (Berjalan)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchMonitoringData}
                disabled={isLoading}
                className="rounded-xl border-gray-200 h-10 px-3.5"
                title="Segarkan Data"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="bg-white p-1.5 border border-gray-100 rounded-2xl shadow-xs inline-flex">
              <TabsTrigger
                value="weekly"
                className="rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-gray-600 data-[state=active]:bg-emerald-900 data-[state=active]:text-white transition-all gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Muroja'ah Batch Sepekan (M1 - M7)</span>
                <span className="bg-emerald-100 text-emerald-900 data-[state=active]:bg-white/20 data-[state=active]:text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                  {weeklyData.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="warrior"
                className="rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-gray-600 data-[state=active]:bg-emerald-900 data-[state=active]:text-white transition-all gap-2"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Progres Muroja'ah Warrior (40x)</span>
                <span className="bg-amber-100 text-amber-900 data-[state=active]:bg-white/20 data-[state=active]:text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                  {warriorData.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari thalibah / juz / halaqah..."
                className="pl-9 rounded-xl border-gray-200 bg-white text-xs h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* TAB 1: WEEKLY MUROJAAH (M1..M7) */}
          <TabsContent value="weekly" className="space-y-6 mt-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="rounded-2xl border-gray-100 shadow-xs bg-white">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Thalibah</p>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">{weeklyData.length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <Users className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-emerald-100 shadow-xs bg-emerald-50/40">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">Lulus 7/7 Blok</p>
                    <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">{weeklyCompleteCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-amber-100 shadow-xs bg-amber-50/40">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider">Sedang Berjalan (1-6)</p>
                    <h3 className="text-xl sm:text-2xl font-black text-amber-950 mt-1">{weeklyInProgressCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-rose-100 shadow-xs bg-rose-50/40">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-rose-800 uppercase tracking-wider">Belum Menyetor (0)</p>
                    <h3 className="text-xl sm:text-2xl font-black text-rose-950 mt-1">{weeklyZeroCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Table */}
            <Card className="rounded-2xl border-gray-100 shadow-xs overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] font-black uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4">No</th>
                      <th className="py-3.5 px-4">Nama Thalibah</th>
                      <th className="py-3.5 px-4">Halaqah</th>
                      <th className="py-3.5 px-4 text-center">Juz</th>
                      <th className="py-3.5 px-4 text-center">Status M1 s.d. M7</th>
                      <th className="py-3.5 px-4 text-center">Progres</th>
                      <th className="py-3.5 px-4 text-center">Syarat Ujian</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                    {filteredWeekly.length > 0 ? (
                      filteredWeekly.map((item, idx) => (
                        <tr key={item.userId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4 text-gray-400 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            <div>{item.fullName}</div>
                            {item.whatsapp && (
                              <span className="text-[10px] text-gray-400 font-normal">{item.whatsapp}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                            {item.halaqahName}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black">
                            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                              {item.juzCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1">
                              {['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'].map(code => {
                                const isDone = item.completedCodes.includes(code);
                                return (
                                  <span
                                    key={code}
                                    className={cn(
                                      "w-6 h-6 rounded-md flex items-center justify-center font-bold text-[9px]",
                                      isDone
                                        ? "bg-emerald-600 text-white shadow-2xs"
                                        : "bg-gray-100 text-gray-400"
                                    )}
                                    title={`${code}: ${isDone ? 'Tuntas' : 'Belum'}`}
                                  >
                                    {isDone ? '✓' : code.replace('M', '')}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-black">
                            <span className={cn(
                              "text-xs font-bold",
                              item.isComplete ? "text-emerald-700" : item.completedCount > 0 ? "text-amber-700" : "text-gray-400"
                            )}>
                              {item.completedCount} / 7
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {item.isComplete ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                <Check className="w-3 h-3 stroke-[3]" /> Mutqin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Kurang {7 - item.completedCount}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {item.whatsapp && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="h-8 rounded-xl border-gray-200 text-xs font-bold gap-1 text-emerald-800 hover:bg-emerald-50"
                              >
                                <a
                                  href={`https://wa.me/${item.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                                    `Assalamu'alaikum Ukhti *${item.fullName}*, kami dari Tim Akademik Markaz Tikrar Indonesia (MTI) mengingatkan perihal setoran Muroja'ah Pekan 11 (M1-M7) Ukhti yang saat ini tercatat ${item.completedCount}/7 blok. Semangat menuntaskan sisa setoran lillah!`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>WA</span>
                                </a>
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400 font-bold">
                          Tidak ada data thalibah ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: WARRIOR MUROJAAH (40X) */}
          <TabsContent value="warrior" className="space-y-6 mt-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="rounded-2xl border-gray-100 shadow-xs bg-white">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Peserta 40x</p>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">{warriorData.length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <Users className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-amber-200 shadow-xs bg-amber-50/40">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider">Badge Warrior Diraih</p>
                    <h3 className="text-xl sm:text-2xl font-black text-amber-950 mt-1">{warriorBadgeCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-emerald-100 shadow-xs bg-emerald-50/40">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">Sedang Aktif Berjalan</p>
                    <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">{warriorActiveCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Flame className="w-5 h-5 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-blue-100 shadow-xs bg-blue-50/40">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-blue-800 uppercase tracking-wider">Total Putaran Disetor</p>
                    <h3 className="text-xl sm:text-2xl font-black text-blue-950 mt-1">{warriorTotalRounds}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Warrior Table */}
            <Card className="rounded-2xl border-gray-100 shadow-xs overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] font-black uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4">No</th>
                      <th className="py-3.5 px-4">Nama Thalibah</th>
                      <th className="py-3.5 px-4 text-center">Juz</th>
                      <th className="py-3.5 px-4">Progres Putaran</th>
                      <th className="py-3.5 px-4 text-center">Hari Tantangan</th>
                      <th className="py-3.5 px-4 text-center">Hutang Putaran</th>
                      <th className="py-3.5 px-4 text-center">Status Warrior</th>
                      <th className="py-3.5 px-4 text-center">Reminder WA</th>
                      <th className="py-3.5 px-4 text-center">Terakhir Setor</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                    {filteredWarrior.length > 0 ? (
                      filteredWarrior.map((item, idx) => {
                        const pct = Math.round((item.totalCompleted / 40) * 100);
                        return (
                          <tr key={item.progressId} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 text-gray-400 font-bold">{idx + 1}</td>
                            <td className="py-3.5 px-4 font-bold text-gray-900">
                              <div>{item.fullName}</div>
                              <span className="text-[10px] text-gray-400 font-normal">{item.batchName}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-black">
                              <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                                {item.juzCode}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 min-w-[160px]">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className="text-emerald-900">{item.totalCompleted} / 40</span>
                                  <span className="text-gray-400">{pct}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="text-[11px] font-bold text-gray-900">
                                Hari ke-{item.daysElapsed}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                Sisa {item.daysRemaining} hari
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-black">
                              {item.debt.totalDebt > 0 ? (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px]">
                                  {item.debt.totalDebt} Putaran
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                                  Lunas 0
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {item.hasWarriorBadge ? (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                  🏆 Warrior Lulus
                                </span>
                              ) : item.isExpired ? (
                                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Expired
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Berjalan
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {item.isReminderActive ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                  <Bell className="w-3 h-3 text-emerald-600" /> Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded-full">
                                  <BellOff className="w-3 h-3 text-gray-400" /> Off
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center text-gray-500 text-[11px]">
                              {item.lastSetoran ? (
                                new Date(item.lastSetoran).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short'
                                })
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {item.whatsapp && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                  className="h-8 rounded-xl border-gray-200 text-xs font-bold gap-1 text-emerald-800 hover:bg-emerald-50"
                                >
                                  <a
                                    href={`https://wa.me/${item.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                                      `Assalamu'alaikum Ukhti *${item.fullName}*, kami dari Tim Akademik Markaz Tikrar Indonesia (MTI) mengapresiasi keikutsertaan Ukhti dalam program Muroja'ah 40x (Juz ${item.juzCode}). Saat ini progres Ukhti telah mencapai ${item.totalCompleted}/40 putaran di hari ke-${item.daysElapsed}. Semangat menjaga hafalan Al-Qur'an!`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>WA</span>
                                  </a>
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-400 font-bold">
                          Tidak ada peserta Muroja'ah 40x ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
