'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Shield, Flame, BookOpen, CheckCircle2, Clock, 
  Search, Users, Award, AlertCircle, RefreshCw, MessageSquare,
  Sparkles, Check, X, Bell, BellOff, ChevronRight, Phone,
  ExternalLink, Filter
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BatchItem {
  id: string;
  name: string;
  status: string;
  warrior_count?: number;
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
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [warriorData, setWarriorData] = useState<WarriorMurojaahItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'debt' | 'expired'>('all');

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

  // Warrior Stats
  const totalWarrior = warriorData.length;
  const completedWarrior = warriorData.filter(d => d.isCompleted || d.hasWarriorBadge).length;
  const activeWarrior = warriorData.filter(d => !d.isCompleted && !d.isExpired).length;
  const debtWarrior = warriorData.filter(d => d.debt.totalDebt > 0 && !d.isCompleted).length;
  const expiredWarrior = warriorData.filter(d => d.isExpired && !d.isCompleted).length;
  const totalRoundsCollected = warriorData.reduce((acc, curr) => acc + curr.totalCompleted, 0);

  // Toggle Reminder Status for Warrior
  const handleToggleReminder = async (progressId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/alumni/murojaah-40x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress_id: progressId,
          is_reminder_active: !currentStatus,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message);
        setWarriorData(prev => prev.map(w => w.progressId === progressId ? { ...w, isReminderActive: !currentStatus } : w));
      } else {
        toast.error(json.error || 'Gagal memperbarui status reminder');
      }
    } catch (err) {
      toast.error('Gagal memperbarui status');
    }
  };

  // Filtered lists
  const filteredWarrior = warriorData.filter(w => {
    // Search match
    const matchesSearch = 
      w.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (w.whatsapp && w.whatsapp.includes(search)) ||
      w.juzCode.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === 'active') return !w.isCompleted && !w.isExpired;
    if (statusFilter === 'completed') return w.isCompleted || w.hasWarriorBadge;
    if (statusFilter === 'debt') return w.debt.totalDebt > 0 && !w.isCompleted;
    if (statusFilter === 'expired') return w.isExpired && !w.isCompleted;

    return true;
  });

  const currentSelectedBatch = batches.find(b => b.id === selectedBatchId);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 mb-6 sticky top-0 z-20 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700 uppercase tracking-[0.2em] mb-0.5">
                  <Shield className="h-3 w-3" />
                  <span>Authority Console</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                  <Flame className="h-6 w-6 text-amber-500 fill-amber-500" />
                  <span>Monitoring Muroja'ah Warrior (40x)</span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-100">
                    Live Panel
                  </span>
                </h1>
              </div>
            </div>

            {/* Quick Actions & Filters */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Shortcut to Presensi Jurnal for M1-M7 */}
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-xl border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 text-xs font-bold gap-1.5 h-10 shadow-2xs"
              >
                <Link href="/presensi-jurnal">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Presensi Jurnal (M1–M7)</span>
                  <ExternalLink className="w-3 h-3 text-emerald-600" />
                </Link>
              </Button>

              {/* Batch Select */}
              <div className="w-full sm:w-64">
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white font-medium text-xs sm:text-sm h-10">
                    <SelectValue placeholder="Pilih Angkatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-bold text-emerald-900">
                      🌐 Semua Angkatan (Semua Batch)
                    </SelectItem>
                    {batches.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.warrior_count !== undefined ? `(${b.warrior_count} Peserta)` : ''} {b.status === 'ongoing' ? '🟢' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMonitoringData}
                disabled={isLoading}
                className="rounded-xl border-gray-200 h-10 px-3.5 bg-white hover:bg-gray-50"
                title="Segarkan Data"
              >
                <RefreshCw className={cn("w-4 h-4 text-gray-600", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Banner if batch with 0 participants selected */}
        {currentSelectedBatch && currentSelectedBatch.warrior_count === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-900 font-medium">
                <strong>{currentSelectedBatch.name}</strong> belum memiliki peserta Muroja'ah Warrior 40x.
                Silakan pilih <strong>Tikrar Tahfidz MTI Batch 3</strong> pada menu di atas untuk memantau peserta yang sedang berjalan.
              </p>
            </div>
            {batches.find(b => b.name.includes('Batch 3')) && (
              <Button
                size="sm"
                onClick={() => setSelectedBatchId(batches.find(b => b.name.includes('Batch 3'))!.id)}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 h-8"
              >
                Buka Batch 3 &rarr;
              </Button>
            )}
          </div>
        )}

        {/* 1. KPI Cards for Murojaah Warrior */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="rounded-2xl border-gray-100 shadow-xs bg-white">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Peserta 40x</p>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">{totalWarrior}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100 shadow-xs bg-white">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Lulus 40 Putaran</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">{completedWarrior}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100 shadow-xs bg-white">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Sedang Berjalan</p>
                <h3 className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{activeWarrior}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Flame className="w-5 h-5 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100 shadow-xs bg-white">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Putaran Disetor</p>
                <h3 className="text-xl sm:text-2xl font-black text-blue-900 mt-1">{totalRoundsCollected}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. Control Bar: Filter Status + Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                statusFilter === 'all'
                  ? "bg-emerald-900 text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              )}
            >
              Semua ({totalWarrior})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                statusFilter === 'active'
                  ? "bg-emerald-900 text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              )}
            >
              Sedang Berjalan ({activeWarrior})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('debt')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                statusFilter === 'debt'
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
              )}
            >
              Ada Hutang ({debtWarrior})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                statusFilter === 'completed'
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
              )}
            >
              Lulus Warrior ({completedWarrior})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('expired')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                statusFilter === 'expired'
                  ? "bg-gray-800 text-white shadow-xs"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              )}
            >
              Waktu Habis ({expiredWarrior})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari thalibah, juz, no WA..."
              className="pl-9 rounded-xl border-gray-200 bg-white text-xs h-10"
            />
          </div>
        </div>

        {/* 3. Warrior Muroja'ah Table */}
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
                          {item.whatsapp && (
                            <span className="text-[10px] text-gray-400 block font-normal">{item.whatsapp}</span>
                          )}
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
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          <span className="text-gray-900">Hari ke-{item.daysElapsed}</span>
                          <span className="block text-[10px] text-gray-400 font-normal">
                            Sisa {item.daysRemaining} hari
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          {item.debt.totalDebt > 0 ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200/60 px-2 py-0.5 rounded-full text-[10px] font-black">
                              {item.debt.totalDebt} Putaran
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              Lancar
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.hasWarriorBadge || item.isCompleted ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                              🏆 Warrior
                            </span>
                          ) : item.isExpired ? (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Waktu Habis
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleReminder(item.progressId, item.isReminderActive)}
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                              item.isReminderActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
                            )}
                            title={item.isReminderActive ? "Klik untuk mematikan reminder sore WA" : "Klik untuk menyalakan reminder sore WA"}
                          >
                            {item.isReminderActive ? (
                              <>
                                <Bell className="w-3 h-3 text-emerald-600" />
                                <span>Aktif</span>
                              </>
                            ) : (
                              <>
                                <BellOff className="w-3 h-3 text-gray-400" />
                                <span>Off</span>
                              </>
                            )}
                          </button>
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
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Flame className="w-8 h-8 text-gray-300 stroke-[1.5]" />
                        <span>Tidak ada peserta Muroja'ah 40x yang sesuai filter.</span>
                        {currentSelectedBatch && currentSelectedBatch.warrior_count === 0 && (
                          <span className="text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-1">
                            Angkatan ini belum memiliki peserta. Silakan pilih <strong>Tikrar Tahfidz MTI Batch 3</strong> pada menu di atas.
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
