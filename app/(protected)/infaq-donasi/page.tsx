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
  ArrowLeft,
  Plus,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Link from 'next/link';

// Import from components/ui/button
import { Button as UIButton } from "@/components/ui/button";

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
          // If user already has a pending donation from today/recently, default form to collapsed
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
    toast.success('Nomor rekening disalin');
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow larger photos since client-side compression will downsize them
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
    
    // Auto-correct if user typed shorthand like '25' or '50' for ribuan
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
        // 1. Save last submitted summary for modal & closed state
        setLastSubmitted({
          amount: parsedAmount,
          donor_name: donorName.trim(),
          proof_url: proofUrl,
          created_at: new Date().toISOString()
        });

        // 2. Open prominent Success Modal
        setShowSuccessModal(true);

        // 3. Close the form
        setIsFormOpen(false);

        // 4. Trigger Toast
        toast.success('Alhamdulillah, konfirmasi donasi berhasil dikirim!');

        // 5. Reset input fields
        setDonationAmount('');
        setNotes('');
        setProofFile(null);
        setProofUrl('');

        // 6. Refresh history list
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
        month: 'long',
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-800 mx-auto mb-4"></div>
          <p className="text-emerald-800 font-medium font-sans">Memuat Halaman Infaq & Donasi...</p>
        </div>
      </div>
    );
  }

  const approvedTotal = (donations || [])
    .filter(d => d.status === 'approved')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const pendingDonation = (donations || []).find(d => d.status === 'pending');

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-12 px-4 sm:px-6 lg:px-8 font-sans">
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

            {/* Receipt Summary Card */}
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

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <UIButton
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl py-3 text-xs sm:text-sm font-bold shadow-md shadow-emerald-200"
              >
                Lihat Riwayat Donasi
              </UIButton>
              <UIButton
                asChild
                variant="outline"
                className="w-full border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl py-3 text-xs sm:text-sm font-semibold"
              >
                <Link href="/dashboard">
                  Ke Dashboard
                </Link>
              </UIButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-5xl mx-auto">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-emerald-850 to-emerald-700 bg-emerald-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl mb-10 overflow-hidden relative">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-44 h-44 rounded-full bg-emerald-800/30 blur-2xl" />
          <div className="absolute left-1/3 bottom-0 translate-y-10 w-60 h-60 rounded-full bg-emerald-600/10 blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md"
                  title="Kembali ke Dashboard"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <span className="bg-emerald-800/60 border border-emerald-600 text-emerald-100 text-xs font-semibold px-3 py-1.5 rounded-full tracking-wide uppercase">
                  Kontribusi Dakwah
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">Infaq & Donasi</h1>
              <p className="text-emerald-100/90 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
                Salurkan kontribusi terbaik Ukhti untuk operasional dakwah, kelas harian, beasiswa mu'allimah, dan pemeliharaan server Markaz Tikrar Indonesia.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
                <HeartHandshake className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="text-xs text-emerald-250 font-bold uppercase tracking-wider">Total Donasi Ukhti</p>
                <p className="text-lg font-black mt-0.5">
                  {formatIDR(approvedTotal)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form / Success Card Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* 1. COLLAPSED SUCCESS / ACTIVE STATUS CARD (When form is closed) */}
            {!isFormOpen && (
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white border-l-4 border-l-emerald-600">
                <CardHeader className="p-6 sm:p-7 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900">
                          Konfirmasi Infaq Terkirim
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Bukti transfer Ukhti sedang dalam proses verifikasi tim admin MTI.
                        </CardDescription>
                      </div>
                    </div>
                    {pendingDonation && (
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0">
                        <Clock className="w-3.5 h-3.5" /> Proses Verifikasi
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6 sm:p-7 pt-2 space-y-4">
                  {(lastSubmitted || pendingDonation) && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Nominal Terakhir Diajukan</p>
                        <p className="text-xl font-black text-gray-900 mt-0.5">
                          {formatIDR(lastSubmitted?.amount || pendingDonation?.amount || 0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDateSafe(lastSubmitted?.created_at || pendingDonation?.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(lastSubmitted?.proof_url || pendingDonation?.proof_url) && (
                          <UIButton asChild variant="outline" size="sm" className="rounded-xl text-xs h-9 border-gray-200">
                            <a href={lastSubmitted?.proof_url || pendingDonation?.proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" /> Lihat Bukti
                            </a>
                          </UIButton>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <UIButton
                      onClick={() => setIsFormOpen(true)}
                      className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold h-10 px-4 flex items-center gap-2 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Kirim Infaq / Donasi Lagi</span>
                    </UIButton>

                    <UIButton
                      asChild
                      variant="outline"
                      className="rounded-xl text-xs sm:text-sm font-semibold h-10 px-4 border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <Link href="/dashboard">
                        Kembali ke Dashboard
                      </Link>
                    </UIButton>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2. DONATION FORM CARD (When form is open) */}
            {isFormOpen && (
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-gray-50 pb-6 p-6 sm:p-8 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Konfirmasi Donasi Operasional</CardTitle>
                    <CardDescription className="mt-1">
                      Kirimkan konfirmasi transfer donasi Ukhti untuk keperluan operasional dakwah Markaz Tikrar Indonesia.
                    </CardDescription>
                  </div>
                  {donations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all shrink-0"
                    >
                      Tutup Form
                    </button>
                  )}
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                  <form onSubmit={handleDonationSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Donor Name */}
                      <div className="space-y-2">
                        <Label htmlFor="donorName" className="text-sm font-semibold text-gray-700">Nama Donatur</Label>
                        <Input
                          id="donorName"
                          type="text"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          placeholder="Masukkan nama donatur"
                          className="rounded-xl border-gray-200 focus:border-emerald-500"
                        />
                      </div>
                      
                      {/* Whatsapp */}
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp" className="text-sm font-semibold text-gray-700">Nomor Whatsapp</Label>
                        <Input
                          id="whatsapp"
                          type="text"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="Contoh: 08123456789"
                          className="rounded-xl border-gray-200 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Amount */}
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-sm font-semibold text-gray-700">Nominal Infaq / Donasi (IDR)</Label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {['25.000', '50.000', '100.000', '200.000'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setDonationAmount(preset)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                donationAmount === preset
                                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50 hover:border-emerald-300'
                              }`}
                            >
                              Rp {preset}
                            </button>
                          ))}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">Rp</span>
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
                            className="rounded-xl border-gray-200 focus:border-emerald-500 pl-10 font-bold text-gray-900"
                          />
                        </div>
                        {donationAmount && Number(donationAmount.replace(/\D/g, '')) > 0 && Number(donationAmount.replace(/\D/g, '')) < 1000 && (
                          <p className="text-[11px] text-amber-600 font-medium">
                            * Otomatis dihitung sebagai Rp {new Intl.NumberFormat('id-ID').format(Number(donationAmount.replace(/\D/g, '')) * 1000)}
                          </p>
                        )}
                      </div>

                      {/* Proof Upload */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">Unggah Bukti Transfer</Label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 flex items-center justify-between px-4 py-2.5 bg-white border border-gray-250 hover:bg-gray-50 text-gray-650 rounded-xl cursor-pointer transition-all">
                            <span className="text-xs truncate max-w-[180px]">
                              {proofFile ? proofFile.name : 'Pilih file (Max 25MB)...'}
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
                            <div className="w-5 h-5 animate-spin rounded-full border-b-2 border-emerald-800" />
                          )}
                          {proofUrl && (
                            <span className="text-emerald-700 flex items-center gap-1 text-xs font-semibold shrink-0">
                              <CheckCircle className="w-4 h-4" /> Ready
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">Catatan Tambahan (Opsional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Masukkan catatan jika ada (contoh: untuk beasiswa mu'allimah)"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="rounded-xl border-gray-200 focus:border-emerald-500 resize-none"
                      />
                    </div>

                    <UIButton
                      type="submit"
                      disabled={submittingDonation || uploadingProof}
                      className="w-full bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl py-6 font-semibold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                    >
                      {submittingDonation ? (
                        <>
                          <div className="w-4 h-4 animate-spin rounded-full border-b-2 border-white" />
                          Mengirim Konfirmasi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Kirim Konfirmasi Transfer
                        </>
                      )}
                    </UIButton>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Donation History Card */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-50 pb-6 p-6 sm:p-8">
                <CardTitle className="text-xl font-bold text-gray-900">Riwayat Donasi</CardTitle>
                <CardDescription>Catatan kontribusi operasional yang sudah Ukhti ajukan.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {donations.length === 0 ? (
                  <div className="text-center py-12 text-gray-450 text-sm font-sans">
                    Belum ada riwayat donasi yang diajukan.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto font-sans">
                    {donations.map((don) => (
                      <div key={don.id} className="p-6 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <p className="font-bold text-gray-900 text-base">{formatIDR(don.amount)}</p>
                          <p className="text-xs text-gray-450 mt-1 flex items-center gap-1.5">
                            <span>Atas nama: {don.donor_name}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span>{formatDateSafe(don.created_at)}</span>
                          </p>
                          {don.notes && (
                            <p className="text-xs text-gray-550 mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 max-w-lg">
                              "{don.notes}"
                            </p>
                          )}
                          {don.status === 'rejected' && don.notes && (
                            <p className="text-xs text-red-655 mt-1.5 font-medium">
                              Catatan admin: {don.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <UIButton asChild variant="outline" size="sm" className="border-gray-250 text-gray-650 hover:bg-gray-100 rounded-lg text-xs h-8">
                            <a href={don.proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Bukti
                            </a>
                          </UIButton>
                          <div>
                            {don.status === 'approved' && (
                              <span className="bg-emerald-55 text-emerald-700 border border-emerald-100 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Berhasil
                              </span>
                            )}
                            {don.status === 'rejected' && (
                              <span className="bg-red-50 text-red-700 border border-red-100 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Ditolak
                              </span>
                            )}
                            {don.status === 'pending' && (
                              <span className="bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Proses Verifikasi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bank Info / FAQ Column */}
          <div className="space-y-6">
            {/* Bank Transfer Info Card */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-b from-emerald-55 to-white pb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-emerald-800" />
                  Informasi Rekening Transfer
                </h3>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-6">
                <div className="bg-emerald-900/5 border border-emerald-900/10 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-5 -translate-x-2 translate-y-2">
                    <HeartHandshake className="w-24 h-24 text-emerald-950" />
                  </div>
                  
                  <p className="text-xs text-emerald-800 font-semibold tracking-wider uppercase font-sans">Nama Bank</p>
                  <p className="font-extrabold text-emerald-950 text-lg mt-0.5 font-sans">Bank Syariah Indonesia (BSI)</p>
                  
                  <p className="text-xs text-emerald-800 font-semibold tracking-wider uppercase mt-4 font-sans">Nomor Rekening</p>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="font-extrabold text-emerald-950 text-xl tracking-wide font-sans">7345608197</p>
                    <button
                      onClick={copyBankNumber}
                      type="button"
                      className="p-2 bg-white hover:bg-emerald-50 text-emerald-900 rounded-xl transition-all border border-emerald-900/10 shadow-sm"
                    >
                      {copiedBank ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-xs text-emerald-800 font-semibold tracking-wider uppercase mt-4 font-sans">Nama Pemilik Rekening</p>
                  <p className="font-bold text-emerald-950 mt-0.5 font-sans">Mara Martalena</p>
                </div>

                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-900 text-xs leading-relaxed font-sans">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p>
                    Mohon pastikan jumlah transfer sesuai dengan nominal donasi Ukhti. Pengiriman bukti transfer sangat penting untuk pencatatan laporan keuangan Yayasan.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Donation FAQ Card */}
            <Card className="border-0 shadow-md rounded-2xl bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold text-gray-900 uppercase tracking-wide">FAQ Donasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-gray-650 leading-relaxed font-sans">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Ke mana donasi operasional disalurkan?</h4>
                  <p>Donasi Ukhti disalurkan sepenuhnya untuk biaya penyediaan Zoom premium kelas harian, pemeliharaan server website, beasiswa mu'allimah, serta pengembangan sarana prasarana dakwah Markaz Tikrar Indonesia.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Berapa minimal donasi?</h4>
                  <p>Tidak ada batas minimal. Berapapun dukungan ikhlas yang Ukhti berikan, insyaAllah sangat bernilai di sisi Allah Subhanahu wa Ta'ala sebagai sedekah jariyah.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
