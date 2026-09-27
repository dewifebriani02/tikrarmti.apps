'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Clock, 
  DollarSign, 
  Phone, 
  FileText, 
  AlertCircle,
  Search,
  Wallet,
  Coins,
  ShieldCheck,
  Ban,
  Send,
  MessageCircle,
  Calendar,
  Layers,
  Filter,
  Check,
  UserCheck,
  ExternalLink,
  Users
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Donation {
  id: string;
  user_id: string;
  amount: number;
  donor_name: string;
  whatsapp: string;
  proof_url: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface RekapThalibah {
  user_id: string;
  daftar_ulang_id: string;
  full_name: string;
  nama_kunyah?: string;
  email: string;
  whatsapp: string;
  whatsapp_display: string;
  avatar_url?: string;
  chosen_juz?: string;
  halaqah_name?: string;
  is_donasi_choice: boolean;
  commitment_type: string;
  commitment_amount: number;
  has_dispensation: boolean;
  payment_status: 'paid' | 'pending' | 'unpaid' | 'rejected';
  donation?: {
    id: string;
    amount: number;
    status: string;
    proof_url: string;
    notes: string;
    created_at: string;
  } | null;
}

interface RekapData {
  month: number;
  year: number;
  month_name: string;
  batches: Array<{ id: string; name: string; status: string }>;
  selected_batch: { id: string; name: string } | null;
  stats: {
    total_donasi_cohort: number;
    total_paid: number;
    total_pending: number;
    total_unpaid: number;
    total_rejected: number;
    amount_paid: number;
    amount_pending: number;
  };
  thalibah_list: RekapThalibah[];
}

export function AdminDonationsTab() {
  // Main view tab: 'rekap' (Rekapitulasi & Reminder) vs 'verifikasi' (Bukti Transfer)
  const [activeTab, setActiveTab] = useState<'rekap' | 'verifikasi'>('rekap');

  // Transactions State (Verifikasi)
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [verificationSearch, setVerificationSearch] = useState('');

  // Rekapitulasi State
  const [rekapData, setRekapData] = useState<RekapData | null>(null);
  const [loadingRekap, setLoadingRekap] = useState(true);
  
  // Date calculation defaults
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [rekapStatusFilter, setRekapStatusFilter] = useState<'all' | 'unpaid' | 'pending' | 'paid' | 'pengabdian'>('all');
  const [rekapSearch, setRekapSearch] = useState('');

  // Note Modal States for approval/rejection
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [currentDonation, setCurrentDonation] = useState<Donation | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchDonations();
  }, []);

  useEffect(() => {
    fetchRekap();
  }, [selectedMonth, selectedYear, selectedBatchId]);

  const fetchDonations = async () => {
    try {
      setLoadingDonations(true);
      const res = await fetch('/api/admin/donations');
      if (!res.ok) throw new Error('Gagal memuat data infaq');
      const data = await res.json();
      if (data.success) {
        setDonations(data.data || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat memuat data infaq');
    } finally {
      setLoadingDonations(false);
    }
  };

  const fetchRekap = async () => {
    try {
      setLoadingRekap(true);
      const queryParams = new URLSearchParams({
        month: String(selectedMonth),
        year: String(selectedYear),
      });
      if (selectedBatchId) {
        queryParams.set('batch_id', selectedBatchId);
      }

      const res = await fetch(`/api/admin/donations/rekap?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat rekapitulasi infaq');
      const data = await res.json();
      if (data.success) {
        setRekapData(data.data);
        if (!selectedBatchId && data.data?.selected_batch?.id) {
          setSelectedBatchId(data.data.selected_batch.id);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat memuat rekap infaq');
    } finally {
      setLoadingRekap(false);
    }
  };

  const handleOpenActionModal = (donation: Donation, type: 'approved' | 'rejected') => {
    setCurrentDonation(donation);
    setActionType(type);
    setAdminNotes(donation.notes || '');
    setNoteModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!currentDonation || !actionType) return;

    try {
      setSubmittingAction(true);
      const res = await fetch('/api/admin/donations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDonation.id,
          status: actionType,
          notes: adminNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Infaq berhasil ${actionType === 'approved' ? 'disetujui' : 'ditolak'}`);
        setDonations(prev =>
          prev.map(d => (d.id === currentDonation.id ? { ...d, status: actionType, notes: adminNotes } : d))
        );
        setNoteModalOpen(false);
        setCurrentDonation(null);
        setActionType(null);
        setAdminNotes('');
        // Also refresh rekap
        fetchRekap();
      } else {
        toast.error(data.error || 'Gagal memproses infaq');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Ukhti yakin ingin menghapus catatan infaq ini?')) return;

    try {
      const res = await fetch(`/api/admin/donations?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Catatan infaq berhasil dihapus');
        setDonations(prev => prev.filter(d => d.id !== id));
        fetchRekap();
      } else {
        toast.error(data.error || 'Gagal menghapus catatan infaq');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // WhatsApp Message Generator for Japri Reminder
  const generateWaReminderUrl = (thalibah: RekapThalibah) => {
    const phone = thalibah.whatsapp;
    if (!phone) return '#';

    const nama = thalibah.full_name;
    const nominalStr = formatIDR(thalibah.commitment_amount || 25000);
    const monthName = rekapData?.month_name || monthNames[selectedMonth - 1];

    let message = '';
    if (thalibah.payment_status === 'unpaid') {
      message = `Assalamu'alaikum Warahmatullahi Wabarakatuh, Ukhti *${nama}* yang dirahmati Allah.

Semoga Ukhti dan keluarga senantiasa dalam limpahan taufik dan kesehatan.

Kami dari *Admin Markaz Tikrar Indonesia (MTI)* ingin menyampaikan pengingat terkait *Infaq Operasional Bulanan Periode ${monthName} ${selectedYear}*.

📌 *Rincian Komitmen Infaq:*
• Nama Thalibah: *${nama}*
• Periode: *${monthName} ${selectedYear}*
• Nominal Komitmen: *${nominalStr}*

💳 *Rekening Pembayaran:*
• Bank: *Bank Syariah Indonesia (BSI)*
• No. Rekening: *7345608197*
• Atas Nama: *Markaz Tikrar Indonesia*

🔗 *Konfirmasi & Unggah Bukti:*
Setelah melakukan transfer, mohon konfirmasi dan unggah bukti transfer melalui tautan aplikasi berikut:
https://markaztikrar.id/infaq-donasi

_Catatan: Batas akhir konfirmasi infaq setiap bulannya adalah tanggal 10. Jika ada kendala atau membutuhkan keringanan, silakan mengabari kami ya Ukhti._

Jazakillahu khairan katsiran atas dukungan dan komitmen Ukhti. Semoga menjadi amal jariyah yang diberkahi Allah Ta'ala. 🌸

_Wassalamu'alaikum Warahmatullahi Wabarakatuh_
*Pengurus & Admin Markaz Tikrar Indonesia*`;
    } else if (thalibah.payment_status === 'rejected') {
      message = `Assalamu'alaikum Warahmatullahi Wabarakatuh, Ukhti *${nama}*.

Terkait bukti transfer infaq bulanan *${monthName} ${selectedYear}* yang telah diunggah sebelumnya, mohon maaf bukti tersebut belum dapat kami validasi (alasan: _${thalibah.donation?.notes || 'Bukti transfer tidak terbaca / tidak sesuai'}_).

Mohon kesediaan Ukhti untuk mengunggah ulang bukti transfer yang sah melalui:
https://markaztikrar.id/infaq-donasi

Jazakillahu khairan katsiran.`;
    } else {
      message = `Assalamu'alaikum Warahmatullahi Wabarakatuh, Ukhti *${nama}*.

Terima kasih atas konfirmasi infaq bulanan *${monthName} ${selectedYear}*. Semoga Allah memberkahi rezeki dan hafalan Al-Qur'an Ukhti. Aamiin. 🌸`;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  // Filtered Rekapitulasi List
  const filteredRekapList = useMemo(() => {
    if (!rekapData?.thalibah_list) return [];

    return rekapData.thalibah_list.filter(t => {
      // Filter by status pill
      if (rekapStatusFilter === 'unpaid' && (t.payment_status !== 'unpaid' || !t.is_donasi_choice)) return false;
      if (rekapStatusFilter === 'pending' && t.payment_status !== 'pending') return false;
      if (rekapStatusFilter === 'paid' && t.payment_status !== 'paid') return false;
      if (rekapStatusFilter === 'pengabdian' && t.is_donasi_choice) return false;

      // Search query
      if (rekapSearch.trim()) {
        const query = rekapSearch.toLowerCase();
        const matchesName = t.full_name?.toLowerCase().includes(query);
        const matchesEmail = t.email?.toLowerCase().includes(query);
        const matchesWa = t.whatsapp?.includes(query);
        const matchesHalaqah = t.halaqah_name?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesWa && !matchesHalaqah) return false;
      }

      return true;
    });
  }, [rekapData, rekapStatusFilter, rekapSearch]);

  // Filtered Verification List
  const filteredVerificationList = useMemo(() => {
    return donations.filter(d => {
      const matchesFilter = verificationFilter === 'all' || d.status === verificationFilter;
      if (!matchesFilter) return false;

      if (!verificationSearch.trim()) return true;
      const query = verificationSearch.toLowerCase();
      return (
        d.donor_name?.toLowerCase().includes(query) ||
        d.user?.full_name?.toLowerCase().includes(query) ||
        d.user?.email?.toLowerCase().includes(query) ||
        d.whatsapp?.toLowerCase().includes(query) ||
        d.notes?.toLowerCase().includes(query)
      );
    });
  }, [donations, verificationFilter, verificationSearch]);

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 w-full sm:w-auto shadow-inner">
          <button
            onClick={() => setActiveTab('rekap')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'rekap'
                ? 'bg-white text-emerald-950 shadow-md scale-[1.02]'
                : 'text-gray-600 hover:text-emerald-950 hover:bg-white/50'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-700" />
            <span>Rekap & Reminder Bulanan</span>
            {rekapData && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {rekapData.stats.total_donasi_cohort}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('verifikasi')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'verifikasi'
                ? 'bg-white text-emerald-950 shadow-md scale-[1.02]'
                : 'text-gray-600 hover:text-emerald-950 hover:bg-white/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Verifikasi Bukti Transfer</span>
            {donations.filter(d => d.status === 'pending').length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                {donations.filter(d => d.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Global Batch & Month indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {rekapData?.month_name || monthNames[selectedMonth - 1]} {selectedYear}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Thalibah Infaq */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl relative border-l-4 border-l-emerald-600">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-emerald-500/10 blur-xl" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800 border border-emerald-100 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Thalibah Wajib Infaq</p>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 truncate">
                {rekapData?.stats.total_donasi_cohort || 0} orang
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Jalur Komitmen Donasi</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Sudah Membayar (Bulan Ini) */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl relative border-l-4 border-l-green-600">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-green-500/10 blur-xl" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-700 border border-green-100 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Sudah Membayar ({rekapData?.month_name})</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mt-1 truncate">
                {rekapData?.stats.total_paid || 0} orang
              </h3>
              <p className="text-xs text-green-700 font-semibold mt-0.5">
                {formatIDR(rekapData?.stats.amount_paid || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Menunggu Verifikasi */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl relative border-l-4 border-l-amber-500">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-amber-500/10 blur-xl" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700 border border-amber-100 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Menunggu Verifikasi</p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-950 mt-1 truncate">
                {rekapData?.stats.total_pending || 0} orang
              </h3>
              <p className="text-xs text-amber-700 font-semibold mt-0.5">
                {formatIDR(rekapData?.stats.amount_pending || 0)} pending
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Belum Membayar */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl relative border-l-4 border-l-rose-500">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-rose-500/10 blur-xl" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-700 border border-rose-100 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Belum Membayar ({rekapData?.month_name})</p>
              <h3 className="text-xl sm:text-2xl font-black text-rose-950 mt-1 truncate">
                {rekapData?.stats.total_unpaid || 0} orang
              </h3>
              <p className="text-xs text-rose-700 font-semibold mt-0.5">Perlu Reminder WhatsApp</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REKAPITULASI & REMINDER JAPRI WHATSAPP                             */}
      {/* ========================================================================= */}
      {activeTab === 'rekap' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Controls Bar: Batch & Month Selectors */}
          <div className="p-5 sm:p-6 border-b border-gray-100 space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>Rekapitulasi Infaq Bulanan</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                    {rekapData?.selected_batch?.name || 'Batch Aktif'}
                  </span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Daftar thalibah yang sudah membayar dan belum membayar infaq bulan {rekapData?.month_name} {selectedYear}. Admin dapat mengirim pengingat langsung via WhatsApp (Japri).
                </p>
              </div>

              {/* Month, Year & Batch Filters */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                {/* Batch Selector */}
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="text-xs rounded-xl border-gray-200 bg-gray-50 focus:bg-white h-9 px-3 font-semibold text-gray-700 border focus:border-emerald-500"
                >
                  {rekapData?.batches?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.status === 'ongoing' ? '(Aktif)' : ''}
                    </option>
                  ))}
                </select>

                {/* Month Selector */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs rounded-xl border-gray-200 bg-gray-50 focus:bg-white h-9 px-3 font-semibold text-gray-700 border focus:border-emerald-500"
                >
                  {monthNames.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      Bulan {m}
                    </option>
                  ))}
                </select>

                {/* Year Selector */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs rounded-xl border-gray-200 bg-gray-50 focus:bg-white h-9 px-3 font-semibold text-gray-700 border focus:border-emerald-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
                <button
                  onClick={() => setRekapStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    rekapStatusFilter === 'all' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-600 hover:text-emerald-950'
                  }`}
                >
                  Semua ({rekapData?.thalibah_list?.length || 0})
                </button>
                <button
                  onClick={() => setRekapStatusFilter('unpaid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    rekapStatusFilter === 'unpaid' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600 hover:text-rose-700'
                  }`}
                >
                  Belum Bayar ({rekapData?.stats?.total_unpaid || 0})
                </button>
                <button
                  onClick={() => setRekapStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    rekapStatusFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600 hover:text-amber-700'
                  }`}
                >
                  Pending ({rekapData?.stats?.total_pending || 0})
                </button>
                <button
                  onClick={() => setRekapStatusFilter('paid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    rekapStatusFilter === 'paid' ? 'bg-white text-emerald-900 shadow-sm' : 'text-gray-600 hover:text-emerald-900'
                  }`}
                >
                  Sudah Bayar ({rekapData?.stats?.total_paid || 0})
                </button>
                <button
                  onClick={() => setRekapStatusFilter('pengabdian')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    rekapStatusFilter === 'pengabdian' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Jalur Pengabdian
                </button>
              </div>

              {/* Search */}
              <div className="relative sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder="Cari thalibah / WA / halaqah..."
                  value={rekapSearch}
                  onChange={(e) => setRekapSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-gray-200 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {loadingRekap ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 font-medium">Memuat rekapitulasi infaq...</p>
            </div>
          ) : filteredRekapList.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Tidak ada data thalibah untuk filter ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">No</th>
                    <th className="py-3.5 px-6">Thalibah</th>
                    <th className="py-3.5 px-6">Halaqah & Juz</th>
                    <th className="py-3.5 px-6">Komitmen Infaq</th>
                    <th className="py-3.5 px-6">Status Infaq {rekapData?.month_name}</th>
                    <th className="py-3.5 px-6">Bukti Transfer</th>
                    <th className="py-3.5 px-6 text-right">Reminder Japri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredRekapList.map((t, idx) => (
                    <tr key={t.user_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-xs text-gray-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {t.full_name}
                            {t.nama_kunyah && <span className="text-xs font-normal text-gray-500 ml-1.5">({t.nama_kunyah})</span>}
                          </p>
                          <p className="text-xs text-gray-400 font-normal mt-0.5">{t.email}</p>
                          {t.whatsapp_display && (
                            <p className="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {t.whatsapp_display}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-600 whitespace-nowrap">
                        <span className="font-semibold text-gray-800">{t.halaqah_name}</span>
                        {t.chosen_juz && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold">
                            Juz {t.chosen_juz}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {t.is_donasi_choice ? (
                          <div>
                            <span className="font-bold text-emerald-950 text-sm">
                              {formatIDR(t.commitment_amount)}
                            </span>
                            <p className="text-[10px] text-gray-400">/ bulan</p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold">
                            <UserCheck className="w-3 h-3" /> Pengabdian
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {!t.is_donasi_choice ? (
                          <span className="text-xs text-gray-400 font-medium">Bebas Infaq</span>
                        ) : t.payment_status === 'paid' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Sudah Membayar
                          </span>
                        ) : t.payment_status === 'pending' ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi
                          </span>
                        ) : t.payment_status === 'rejected' ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-100 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Ditolak / Tidak Sah
                          </span>
                        ) : (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Belum Membayar
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-xs">
                        {t.donation?.proof_url ? (
                          <a
                            href={t.donation.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Lihat Bukti</span>
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {t.whatsapp ? (
                          <Button
                            asChild
                            size="sm"
                            className={`rounded-xl text-xs font-bold h-8 px-3.5 shadow-sm gap-1.5 transition-all ${
                              t.payment_status === 'unpaid'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : t.payment_status === 'pending'
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            <a
                              href={generateWaReminderUrl(t)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Kirim Pesan WhatsApp Japri"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{t.payment_status === 'unpaid' ? 'Kirim Reminder WA' : 'Chat WA'}</span>
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No WA tidak ada</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VERIFIKASI BUKTI TRANSFER (TRANSAKSI MASUK)                        */}
      {/* ========================================================================= */}
      {activeTab === 'verifikasi' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Verifikasi Bukti Pembayaran</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pemeriksaan bukti transfer bank pembayaran infaq bulanan dari thalibah & alumni MTI.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder="Cari donatur / WA / catatan..."
                  value={verificationSearch}
                  onChange={(e) => setVerificationSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-gray-200 focus:border-emerald-500"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
                <button
                  onClick={() => setVerificationFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    verificationFilter === 'all' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-600 hover:text-emerald-950'
                  }`}
                >
                  Semua ({donations.length})
                </button>
                <button
                  onClick={() => setVerificationFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    verificationFilter === 'pending' ? 'bg-white text-amber-800 shadow-sm' : 'text-gray-600 hover:text-amber-800'
                  }`}
                >
                  Pending ({donations.filter(d => d.status === 'pending').length})
                </button>
                <button
                  onClick={() => setVerificationFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    verificationFilter === 'approved' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-600 hover:text-emerald-950'
                  }`}
                >
                  Berhasil ({donations.filter(d => d.status === 'approved').length})
                </button>
                <button
                  onClick={() => setVerificationFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    verificationFilter === 'rejected' ? 'bg-white text-rose-750 shadow-sm' : 'text-gray-600 hover:text-rose-750'
                  }`}
                >
                  Ditolak ({donations.filter(d => d.status === 'rejected').length})
                </button>
              </div>
            </div>
          </div>

          {loadingDonations ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 font-medium">Memuat data transaksi...</p>
            </div>
          ) : filteredVerificationList.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Tidak ada data infaq untuk kriteria pencarian ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Tanggal</th>
                    <th className="py-3.5 px-6">Donatur / Thalibah</th>
                    <th className="py-3.5 px-6">Jumlah Infaq</th>
                    <th className="py-3.5 px-6">WhatsApp</th>
                    <th className="py-3.5 px-6">Catatan Admin</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredVerificationList.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                      </td>
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        <div>
                          {d.donor_name}
                          {d.user?.email && <p className="text-xs text-gray-400 font-normal mt-0.5">{d.user.email}</p>}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-emerald-950 whitespace-nowrap">
                        {formatIDR(d.amount)}
                      </td>
                      <td className="py-4 px-6">
                        {d.whatsapp ? (
                          <a
                            href={`https://wa.me/${d.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 font-medium hover:underline text-xs"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            {d.whatsapp}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="py-4 px-6 text-gray-600 max-w-xs truncate text-xs" title={d.notes}>
                        {d.notes || '-'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {d.status === 'approved' && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Berhasil
                          </span>
                        )}
                        {d.status === 'rejected' && (
                          <span className="bg-rose-50 text-rose-700 border border-rose-100 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Ditolak
                          </span>
                        )}
                        {d.status === 'pending' && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-2">
                          <Button asChild variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg text-xs h-8">
                            <a href={d.proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" /> Bukti
                            </a>
                          </Button>
                          
                          {d.status === 'pending' && (
                            <>
                              <Button
                                onClick={() => handleOpenActionModal(d, 'approved')}
                                className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs px-3 h-8 shadow-sm"
                              >
                                Terima
                              </Button>
                              <Button
                                onClick={() => handleOpenActionModal(d, 'rejected')}
                                variant="outline"
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs px-3 h-8"
                              >
                                Tolak
                              </Button>
                            </>
                          )}
                          
                          <Button
                            onClick={() => handleDelete(d.id)}
                            variant="outline"
                            size="sm"
                            className="border-rose-100 text-rose-700 hover:bg-rose-50 rounded-lg p-2 h-8 w-8 flex items-center justify-center"
                            title="Hapus catatan infaq"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Action Notes Modal for verification */}
      {noteModalOpen && currentDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border-0 shadow-2xl max-w-md w-full overflow-hidden">
            <div className={`h-1.5 ${actionType === 'approved' ? 'bg-emerald-700' : 'bg-rose-600'}`} />
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                {actionType === 'approved' ? 'Setujui Penerimaan Infaq' : 'Tolak Bukti Transfer Infaq'}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Ukhti akan {actionType === 'approved' ? 'menyetujui' : 'menolak'} infaq sebesar <strong>{formatIDR(currentDonation.amount)}</strong> dari <strong>{currentDonation.donor_name}</strong>. Silakan masukkan catatan admin tambahan jika diperlukan.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="adminNotes" className="text-xs font-semibold text-gray-700">Catatan Admin</Label>
                <textarea
                  id="adminNotes"
                  className="w-full rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 text-xs p-3 h-24 resize-none border"
                  placeholder={actionType === 'approved' ? 'Jazakumullahu khairan...' : 'Bukti transfer tidak terbaca / tidak sesuai, mohon unggah ulang...'}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  onClick={() => {
                    setNoteModalOpen(false);
                    setCurrentDonation(null);
                    setActionType(null);
                    setAdminNotes('');
                  }}
                  variant="ghost"
                  className="rounded-xl text-gray-500 text-xs"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  disabled={submittingAction}
                  className={`rounded-xl px-5 text-xs ${
                    actionType === 'approved' 
                      ? 'bg-emerald-800 hover:bg-emerald-700 text-white' 
                      : 'bg-rose-700 hover:bg-rose-600 text-white'
                  }`}
                >
                  {submittingAction ? 'Memproses...' : 'Konfirmasi'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
