'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Copy, 
  Check, 
  Upload, 
  PhoneCall, 
  ArrowRight, 
  ShieldAlert,
  X,
  BookOpen
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  // Dialog open state
  const [isOpen, setIsOpen] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [amount, setAmount] = useState<string>('50000');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status?.commitment_amount) {
      setAmount(String(status.commitment_amount));
    }
  }, [status?.commitment_amount]);

  // Check if popup was dismissed in current session
  useEffect(() => {
    if (!status || !status.is_required || !status.is_suspended || status.has_paid) {
      setIsOpen(false);
      return;
    }

    const sessionKey = `mti_infaq_popup_dismissed_${status.month_name}_${status.current_year}`;
    const isDismissed = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null;
    
    // Don't auto-open on allowed routes
    const isAllowedPath = 
      pathname.startsWith('/infaq-donasi') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/pengaturan') ||
      pathname.startsWith('/alumni') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/panel-');

    if (!isDismissed && !isAllowedPath) {
      setIsOpen(true);
    }
  }, [status, pathname]);

  const handleClose = () => {
    setIsOpen(false);
    if (status) {
      const sessionKey = `mti_infaq_popup_dismissed_${status.month_name}_${status.current_year}`;
      try {
        sessionStorage.setItem(sessionKey, 'true');
      } catch (e) {
        console.error(e);
      }
    }
  };

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
          notes: notes ? notes.trim() : `Infaq Bulanan ${status?.month_name} ${status?.current_year}`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Alhamdulillah, konfirmasi infaq berhasil dikirim! Syukron jazakillahu khayran.');
        setIsOpen(false);
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
    <>
      {/* Render children normally without blocking */}
      {children}

      {/* Dismissible Reminder Dialog Popup */}
      {status && status.is_suspended && (
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) handleClose();
          else setIsOpen(true);
        }}>
          <DialogContent className="max-w-md w-[95vw] sm:w-full p-0 overflow-hidden rounded-3xl border border-rose-100 shadow-2xl">
            {/* Top Warning Bar */}
            <div className="h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

            <div className="p-4 sm:p-5 space-y-3.5 max-h-[88vh] overflow-y-auto">
              <DialogHeader className="space-y-1.5 text-center">
                <div className="mx-auto w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="inline-block">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    Pengingat Infaq Bulanan
                  </span>
                </div>
                <DialogTitle className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  Infaq Bulan {status.month_name} {status.current_year}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-600 leading-relaxed">
                  Afwan Ukhti <strong>{user.full_name}</strong>, batas waktu konfirmasi infaq bulanan (tanggal 10 {status.month_name}) telah terlewati. Mohon selesaikan konfirmasi infaq operasional sebesar <strong className="text-emerald-800 font-bold">{formatIDR(status.commitment_amount)}</strong>.
                </DialogDescription>
              </DialogHeader>

              {/* Bank Info Card */}
              <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 text-white p-3.5 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">Rekening Infaq Operasional</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg sm:text-xl font-mono font-bold tracking-wider text-white">
                        7345608197
                      </span>
                      <button
                        onClick={copyBankNumber}
                        className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-[11px]"
                        title="Salin nomor rekening"
                      >
                        {copiedBank ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-300" />
                            <span className="text-[10px] text-emerald-300 font-bold">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[10px]">Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-200 font-medium">
                      BSI • a.n <strong>Mara Martalena</strong>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">Nominal</p>
                    <p className="text-base sm:text-lg font-black text-amber-300">
                      {formatIDR(status.commitment_amount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Upload Form */}
              <form onSubmit={handleSubmit} className="space-y-2.5 bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="guardAmount" className="text-[11px] font-bold text-gray-700">Nominal (Rp)</Label>
                    <Input
                      id="guardAmount"
                      type="number"
                      placeholder="50000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="rounded-xl border-gray-200 h-8 text-xs font-semibold focus:border-emerald-500 bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="guardProof" className="text-[11px] font-bold text-gray-700">Bukti Transfer</Label>
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
                        className={`flex items-center justify-center gap-1.5 w-full h-8 px-2.5 rounded-xl border border-dashed border-emerald-300 hover:border-emerald-600 bg-white hover:bg-emerald-50 text-[11px] font-medium text-gray-700 cursor-pointer transition-colors shadow-sm ${
                          uploadingProof ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {uploadingProof ? (
                          <span className="flex items-center gap-1 text-emerald-800 text-[10px]">
                            <div className="w-2.5 h-2.5 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
                            Mengunggah...
                          </span>
                        ) : proofUrl ? (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold truncate text-[10px]">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            {proofFile ? proofFile.name : 'Bukti Terpilih'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-800 font-semibold text-[10px]">
                            <Upload className="w-3 h-3" />
                            Pilih Foto Bukti
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
                    className="rounded-xl border-gray-200 h-8 text-xs focus:border-emerald-500 bg-white"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={uploadingProof || submitting || !proofUrl}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl h-9 text-xs font-bold shadow-md hover:shadow-lg transition-all gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Bukti Infaq</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="rounded-xl h-9 text-xs font-bold text-gray-600 hover:text-gray-900 border-gray-200 hover:bg-gray-100 gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Tutup & Lanjutkan Belajar</span>
                  </Button>
                </div>
              </form>

              {/* Footer Actions / Help */}
              <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                <Link
                  href="/infaq-donasi"
                  onClick={handleClose}
                  className="hover:text-emerald-800 underline font-semibold transition-colors"
                >
                  Halaman Infaq Lengkap
                </Link>

                <a
                  href="https://wa.me/6281234567890?text=Assalamu%27alaikum%20Admin%20MTI,%20saya%20ingin%20konfirmasi%20terkait%20infaq%20bulanan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium"
                >
                  <PhoneCall className="w-3 h-3 text-emerald-600" />
                  <span>Bantuan / Dispensasi?</span>
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
