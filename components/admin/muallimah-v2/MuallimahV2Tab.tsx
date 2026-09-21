'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle } from 'lucide-react';

import { MuallimahV2Type, MuallimahV2StatsData } from './types';
import { MuallimahV2Stats } from './MuallimahV2Stats';
import { MuallimahV2Filters } from './MuallimahV2Filters';
import { MuallimahV2Table } from './MuallimahV2Table';
import { MuallimahReviewModal, MuallimahBulkConfirmModal, MuallimahUnapproveModal, MuallimahEditModal } from './MuallimahV2Modals';
import { AdminDeleteModal } from '@/components/AdminDeleteModal';

export function MuallimahV2Tab({ user }: { user: any }) {
  const supabase = createClient();
  
  // State
  const [muallimah, setMuallimah] = useState<MuallimahV2Type[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<MuallimahV2StatsData | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals State
  const [selectedRegistration, setSelectedRegistration] = useState<MuallimahV2Type | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnapproveModal, setShowUnapproveModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    batchId: 'all',
    status: 'all',
    sortBy: 'newest'
  });

  const [batchReady, setBatchReady] = useState(false);

  // Batch diambil lewat API server (query klien ke tabel batches mengembalikan kosong),
  // dan default selalu batch aktif supaya data batch lama tidak bercampur.
  const fetchBatches = async () => {
    let loadedBatches: any[] = [];
    try {
      const res = await fetch('/api/batch');
      const json = await res.json();
      loadedBatches = Array.isArray(json?.data) ? json.data : [];
    } catch {
      loadedBatches = [];
    }
    setBatches(loadedBatches);

    const active =
      loadedBatches.find((b: any) => b.status === 'open') ||
      loadedBatches.find((b: any) => b.status === 'ongoing') ||
      loadedBatches.find((b: any) =>
        b.registration_start_date &&
        b.registration_end_date &&
        new Date(b.registration_start_date) <= new Date() &&
        new Date(b.registration_end_date) >= new Date()
      ) ||
      loadedBatches[0];

    if (active) {
      setFilters(prev => ({ ...prev, batchId: active.id }));
    }
    setBatchReady(true);
  };

  const fetchMuallimahData = useCallback(async () => {
    if (!batchReady) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('skipCount', 'true');
      if (filters.batchId !== 'all') queryParams.set('batchId', filters.batchId);
      
      const response = await fetch('/api/admin/muallimah?' + queryParams.toString());
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || 'Failed to fetch');
      
      let filteredData = (result.data?.data || []) as MuallimahV2Type[];

      // Calculate stats before applying status filter
      setStats({
        total: filteredData.length,
        pending: filteredData.filter(t => t.status === 'pending').length,
        approved: filteredData.filter(t => t.status === 'approved').length,
        rejected: filteredData.filter(t => t.status === 'rejected').length,
      });

      if (filters.status !== 'all') {
        filteredData = filteredData.filter(t => t.status === filters.status);
      }

      if (filters.search) {
        const s = filters.search.toLowerCase();
        filteredData = filteredData.filter(t => 
          t.full_name?.toLowerCase().includes(s) ||
          t.user?.full_name?.toLowerCase().includes(s) ||
          t.email?.toLowerCase().includes(s) ||
          t.user?.email?.toLowerCase().includes(s) ||
          t.whatsapp?.includes(s)
        );
      }

      setMuallimah(filteredData);
    } catch (error: any) {
      toast.error('Gagal mengambil data Muallimah: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, batchReady]);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    fetchMuallimahData();
  }, [fetchMuallimahData]);

  // Handlers
  const handleAction = (action: 'review' | 'edit' | 'delete' | 'unapprove', data: MuallimahV2Type) => {
    setSelectedRegistration(data);
    if (action === 'review') setShowReviewModal(true);
    if (action === 'edit') setShowEditModal(true);
    if (action === 'delete') setShowDeleteModal(true);
    if (action === 'unapprove') setShowUnapproveModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRegistration) return;
    try {
      const { error } = await supabase
        .from('muallimah_akads')
        .delete()
        .eq('id', selectedRegistration.id);
      
      if (error) throw error;
      toast.success('Pendaftaran berhasil dihapus');
      fetchMuallimahData();
    } catch (error: any) {
      toast.error('Gagal menghapus: ' + error.message);
    } finally {
      setShowDeleteModal(false);
      setSelectedRegistration(null);
    }
  };

  const handleUnapproveConfirm = async (reason: string) => {
    if (!selectedRegistration) return;
    try {
      const { error } = await supabase
        .from('muallimah_akads')
        .update({
          status: 'pending',
          review_notes: reason
        })
        .eq('id', selectedRegistration.id);
      
      if (error) throw error;
      toast.success('Persetujuan dibatalkan');
      fetchMuallimahData();
    } catch (error: any) {
      toast.error('Gagal membatalkan: ' + error.message);
    } finally {
      setShowUnapproveModal(false);
      setSelectedRegistration(null);
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0 || !bulkAction) return;
    setIsBulkProcessing(true);
    try {
      const { error } = await supabase
        .from('muallimah_akads')
        .update({
          status: bulkAction === 'approve' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          review_notes: null
        })
        .in('id', selectedIds);
      
      if (error) throw error;
      toast.success(`${selectedIds.length} pendaftaran berhasil di-${bulkAction}`);
      setSelectedIds([]);
      fetchMuallimahData();
    } catch (error: any) {
      toast.error('Gagal memproses massal: ' + error.message);
    } finally {
      setIsBulkProcessing(false);
      setShowBulkModal(false);
      setBulkAction(null);
    }
  };

  
  const sortedMuallimah = useMemo(() => {
    let result = [...muallimah];
    switch (filters.sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
      case 'name_asc':
        result.sort((a, b) => (a.full_name || a.user?.full_name || '').localeCompare(b.full_name || b.user?.full_name || ''));
        break;
      case 'name_desc':
        result.sort((a, b) => (b.full_name || b.user?.full_name || '').localeCompare(a.full_name || a.user?.full_name || ''));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
    }
    return result;
  }, [muallimah, filters.sortBy]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = muallimah.filter(t => t.status === 'pending').map(t => t.id);
      setSelectedIds(pendingIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleToggleExcludeCapacity = async (id: string, exclude: boolean) => {
    try {
      const { error } = await supabase
        .from('muallimah_akads')
        .update({ exclude_from_capacity: exclude })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(exclude ? 'Muallimah dikecualikan dari kapasitas' : 'Muallimah diikutkan dalam kapasitas');
      fetchMuallimahData();
    } catch (error: any) {
      toast.error('Gagal memperbarui status kapasitas: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <MuallimahV2Stats 
        stats={stats} 
        isLoading={isLoading} 
        activeFilter={filters.status as any}
        onCardClick={(filter) => setFilters(prev => ({ ...prev, status: filter }))}
      />
      
      <MuallimahV2Filters 
        batches={batches}
        isLoading={isLoading}
        onFilterChange={setFilters}
        onRefresh={fetchMuallimahData}
        defaultBatchId={filters.batchId}
        defaultStatus={filters.status}
      />

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-bold text-gray-900">{selectedIds.length} pendaftaran dipilih</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setBulkAction('approve'); setShowBulkModal(true); }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
            >
              Setujui Semua
            </button>
            <button
              onClick={() => { setBulkAction('reject'); setShowBulkModal(true); }}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
            >
              Tolak Semua
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-bold text-gray-500 hover:text-gray-700 px-2"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <MuallimahV2Table 
        muallimah={sortedMuallimah}
        isLoading={isLoading}
        onAction={handleAction}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        onToggleExcludeCapacity={handleToggleExcludeCapacity}
      />

      {/* Modals */}
      <MuallimahReviewModal 
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviewData={selectedRegistration}
        onRefresh={fetchMuallimahData}
        user={user}
      />

      <MuallimahUnapproveModal 
        isOpen={showUnapproveModal}
        onClose={() => setShowUnapproveModal(false)}
        onConfirm={handleUnapproveConfirm}
        data={selectedRegistration}
        isProcessing={false}
      />

      <MuallimahBulkConfirmModal 
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onConfirm={handleBulkConfirm}
        action={bulkAction}
        count={selectedIds.length}
        isProcessing={isBulkProcessing}
      />

      <AdminDeleteModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Akad Mu'allimah"
        message={`Apakah Ukhti yakin ingin menghapus pendaftaran/akad "${selectedRegistration?.full_name}"? Tindakan ini tidak dapat dibatalkan.`}
      />

      {showEditModal && (
        <MuallimahEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          editData={selectedRegistration}
          batches={batches}
          onRefresh={() => {
            fetchMuallimahData();
            fetchBatches();
          }}
        />
      )}
    </div>
  );
}
