'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from 'sonner';
import { uploadFileWithFallback } from '@/lib/image-compress';
import { 
  HeartHandshake, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Copy, 
  Check, 
  Send, 
  Upload, 
  Plus, 
  ChevronDown,
  Sparkles,
  Info,
  HelpCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

interface Donation {
  id: string;
  amount: number;
  donor_name: string;
  whatsapp: string;
  proof_url: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  created_at: string;
}

export default function InfaqDonasiPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donorName, setDonorName] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submittingDonation, setSubmittingDonation] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // Form collapse & Success Modal states
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<{
    amount: number;
    donor_name: string;
    proof_url: string;
    created_at: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setDonorName(user.full_name || '');
      setWhatsapp(user.whatsapp || '');
      fetchDonations();
    }
  }, [user]);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/alumni/donations/my');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : (Array.isArray(data.data?.rows) ? data.data.rows : []);
          setDonations(list);
          if (list.length > 0 && list.some((d: Donation) => d.status === 'pending')) {
            setIsFormOpen(false);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching donations:', err);
      toast.error('Gagal memuat riwayat donasi');
    } finally {
      setLoading(false);
    }
  };

  const copyBankNumber = () => {
    navigator.clipboard.writeText('7345608197');
    setCopiedBank(true);
    toast.success('Nomor rekening disalin ke clipboard');
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 25MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      toast.error('Format file harus berupa JPG, PNG, atau PDF');
      return;
    }

    try {
      setUploadingProof(true);
      setProofFile(file);

      const { publicUrl } = await uploadFileWithFallback(file, {
        bucket: 'documents',
        subfolder: 'donations',
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8
      });

      setProofUrl(publicUrl);
      toast.success('Bukti transfer berhasil diunggah');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(`Gagal mengunggah file: ${err.message || err}`);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawDigits = donationAmount.replace(/\D/g, '');
    let parsedAmount = Number(rawDigits);
    
    if (parsedAmount > 0 && parsedAmount < 1000) {
      parsedAmount = parsedAmount * 1000;
    }

    if (!parsedAmount || parsedAmount < 1000) {
      toast.error('Masukkan jumlah donasi minimal Rp 1.000');
      return;
    }
    if (!donorName.trim()) {
      toast.error('Nama donatur wajib diisi');
      return;
    }
    if (!proofUrl) {
      toast.error('Silakan unggah bukti transfer terlebih dahulu');
      return;
    }

    try {
      setSubmittingDonation(true);
      const res = await fetch('/api/alumni/donations/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          donor_name: donorName.trim(),
          whatsapp: whatsapp ? whatsapp.trim() : '',
          proof_url: proofUrl,
          notes: notes ? notes.trim() : ''
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastSubmitted({
          amount: parsedAmount,
          donor_name: donorName.trim(),
          proof_url: proofUrl,
          created_at: new Date().toISOString()
        });

        setShowSuccessModal(true);
        setIsFormOpen(false);
        toast.success('Alhamdulillah, konfirmasi donasi berhasil dikirim!');

        setDonationAmount('');
        setNotes('');
        setProofFile(null);
        setProofUrl('');

        fetchDonations();
      } else {
        toast.error(data.error || 'Gagal mengirim konfirmasi donasi');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat mengirim konfirmasi');
    } finally {
      setSubmittingDonation(false);
    }
  };

  const formatIDR = (num: any) => {
    const val = Number(num) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDateSafe = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta'
      });
    } catch {
      return String(dateStr);
    }
  };

  if (loading && (!donations || donations.length === 0)) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] py-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-900 mx-auto mb-4"></div>
          <p className="text-green-900 font-medium text-xs">Memuat Halaman Infaq & Donasi...</p>
        </div>
      </div>
    );
  }

  const approvedTotal = (donations || [])
    .filter(d => d.status === 'approved')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const pendingDonation = (donations || []).find(d => d.status === 'pending');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadeInUp pb-24 font-sans">
      <Toaster position="top-right" richColors />

      {/* ========================================================================= */}
      {/* POPUP MODAL: SUKSES KONFIRMASI INFAQ                                      */}
      {/* ========================================================================= */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full p-0 overflow-hidden rounded-3xl border border-emerald-100 shadow-2xl">
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
          <div className="p-6 sm:p-7 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
              <CheckCircle className="w-9 h-9 animate-bounce" />
            </div>

            <DialogHeader className="space-y-1.5 text-center">
              <DialogTitle className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Alhamdulillah, Berhasil! 🎉
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Bukti transfer infaq Ukhti telah berhasil terkirim ke sistem dan sedang dalam antrean verifikasi oleh tim admin.
              </DialogDescription>
            </DialogHeader>

            {lastSubmitted && (
              <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-2xl p-4 text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Nominal Infaq</span>
                  <span className="font-extrabold text-emerald-950 text-base">
                    {formatIDR(lastSubmitted.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Atas Nama</span>
                  <span className="font-semibold text-gray-800">{lastSubmitted.donor_name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Status</span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full text-[10px]">
                    <Clock className="w-3 h-3" /> Menunggu Verifikasi
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-green-900 hover:bg-green-800 text-white rounded-xl py-3 text-xs sm:text-sm font-bold shadow-md shadow-emerald-200"
              >
                Lihat Riwayat Donasi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 1. Header Halaman (Standar Jurnal Harian) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Infaq & Donasi Dakwah
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h1>
            <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest leading-none mt-1">
              Markaz Tikrar Indonesia
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-2xl shadow-sm">
            <span className="text-xs">💛</span>
            <span className="text-xs font-black uppercase tracking-wider">
              Jariyah Santri
            </span>
          </div>
        </div>

        {/* 2. Hero Status Card (Gradien Hijau Tua Elegan) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-4 sm:p-5 text-white shadow-lg border border-white/10">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                <HeartHandshake className="w-5 h-5 text-green-200" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Total Kontribusi Ukhti
                </h2>
                <p className="text-green-100/70 text-[10px] font-black uppercase tracking-tighter">
                  {formatIDR(approvedTotal)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 text-green-100 px-2.5 py-1 rounded-lg border border-white/10">
                {donations.filter(d => d.status === 'approved').length} Transaksi Terverifikasi
              </span>
            </div>
          </div>

          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-yellow-400/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-green-400/5 rounded-full blur-2xl" />
        </div>
      </div>

      {/* 3. Banner Edukasi & Rekening Bank Resmi */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-900 leading-tight">
              Rekening Resmi Operasional Dakwah MTI
            </p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              Disalurkan untuk operasional kelas, Zoom harian, dan beasiswa Mu'allimah.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
            Bank BSI
          </span>
        </div>
      </div>

      {/* 4. Kartu Rekening BSI */}
      <Card className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-900 text-white flex items-center justify-center font-black text-xs shadow-sm">
              BSI
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 leading-none">Bank Syariah Indonesia</p>
              <p className="text-[10px] text-gray-500 mt-1">a.n. Mara Martalena / Markaz Tikrar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={copyBankNumber}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-900 rounded-xl text-xs font-bold border border-green-200/60 transition-all cursor-pointer shadow-xs"
          >
            {copiedBank ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedBank ? 'Tersalin' : 'Salin Rekening'}</span>
          </button>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-500">Nomor Rekening:</span>
          <span className="text-sm font-black text-gray-900 font-mono tracking-wider">7345608197</span>
        </div>
      </Card>

      {/* 5. Status Pending Terakhir (Bila Form Tertutup) */}
      {!isFormOpen && (
        <Card className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white space-y-3 border-l-4 border-l-emerald-600">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Konfirmasi Infaq Terkirim
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Bukti transfer sedang dalam antrean verifikasi tim admin.
                </p>
              </div>
            </div>
            {pendingDonation && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" /> Verifikasi
              </span>
            )}
          </div>

          {(lastSubmitted || pendingDonation) && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex justify-between items-center text-xs">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nominal Diajukan</p>
                <p className="text-base font-black text-gray-900 mt-0.5">
                  {formatIDR(lastSubmitted?.amount || pendingDonation?.amount || 0)}
                </p>
              </div>
              {(lastSubmitted?.proof_url || pendingDonation?.proof_url) && (
                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8 border-gray-200">
                  <a href={lastSubmitted?.proof_url || pendingDonation?.proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Bukti
                  </a>
                </Button>
              )}
            </div>
          )}

          <Button
            onClick={() => setIsFormOpen(true)}
            className="w-full bg-green-900 hover:bg-green-800 text-white rounded-xl text-xs font-bold h-9 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kirim Infaq / Donasi Lagi</span>
          </Button>
        </Card>
      )}

      {/* 6. Formulir Konfirmasi Transfer */}
      {isFormOpen && (
        <Card className="rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                Konfirmasi Transfer Infaq
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Unggah bukti transfer untuk pencatatan dan verifikasi admin.
              </p>
            </div>
            {donations.length > 0 && (
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all shrink-0 cursor-pointer"
              >
                Tutup Form
              </button>
            )}
          </div>

          <form onSubmit={handleDonationSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="donorName" className="text-xs font-bold text-gray-700">Nama Donatur</Label>
                <Input
                  id="donorName"
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Nama lengkap Ukhti"
                  className="rounded-xl border-gray-200 text-xs focus:border-green-800"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp" className="text-xs font-bold text-gray-700">Nomor WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="rounded-xl border-gray-200 text-xs focus:border-green-800"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-bold text-gray-700">Nominal Infaq / Donasi</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['25.000', '50.000', '100.000', '200.000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDonationAmount(preset)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                      donationAmount === preset
                        ? "bg-green-900 text-white border-green-900 shadow-sm"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-green-50 hover:border-green-300"
                    )}
                  >
                    Rp {preset}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Rp</span>
                <Input
                  id="amount"
                  type="text"
                  value={donationAmount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (!digits) {
                      setDonationAmount('');
                    } else {
                      const formatted = new Intl.NumberFormat('id-ID').format(Number(digits));
                      setDonationAmount(formatted);
                    }
                  }}
                  placeholder="25.000"
                  className="rounded-xl border-gray-200 focus:border-green-800 pl-9 font-bold text-xs text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Unggah Bukti Transfer</Label>
              <div className="flex items-center gap-2.5">
                <label className="flex-1 flex items-center justify-between px-3.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl cursor-pointer transition-all">
                  <span className="text-xs truncate max-w-[200px]">
                    {proofFile ? proofFile.name : 'Pilih file struk/tangkapan layar...'}
                  </span>
                  <Upload className="w-4 h-4 text-gray-400" />
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {uploadingProof && (
                  <div className="w-4 h-4 animate-spin rounded-full border-b-2 border-green-900 shrink-0" />
                )}
                {proofUrl && (
                  <span className="text-emerald-700 flex items-center gap-1 text-xs font-semibold shrink-0">
                    <CheckCircle className="w-4 h-4" /> Siap
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-bold text-gray-700">Catatan Tambahan (Opsional)</Label>
              <Textarea
                id="notes"
                placeholder="Misal: untuk beasiswa mu'allimah atau operasional Zoom"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl border-gray-200 text-xs focus:border-green-800 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submittingDonation || uploadingProof}
              className="w-full bg-green-900 hover:bg-green-800 text-white rounded-xl py-5 font-bold text-xs shadow-md shadow-green-900/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {submittingDonation ? (
                <>
                  <div className="w-3.5 h-3.5 animate-spin rounded-full border-b-2 border-white" />
                  <span>Mengirim Konfirmasi...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Konfirmasi Infaq</span>
                </>
              )}
            </Button>
          </form>
        </Card>
      )}

      {/* 7. Riwayat Donasi */}
      <Card className="rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 bg-white space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Riwayat Infaq Ukhti</h3>
            <p className="text-[11px] text-gray-500">Catatan pengajuan infaq yang telah tercatat di sistem.</p>
          </div>
          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {donations.length} Transaksi
          </span>
        </div>

        {donations.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">
            Belum ada riwayat infaq yang diajukan.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {donations.map((don) => (
              <div key={don.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{formatIDR(don.amount)}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <span>{don.donor_name}</span>
                    <span>•</span>
                    <span>{formatDateSafe(don.created_at)}</span>
                  </p>
                  {don.notes && (
                    <p className="text-[11px] text-gray-600 mt-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                      "{don.notes}"
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0">
                  <Button asChild variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs h-7 px-2">
                    <a href={don.proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Bukti
                    </a>
                  </Button>
                  <div>
                    {don.status === 'approved' && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Berhasil
                      </span>
                    )}
                    {don.status === 'rejected' && (
                      <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Ditolak
                      </span>
                    )}
                    {don.status === 'pending' && (
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Verifikasi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 8. FAQ Donasi Ringkas */}
      <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl space-y-1.5">
        <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
          Penyaluran Infaq Dakwah
        </p>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Seluruh infaq yang Ukhti salurkan dipergunakan untuk operasional dakwah Markaz Tikrar Indonesia, langganan Zoom kelas harian, beasiswa mu'allimah, serta pemeliharaan server aplikasi. Jazakunnallahu khairan atas kebaikan Ukhti.
        </p>
      </div>
    </div>
  );
}
