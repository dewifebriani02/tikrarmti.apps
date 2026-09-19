'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from 'sonner';
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
  Coins,
  ArrowLeft
} from 'lucide-react';
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
  const supabase = createClient();

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
          setDonations(data.data || []);
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

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format file harus berupa JPG, PNG, atau PDF');
      return;
    }

    try {
      setUploadingProof(true);
      setProofFile(file);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'documents');
      formData.append('subfolder', 'donations');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal mengunggah bukti transfer');
      }

      const json = await res.json();
      const publicUrl = json.data?.publicUrl || json.data?.url;

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
    if (!donationAmount || Number(donationAmount) <= 0) {
      toast.error('Masukkan jumlah donasi yang valid');
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
          amount: Number(donationAmount),
          donor_name: donorName,
          whatsapp,
          proof_url: proofUrl,
          notes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Konfirmasi donasi berhasil dikirim!');
        // Reset form
        setDonationAmount('');
        setNotes('');
        setProofFile(null);
        setProofUrl('');
        // Refresh history
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

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  if (loading && donations.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] py-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-800 mx-auto mb-4"></div>
          <p className="text-emerald-800 font-medium font-sans">Memuat Halaman Infaq & Donasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <Toaster position="top-right" richColors />
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
                  {formatIDR(donations.filter(d => d.status === 'approved').reduce((sum, d) => sum + d.amount, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Donation Form Card */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-50 pb-6 p-6 sm:p-8">
                <CardTitle className="text-xl font-bold text-gray-900">Konfirmasi Donasi Operasional</CardTitle>
                <CardDescription>
                  Kirimkan konfirmasi transfer donasi Ukhti untuk keperluan operasional dakwah Markaz Tikrar Indonesia.
                </CardDescription>
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
                      <Label htmlFor="amount" className="text-sm font-semibold text-gray-700">Nominal Donasi (IDR)</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="1"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        placeholder="Contoh: 100000"
                        className="rounded-xl border-gray-200 focus:border-emerald-500"
                      />
                    </div>

                    {/* Proof Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Unggah Bukti Transfer</Label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-between px-4 py-2.5 bg-white border border-gray-250 hover:bg-gray-50 text-gray-650 rounded-xl cursor-pointer transition-all">
                          <span className="text-xs truncate max-w-[180px]">
                            {proofFile ? proofFile.name : 'Pilih file (Max 5MB)...'}
                          </span>
                          <Upload className="w-4 h-4 text-gray-400" />
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                        {uploadingProof && (
                          <div className="w-5 h-5 animate-spin rounded-full border-b-2 border-emerald-800" />
                        )}
                        {proofUrl && (
                          <span className="text-emerald-700 flex items-center gap-1 text-xs font-semibold">
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
                            <span>{new Date(don.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}</span>
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
