'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, BookOpen, Plus, RefreshCw, Search, Filter, X, Layers, BookMarked, ClipboardList, Video, MessageCircle } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAdminBatches, useAdminPrograms } from '@/lib/hooks/useAdminData';
import { Batch, Program, BATCH_STATUSES, PROGRAM_STATUSES } from '@/components/admin/batch-program/types';
import { BatchTable } from '@/components/admin/batch-program/BatchTable';
import { BatchFormModal } from '@/components/admin/batch-program/BatchFormModal';
import { ProgramTable } from '@/components/admin/batch-program/ProgramTable';
import { ProgramFormModal } from '@/components/admin/batch-program/ProgramFormModal';
import { AdminJuzTab } from '@/components/admin/batch-program/AdminJuzTab';
import { AdminZoomTab } from '@/components/admin/batch-program/AdminZoomTab';
import { AdminFormBuilderTab } from '@/components/admin/batch-program/AdminFormBuilderTab';
import { AdminReregFormBuilderTab } from '@/components/admin/batch-program/AdminReregFormBuilderTab';
import { AdminMuallimahFormBuilderTab } from '@/components/admin/batch-program/AdminMuallimahFormBuilderTab';
import { AdminPraTikrarFormBuilderTab } from '@/components/admin/batch-program/AdminPraTikrarFormBuilderTab';
import { AdminMusyrifahFormBuilderTab } from '@/components/admin/batch-program/AdminMusyrifahFormBuilderTab';
import { AdminAkadQuizTab } from '@/components/admin/batch-program/AdminAkadQuizTab';
import { AdminCommunicationTab } from '@/components/admin/batch-program/AdminCommunicationTab';
import { AdminFormPublishSwitchboard } from '@/components/admin/batch-program/AdminFormPublishSwitchboard';

type TabType = 'batches' | 'programs' | 'juz' | 'zoom' | 'communication' | 'form-builder' | 'quiz';

