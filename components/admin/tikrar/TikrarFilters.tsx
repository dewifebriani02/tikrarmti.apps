'use client';

import { Search, Filter, RefreshCw, X, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TikrarFiltersProps {
  onFilterChange: (filters: { 
    search: string; 
    batchId: string; 
    status: string;
    selectionStatus: string;
    daftarUlangStatus: string;
  }) => void;
  onRefresh: () => void;
  isLoading: boolean;
  batches: any[];
  defaultBatchId?: string;
}

export function TikrarFilters({ onFilterChange, onRefresh, isLoading, batches, defaultBatchId = 'all' }: TikrarFiltersProps) {
  const [search, setSearch] = useState('');
  const [batchId, setBatchId] = useState(defaultBatchId);
  const [status, setStatus] = useState('all');
  const [selectionStatus, setSelectionStatus] = useState('all');
  const [daftarUlangStatus, setDaftarUlangStatus] = useState('all');

  // Sync batchId if defaultBatchId changes (e.g. once parent fetches batches and finds active batch)
  useEffect(() => {
    if (defaultBatchId !== 'all') {
      setBatchId(defaultBatchId);
    }
  }, [defaultBatchId]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ search, batchId, status, selectionStatus, daftarUlangStatus });
    }, 500);
    return () => clearTimeout(timer);
  }, [search, batchId, status, selectionStatus, daftarUlangStatus, onFilterChange]);

  const handleClear = () => {
    setSearch('');
    setBatchId('all');
    setStatus('all');
    setSelectionStatus('all');
    setDaftarUlangStatus('all');
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari Nama, Email, atau WhatsApp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all text-xs sm:text-sm font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-gray-50/70 border border-gray-200 rounded-xl px-2.5 py-1 sm:py-1.5 focus-within:ring-2 focus-within:ring-green-600/20 focus-within:border-green-600">
            <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-none cursor-pointer py-1 text-gray-800"
            >
              <option value="all">Semua Batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <select
            value={selectionStatus}
            onChange={(e) => setSelectionStatus(e.target.value)}
            className="px-3 py-2 sm:py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 bg-white cursor-pointer text-gray-800"
          >
            <option value="all">Semua Seleksi</option>
            <option value="pending">Pending Seleksi</option>
            <option value="selected">Terpilih</option>
            <option value="not_selected">Tidak Terpilih</option>
            <option value="waitlist">Waitlist</option>
          </select>
          
          <select
            value={daftarUlangStatus}
            onChange={(e) => setDaftarUlangStatus(e.target.value)}
            className="px-3 py-2 sm:py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 bg-white cursor-pointer text-gray-800 sm:col-span-2 lg:col-span-1"
          >
            <option value="all">Semua Daftar Ulang</option>
            <option value="submitted">Sudah Daftar Ulang</option>
            <option value="none">Belum Daftar Ulang</option>
          </select>

          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1 justify-between sm:justify-start">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-2 sm:py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-all flex items-center gap-1.5 text-xs sm:text-sm font-semibold active:scale-95 shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isLoading && "animate-spin")} />
              <span>Refresh</span>
            </button>

            {(search || batchId !== 'all' || status !== 'all' || selectionStatus !== 'all' || daftarUlangStatus !== 'all') && (
              <button
                onClick={handleClear}
                className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl transition-all"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
