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
  Ban
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

export function AdminDonationsTab() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Note Modal States
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [currentDonation, setCurrentDonation] = useState<Donation | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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
      } else {
        toast.error(data.error || 'Gagal menghapus catatan infaq');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  const totalAll = useMemo(() => {
    return donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  }, [donations]);

  const totalApproved = useMemo(() => {
    return donations
      .filter(d => d.status === 'approved')
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  }, [donations]);

  const totalPending = useMemo(() => {
    return donations
      .filter(d => d.status === 'pending')
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  }, [donations]);

  const totalRejected = useMemo(() => {
    return donations
      .filter(d => d.status === 'rejected')
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  }, [donations]);

  const approvedCount = donations.filter(d => d.status === 'approved').length;
  const pendingCount = donations.filter(d => d.status === 'pending').length;
  const rejectedCount = donations.filter(d => d.status === 'rejected').length;

  const filteredDonations = useMemo(() => {
    return donations.filter(d => {
      const matchesFilter = filter === 'all' || d.status === filter;
      if (!matchesFilter) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        d.donor_name?.toLowerCase().includes(query) ||
        d.user?.full_name?.toLowerCase().includes(query) ||
        d.user?.email?.toLowerCase().includes(query) ||
        d.whatsapp?.toLowerCase().includes(query) ||
        d.notes?.toLowerCase().includes(query)
      );
    });
  }, [donations, filter, searchQuery]);

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-emerald-800"></div>
        <p className="text-gray-500 font-medium text-sm">Memuat Data Infaq Bulanan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Seluruh Infaq Diajukan */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl relative border-l-4 border-l-emerald-600">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-emerald-500/10 blur-xl" />
          <CardContent className="p-5 sm:p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800 border border-emerald-100 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Total Seluruh Infaq</p>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 truncate">{formatIDR(totalAll)}</h3>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">{donations.length} total transaksi</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Disetujui */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl relative border-l-4 border-l-green-600">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-green-500/10 blur-xl" />
          <CardContent className="p-5 sm:p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-700 border border-green-100 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Infaq Disetujui</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mt-1 truncate">{formatIDR(totalApproved)}</h3>
              <p className="text-xs text-green-700 font-semibold mt-0.5">{approvedCount} transaksi berhasil</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Menunggu Verifikasi */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl relative border-l-4 border-l-amber-500">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-amber-500/10 blur-xl" />
          <CardContent className="p-5 sm:p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700 border border-amber-100 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Menunggu Verifikasi</p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-950 mt-1 truncate">{pendingCount} transaksi</h3>
              <p className="text-xs text-amber-700 font-semibold mt-0.5">{formatIDR(totalPending)} pending</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Ditolak */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl relative border-l-4 border-l-rose-500">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-rose-500/10 blur-xl" />
          <CardContent className="p-5 sm:p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-700 border border-rose-100 shrink-0">
              <Ban className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Infaq Ditolak</p>
              <h3 className="text-xl sm:text-2xl font-black text-rose-950 mt-1 truncate">{rejectedCount} transaksi</h3>
              <p className="text-xs text-rose-700 font-semibold mt-0.5">{formatIDR(totalRejected)} ditolak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Riwayat Infaq Bulanan</h2>
            <p className="text-xs text-gray-500 mt-0.5">Verifikasi laporan bukti transfer pembayaran infaq bulanan dari thalibah & alumni MTI.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Cari donatur / WA / catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-gray-200 focus:border-emerald-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'all' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-600 hover:text-emerald-950'
                }`}
              >
                Semua ({donations.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'pending' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-600 hover:text-emerald-950'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'approved' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-600 hover:text-emerald-950'
                }`}
              >
                Berhasil ({approvedCount})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'rejected' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-600 hover:text-emerald-950'
                }`}
              >
                Ditolak ({rejectedCount})
              </button>
            </div>
          </div>
        </div>

        {filteredDonations.length === 0 ? (
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
                {filteredDonations.map((d) => (
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

      {/* Action Notes Modal */}
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