export default function AdminBatchProgramPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('batches');

  // Filters
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatus, setBatchStatus] = useState<string>('all');

  const [programSearch, setProgramSearch] = useState('');
  const [programStatus, setProgramStatus] = useState<string>('all');
  const [programBatchFilter, setProgramBatchFilter] = useState<string>('all');

  // Modals
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [activeFormSubTab, setActiveFormSubTab] = useState<'pendaftaran' | 'pra-tikrar' | 'daftar-ulang' | 'muallimah' | 'musyrifah'>('pendaftaran');
  const [activeQuizSubTab, setActiveQuizSubTab] = useState<'pemahaman-akad'>('pemahaman-akad');

  useEffect(() => {
    setMounted(true);
  }, []);

  const { batches, pagination: batchPagination, isLoading: batchesLoading, mutate: mutateBatches } = useAdminBatches(true);
  const { programs, pagination: programPagination, isLoading: programsLoading, mutate: mutatePrograms } = useAdminPrograms(true);

  const filteredBatches = useMemo(() => {
    return (batches as Batch[]).filter((b) => {
      const matchSearch = !batchSearch ||
        b.name?.toLowerCase().includes(batchSearch.toLowerCase()) ||
        b.description?.toLowerCase().includes(batchSearch.toLowerCase());
      const matchStatus = batchStatus === 'all' || b.status === batchStatus;
      return matchSearch && matchStatus;
    });
  }, [batches, batchSearch, batchStatus]);

  const filteredPrograms = useMemo(() => {
    return (programs as Program[]).filter((p) => {
      const matchSearch = !programSearch ||
        p.name?.toLowerCase().includes(programSearch.toLowerCase()) ||
        p.target_level?.toLowerCase().includes(programSearch.toLowerCase()) ||
        p.batch?.name?.toLowerCase().includes(programSearch.toLowerCase());
      const matchStatus = programStatus === 'all' || p.status === programStatus;
      const matchBatch = programBatchFilter === 'all' || p.batch_id === programBatchFilter;
      return matchSearch && matchStatus && matchBatch;
    });
  }, [programs, programSearch, programStatus, programBatchFilter]);

  const handleRefresh = async () => {
    await Promise.all([mutateBatches(), mutatePrograms()]);
    toast.success('Data berhasil diperbarui');
  };

  const handleBatchSuccess = () => {
    setShowBatchModal(false);
    setEditingBatch(null);
    mutateBatches();
  };

  const handleProgramSuccess = () => {
    setShowProgramModal(false);
    setEditingProgram(null);
    mutatePrograms();
  };

  const stats = useMemo(() => {
    const batchList = batches as Batch[];
    const programList = programs as Program[];
    return {
      totalBatches: batchList.length,
      activeBatches: batchList.filter(b => b.status === 'open').length,
      totalPrograms: programList.length,
      openPrograms: programList.filter(p => p.status === 'open' || p.status === 'ongoing').length,
    };
  }, [batches, programs]);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50/50" />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-[0.2em] mb-1">
                  <Layers className="h-3 w-3" />
                  <span>Authority Console</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  Manajemen Batch &amp; Program
                  <span className="px-2 py-0.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                    Scalable v2.0
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 px-4 rounded-xl bg-gray-100/50 border border-gray-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-600">
                  {stats.totalBatches} <span className="font-medium opacity-60">Batch</span>
                </span>
              </div>
              <div className="h-10 px-4 rounded-xl bg-gray-100/50 border border-gray-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-600">
                  {stats.totalPrograms} <span className="font-medium opacity-60">Program</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard
            label="Total Batch"
            value={stats.totalBatches}
            icon={<Calendar className="h-5 w-5 sm:h-6 sm:w-6" />}
            color="bg-green-600 shadow-green-200"
            isLoading={batchesLoading}
          />
          <StatCard
            label="Batch Aktif"
            value={stats.activeBatches}
            icon={<Calendar className="h-5 w-5 sm:h-6 sm:w-6" />}
            color="bg-emerald-600 shadow-emerald-200"
            isLoading={batchesLoading}
          />
          <StatCard
            label="Total Program"
            value={stats.totalPrograms}
            icon={<BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />}
            color="bg-purple-600 shadow-purple-200"
            isLoading={programsLoading}
          />
          <StatCard
            label="Program Berjalan"
            value={stats.openPrograms}
            icon={<BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />}
            color="bg-blue-600 shadow-blue-200"
            isLoading={programsLoading}
          />
        </div>

        {/* Custom Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-100 mb-8 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('batches')}
            className={cn(
              'pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-2',
              activeTab === 'batches' ? 'text-green-900' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Calendar className="h-4 w-4" />
            Manajemen Batch
            {activeTab === 'batches' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-900 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={cn(
              'pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-2',
              activeTab === 'programs' ? 'text-purple-900' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <BookOpen className="h-4 w-4" />
            Manajemen Program
            {activeTab === 'programs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-900 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('juz')}
            className={cn(
              'pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-2',
              activeTab === 'juz' ? 'text-amber-900' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <BookMarked className="h-4 w-4" />
            Pengaturan Pilihan Juz
            {activeTab === 'juz' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-900 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('zoom')}
            className={cn(
              'pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-2',
              activeTab === 'zoom' ? 'text-purple-700' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Video className="h-4 w-4" />
            Pengaturan Zoom Link
            {activeTab === 'zoom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('communication')}
            className={cn(
              'pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-2',
              activeTab === 'communication' ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <MessageCircle className="h-4 w-4" />
            Link Komunikasi
            {activeTab === 'communication' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('form-builder')}
            className={cn(
              'pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-2',
              activeTab === 'form-builder' ? 'text-purple-900' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <ClipboardList className="h-4 w-4" />
            Pengaturan Formulir
            {activeTab === 'form-builder' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-900 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={cn(
              'pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-2',
              activeTab === 'quiz' ? 'text-amber-700' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <ClipboardList className="h-4 w-4" />
            Pengaturan Kuis
            {activeTab === 'quiz' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700 rounded-full" />}
          </button>
        </div>

        {activeTab === 'batches' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari batch berdasarkan nama atau deskripsi..."
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  />
                  {batchSearch && (
                    <button
                      onClick={() => setBatchSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select
                      value={batchStatus}
                      onChange={(e) => setBatchStatus(e.target.value)}
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 bg-white"
                    >
                      <option value="all">Semua Status</option>
                      {BATCH_STATUSES.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleRefresh}
                    disabled={batchesLoading}
                    className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition-all flex items-center gap-2"
                    title="Refresh Data"
                  >
                    <RefreshCw className={cn('h-5 w-5', batchesLoading && 'animate-spin')} />
                  </button>

                  <button
                    onClick={() => {
                      setEditingBatch(null);
                      setShowBatchModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Batch
                  </button>
                </div>
              </div>
            </div>

            <BatchTable
              batches={filteredBatches}
              isLoading={batchesLoading}
              pagination={batchPagination}
              onPageChange={(page) => console.log('Page:', page)}
              onEdit={(batch) => {
                setEditingBatch(batch);
                setShowBatchModal(true);
              }}
            />
          </>
        )}

        {activeTab === 'programs' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari program berdasarkan nama, level, atau batch..."
                    value={programSearch}
                    onChange={(e) => setProgramSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all"
                  />
                  {programSearch && (
                    <button
                      onClick={() => setProgramSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={programBatchFilter}
                    onChange={(e) => setProgramBatchFilter(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 bg-white max-w-[200px]"
                  >
                    <option value="all">Semua Batch ({(programs as Program[]).length})</option>
                    {(batches as Batch[]).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({(programs as Program[]).filter(p => p.batch_id === b.id).length})
                      </option>
                    ))}
                  </select>

                  <select
                    value={programStatus}
                    onChange={(e) => setProgramStatus(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 bg-white"
                  >
                    <option value="all">Semua Status</option>
                    {PROGRAM_STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleRefresh}
                    disabled={programsLoading}
                    className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition-all flex items-center gap-2"
                    title="Refresh Data"
                  >
                    <RefreshCw className={cn('h-5 w-5', programsLoading && 'animate-spin')} />
                  </button>

                  <button
                    onClick={() => {
                      setEditingProgram(null);
                      setShowProgramModal(true);
                    }}
                    disabled={(batches as Batch[]).length === 0}
                    className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                    title={(batches as Batch[]).length === 0 ? 'Buat batch terlebih dahulu' : ''}
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Program
                  </button>
                </div>
              </div>
            </div>

            <ProgramTable
              programs={filteredPrograms}
              isLoading={programsLoading}
              pagination={programPagination}
              onEdit={(p) => {
                setEditingProgram(p);
                setShowProgramModal(true);
              }}
            />
          </>
        )}

        {activeTab === 'juz' && (
          <AdminJuzTab />
        )}

        {activeTab === 'zoom' && (
          <AdminZoomTab batches={batches as Batch[]} />
        )}

        {activeTab === 'communication' && (
          <AdminCommunicationTab batches={batches as Batch[]} />
        )}

        {activeTab === 'form-builder' && (
          <div className="space-y-6">
            {/* Panel Saklar Publish/Unpublish untuk Semua Formulir */}
            <AdminFormPublishSwitchboard />

            <div className="flex p-1 space-x-1 bg-white/50 border border-gray-200 rounded-xl overflow-x-auto max-w-3xl">
              <button
                onClick={() => setActiveFormSubTab('pendaftaran')}
                className={cn(
                  'px-3.5 py-2 text-xs sm:text-sm font-bold leading-5 rounded-lg whitespace-nowrap transition-all',
                  activeFormSubTab === 'pendaftaran'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                )}
              >
                Pendaftaran Tikrar
              </button>
              <button
                onClick={() => setActiveFormSubTab('pra-tikrar')}
                className={cn(
                  'px-3.5 py-2 text-xs sm:text-sm font-bold leading-5 rounded-lg whitespace-nowrap transition-all',
                  activeFormSubTab === 'pra-tikrar'
                    ? 'bg-fuchsia-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-fuchsia-50 hover:text-fuchsia-600'
                )}
              >
                Pra-Tikrar
              </button>
              <button
                onClick={() => setActiveFormSubTab('daftar-ulang')}
                className={cn(
                  'px-3.5 py-2 text-xs sm:text-sm font-bold leading-5 rounded-lg whitespace-nowrap transition-all',
                  activeFormSubTab === 'daftar-ulang'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
                )}
              >
                Daftar Ulang
              </button>
              <button
                onClick={() => setActiveFormSubTab('muallimah')}
                className={cn(
                  'px-3.5 py-2 text-xs sm:text-sm font-bold leading-5 rounded-lg whitespace-nowrap transition-all',
                  activeFormSubTab === 'muallimah'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-teal-50 hover:text-teal-600'
                )}
              >
                Mu'allimah
              </button>
              <button
                onClick={() => setActiveFormSubTab('musyrifah')}
                className={cn(
                  'px-3.5 py-2 text-xs sm:text-sm font-bold leading-5 rounded-lg whitespace-nowrap transition-all',
                  activeFormSubTab === 'musyrifah'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                )}
              >
                Musyrifah / Raisah
              </button>
            </div>

            {activeFormSubTab === 'pendaftaran' && <AdminFormBuilderTab />}
            {activeFormSubTab === 'pra-tikrar' && <AdminPraTikrarFormBuilderTab />}
            {activeFormSubTab === 'daftar-ulang' && <AdminReregFormBuilderTab />}
            {activeFormSubTab === 'muallimah' && <AdminMuallimahFormBuilderTab />}
            {activeFormSubTab === 'musyrifah' && <AdminMusyrifahFormBuilderTab />}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="space-y-6">
            <div className="flex p-1 space-x-1 bg-white/50 border border-gray-200 rounded-xl max-w-sm">
              <button
                onClick={() => setActiveQuizSubTab('pemahaman-akad')}
                className={cn(
                  'w-full py-2.5 text-sm font-bold leading-5 rounded-lg transition-all',
                  activeQuizSubTab === 'pemahaman-akad'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-amber-50 hover:text-amber-600'
                )}
              >
                Pemahaman Akad
              </button>
            </div>

            {activeQuizSubTab === 'pemahaman-akad' && <AdminAkadQuizTab />}
          </div>
        )}
      </div>

      {/* Modals */}
      {showBatchModal && (
        <BatchFormModal
          key={editingBatch?.id || 'new-batch'}
          batch={editingBatch}
          programs={programs as Program[]}
          isOpen={showBatchModal}
          onClose={() => {
            setShowBatchModal(false);
            setEditingBatch(null);
          }}
          onSuccess={handleBatchSuccess}
        />
      )}

      {showProgramModal && (
        <ProgramFormModal
          key={editingProgram?.id || 'new-program'}
          program={editingProgram}
          batches={batches as Batch[]}
          programs={programs as Program[]}
          isOpen={showProgramModal}
          onClose={() => {
            setShowProgramModal(false);
            setEditingProgram(null);
          }}
          onSuccess={handleProgramSuccess}
        />
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  isLoading?: boolean;
}

function StatCard({ label, value, icon, color, isLoading }: StatCardProps) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
      <div className="space-y-1">
        <p className="text-xs sm:text-sm font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors">
          {label}
        </p>
        {isLoading ? (
          <div className="h-7 sm:h-8 w-16 sm:w-24 bg-gray-200 animate-pulse rounded" />
        ) : (
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{value.toLocaleString()}</h3>
        )}
      </div>
      <div className={cn(
        "p-3 sm:p-4 rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
        color
      )}>
        {icon}
      </div>
    </div>
  );
}
