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
  Users,
  Grid,
  List,
  Eye,
  ChevronRight,
  Maximize2,
  X,
  Sparkles,
  ArrowRight
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

interface MonthlyStatusDetail {
  payment_status: 'paid' | 'pending' | 'unpaid' | 'rejected';
  donation: {
    id: string;
    amount: number;
    status: string;
    proof_url: string;
    notes: string;
    created_at: string;
  } | null;
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
  monthly_status?: Record<number, MonthlyStatusDetail>;
  donations_history?: Array<{
    id: string;
    amount: number;
    status: string;
    proof_url: string;
    notes: string;
    created_at: string;
    donor_name?: string;
    whatsapp?: string;
  }>;
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

export function getCleanProofUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://localhost') || trimmed.startsWith('http://127.0.0.1')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.pathname;
    } catch {
      return trimmed.replace(/^http:\/\/localhost(:\d+)?/, '');
    }
  }
  return trimmed;
}

export function AdminDonationsTab() {
  // Main view tab: 'rekap' (Rekapitulasi & Reminder) vs 'verifikasi' (Bukti Transfer)
  const [activeTab, setActiveTab] = useState<'rekap' | 'verifikasi'>('rekap');

  // Sub-view inside Rekap: 'matrix' (Semua Bulan Jan-Des) vs 'monthly' (Tabel Per Bulan Terpilih)
  const [rekapSubView, setRekapSubView] = useState<'matrix' | 'monthly'>('matrix');

  // Transactions State (Verifikasi Queue)
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
  const [rekapStatusFilter, setRekapStatusFilter] = useState<'donasi' | 'unpaid' | 'pending' | 'paid' | 'pengabdian' | 'all'>('donasi');
  const [rekapSearch, setRekapSearch] = useState('');

  // Note Modal States for approval/rejection in table
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [currentDonation, setCurrentDonation] = useState<Donation | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Drilldown Modal State
  const [drilldownModalOpen, setDrilldownModalOpen] = useState(false);
  const [selectedThalibah, setSelectedThalibah] = useState<RekapThalibah | null>(null);
  const [drilldownMonth, setDrilldownMonth] = useState<number>(selectedMonth);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const monthShortNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  // Fetch Verification List
  const fetchDonations = async () => {
    try {
      setLoadingDonations(true);
      const res = await fetch('/api/admin/donations', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        const cleaned = (json.data || []).map((d: any) => ({
          ...d,
          proof_url: getCleanProofUrl(d.proof_url),
        }));
        setDonations(cleaned);
      } else {
        toast.error(json.error || 'Gagal mengambil data verifikasi infaq');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan saat memuat data');
    } finally {
      setLoadingDonations(false);
    }
  };

  // Fetch Rekap List
  const fetchRekap = async (monthNum: number, yearNum: number, batchId?: string) => {
    try {
      setLoadingRekap(true);
      const url = new URL('/api/admin/donations/rekap', window.location.origin);
      url.searchParams.set('month', monthNum.toString());
      url.searchParams.set('year', yearNum.toString());
      if (batchId) {
        url.searchParams.set('batch_id', batchId);
      }
      
      const res = await fetch(url.toString(), { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setRekapData(json.data);
        if (!selectedBatchId && json.data.selected_batch) {
          setSelectedBatchId(json.data.selected_batch.id);
        }
        setSelectedThalibah((prev) => {
          if (!prev) return null;
          const updated = json.data.thalibah_list?.find((t: RekapThalibah) => t.user_id === prev.user_id);
          return updated || prev;
        });
      } else {
        toast.error(json.error || 'Gagal memuat rekapitulasi infaq bulanan');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat data rekapitulasi');
    } finally {
      setLoadingRekap(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  useEffect(() => {
    fetchRekap(selectedMonth, selectedYear, selectedBatchId);
  }, [selectedMonth, selectedYear, selectedBatchId]);

  // Handle Approve / Reject
  const handleUpdateStatus = async (donationId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/admin/donations/${donationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Infaq berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
        setNoteModalOpen(false);
        setAdminNotes('');
        setCurrentDonation(null);
        // Refresh both lists
        fetchDonations();
        await fetchRekap(selectedMonth, selectedYear, selectedBatchId);
      } else {
        toast.error(json.error || 'Gagal memperbarui status infaq');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Terjadi kesalahan saat memproses status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data infaq ini?')) return;
    try {
      const res = await fetch(`/api/admin/donations/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Data infaq berhasil dihapus');
        fetchDonations();
        fetchRekap(selectedMonth, selectedYear, selectedBatchId);
      } else {
        toast.error(json.error || 'Gagal menghapus data');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan');
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Generate WhatsApp Reminder Link
  const generateWaReminderUrl = (thalibah: RekapThalibah, targetMonth?: number) => {
    const monthNum = targetMonth || selectedMonth;
    const monthName = monthNames[monthNum - 1];
    const nama = thalibah.nama_kunyah ? `${thalibah.full_name} (${thalibah.nama_kunyah})` : thalibah.full_name;
    const nominalStr = formatIDR(thalibah.commitment_amount || 25000);
    const monthDetail = thalibah.monthly_status?.[monthNum];
    const status = monthDetail?.payment_status || thalibah.payment_status;

    let message = '';
    if (status === 'unpaid') {
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
• Atas Nama: *Mara Martalena*

🔗 *Konfirmasi & Unggah Bukti:*
Setelah melakukan transfer, mohon konfirmasi dan unggah bukti transfer melalui tautan aplikasi berikut:
https://markaztikrar.id/infaq-donasi

_Catatan: Batas akhir konfirmasi infaq setiap bulannya adalah tanggal 10. Jika ada kendala atau membutuhkan keringanan, silakan mengabari kami ya Ukhti._

Jazakillahu khairan katsiran atas dukungan dan komitmen Ukhti. Semoga menjadi amal jariyah yang diberkahi Allah Ta'ala. 🌸

_Wassalamu'alaikum Warahmatullahi Wabarakatuh_
*Pengurus & Admin Markaz Tikrar Indonesia*`;
    } else if (status === 'rejected') {
      message = `Assalamu'alaikum Warahmatullahi Wabarakatuh, Ukhti *${nama}*.

Terkait bukti transfer infaq bulanan *${monthName} ${selectedYear}* yang telah diunggah sebelumnya, mohon maaf bukti tersebut belum dapat kami validasi (alasan: _${monthDetail?.donation?.notes || thalibah.donation?.notes || 'Bukti transfer tidak terbaca / tidak sesuai'}_).

Mohon kesediaan Ukhti untuk mengunggah ulang bukti transfer yang sah melalui:
https://markaztikrar.id/infaq-donasi

💳 *Rekening BSI:* 7345608197 a.n Mara Martalena

Jazakillahu khairan katsiran.
*Admin Markaz Tikrar Indonesia*`;
    } else {
      // General greeting / follow-up
      message = `Assalamu'alaikum Warahmatullahi Wabarakatuh, Ukhti *${nama}*.

Terima kasih atas partisipasi dan kontribusi infaq bulanan Ukhti di Markaz Tikrar Indonesia untuk periode *${monthName} ${selectedYear}*.

Semoga Allah Ta'ala melipatgandakan pahala dan keberkahan untuk Ukhti sekeluarga. Barakallahu fiki. 🌸

*Admin Markaz Tikrar Indonesia*`;
    }

    const cleanPhone = (thalibah.whatsapp || '').replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  };

  // Open Drilldown Modal
  const openDrilldown = (thalibah: RekapThalibah, monthNum?: number) => {
    setSelectedThalibah(thalibah);
    setDrilldownMonth(monthNum || selectedMonth);
    setDrilldownModalOpen(true);
  };

  // Filtered Rekap List
  const filteredRekapList = useMemo(() => {
    if (!rekapData?.thalibah_list) return [];
    return rekapData.thalibah_list.filter((t) => {
      // Status Filter
      if (rekapStatusFilter === 'donasi' && !t.is_donasi_choice) return false;
      if (rekapStatusFilter === 'pengabdian' && t.is_donasi_choice) return false;
      if (rekapStatusFilter === 'unpaid' && (!t.is_donasi_choice || t.payment_status !== 'unpaid')) return false;
      if (rekapStatusFilter === 'pending' && t.payment_status !== 'pending') return false;
      if (rekapStatusFilter === 'paid' && t.payment_status !== 'paid') return false;

      // Search Filter
      if (rekapSearch.trim()) {
        const q = rekapSearch.toLowerCase();
        const matchName = (t.full_name || '').toLowerCase().includes(q);
        const matchKunyah = (t.nama_kunyah || '').toLowerCase().includes(q);
        const matchEmail = (t.email || '').toLowerCase().includes(q);
        const matchPhone = (t.whatsapp || '').toLowerCase().includes(q) || (t.whatsapp_display || '').includes(q);
        const matchHalaqah = (t.halaqah_name || '').toLowerCase().includes(q);
        const matchJuz = (t.chosen_juz || '').toLowerCase().includes(q);
        return matchName || matchKunyah || matchEmail || matchPhone || matchHalaqah || matchJuz;
      }

      return true;
    });
  }, [rekapData, rekapStatusFilter, rekapSearch]);

  // Filtered Verification List
  const filteredVerificationList = useMemo(() => {
    return donations.filter((d) => {
      if (verificationFilter !== 'all' && d.status !== verificationFilter) return false;
      if (verificationSearch.trim()) {
        const q = verificationSearch.toLowerCase();
        const matchName = (d.donor_name || '').toLowerCase().includes(q);
        const matchEmail = (d.user?.email || '').toLowerCase().includes(q);
        const matchPhone = (d.whatsapp || '').toLowerCase().includes(q);
        const matchNotes = (d.notes || '').toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchNotes;
      }
      return true;
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
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800 border border-emerald-100 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold uppercase tracking-wider">Thalibah Wajib Infaq</p>
              <h3 className="text-lg sm:text-xl xl:text-2xl font-black text-gray-900 mt-0.5 leading-tight">
                {rekapData?.stats.total_donasi_cohort || 0} orang
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Jalur Komitmen Donasi</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Sudah Membayar (Bulan Ini) */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl relative border-l-4 border-l-green-600">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-green-500/10 blur-xl" />
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-700 border border-green-100 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold uppercase tracking-wider">Sudah Membayar ({rekapData?.month_name})</p>
              <h3 className="text-lg sm:text-xl xl:text-2xl font-black text-emerald-950 mt-0.5 leading-tight">
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
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700 border border-amber-100 shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold uppercase tracking-wider">Menunggu Verifikasi</p>
              <h3 className="text-lg sm:text-xl xl:text-2xl font-black text-amber-950 mt-0.5 leading-tight">
                {rekapData?.stats.total_pending || 0} transaksi
              </h3>
              <p className="text-xs text-amber-700 font-semibold mt-0.5">
                {formatIDR(rekapData?.stats.amount_pending || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Belum Membayar */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl relative border-l-4 border-l-rose-500">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-rose-500/10 blur-xl" />
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-700 border border-rose-100 shrink-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold uppercase tracking-wider">Belum Membayar ({rekapData?.month_name})</p>
              <h3 className="text-lg sm:text-xl xl:text-2xl font-black text-rose-950 mt-0.5 leading-tight">
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
          {/* Controls Bar: Batch, View Switcher & Month Selectors */}
          <div className="p-5 sm:p-6 border-b border-gray-100 space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>Rekapitulasi Infaq Bulanan</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                      {rekapData?.selected_batch?.name || 'Batch Aktif'}
                    </span>
                  </h2>

                  {/* Matrix vs Monthly View Switcher */}
                  <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
                    <button
                      onClick={() => setRekapSubView('matrix')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                        rekapSubView === 'matrix' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-600 hover:text-emerald-950'
                      }`}
                      title="Lihat status ceklist semua bulan secara berdampingan"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Matrix Semua Bulan</span>
                    </button>
                    <button
                      onClick={() => setRekapSubView('monthly')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                        rekapSubView === 'monthly' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-600 hover:text-emerald-950'
                      }`}
                      title="Lihat tabel terfokus satu bulan"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Per Bulan Terpilih</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {rekapSubView === 'matrix'
                    ? 'Klik pada sel bulan mana saja untuk melihat rincian bukti transfer, tanggal transfer, drilldown riwayat, dan kirim reminder WhatsApp.'
                    : `Menampilkan status infaq thalibah untuk bulan ${rekapData?.month_name} ${selectedYear}. Klik baris thalibah untuk drilldown.`
                  }
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

                {/* Month Selector (always active or for focus) */}
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
                  onClick={() => setRekapStatusFilter('donasi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rekapStatusFilter === 'donasi' ? 'bg-white text-emerald-950 shadow-sm border border-emerald-300' : 'text-gray-600 hover:text-emerald-950'
                  }`}
                >
                  Wajib Infaq ({rekapData?.stats?.total_donasi_cohort || 0})
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
                    rekapStatusFilter === 'pengabdian' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-600 hover:text-blue-800'
                  }`}
                >
                  Jalur Pengabdian ({rekapData?.thalibah_list?.filter(x => !x.is_donasi_choice).length || 0})
                </button>
                <button
                  onClick={() => setRekapStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    rekapStatusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Semua ({rekapData?.thalibah_list?.length || 0})
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

          {/* Loading & Empty State */}
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
          ) : rekapSubView === 'matrix' ? (
            /* ========================================================================= */
            /* VIEW 1: MATRIX CROSS-TABULAR VIEW (SEMUA BULAN)                           */
            /* ========================================================================= */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-3.5 px-4 text-center w-12 bg-gray-50">No</th>
                    <th className="py-3.5 px-4 min-w-[200px] bg-gray-50">Thalibah & Kontak</th>
                    <th className="py-3.5 px-4 min-w-[150px] bg-gray-50">Halaqah</th>
                    <th className="py-3.5 px-3 text-center min-w-[90px] bg-gray-50">Komitmen</th>
                    {/* Columns for 12 months */}
                    {monthShortNames.map((mShort, idx) => {
                      const mNum = idx + 1;
                      const isCurrentSelected = mNum === selectedMonth;
                      return (
                        <th 
                          key={mShort} 
                          className={`py-3.5 px-2 text-center text-[10px] w-20 transition-colors ${
                            isCurrentSelected ? 'bg-emerald-100/70 text-emerald-950 font-black border-x border-emerald-200' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{mShort}</span>
                            {isCurrentSelected && (
                              <span className="text-[8px] bg-emerald-700 text-white px-1.5 py-0.2 rounded-full mt-0.5">Aktif</span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="py-3.5 px-4 text-center min-w-[130px] bg-gray-50 sticky right-0 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      Aksi Japri WA
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredRekapList.map((t, index) => {
                    return (
                      <tr 
                        key={t.user_id} 
                        className="hover:bg-emerald-50/40 transition-colors group"
                      >
                        {/* No */}
                        <td className="py-3.5 px-4 text-center text-gray-400 font-mono text-xs">
                          {index + 1}
                        </td>

                        {/* Thalibah Info */}
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                              {t.full_name?.charAt(0)?.toUpperCase() || 'T'}
                            </div>
                            <div className="min-w-0">
                              <button
                                onClick={() => openDrilldown(t, selectedMonth)}
                                className="text-left font-bold text-gray-900 hover:text-emerald-700 hover:underline flex items-center gap-1 group/name"
                                title="Klik untuk drilldown detail thalibah ini"
                              >
                                <span>{t.full_name}</span>
                                <ChevronRight className="w-3 h-3 text-gray-400 group-hover/name:text-emerald-700 transition-transform group-hover/name:translate-x-0.5" />
                              </button>
                              {t.nama_kunyah && (
                                <p className="text-[11px] text-gray-500 font-normal">({t.nama_kunyah})</p>
                              )}
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{t.whatsapp_display || t.whatsapp || '-'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Halaqah & Juz */}
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-gray-800 text-[11px]">{t.halaqah_name || 'Belum Ditugaskan'}</p>
                          {t.chosen_juz && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                              Juz {t.chosen_juz}
                            </span>
                          )}
                        </td>

                        {/* Komitmen Infaq */}
                        <td className="py-3.5 px-3 text-center">
                          {t.is_donasi_choice ? (
                            <div>
                              <span className="font-bold text-emerald-950 text-xs">
                                {formatIDR(t.commitment_amount)}
                              </span>
                              <p className="text-[9px] text-gray-400">/bulan</p>
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-bold">
                              Pengabdian
                            </span>
                          )}
                        </td>

                        {/* 12 Months Cells */}
                        {monthShortNames.map((mShort, idx) => {
                          const mNum = idx + 1;
                          const isCurrentSelected = mNum === selectedMonth;
                          const mDetail = t.monthly_status?.[mNum];
                          const pStatus = mDetail?.payment_status || 'unpaid';
                          const donation = mDetail?.donation || null;

                          // 1. Paid Status (Mandatory or Voluntary Pengabdian)
                          if (pStatus === 'paid') {
                            return (
                              <td 
                                key={mNum} 
                                className={`py-3 px-1 text-center ${
                                  isCurrentSelected ? 'bg-emerald-50/50 border-x border-emerald-200' : ''
                                }`}
                              >
                                <button
                                  onClick={() => openDrilldown(t, mNum)}
                                  className="w-full py-1.5 px-1 bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 rounded-lg flex flex-col items-center justify-center transition-all shadow-xs border border-emerald-300/60"
                                  title={`Bulan ${monthNames[mNum - 1]}: Lunas (${formatIDR(donation?.amount || 0)}). Klik untuk drilldown.`}
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                                  <span className="text-[9px] font-extrabold mt-0.5 leading-tight">Lunas</span>
                                </button>
                              </td>
                            );
                          }

                          // 2. Pending Status (Mandatory or Voluntary Pengabdian)
                          if (pStatus === 'pending') {
                            return (
                              <td 
                                key={mNum} 
                                className={`py-3 px-1 text-center ${
                                  isCurrentSelected ? 'bg-emerald-50/50 border-x border-emerald-200' : ''
                                }`}
                              >
                                <button
                                  onClick={() => openDrilldown(t, mNum)}
                                  className="w-full py-1.5 px-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg flex flex-col items-center justify-center transition-all shadow-xs border border-amber-300 animate-pulse"
                                  title={`Bulan ${monthNames[mNum - 1]}: Menunggu Verifikasi. Klik untuk buka bukti & setujui.`}
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                                  <span className="text-[9px] font-extrabold mt-0.5 leading-tight">Pending</span>
                                </button>
                              </td>
                            );
                          }

                          // 3. Rejected Status
                          if (pStatus === 'rejected') {
                            return (
                              <td 
                                key={mNum} 
                                className={`py-3 px-1 text-center ${
                                  isCurrentSelected ? 'bg-emerald-50/50 border-x border-emerald-200' : ''
                                }`}
                              >
                                <button
                                  onClick={() => openDrilldown(t, mNum)}
                                  className="w-full py-1.5 px-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg flex flex-col items-center justify-center transition-all border border-rose-200"
                                  title={`Bulan ${monthNames[mNum - 1]}: Ditolak. Klik untuk drilldown.`}
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                  <span className="text-[9px] font-extrabold mt-0.5 leading-tight">Ditolak</span>
                                </button>
                              </td>
                            );
                          }

                          // 4. Unpaid:
                          // If Jalur Pengabdian -> display Bebas (clickable in case they wish to view or donate)
                          if (!t.is_donasi_choice) {
                            return (
                              <td 
                                key={mNum} 
                                className={`py-3 px-1.5 text-center text-[10px] ${
                                  isCurrentSelected ? 'bg-emerald-50/50 border-x border-emerald-100' : ''
                                }`}
                              >
                                <button
                                  onClick={() => openDrilldown(t, mNum)}
                                  className="w-full py-1.5 px-1 text-gray-400 hover:text-emerald-800 hover:bg-emerald-50/50 rounded-lg text-[10px] font-mono transition-colors"
                                  title="Jalur Pengabdian (Bebas Infaq, namun boleh berdonasi sukarela)"
                                >
                                  Bebas
                                </button>
                              </td>
                            );
                          }

                          // If Mandatory Donasi Unpaid
                          return (
                            <td 
                              key={mNum} 
                              className={`py-3 px-1 text-center ${
                                isCurrentSelected ? 'bg-emerald-50/50 border-x border-emerald-200' : ''
                              }`}
                            >
                              <button
                                onClick={() => openDrilldown(t, mNum)}
                                className="w-full py-1.5 px-1 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-700 rounded-lg flex flex-col items-center justify-center transition-all border border-gray-100 hover:border-rose-200"
                                title={`Bulan ${monthNames[mNum - 1]}: Belum Bayar. Klik untuk kirim reminder WA.`}
                              >
                                <span className="text-xs text-gray-300 font-bold">✕</span>
                                <span className="text-[8px] font-semibold mt-0.5 leading-tight">Belum</span>
                              </button>
                            </td>
                          );
                        })}

                        {/* WhatsApp Action Button (Sticky Right) */}
                        <td className="py-3.5 px-4 text-center sticky right-0 bg-white group-hover:bg-emerald-50/40 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                          {t.whatsapp ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                asChild
                                size="sm"
                                className={`rounded-xl text-xs font-bold h-8 px-3 shadow-xs gap-1.5 transition-all ${
                                  t.payment_status === 'unpaid' && t.is_donasi_choice
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : t.payment_status === 'pending'
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                <a
                                  href={generateWaReminderUrl(t, selectedMonth)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Kirim Pesan WhatsApp Japri"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>{t.payment_status === 'unpaid' && t.is_donasi_choice ? 'Reminder' : 'Chat WA'}</span>
                                </a>
                              </Button>

                              <button
                                onClick={() => openDrilldown(t, selectedMonth)}
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-100 text-gray-600 hover:text-emerald-900 transition-colors"
                                title="Lihat Drilldown Detail"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No WA -</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 2: MONTHLY FOCUSED VIEW (SATU BULAN TERPILIH)                        */
            /* ========================================================================= */
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
                    <th className="py-3.5 px-6 text-right">Aksi Drilldown & WA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredRekapList.map((t, index) => {
                    const cleanUrl = getCleanProofUrl(t.donation?.proof_url);
                    return (
                      <tr 
                        key={t.user_id} 
                        className="hover:bg-gray-50/60 transition-colors cursor-pointer group"
                        onClick={() => openDrilldown(t, selectedMonth)}
                      >
                        <td className="py-4 px-6 text-gray-400 font-mono text-xs">{index + 1}</td>
                        <td className="py-4 px-6 font-semibold text-gray-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                              {t.full_name?.charAt(0)?.toUpperCase() || 'T'}
                            </div>
                            <div>
                              <p className="group-hover:text-emerald-700 font-bold transition-colors">{t.full_name}</p>
                              {t.nama_kunyah && (
                                <p className="text-xs text-gray-500 font-normal">({t.nama_kunyah})</p>
                              )}
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{t.whatsapp_display || t.whatsapp || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600 text-xs">
                          <p className="font-semibold text-gray-800">{t.halaqah_name}</p>
                          {t.chosen_juz && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                              Juz {t.chosen_juz}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {t.is_donasi_choice ? (
                            <div>
                              <span className="font-bold text-emerald-950">
                                {formatIDR(t.commitment_amount)}
                              </span>
                              <span className="text-xs text-gray-400"> /bln</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              <UserCheck className="w-3.5 h-3.5" />
                              Jalur Pengabdian
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          {t.payment_status === 'paid' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Sudah Membayar {!t.is_donasi_choice && '(Sukarela)'}
                            </span>
                          ) : t.payment_status === 'pending' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Menunggu Verifikasi {!t.is_donasi_choice && '(Sukarela)'}
                            </span>
                          ) : t.payment_status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-200">
                              <Ban className="w-3.5 h-3.5 text-rose-600" />
                              Bukti Ditolak
                            </span>
                          ) : !t.is_donasi_choice ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              Bebas Infaq (Pengabdian)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                              Belum Membayar
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          {cleanUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: cleanUrl, title: `Bukti Infaq: ${t.full_name}` })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Bukti</span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openDrilldown(t, selectedMonth)}
                              className="rounded-xl text-xs font-bold h-8 px-3 border-gray-200 hover:border-emerald-500 hover:text-emerald-900"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              <span>Drilldown</span>
                            </Button>

                            {t.whatsapp && (
                              <Button
                                asChild
                                size="sm"
                                className={`rounded-xl text-xs font-bold h-8 px-3.5 shadow-sm gap-1.5 transition-all ${
                                  t.payment_status === 'unpaid' && t.is_donasi_choice
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : t.payment_status === 'pending'
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                <a
                                  href={generateWaReminderUrl(t, selectedMonth)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Kirim Pesan WhatsApp Japri"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>{t.payment_status === 'unpaid' && t.is_donasi_choice ? 'Kirim Reminder WA' : 'Chat WA'}</span>
                                </a>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                  {filteredVerificationList.map((d) => {
                    const cleanUrl = getCleanProofUrl(d.proof_url);
                    return (
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
                        <td className="py-4 px-6 text-gray-600 text-xs" title={d.notes}>
                          {d.notes || '-'}
                        </td>
                        <td className="py-4 px-6">
                          {d.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Diterima
                            </span>
                          )}
                          {d.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                          {d.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                              <XCircle className="w-3.5 h-3.5" />
                              Ditolak
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {cleanUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl h-8 px-2.5 text-xs text-gray-600 hover:text-emerald-950"
                                onClick={() => setPreviewImage({ url: cleanUrl, title: `Bukti Infaq: ${d.donor_name}` })}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Bukti
                              </Button>
                            )}

                            {d.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setCurrentDonation(d);
                                    setActionType('approved');
                                    setNoteModalOpen(true);
                                  }}
                                  className="rounded-xl h-8 px-3 text-xs bg-emerald-800 hover:bg-emerald-900 text-white"
                                >
                                  Terima
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setCurrentDonation(d);
                                    setActionType('rejected');
                                    setNoteModalOpen(true);
                                  }}
                                  className="rounded-xl h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-50"
                                >
                                  Tolak
                                </Button>
                              </>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(d.id)}
                              className="rounded-xl h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRILLDOWN MODAL (RINCIAN PEMBAYARAN PER THALIBAH)                          */}
      {/* ========================================================================= */}
      {drilldownModalOpen && selectedThalibah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white flex justify-between items-start">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-white font-black text-lg flex items-center justify-center shrink-0 border border-white/20">
                  {selectedThalibah.full_name?.charAt(0)?.toUpperCase() || 'T'}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">{selectedThalibah.full_name}</h3>
                  {selectedThalibah.nama_kunyah && (
                    <p className="text-xs text-emerald-200">({selectedThalibah.nama_kunyah})</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                    <span className="bg-white/20 px-2.5 py-0.5 rounded-full font-medium">
                      {selectedThalibah.halaqah_name || 'Halaqah'}
                    </span>
                    {selectedThalibah.chosen_juz && (
                      <span className="bg-emerald-800/80 px-2.5 py-0.5 rounded-full font-medium">
                        Juz {selectedThalibah.chosen_juz}
                      </span>
                    )}
                    <span className="bg-amber-400/20 text-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                      Komitmen: {selectedThalibah.is_donasi_choice ? formatIDR(selectedThalibah.commitment_amount) : 'Pengabdian'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDrilldownModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Month Selector Tabs inside Modal */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Bulan Pemeriksaan</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {monthShortNames.map((mShort, idx) => {
                    const mNum = idx + 1;
                    const isSelected = drilldownMonth === mNum;
                    const mDetail = selectedThalibah.monthly_status?.[mNum];
                    const pStatus = mDetail?.payment_status || 'unpaid';

                    return (
                      <button
                        key={mShort}
                        onClick={() => setDrilldownMonth(mNum)}
                        className={`p-2 rounded-xl text-center transition-all border ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                            : 'border-gray-200 bg-gray-50 hover:bg-white text-gray-700'
                        }`}
                      >
                        <p className="text-[11px] font-bold">{mShort}</p>
                        <div className="mt-1">
                          {pStatus === 'paid' ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Lunas" />
                          ) : pStatus === 'pending' ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Pending" />
                          ) : pStatus === 'rejected' ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-rose-500" title="Ditolak" />
                          ) : (
                            <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="Belum Bayar" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Month Status Card */}
              {(() => {
                const curMonthDetail = selectedThalibah.monthly_status?.[drilldownMonth];
                const curStatus = curMonthDetail?.payment_status || 'unpaid';
                const curDonation = curMonthDetail?.donation || null;
                const cleanUrl = getCleanProofUrl(curDonation?.proof_url);

                return (
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
                      <div>
                        <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                          <span>Status Infaq {monthNames[drilldownMonth - 1]} {selectedYear}</span>
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {selectedThalibah.is_donasi_choice
                            ? `Komitmen bulanan: ${formatIDR(selectedThalibah.commitment_amount)}`
                            : 'Thalibah di jalur pengabdian (bebas infaq)'}
                        </p>
                      </div>

                      <div>
                        {!selectedThalibah.is_donasi_choice ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            Jalur Pengabdian
                          </span>
                        ) : curStatus === 'paid' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Sudah Membayar (Lunas)
                          </span>
                        ) : curStatus === 'pending' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Menunggu Verifikasi
                          </span>
                        ) : curStatus === 'rejected' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-200">
                            <Ban className="w-3.5 h-3.5 text-rose-600" />
                            Bukti Ditolak
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            Belum Membayar
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Transaction Details & Proof if exists */}
                    {curDonation ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        {/* Transaction Data */}
                        <div className="space-y-2.5 text-xs text-gray-700">
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="text-gray-500">Jumlah Transfer:</span>
                            <span className="font-bold text-emerald-950 text-sm">{formatIDR(curDonation.amount)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="text-gray-500">Tanggal Unggah:</span>
                            <span className="font-medium text-gray-900">
                              {new Date(curDonation.created_at).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Jakarta'
                              })} WIB
                            </span>
                          </div>
                          {curDonation.notes && (
                            <div className="py-1">
                              <span className="text-gray-500 block mb-0.5">Catatan Donatur:</span>
                              <p className="p-2 bg-white rounded-lg border border-gray-200 text-gray-800 font-medium">
                                {curDonation.notes}
                              </p>
                            </div>
                          )}

                          {/* Quick Actions if Pending */}
                          {curStatus === 'pending' && (
                            <div className="pt-2 flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(curDonation.id, 'approved')}
                                disabled={updatingStatus}
                                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl h-9"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Terima Bukti
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const reason = prompt('Masukkan alasan penolakan bukti transfer:', 'Bukti transfer tidak terbaca');
                                  if (reason) handleUpdateStatus(curDonation.id, 'rejected', reason);
                                }}
                                disabled={updatingStatus}
                                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold rounded-xl h-9"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Tolak
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Proof Image Box */}
                        <div className="bg-white rounded-xl p-3 border border-gray-200 flex flex-col items-center justify-center">
                          {cleanUrl ? (
                            <div className="w-full space-y-2 text-center">
                              <div 
                                onClick={() => setPreviewImage({ url: cleanUrl, title: `Bukti Infaq: ${selectedThalibah.full_name}` })}
                                className="w-full h-36 rounded-lg bg-gray-100 overflow-hidden cursor-pointer relative group border border-gray-200 flex items-center justify-center"
                              >
                                <img 
                                  src={cleanUrl} 
                                  alt="Bukti Transfer" 
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    // Fallback if image load fails
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                                  <Maximize2 className="w-4 h-4 mr-1" /> Perbesar Bukti
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: cleanUrl, title: `Bukti Infaq: ${selectedThalibah.full_name}` })}
                                className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Buka Bukti Lengkap
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Bukti transfer belum diunggah</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-gray-500 text-xs">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="font-medium">Belum ada transaksi infaq yang tercatat untuk bulan {monthNames[drilldownMonth - 1]} {selectedYear}.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* All History Timeline for this Thalibah */}
              <div>
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
                  Semua Riwayat Infaq Thalibah ({selectedThalibah.donations_history?.length || 0} Transaksi)
                </h4>
                {selectedThalibah.donations_history && selectedThalibah.donations_history.length > 0 ? (
                  <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100 max-h-52 overflow-y-auto text-xs">
                    {selectedThalibah.donations_history.map((hist) => {
                      const cleanHistUrl = getCleanProofUrl(hist.proof_url);
                      return (
                        <div key={hist.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              hist.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              hist.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {hist.status === 'approved' ? <CheckCircle className="w-4 h-4" /> :
                               hist.status === 'pending' ? <Clock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{formatIDR(hist.amount)}</p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(hist.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })} • Status: <strong className="capitalize">{hist.status}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {cleanHistUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: cleanHistUrl, title: `Bukti Infaq: ${selectedThalibah.full_name}` })}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg text-[11px] transition-colors"
                              >
                                Bukti
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Belum ada riwayat pembayaran sebelumnya.</p>
                )}
              </div>
            </div>

            {/* Modal Footer: WhatsApp Japri Button */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                <span>No. WhatsApp: </span>
                <strong className="text-gray-900 font-mono">{selectedThalibah.whatsapp_display || selectedThalibah.whatsapp || '-'}</strong>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDrilldownModalOpen(false)}
                  className="rounded-xl text-xs h-9 px-4 font-semibold"
                >
                  Tutup
                </Button>

                {selectedThalibah.whatsapp && (
                  <Button
                    asChild
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-5 font-bold shadow-md gap-2"
                  >
                    <a
                      href={generateWaReminderUrl(selectedThalibah, drilldownMonth)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Kirim Pesan WhatsApp ({monthNames[drilldownMonth - 1]})</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IMAGE PREVIEW MODAL (ZOOM BUKTI TRANSFER TANPA CRASH / LOCALHOST)          */}
      {/* ========================================================================= */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-3xl w-full max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-200">
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold truncate max-w-md">{previewImage.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1 transition-colors"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tab Baru</span>
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-950 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img 
                src={previewImage.url} 
                alt="Bukti Transfer" 
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Notes Modal (Approve / Reject) */}
      {noteModalOpen && currentDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {actionType === 'approved' ? 'Terima Infaq' : 'Tolak Infaq'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Donatur: <strong>{currentDonation.donor_name}</strong> ({formatIDR(currentDonation.amount)})
                </p>
              </div>
              <button
                onClick={() => setNoteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">
                {actionType === 'approved' ? 'Catatan Tambahan (Opsional)' : 'Alasan Penolakan (Wajib/Opsional)'}
              </Label>
              <Input
                placeholder={actionType === 'approved' ? 'Misal: Transfer valid via BSI' : 'Misal: Bukti buram/tidak sesuai nominal'}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNoteModalOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (currentDonation && actionType) {
                    handleUpdateStatus(currentDonation.id, actionType, adminNotes);
                  }
                }}
                disabled={updatingStatus}
                className={`rounded-xl text-xs h-9 px-4 font-bold text-white ${
                  actionType === 'approved'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {updatingStatus ? 'Menyimpan...' : actionType === 'approved' ? 'Ya, Terima Infaq' : 'Tolak Infaq'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
