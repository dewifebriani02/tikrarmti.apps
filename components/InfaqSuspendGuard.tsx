'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Lock, 
  HeartHandshake, 
  Copy, 
  Check, 
  Upload, 
  FileText, 
  AlertCircle, 
  Sparkles,
  PhoneCall,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { InfaqStatusData } from './InfaqReminderBanner';
import Link from 'next/link';

interface InfaqSuspendGuardProps {
  status: InfaqStatusData | null;
  user: {
    id: string;
    full_name: string;
    email: string;
    whatsapp?: string;
  };
  onStatusRefresh?: () => void;
  children: React.ReactNode;
}

export function InfaqSuspendGuard({
  status,
  user,
  onStatusRefresh,
  children
}: InfaqSuspendGuardProps) {
  const pathname = usePathname();

  // Allow unrestricted access to infaq submission, profile, settings, and alumni
  const isAllowedPath = 
    pathname.startsWith('/infaq-donasi') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/pengaturan') ||
    pathname.startsWith('/alumni') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/panel-');

  // Form states for in-modal quick upload
  const [copiedBank, setCopiedBank] = useState(false);
  const [amount, setAmount] = useState<string>(status?.commitment_amount ? String(status.commitment_amount) : '25000');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // If not suspended or on allowed path, render children normally
  if (!status || !status.is_required || !status.is_suspended || isAllowedPath) {
    return <>{children}</>;
  }

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const copyBankNumber = () => {
    navigator.clipboard.writeText('7345608197');
    setCopiedBank(true);
    toast.success('Nomor rekening BSI berhasil disalin!');
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Masukkan nominal infaq yang valid');
      return;
    }
    if (!proofUrl) {
      toast.error('Silakan unggah bukti transfer terlebih dahulu');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/alumni/donations/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          donor_name: user.full_name || 'Thalibah MTI',
          whatsapp: user.whatsapp || '',
          proof_url: proofUrl,
          notes: notes ? notes.trim() : `Infaq Bulanan ${status.month_name} ${status.current_year}`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Alhamdulillah, konfirmasi infaq berhasil dikirim! Akses aplikasi telah dibuka kembali.');
        if (onStatusRefresh) {
          onStatusRefresh();
        } else {
          window.location.reload();
        }
      } else {
        toast.error(data.error || 'Gagal mengirim konfirmasi infaq');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan koneksi saat mengirim infaq');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-2 sm:py-6 px-3 sm:px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-rose-100 overflow-hidden relative">
        {/* Top Warning Bar */}
        <div className="h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

        <div className="p-4 sm:p-6 space-y-4">
          {/* Header Section */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full inline-block">
                Akses Aplikasi Sementara Dijeda
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Konfirmasi Infaq Bulanan {status.month_name} {status.current_year}
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md">
              Afwan Ukhti <strong>{user.full_name}</strong>, batas waktu konfirmasi infaq bulanan (tgl 10 {status.month_name}) telah terlewati. Mohon unggah bukti infaq operasional sebesar <strong className="text-emerald-700 font-bold">{formatIDR(status.commitment_amount)}</strong> di bawah ini agar akses modul pembelajaran terbuka kembali otomatis.
            </p>
          </div>

          {/* Bank Info Card */}
          <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 text-white p-4 sm:p-5 rounded-2xl shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">Rekening Infaq Operasional</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-white">
                    7345608197
                  </h3>
                  <button
                    onClick={copyBankNumber}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs"
                    title="Salin nomor rekening"
                  >
                    {copiedBank ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="text-[10px] text-emerald-300 font-bold">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Salin</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-emerald-200 mt-1 font-medium">
                  Bank Syariah Indonesia (BSI) • a.n <strong>Mara Martalena</strong>
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/10 w-full sm:w-auto flex justify-between sm:block">
                <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">Nominal Komitmen</p>
                <p className="text-lg sm:text-xl font-black text-amber-300">
                  {formatIDR(status.commitment_amount)}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Upload Form */}
          <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50/80 p-3.5 sm:p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 pb-1 border-b border-gray-200/60">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Unggah Bukti Transfer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="guardAmount" className="text-[11px] font-bold text-gray-700">Nominal Transfer (Rp)</Label>
                <Input
                  id="guardAmount"
                  type="number"
                  placeholder="50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-xl border-gray-200 h-9 text-xs font-semibold focus:border-emerald-500 bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="guardProof" className="text-[11px] font-bold text-gray-700">Foto Bukti Transfer</Label>
                <div className="relative">
                  <input
                    id="guardProof"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingProof}
                  />
                  <label
                    htmlFor="guardProof"
                    className={`flex items-center justify-center gap-1.5 w-full h-9 px-3 rounded-xl border border-dashed border-emerald-300 hover:border-emerald-600 bg-white hover:bg-emerald-50 text-xs font-medium text-gray-700 cursor-pointer transition-colors shadow-sm ${
                      uploadingProof ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {uploadingProof ? (
                      <span className="flex items-center gap-1.5 text-emerald-800 text-[11px]">
                        <div className="w-3 h-3 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
                        Mengunggah...
                      </span>
                    ) : proofUrl ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold truncate text-[11px]">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {proofFile ? proofFile.name : 'Bukti Terpilih'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                        <Upload className="w-3.5 h-3.5" />
                        Pilih Gambar / PDF
                      </span>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="guardNotes" className="text-[11px] font-bold text-gray-700">Catatan (Opsional)</Label>
              <Input
                id="guardNotes"
                placeholder={`Infaq ${status.month_name} ${status.current_year} - ${user.full_name}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl border-gray-200 h-9 text-xs focus:border-emerald-500 bg-white"
              />
            </div>

            <Button
              type="submit"
              disabled={uploadingProof || submitting || !proofUrl}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl h-10 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all gap-2 mt-1"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses & Membuka Akses...</span>
                </>
              ) : (
                <>
                  <span>Kirim Bukti & Buka Akses Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Actions / Help */}
          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <Link
              href="/infaq-donasi"
              className="hover:text-emerald-800 underline font-semibold transition-colors text-[11px]"
            >
              Buka Halaman Infaq Lengkap
            </Link>

            <a
              href="https://wa.me/6281234567890?text=Assalamu%27alaikum%20Admin%20MTI,%20saya%20ingin%20konfirmasi%20terkait%20infaq%20bulanan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-medium text-[11px]"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
              <span>Butuh Bantuan / Dispensasi?</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
