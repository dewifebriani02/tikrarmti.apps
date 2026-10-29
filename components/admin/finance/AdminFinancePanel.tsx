'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Landmark,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const FINANCE_CATEGORIES = [
  'Infaq Tikrar Tahfidz',
  'Infaq Pra-Tikrar',
  'Infaq Murojaah 40x',
  'Donasi Operasional & IT',
  'Beasiswa Santriwati & Dhuafa',
  'Kafalah Muallimah & Pengajar',
  'Wakaf Al-Quran & Fasilitas',
  'Operasional Server & IT',
  'Operasional & Fasilitas Dakwah',
  'Lainnya',
];

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
  total_income: number;
  total_expense: number;
  calculated_balance: number;
  total_transactions: number;
  is_active: boolean;
  display_order: number;
}

interface FinancialTransaction {
  id: string;
  account_id: string;
  program_name: string;
  program_slug: string;
  account_number: string;
  transaction_date: string;
  date_time_raw: string;
  type: 'masuk' | 'keluar';
  amount: number;
  donor_name: string;
  description: string;
  category: string;
  reference_number: string | null;
  balance_after: number | null;
  is_public: boolean;
  created_at: string;
}

interface DraftTransaction {
  id: string;
  date: string;
  time: string;
  dateTimeRaw: string;
  type: 'masuk' | 'keluar';
  amount: number;
  donorName: string;
  description: string;
  category: string;
  referenceNumber: string;
  balanceAfter: number;
  isDuplicate: boolean;
  isPublic: boolean;
  selected: boolean;
}

interface ParsedPdfResult {
  fileName: string;
  fileSize: number;
  accountNumber: string;
  accountHolder: string;
  period: string;
  matchedAccount: BankAccount | null;
  totalParsed: number;
  totalIncome: number;
  totalExpense: number;
  duplicateCount: number;
  transactions: DraftTransaction[];
}

