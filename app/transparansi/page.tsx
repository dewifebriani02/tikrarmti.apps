'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Landmark,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  Filter,
  Search,
  Calendar,
  Layers,
  HeartHandshake,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  program_name: string;
  program_slug: string;
  description: string;
  initial_balance: number;
  current_balance: number;
  display_order: number;
}

interface PublicTransaction {
  id: string;
  accountId: string;
  programName: string;
  programSlug: string;
  accountNumber: string;
  date: string;
  dateTimeRaw: string;
  type: 'masuk' | 'keluar';
  amount: number;
  donorName: string;
  description: string;
  category: string;
  balanceAfter: number | null;
}

interface CategoryAllocation {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export default function TransparansiPublikPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedProgramSlug, setSelectedProgramSlug] = useState<string>('all');
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalTransactions: 0,
  });
  const [allocation, setAllocation] = useState<CategoryAllocation[]>([]);
  const [transactions, setTransactions] = useState<PublicTransaction[]>([]);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const fetchPublicData = async (programSlug = 'all') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (programSlug !== 'all') params.set('program', programSlug);

      const res = await fetch(`/api/finance/public?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setAccounts(json.data.accounts || []);
        setSummary(
          json.data.summary || {
            totalIncome: 0,
            totalExpense: 0,
            netBalance: 0,
            totalTransactions: 0,
          }
        );
        setAllocation(json.data.allocation || []);
        setTransactions(json.data.transactions || []);
      }
    } catch (err: any) {
      console.error('Error fetching public finance data:', err);
      toast.error('Gagal memuat data transparansi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData(selectedProgramSlug);
  }, [selectedProgramSlug]);

  const handleCopy = (accNumber: string) => {
    navigator.clipboard.writeText(accNumber);
    setCopiedAccount(accNumber);
    toast.success('Nomor rekening BSI tersalin!');
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const activeAccount =
    selectedProgramSlug !== 'all' ? accounts.find((a) => a.program_slug === selectedProgramSlug) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 text-gray-800">
      {/* 1. PUBLIC HEADER NAVBAR */}
      <header className="border-b border-gray-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-black text-sm shadow-xs">
              MTI
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-gray-900 tracking-tight block">
                Markaz Tikrar Indonesia
              </span>
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block -mt-0.5">
                Portal Transparansi Umat
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/infaq-donasi"
              className="text-xs font-bold text-gray-600 hover:text-emerald-900 px-3 py-1.5 transition-colors hidden sm:inline-block"
            >
              Infaq &amp; Donasi
            </Link>
            <Link
              href="/login"
              className="text-xs font-bold bg-emerald-900 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              Masuk Akun
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white py-12 sm:py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-extrabold">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Akuntabilitas, Kejujuran, &amp; Keterbukaan Publik</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Transparansi Donasi &amp; Laporan Kas MTI
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl mx-auto leading-relaxed">
            &ldquo;Wahai orang-orang yang beriman! Janganlah kamu mengkhianati Allah dan Rasul dan (juga) janganlah kamu
            mengkhianati amanat yang dipercayakan kepadamu, sedang kamu mengetahui.&rdquo; (QS. Al-Anfāl: 27)
          </p>

          <p className="text-[11px] text-emerald-300/90 font-medium">
            Setiap rupiah infaq dan donasi terkelola secara profesional, terpisah satu rekening BSI per program, dan
            diaudit secara berkala demi kemaslahatan dakwah Al-Qur&apos;an.
          </p>
        </div>
      </section>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 -mt-8 relative z-20">
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-3xl border-none shadow-lg bg-white overflow-hidden p-6 space-y-2">
            <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Donasi &amp; Infaq Masuk</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-mono">
              Rp {summary.totalIncome.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-gray-500">
              Dari komitmen pendaftaran, infaq murojaah, dan donatur publik
            </p>
          </Card>

          <Card className="rounded-3xl border-none shadow-lg bg-white overflow-hidden p-6 space-y-2">
            <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
              <span>Realisasi Penyaluran &amp; Operasional</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight font-mono">
              Rp {summary.totalExpense.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-gray-500">
              Kafalah mu&apos;allimah, beasiswa dhuafa, infrastruktur server &amp; Zoom
            </p>
          </Card>

          <Card className="rounded-3xl border-none shadow-lg bg-gradient-to-br from-emerald-900 to-green-950 text-white p-6 space-y-2">
            <div className="flex items-center justify-between text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <span>Saldo Kas Amanah Berjalan</span>
              <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
              Rp {summary.netBalance.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-emerald-200">
              Saldo bersih siap guna terbagi di rekening resmi BSI MTI
            </p>
          </Card>
        </div>

        {/* 4. PROGRAM TABS FILTER */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
                Pemisahan Rekening BSI per Program
              </h2>
              <p className="text-xs text-gray-500">
                Pilih tab program untuk melihat rincian kas dan nomor rekening resmi yang bersangkutan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200/80">
            <button
              type="button"
              onClick={() => setSelectedProgramSlug('all')}
              className={`py-2 px-4 rounded-xl font-bold text-xs transition-all ${
                selectedProgramSlug === 'all'
                  ? 'bg-white text-emerald-950 shadow-xs border border-gray-200/80'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semua Program ({accounts.length})
            </button>

            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setSelectedProgramSlug(acc.program_slug)}
                className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                  selectedProgramSlug === acc.program_slug
                    ? 'bg-white text-emerald-950 shadow-xs border border-gray-200/80'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{acc.program_name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. ACTIVE ACCOUNT CARD (OR MULTI ACCOUNTS) */}
        {activeAccount ? (
          <Card className="rounded-3xl border-emerald-200/80 bg-gradient-to-r from-emerald-900 to-green-900 text-white p-6 sm:p-7 shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="bg-white/10 text-emerald-200 border border-white/20 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  Rekening Resmi Program Terpilih
                </span>
                <h3 className="text-xl sm:text-2xl font-black">{activeAccount.program_name}</h3>
                <p className="text-xs text-emerald-100 max-w-xl">{activeAccount.description}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 space-y-2 sm:min-w-[320px]">
                <div className="flex items-center justify-between text-xs text-emerald-200 font-semibold">
                  <span>{activeAccount.bank_name}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeAccount.account_number)}
                    className="text-[11px] font-bold text-amber-300 hover:underline flex items-center gap-1"
                  >
                    {copiedAccount === activeAccount.account_number ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Rekening</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-2xl font-black font-mono tracking-wider text-white">
                  {activeAccount.account_number}
                </div>
                <div className="text-xs text-emerald-200">
                  Atas Nama: <strong className="text-white">{activeAccount.account_holder}</strong>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((acc) => (
              <Card
                key={acc.id}
                className="rounded-2xl border-gray-200/80 bg-white hover:border-emerald-300 transition-all shadow-xs p-4 space-y-3 cursor-pointer"
                onClick={() => setSelectedProgramSlug(acc.program_slug)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {acc.bank_name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(acc.account_number);
                    }}
                    className="text-[10px] font-bold text-gray-500 hover:text-emerald-900 flex items-center gap-1"
                  >
                    {copiedAccount === acc.account_number ? 'Tersalin' : 'Salin'}
                  </button>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">{acc.program_name}</h4>
                  <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{acc.description}</p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div className="font-mono font-black text-xs text-emerald-950">{acc.account_number}</div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 6. ALOKASI PENYALURAN DANA */}
        {allocation.length > 0 && (
          <Card className="rounded-3xl border-gray-200/80 bg-white shadow-xs p-6 sm:p-7 space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">
                Alokasi Penyaluran &amp; Realisasi Dana Operasional
              </h3>
              <p className="text-xs text-gray-500">
                Rincian pos penggunaan dana kas keluar demi keberlangsungan belajar mengajar Al-Qur&apos;an di MTI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allocation.map((alloc) => (
                <div key={alloc.category} className="space-y-1.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-gray-900">{alloc.category}</span>
                    <span className="font-black font-mono text-rose-700">
                      Rp {alloc.amount.toLocaleString('id-ID')} ({alloc.percentage}%)
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-800 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${alloc.percentage}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-gray-400 flex items-center justify-between">
                    <span>{alloc.count} kali transaksi pengeluaran</span>
                    <span>Realisasi terverifikasi</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 7. TABEL MUTASI TRANSPARAN */}
        <Card className="rounded-3xl border-gray-200/80 bg-white shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">
                Buku Mutasi Kas Masuk &amp; Keluar Terbuka
              </h3>
              <p className="text-xs text-gray-500">
                Menampilkan mutasi publik yang telah diverifikasi oleh tim bendahara Markaz Tikrar Indonesia.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500">
                Total Mutasi: <strong className="text-gray-900">{transactions.length}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Program &amp; Rekening</th>
                  <th className="py-3 px-4">Nama Donatur / Akun</th>
                  <th className="py-3 px-4">Kategori Pos</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      Memuat buku mutasi transparansi...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      Belum ada catatan mutasi publik pada filter ini.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{tx.date}</div>
                        <div className="text-[10px] text-gray-400">{tx.dateTimeRaw}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-extrabold text-emerald-950">{tx.programName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">BSI {tx.accountNumber}</div>
                      </td>

                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="font-bold text-gray-900 truncate">{tx.donorName}</div>
                        <div className="text-[10px] text-gray-500 truncate">{tx.description || '-'}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="bg-gray-100 text-gray-800 font-semibold px-2.5 py-0.5 rounded-full text-[10px]">
                          {tx.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                        <span
                          className={`font-black text-xs ${
                            tx.type === 'masuk' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {tx.type === 'masuk' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 8. FOOTER CONFIRMATION CTA */}
        <Card className="rounded-3xl border-none bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-950 text-white p-6 sm:p-8 text-center space-y-4">
          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-black">Konfirmasi &amp; Donasi Dakwah Al-Qur&apos;an</h3>
            <p className="text-xs text-emerald-200">
              Jazakumullahu khairan kepada seluruh muhsinin, thalibah, dan donatur yang telah membersamai perjalanan
              dakwah Markaz Tikrar Indonesia.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="https://wa.me/6281234567890?text=Bismillah,%20saya%20ingin%20konfirmasi%20infaq%20donasi%20Markaz%20Tikrar"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-md transition-all inline-flex items-center gap-2"
            >
              <span>Konfirmasi Infaq via WhatsApp</span>
            </a>
            <Link
              href="/"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-3 rounded-2xl border border-white/20 transition-all"
            >
              Kembali ke Beranda MTI
            </Link>
          </div>
        </Card>
      </main>

      {/* 9. PUBLIC FOOTER */}
      <footer className="border-t border-gray-200/80 bg-white py-8 mt-12 text-center text-xs text-gray-500 space-y-1">
        <p className="font-bold text-gray-700">© 2026 Markaz Tikrar Indonesia (MTI)</p>
        <p className="text-[11px]">Transparansi Keuangan &amp; Akuntabilitas Publik</p>
      </footer>
    </div>
  );
}
