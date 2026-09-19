'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';

import { TikrarTahfidz, TikrarStatsData as TikrarStatsType } from './types';
import { TikrarStats } from './TikrarStats';
import { TikrarFilters } from './TikrarFilters';
import { TikrarTable } from './TikrarTable';
import { TikrarReviewModal, TikrarBulkConfirmModal, TikrarUnapproveModal } from './TikrarModals';
import { AdminCrudModal } from '@/components/AdminCrudModal';
import { AdminDeleteModal } from '@/components/AdminDeleteModal';
import { useJuzOptions } from '@/hooks/useJuzOptions';

export function TikrarTab({ user }: { user: any }) {
  const supabase = createClient();
  const { juzOptions } = useJuzOptions();
  
  // State
  const [tikrar, setTikrar] = useState<TikrarTahfidz[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<TikrarStatsType | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals State
  const [selectedRegistration, setSelectedRegistration] = useState<TikrarTahfidz | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnapproveModal, setShowUnapproveModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    batchId: 'all',
    status: 'all',
    selectionStatus: 'all',
    daftarUlangStatus: 'all'
  });

  // Fetch Batches
  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/batches');
      const json = await res.json();
      const loadedBatches = json.data || [];
      setBatches(loadedBatches);

      // Find the currently active batch and set it as default in filters
      const active = loadedBatches.find((b: any) => 
        b.registration_start_date && 
        b.registration_end_date &&
        new Date(b.registration_start_date) <= new Date() && 
        new Date(b.registration_end_date) >= new Date()
      ) || loadedBatches[0]; // fallback to latest batch if no active one

      if (active) {
        setFilters(prev => ({
          ...prev,
          batchId: active.id
        }));
      }
    } catch (e) {
      console.error('Failed to load batches:', e);
    } finally {
      setBatchesLoaded(true);
    }
  };

  // Fetch Tikrar Data
  const fetchTikrarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.batchId !== 'all') params.append('batch_id', filters.batchId);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.selectionStatus !== 'all') params.append('selection_status', filters.selectionStatus);
      params.append('limit', '1000');

      const res = await fetch(`/api/admin/tikrar?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.message || 'Gagal memuat data pendaftaran');
      }

      const json = await res.json();
      let filteredData: TikrarTahfidz[] = (json.data?.data || json.data || []) as TikrarTahfidz[];

      // Apply Search & Additional Filters (Local)
      if (filters.search || filters.daftarUlangStatus !== 'all') {
        const s = filters.search.toLowerCase();
        filteredData = filteredData.filter(item => {
          const nameMatch = (item.user?.full_name || item.full_name || '').toLowerCase().includes(s);
          const emailMatch = (item.user?.email || '').toLowerCase().includes(s);
          const waMatch = (item.user?.whatsapp || item.wa_phone || '').includes(s);
          const searchMatch = !filters.search || nameMatch || emailMatch || waMatch;

          let statusMatch = true;
          if (filters.daftarUlangStatus !== 'all') {
            const hasSubmitted = (item as any).daftar_ulang_submissions?.some((du: any) => du.status === 'submitted' || du.status === 'approved');
            if (filters.daftarUlangStatus === 'submitted') {
              statusMatch = hasSubmitted;
            } else if (filters.daftarUlangStatus === 'none') {
              statusMatch = !hasSubmitted;
            }
          }

          return searchMatch && statusMatch;
        });
      }

      // Client-side sort alphabetically by name (A-Z)
      filteredData.sort((a, b) => {
        const nameA = (a.full_name || a.user?.full_name || 'Hamba Allah').toLowerCase();
        const nameB = (b.full_name || b.user?.full_name || 'Hamba Allah').toLowerCase();
        return nameA.localeCompare(nameB, 'id');
      });

      setTikrar(filteredData || []);
      
      // Note: Since filtering by selection_status is done on the server, 
      // the stats calculation will only reflect the current filtered dataset.
      // To show global stats, we would need a separate API call or return it from the API.
      
      const total = filteredData.length;
      const pending = filteredData.filter(t => t.selection_status === 'pending').length;
      const approved = filteredData.filter(t => t.selection_status === 'selected').length;
      const rejected = filteredData.filter(t => t.selection_status === 'not_selected').length;
      const selectionPending = pending;
      const selected = approved;

      setStats({
        total,
        pending,
        approved,
        rejected,
        selectionPending,
        selected
      });

    } catch (error: any) {
      toast.error('Gagal mengambil data Tikrar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, supabase]);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (batchesLoaded) {
      fetchTikrarData();
    }
  }, [fetchTikrarData, batchesLoaded]);

  // Handlers
  const handleAction = (action: 'review' | 'edit' | 'delete' | 'unapprove', data: TikrarTahfidz) => {
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
        .from('pendaftaran_tikrar_tahfidz')
        .delete()
        .eq('id', selectedRegistration.id);
      
      if (error) throw error;
      toast.success('Pendaftaran berhasil dihapus');
      fetchTikrarData();
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
        .from('pendaftaran_tikrar_tahfidz')
        .update({
          status: 'pending',
          review_notes: reason
        })
        .eq('id', selectedRegistration.id);
      
      if (error) throw error;
      toast.success('Persetujuan dibatalkan');
      fetchTikrarData();
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
        .from('pendaftaran_tikrar_tahfidz')
        .update({
          status: bulkAction === 'approve' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          review_notes: bulkAction === 'reject' ? bulkRejectionReason : null
        })
        .in('id', selectedIds);
      
      if (error) throw error;
      toast.success(`${selectedIds.length} pendaftaran berhasil di-${bulkAction}`);
      setSelectedIds([]);
      fetchTikrarData();
    } catch (error: any) {
      toast.error('Gagal memproses massal: ' + error.message);
    } finally {
      setIsBulkProcessing(false);
      setShowBulkModal(false);
      setBulkAction(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = tikrar.filter(t => t.status === 'pending').map(t => t.id);
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

  return (
    <div className="space-y-6">
      <TikrarStats stats={stats} isLoading={isLoading} />
      
      <TikrarFilters 
        batches={batches}
        isLoading={isLoading}
        onFilterChange={setFilters}
        onRefresh={fetchTikrarData}
        defaultBatchId={filters.batchId}
      />


      <TikrarTable 
        tikrar={tikrar}
        isLoading={isLoading}
        onAction={handleAction}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
      />

      {/* Modals */}
      <TikrarReviewModal 
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviewData={selectedRegistration}
        onRefresh={fetchTikrarData}
        user={user}
      />

      <TikrarUnapproveModal 
        isOpen={showUnapproveModal}
        onClose={() => setShowUnapproveModal(false)}
        onConfirm={handleUnapproveConfirm}
        data={selectedRegistration}
        isProcessing={false}
      />

      <TikrarBulkConfirmModal 
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onConfirm={handleBulkConfirm}
        action={bulkAction}
        count={selectedIds.length}
        isProcessing={isBulkProcessing}
        rejectionReason={bulkRejectionReason}
        setRejectionReason={setBulkRejectionReason}
      />

      <AdminDeleteModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Pendaftaran Tikrar"
        message={`Apakah Ukhti yakin ingin menghapus pendaftaran "${selectedRegistration?.full_name}"? Tindakan ini tidak dapat dibatalkan.`}
      />

      <AdminCrudModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Pendaftaran Tikrar"
        fields={[
          { name: 'full_name', label: 'Full Name', type: 'text', required: true },
          { name: 'status', label: 'Status', type: 'select', options: [
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'withdrawn', label: 'Withdrawn' },
            { value: 'completed', label: 'Completed' }
          ] },
          { name: 'selection_status', label: 'Selection Status', type: 'select', options: [
            { value: 'pending', label: 'Pending' },
            { value: 'selected', label: 'Selected' },
            { value: 'not_selected', label: 'Not Selected' },
            { value: 'waitlist', label: 'Waitlist' }
          ] },
          { name: 'chosen_juz', label: 'Juz Penempatan', type: 'select', options: 
            juzOptions && juzOptions.length > 0 
              ? juzOptions.map(j => ({ value: j.code, label: j.name }))
              : [
                  { value: '1A', label: 'Juz 1A' }, { value: '1B', label: 'Juz 1B' },
                  { value: '28A', label: 'Juz 28A' }, { value: '28B', label: 'Juz 28B' },
                  { value: '29A', label: 'Juz 29A' }, { value: '29B', label: 'Juz 29B' },
                  { value: '30A', label: 'Juz 30A' }, { value: '30B', label: 'Juz 30B' }
                ]
          },
          { name: 'wa_phone', label: 'WhatsApp', type: 'text' },
          { name: 'telegram_phone', label: 'Telegram Phone', type: 'text' },
          { name: 'domicile', label: 'Domisili', type: 'text' },
          { name: 'address', label: 'Alamat Lengkap', type: 'textarea' },
          { name: 'birth_date', label: 'Tanggal Lahir', type: 'date' },
          { name: 'age', label: 'Usia', type: 'number' },
          { name: 'infaq_amount', label: 'Komitmen Infaq', type: 'text' },
          { name: 'timezone', label: 'Zona Waktu', type: 'text' },
          { name: 'main_time_slot', label: 'Waktu Setoran Utama', type: 'text' },
          { name: 'backup_time_slot', label: 'Waktu Setoran Cadangan', type: 'text' },
          { name: 'permission_name', label: 'Nama Pemberi Izin', type: 'text' },
          { name: 'permission_phone', label: 'No. HP Pemberi Izin', type: 'text' },
          { name: 'ready_for_team', label: 'Bersedia Masuk Tim', type: 'select', options: [
            { value: 'yes', label: 'Ya' },
            { value: 'no', label: 'Tidak' }
          ] },
          { name: 'motivation', label: 'Motivasi', type: 'textarea' },
          { name: 'questions', label: 'Pertanyaan / Harapan', type: 'textarea' },
          { name: 'understands_program', label: 'Memahami Program', type: 'checkbox' },
          { name: 'understands_commitment', label: 'Memahami Komitmen', type: 'checkbox' },
          { name: 'time_commitment', label: 'Komitmen Waktu', type: 'checkbox' },
          { name: 'tried_simulation', label: 'Mencoba Simulasi', type: 'checkbox' },
          { name: 'no_negotiation', label: 'Tidak Negosiasi', type: 'checkbox' },
          { name: 'no_travel_plans', label: 'Tidak Ada Rencana Safar', type: 'checkbox' },
          { name: 'saved_contact', label: 'Simpan Kontak', type: 'checkbox' },
          { name: 'has_permission', label: 'Punya Izin', type: 'checkbox' },
          { name: 'has_telegram', label: 'Punya Telegram', type: 'checkbox' },
          { name: 'oral_total_score', label: 'Oral Score', type: 'number' },
          { name: 'written_quiz_score', label: 'Written Score', type: 'number' },
        ]}
        initialData={selectedRegistration || {}}
        onSubmit={async (formData) => {
          if (!selectedRegistration) return;
          try {
            // Sanitize empty strings to null for integer/numeric fields
            const cleanedData = { ...formData };
            ['age', 'oral_total_score', 'written_quiz_score'].forEach(field => {
              if (cleanedData[field] === '') {
                cleanedData[field] = null;
              }
            });

            const { error } = await supabase
              .from('pendaftaran_tikrar_tahfidz')
              .update(cleanedData)
              .eq('id', selectedRegistration.id);
            
            if (error) throw error;
            toast.success('Pendaftaran berhasil diupdate');
            fetchTikrarData();
            setShowEditModal(false);
          } catch (error: any) {
            toast.error('Gagal mengupdate: ' + error.message);
          }
        }}
      />
    </div>
  );
}