export default function AdminFinancePanel() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'import' | 'accounts'>('transactions');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Transactions Tab State
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(0);
  const txLimit = 25;

  // Import Tab State
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfResult, setPdfResult] = useState<ParsedPdfResult | null>(null);
  const [selectedTargetAccountId, setSelectedTargetAccountId] = useState<string>('');
  const [savingBatch, setSavingBatch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Transaction Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    account_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'masuk' as 'masuk' | 'keluar',
    amount: '',
    donor_name: '',
    description: '',
    category: 'Infaq Tikrar Tahfidz',
    reference_number: '',
    is_public: true,
  });
  const [savingManual, setSavingManual] = useState(false);

  // Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    bank_name: 'BSI (Bank Syariah Indonesia)',
    account_number: '',
    account_holder: '',
    program_name: '',
    program_slug: '',
    description: '',
    initial_balance: 0,
    display_order: 1,
  });
  const [savingAccount, setSavingAccount] = useState(false);

  // 1. Fetch Accounts
  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const res = await fetch('/api/admin/finance/accounts');
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching accounts:', err);
      toast.error('Gagal memuat akun rekening');
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 2. Fetch Transactions
  const fetchTransactions = async (page = 0) => {
    try {
      setLoadingTx(true);
      const params = new URLSearchParams({
        limit: txLimit.toString(),
        offset: (page * txLimit).toString(),
      });
      if (selectedAccountFilter !== 'all') params.set('accountId', selectedAccountFilter);
      if (selectedTypeFilter !== 'all') params.set('type', selectedTypeFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/finance/transactions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data.transactions || []);
        setTxTotal(json.data.total || 0);
        setTxPage(page);
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      toast.error('Gagal memuat daftar transaksi');
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchTransactions(0);
  }, []);

  useEffect(() => {
    fetchTransactions(0);
  }, [selectedAccountFilter, selectedTypeFilter]);

  // Handle PDF Upload
  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      toast.error('Harap pilih file PDF rekening koran yang valid');
      return;
    }

    try {
      setUploadingPdf(true);
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await fetch('/api/admin/finance/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memproses file PDF');
      }

      const result: ParsedPdfResult = json.data;
      setPdfResult(result);

      // Pre-select matching account if found
      if (result.matchedAccount) {
        setSelectedTargetAccountId(result.matchedAccount.id);
      } else if (accounts.length > 0) {
        // Fallback to first account matching number or first
        const found = accounts.find((a) => a.account_number === result.accountNumber);
        setSelectedTargetAccountId(found ? found.id : accounts[0].id);
      }

      toast.success(
        `PDF berhasil diekstrak! Ditemukan ${result.totalParsed} transaksi (${result.duplicateCount} duplikat terdeteksi).`
      );
    } catch (err: any) {
      console.error('Error parsing PDF:', err);
      toast.error(err.message || 'Gagal memproses file PDF');
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Draft edits
  const handleUpdateDraft = (id: string, updates: Partial<DraftTransaction>) => {
    if (!pdfResult) return;
    const updated = pdfResult.transactions.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx));
    setPdfResult({ ...pdfResult, transactions: updated });
  };

  const handleToggleSelectAll = (select: boolean) => {
    if (!pdfResult) return;
    const updated = pdfResult.transactions.map((tx) => ({
      ...tx,
      selected: select ? !tx.isDuplicate : false,
    }));
    setPdfResult({ ...pdfResult, transactions: updated });
  };

  // Save Batch Drafts
  const handleSaveBatch = async () => {
    if (!pdfResult || !selectedTargetAccountId) {
      toast.error('Pilih rekening tujuan terlebih dahulu');
      return;
    }

    const selectedDrafts = pdfResult.transactions.filter((t) => t.selected);
    if (selectedDrafts.length === 0) {
      toast.error('Pilih minimal satu transaksi untuk disimpan');
      return;
    }

    try {
      setSavingBatch(true);
      const res = await fetch('/api/admin/finance/batch-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedTargetAccountId,
          transactions: selectedDrafts.map((t) => ({
            date: t.date,
            dateTimeRaw: t.dateTimeRaw,
            type: t.type,
            amount: t.amount,
            donorName: t.donorName,
            description: t.description,
            category: t.category,
            referenceNumber: t.referenceNumber,
            balanceAfter: t.balanceAfter,
            isPublic: t.isPublic,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan transaksi');
      }

      toast.success(json.message || 'Transaksi berhasil disimpan ke pembukuan!');
      setPdfResult(null);
      fetchAccounts();
      fetchTransactions(0);
      setActiveTab('transactions');
    } catch (err: any) {
      console.error('Error saving batch:', err);
      toast.error(err.message || 'Gagal menyimpan transaksi');
    } finally {
      setSavingBatch(false);
    }
  };

  // Handle Manual Save
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.account_id || !manualForm.amount || parseInt(manualForm.amount, 10) <= 0) {
      toast.error('Lengkapi rekening dan nominal transaksi');
      return;
    }

    try {
      setSavingManual(true);
      const res = await fetch('/api/admin/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: manualForm.account_id,
          transaction_date: manualForm.transaction_date,
          type: manualForm.type,
          amount: parseInt(manualForm.amount, 10),
          donor_name: manualForm.donor_name || 'Hamba Allah',
          description: manualForm.description,
          category: manualForm.category,
          reference_number: manualForm.reference_number || null,
          is_public: manualForm.is_public,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan transaksi');
      }

      toast.success('Transaksi manual berhasil dicatat!');
      setIsManualModalOpen(false);
      setManualForm({
        account_id: accounts[0]?.id || '',
        transaction_date: new Date().toISOString().split('T')[0],
        type: 'masuk',
        amount: '',
        donor_name: '',
        description: '',
        category: 'Infaq Tikrar Tahfidz',
        reference_number: '',
        is_public: true,
      });
      fetchAccounts();
      fetchTransactions(0);
    } catch (err: any) {
      console.error('Error saving manual transaction:', err);
      toast.error(err.message || 'Gagal mencatat transaksi');
    } finally {
      setSavingManual(false);
    }
  };

  // Handle Delete Tx
  const handleDeleteTx = async (id: string) => {
    if (!confirm('Apakah Ukhti yakin ingin menghapus mutasi ini? Saldo rekening akan disesuaikan kembali.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/finance/transactions?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menghapus');
      toast.success('Mutasi berhasil dihapus');
      fetchAccounts();
      fetchTransactions(txPage);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus');
    }
  };

  // Quick toggle public status
  const handleTogglePublic = async (tx: FinancialTransaction) => {
    try {
      const res = await fetch('/api/admin/finance/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tx.id,
          is_public: !tx.is_public,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal memperbarui');
      toast.success(`Status publik mutasi diubah menjadi ${!tx.is_public ? 'Publik' : 'Internal'}`);
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, is_public: !tx.is_public } : t)));
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui status publik');
    }
  };

  // Total Summary All Accounts
  const totalBalanceAll = accounts.reduce((sum, a) => sum + (a.calculated_balance || a.current_balance), 0);
  const totalIncomeAll = accounts.reduce((sum, a) => sum + (a.total_income || 0), 0);
  const totalExpenseAll = accounts.reduce((sum, a) => sum + (a.total_expense || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. HERO METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-emerald-100 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white shadow-sm overflow-hidden">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider">
              <span>Total Saldo Kas Berjalan</span>
              <Landmark className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-2xl font-black tracking-tight">
              Rp {totalBalanceAll.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-emerald-200">
              Akumulasi saldo kas bersih di {accounts.length} rekening program BSI
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-sm overflow-hidden">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Infaq &amp; Donasi</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              Rp {totalIncomeAll.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-gray-500">
              Kas masuk dari pendaftaran, murojaah, dan donatur
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-sm overflow-hidden">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
              <span>Penyaluran &amp; Operasional</span>
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700 tracking-tight">
              Rp {totalExpenseAll.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-gray-500">
              Beasiswa dhuafa, kafalah pengajar, server &amp; Zoom
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-sm overflow-hidden">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
              <span>Rekening Program BSI</span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-900 tracking-tight">
              {accounts.length} Rekening
            </div>
            <p className="text-[11px] text-gray-500">
              Satu rekening BSI untuk satu program terfokus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. MAIN NAVIGATION SUB-TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'transactions'
                ? 'bg-white text-emerald-950 shadow-xs border border-gray-200/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>Mutasi &amp; Pembukuan</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-black">
              {txTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-white text-emerald-950 shadow-xs border border-gray-200/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-700" />
            <span>Impor Rekening Koran BSI</span>
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold">
              PDF e-Statement
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'accounts'
                ? 'bg-white text-emerald-950 shadow-xs border border-gray-200/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Landmark className="w-4 h-4 text-emerald-700" />
            <span>Rekening Program</span>
            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] rounded-full font-bold">
              {accounts.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setManualForm((prev) => ({
                ...prev,
                account_id: accounts[0]?.id || '',
              }));
              setIsManualModalOpen(true);
            }}
            className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Mutasi Manual</span>
          </Button>

          <a
            href="/transparansi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 py-2 px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            <span>Buka Portal Publik</span>
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MUTASI & PEMBUKUAN                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="rounded-2xl border-gray-200/80 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Account Filter */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Rekening Program:
                  </label>
                  <select
                    value={selectedAccountFilter}
                    onChange={(e) => setSelectedAccountFilter(e.target.value)}
                    className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Semua Rekening ({accounts.length})</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.program_name} (BSI {acc.account_number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Tipe Mutasi:
                  </label>
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value)}
                    className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Semua (Masuk &amp; Keluar)</option>
                    <option value="masuk">Kas Masuk (Infaq &amp; Donasi)</option>
                    <option value="keluar">Kas Keluar (Operasional &amp; Beasiswa)</option>
                  </select>
                </div>

                {/* Search query */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Pencarian (Nama Donatur / Ref / Keterangan):
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchTransactions(0)}
                        placeholder="Ketik nama donatur, nomor FT..., atau keperluan..."
                        className="pl-9 text-xs rounded-xl"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => fetchTransactions(0)}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold px-4"
                    >
                      Cari
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedAccountFilter('all');
                        setSelectedTypeFilter('all');
                      }}
                      className="rounded-xl text-xs text-gray-500 hover:text-gray-900"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card className="rounded-2xl border-gray-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tanggal &amp; Waktu</th>
                    <th className="py-3 px-4">Program / Rekening</th>
                    <th className="py-3 px-4">Nama Akun / Donatur</th>
                    <th className="py-3 px-4">Kategori Pos</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                    <th className="py-3 px-4 text-center">Publik</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {loadingTx ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-800 mb-2" />
                        <span>Memuat data transaksi pembukuan...</span>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="font-semibold text-gray-600">Belum ada transaksi ditemukan</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Impor rekening koran BSI atau catat mutasi manual untuk mengisi pembukuan.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900">{tx.transaction_date}</div>
                          <div className="text-[10px] text-gray-400">{tx.date_time_raw || '-'}</div>
                          {tx.reference_number && (
                            <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1 py-0.2 rounded-sm">
                              {tx.reference_number}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-emerald-950">{tx.program_name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">BSI {tx.account_number}</div>
                        </td>

                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="font-extrabold text-gray-900 truncate" title={tx.donor_name}>
                            {tx.donor_name}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate" title={tx.description}>
                            {tx.description || '-'}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="bg-emerald-50 text-emerald-900 border border-emerald-200/60 font-medium px-2 py-0.5 rounded-full text-[10px]">
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
                          {tx.balance_after !== null && (
                            <div className="text-[9px] text-gray-400">
                              Saldo: Rp {tx.balance_after.toLocaleString('id-ID')}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleTogglePublic(tx)}
                            title={tx.is_public ? 'Tayang di publik (Klik untuk sembunyikan)' : 'Hanya internal (Klik untuk tayangkan)'}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                              tx.is_public
                                ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {tx.is_public ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{tx.is_public ? 'Publik' : 'Internal'}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTx(tx.id)}
                            className="h-7 w-7 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Hapus transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {txTotal > txLimit && (
              <div className="p-3 border-t border-gray-200/80 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Menampilkan {txPage * txLimit + 1} s.d. {Math.min((txPage + 1) * txLimit, txTotal)} dari {txTotal} mutasi
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={txPage === 0}
                    onClick={() => fetchTransactions(txPage - 1)}
                    className="h-7 text-xs rounded-lg"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={(txPage + 1) * txLimit >= txTotal}
                    onClick={() => fetchTransactions(txPage + 1)}
                    className="h-7 text-xs rounded-lg"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: IMPOR REKENING KORAN BSI (PDF E-STATEMENT)                         */}
      {/* ========================================================================= */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Upload Dropzone */}
          <Card className="rounded-2xl border-2 border-dashed border-emerald-300/80 bg-emerald-50/30 hover:bg-emerald-50/50 transition-colors shadow-xs">
            <CardContent className="p-8 text-center space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfFileSelect}
                className="hidden"
                id="bsi-pdf-upload"
              />
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                {uploadingPdf ? (
                  <RefreshCw className="w-7 h-7 animate-spin text-emerald-800" />
                ) : (
                  <UploadCloud className="w-7 h-7 text-emerald-800" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-gray-900">
                  {uploadingPdf ? 'Mengekstrak Data PDF Rekening Koran BSI...' : 'Upload e-Statement Rekening Koran BSI'}
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Unggah file PDF resmi dari BSI Mobile / BYOND / e-Statement. Sistem otomatis mengekstrak seluruh mutasi,
                  mendeteksi nomor rekening, dan menduplikasi pencegahan.
                </p>
              </div>

              <div>
                <Button
                  disabled={uploadingPdf}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold px-6 py-2.5 shadow-xs"
                >
                  {uploadingPdf ? 'Sedang Membaca PDF...' : 'Pilih File PDF Rekening Koran'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Parsed Result & Interactive Review Table */}
          {pdfResult && (
            <div className="space-y-4 animate-fadeIn">
              {/* Header Card Statement Info */}
              <Card className="rounded-2xl border-emerald-200 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-sm overflow-hidden">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-white/10 text-emerald-200 border border-white/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Hasil Ekstraksi BSI PDF
                        </span>
                        <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {pdfResult.period || 'Periode Terbaca'}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold tracking-tight">
                        Rekening BSI: {pdfResult.accountNumber}
                      </h3>
                      <p className="text-xs text-emerald-200">
                        Atas Nama: <strong className="text-white">{pdfResult.accountHolder}</strong> • File:{' '}
                        {pdfResult.fileName}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-black/20 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-right">
                        <div className="text-[10px] text-emerald-200 uppercase font-bold">Total Masuk ({pdfResult.transactions.filter(t => t.type === 'masuk').length})</div>
                        <div className="text-sm font-extrabold text-emerald-300 font-mono">
                          +Rp {pdfResult.totalIncome.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="bg-black/20 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-right">
                        <div className="text-[10px] text-rose-200 uppercase font-bold">Total Keluar ({pdfResult.transactions.filter(t => t.type === 'keluar').length})</div>
                        <div className="text-sm font-extrabold text-rose-300 font-mono">
                          -Rp {pdfResult.totalExpense.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Destination Account Linker */}
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span>
                        Simpan transaksi ini ke Rekening Program:{' '}
                        <strong className="text-white underline">
                          {accounts.find((a) => a.id === selectedTargetAccountId)?.program_name || 'Pilih Rekening'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-emerald-200 text-[11px] font-bold">Ubah Rekening:</span>
                      <select
                        value={selectedTargetAccountId}
                        onChange={(e) => setSelectedTargetAccountId(e.target.value)}
                        className="bg-emerald-950/80 text-white border border-white/20 text-xs font-bold rounded-lg py-1 px-2.5 focus:outline-hidden"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.program_name} (BSI {acc.account_number})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Duplicate Notice if any */}
              {pdfResult.duplicateCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Ditemukan <strong>{pdfResult.duplicateCount} transaksi</strong> yang sudah pernah disimpan
                      sebelumnya. Secara default transaksi duplikat tidak dicentang agar tidak tercatat ganda.
                    </span>
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-xs rounded-xl font-bold text-gray-700"
                  >
                    Pilih Semua Non-Duplikat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-xs rounded-xl font-bold text-gray-500"
                  >
                    Hapus Pilihan
                  </Button>
                  <span className="text-xs text-gray-500 ml-2">
                    Terpilih:{' '}
                    <strong className="text-emerald-900 font-extrabold">
                      {pdfResult.transactions.filter((t) => t.selected).length}
                    </strong>{' '}
                    dari {pdfResult.totalParsed} transaksi
                  </span>
                </div>

                <Button
                  disabled={savingBatch || pdfResult.transactions.filter((t) => t.selected).length === 0}
                  onClick={handleSaveBatch}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-extrabold px-6 py-2.5 shadow-xs gap-1.5"
                >
                  {savingBatch ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Pembukuan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        Simpan {pdfResult.transactions.filter((t) => t.selected).length} Transaksi Terpilih
                      </span>
                    </>
                  )}
                </Button>
              </div>

              {/* Editable Draft Table */}
              <Card className="rounded-2xl border-gray-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3 text-center w-10">Pilih</th>
                        <th className="py-3 px-3">Tanggal</th>
                        <th className="py-3 px-3">Tipe &amp; Nominal</th>
                        <th className="py-3 px-3">
                          Nama Akun / Donatur <span className="text-emerald-700 normal-case">(Dapat Diedit)</span>
                        </th>
                        <th className="py-3 px-3">Kategori Pos</th>
                        <th className="py-3 px-3">Keterangan Asli BSI</th>
                        <th className="py-3 px-3 text-center">Publik</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {pdfResult.transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className={`hover:bg-gray-50/70 transition-colors ${
                            tx.isDuplicate ? 'bg-amber-50/30' : tx.selected ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={tx.selected}
                              onChange={(e) => handleUpdateDraft(tx.id, { selected: e.target.checked })}
                              className="w-4 h-4 text-emerald-700 rounded-sm border-gray-300 focus:ring-emerald-500"
                            />
                          </td>

                          {/* Date & Ref */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-bold text-gray-900">{tx.date}</div>
                            <div className="text-[10px] text-gray-400">{tx.time || '-'}</div>
                            {tx.referenceNumber && (
                              <span className="text-[9px] font-mono text-gray-500 bg-gray-100 px-1 py-0.2 rounded-sm block w-fit mt-0.5">
                                {tx.referenceNumber}
                              </span>
                            )}
                            {tx.isDuplicate && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-sm block w-fit mt-0.5">
                                Sudah Tersimpan
                              </span>
                            )}
                          </td>

                          {/* Type & Amount */}
                          <td className="py-3 px-3 whitespace-nowrap font-mono">
                            <span
                              className={`font-black text-xs ${
                                tx.type === 'masuk' ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {tx.type === 'masuk' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                            </span>
                            <div className="text-[10px] text-gray-400">
                              Saldo: Rp {tx.balanceAfter.toLocaleString('id-ID')}
                            </div>
                          </td>

                          {/* Editable Donor Name */}
                          <td className="py-3 px-3 min-w-[200px]">
                            <div className="relative">
                              <Input
                                value={tx.donorName}
                                onChange={(e) => handleUpdateDraft(tx.id, { donorName: e.target.value })}
                                className="h-8 text-xs font-bold rounded-lg border-gray-300 bg-white focus:bg-white focus:border-emerald-500"
                                placeholder="Edit nama donatur jika salah..."
                              />
                            </div>
                          </td>

                          {/* Category selector */}
                          <td className="py-3 px-3 min-w-[160px]">
                            <select
                              value={tx.category}
                              onChange={(e) => handleUpdateDraft(tx.id, { category: e.target.value })}
                              className="w-full text-xs font-semibold py-1.5 px-2 rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                            >
                              {FINANCE_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-3 max-w-[240px]">
                            <p className="text-[11px] text-gray-600 truncate" title={tx.description}>
                              {tx.description}
                            </p>
                          </td>

                          {/* Is Public Toggle */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleUpdateDraft(tx.id, { isPublic: !tx.isPublic })}
                              className={`p-1.5 rounded-lg transition-colors ${
                                tx.isPublic
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                              title={tx.isPublic ? 'Tayang di Publik' : 'Disembunyikan (Hanya Internal)'}
                            >
                              {tx.isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PENGATURAN REKENING PROGRAM                                        */}
      {/* ========================================================================= */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-gray-900">Daftar Rekening BSI per Program MTI</h3>
              <p className="text-xs text-gray-500">
                Setiap program memiliki rekening penampung BSI terpisah untuk menjaga amanah dan akuntabilitas dana umat.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingAccount(null);
                setAccountForm({
                  bank_name: 'BSI (Bank Syariah Indonesia)',
                  account_number: '',
                  account_holder: 'Markaz Tikrar Indonesia',
                  program_name: '',
                  program_slug: '',
                  description: '',
                  initial_balance: 0,
                  display_order: accounts.length + 1,
                });
                setIsAccountModalOpen(true);
              }}
              className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rekening Program</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <Card key={acc.id} className="rounded-2xl border-gray-200/80 shadow-xs overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                          {acc.program_slug}
                        </span>
                        {acc.is_active ? (
                          <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <h4 className="font-black text-base text-gray-900">{acc.program_name}</h4>
                      <p className="text-xs text-gray-500">{acc.description || 'Tidak ada deskripsi'}</p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingAccount(acc);
                        setAccountForm({
                          bank_name: acc.bank_name,
                          account_number: acc.account_number,
                          account_holder: acc.account_holder,
                          program_name: acc.program_name,
                          program_slug: acc.program_slug,
                          description: acc.description || '',
                          initial_balance: acc.initial_balance,
                          display_order: acc.display_order || 1,
                        });
                        setIsAccountModalOpen(true);
                      }}
                      className="h-8 w-8 text-gray-400 hover:text-emerald-800 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Account Details Box */}
                  <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-semibold">{acc.bank_name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(acc.account_number);
                          toast.success('Nomor rekening disalin!');
                        }}
                        className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Salin</span>
                      </button>
                    </div>
                    <div className="text-lg font-black font-mono tracking-wider text-emerald-950">
                      {acc.account_number}
                    </div>
                    <div className="text-xs text-gray-600">
                      a.n. <strong className="text-gray-900">{acc.account_holder}</strong>
                    </div>
                  </div>

                  {/* Balance & Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100 text-center">
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Saldo Berjalan</div>
                      <div className="text-xs font-black text-gray-900 font-mono mt-0.5">
                        Rp {(acc.calculated_balance || acc.current_balance).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Kas Masuk</div>
                      <div className="text-xs font-bold text-emerald-700 font-mono mt-0.5">
                        +Rp {acc.total_income.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Penyaluran</div>
                      <div className="text-xs font-bold text-rose-700 font-mono mt-0.5">
                        -Rp {acc.total_expense.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CATAT MUTASI MANUAL                                              */}
      {/* ========================================================================= */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Catat Mutasi Kas Manual</h3>
                <p className="text-xs text-gray-500">Input transaksi infaq/operasional manual tanpa PDF</p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-4 text-xs">
              {/* Account Picker */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Rekening Tujuan / Asal:</label>
                <select
                  value={manualForm.account_id}
                  onChange={(e) => setManualForm({ ...manualForm, account_id: e.target.value })}
                  required
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-300 font-semibold bg-white"
                >
                  <option value="">-- Pilih Rekening Program --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.program_name} (BSI {acc.account_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type and Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tipe Mutasi:</label>
                  <select
                    value={manualForm.type}
                    onChange={(e) => setManualForm({ ...manualForm, type: e.target.value as any })}
                    className="w-full py-2.5 px-3 rounded-xl border border-gray-300 font-bold bg-white"
                  >
                    <option value="masuk">Kas Masuk (Infaq &amp; Donasi)</option>
                    <option value="keluar">Kas Keluar (Operasional / Beasiswa)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tanggal Transaksi:</label>
                  <Input
                    type="date"
                    value={manualForm.transaction_date}
                    onChange={(e) => setManualForm({ ...manualForm, transaction_date: e.target.value })}
                    required
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nominal (Rp):</label>
                <Input
                  type="number"
                  min="1000"
                  step="1000"
                  value={manualForm.amount}
                  onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                  placeholder="Contoh: 50000"
                  required
                  className="text-xs rounded-xl font-mono font-bold"
                />
              </div>

              {/* Donor / Recipient Name */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Nama Akun / Donatur / Penerima:
                </label>
                <Input
                  value={manualForm.donor_name}
                  onChange={(e) => setManualForm({ ...manualForm, donor_name: e.target.value })}
                  placeholder="Nama donatur atau nama pihak pengeluaran..."
                  className="text-xs rounded-xl font-medium"
                />
              </div>

              {/* Category */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Kategori Pos Dana:</label>
                <select
                  value={manualForm.category}
                  onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-300 font-semibold bg-white"
                >
                  {FINANCE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Keterangan / Keperluan:</label>
                <Input
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  placeholder="Contoh: Infaq komitmen Murojaah 40x / Langganan Cloud Zoom..."
                  className="text-xs rounded-xl"
                />
              </div>

              {/* Reference */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nomor Referensi (Opsional):</label>
                <Input
                  value={manualForm.reference_number}
                  onChange={(e) => setManualForm({ ...manualForm, reference_number: e.target.value })}
                  placeholder="Nomor bukti transfer / kuitansi..."
                  className="text-xs rounded-xl font-mono"
                />
              </div>

              {/* Toggle Public */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="manual-public-check"
                  checked={manualForm.is_public}
                  onChange={(e) => setManualForm({ ...manualForm, is_public: e.target.checked })}
                  className="w-4 h-4 text-emerald-800 rounded-sm border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="manual-public-check" className="font-bold text-gray-700 cursor-pointer">
                  Tayangkan transaksi ini di Portal Transparansi Publik
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={savingManual}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold px-5"
                >
                  {savingManual ? 'Menyimpan...' : 'Simpan Mutasi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH / EDIT REKENING PROGRAM                                    */}
      {/* ========================================================================= */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-extrabold text-base text-gray-900">
                {editingAccount ? 'Edit Rekening Program' : 'Tambah Rekening Program BSI'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nama Bank:</label>
                <Input
                  value={accountForm.bank_name}
                  onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                  className="text-xs rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Nomor Rekening BSI:</label>
                <Input
                  value={accountForm.account_number}
                  onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                  placeholder="Contoh: 7345608197"
                  className="text-xs rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Atas Nama Rekening:</label>
                <Input
                  value={accountForm.account_holder}
                  onChange={(e) => setAccountForm({ ...accountForm, account_holder: e.target.value })}
                  placeholder="Contoh: Mara Martalena / Markaz Tikrar"
                  className="text-xs rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Nama Program Terkait:</label>
                <Input
                  value={accountForm.program_name}
                  onChange={(e) => setAccountForm({ ...accountForm, program_name: e.target.value })}
                  placeholder="Contoh: Tikrar Tahfidz & Murojaah"
                  className="text-xs rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Slug Program (URL ID):</label>
                <Input
                  value={accountForm.program_slug}
                  onChange={(e) => setAccountForm({ ...accountForm, program_slug: e.target.value })}
                  placeholder="Contoh: tikrar-tahfidz / murojaah-40x"
                  className="text-xs rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Deskripsi Peruntukan:</label>
                <Input
                  value={accountForm.description}
                  onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                  placeholder="Deskripsi singkat peruntukan dana rekening ini..."
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAccountModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={savingAccount}
                onClick={async () => {
                  try {
                    setSavingAccount(true);
                    const url = '/api/admin/finance/accounts';
                    const method = editingAccount ? 'PUT' : 'POST';
                    const payload = editingAccount
                      ? { id: editingAccount.id, ...accountForm }
                      : accountForm;

                    const res = await fetch(url, {
                      method,
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    });
                    const json = await res.json();
                    if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menyimpan');
                    toast.success(editingAccount ? 'Rekening diperbarui' : 'Rekening baru ditambahkan');
                    setIsAccountModalOpen(false);
                    fetchAccounts();
                  } catch (err: any) {
                    toast.error(err.message || 'Gagal menyimpan rekening');
                  } finally {
                    setSavingAccount(false);
                  }
                }}
                className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold px-5"
              >
                {savingAccount ? 'Menyimpan...' : 'Simpan Rekening'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
