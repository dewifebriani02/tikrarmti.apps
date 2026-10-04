'use client';

import { Search, Filter, RefreshCw, X, Award, Download, FileSpreadsheet, Users, BookOpen, FileText, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DaftarUlangV2FiltersProps {
  searchQuery: string;
  batchId: string;
  submissionStatus: string;
  akadStatus: string;
  halaqahStatus: string;
  onChange: (filters: { 
    search: string; 
    batchId: string; 
    submissionStatus: string;
    akadStatus: string;
    halaqahStatus: string;
    juz: string;
  }) => void;
  onRefresh: () => void;
  isLoading: boolean;
  batches: any[];
  juzOptions: any[];
  onDownloadExcel: () => void;
  onDownloadPDF: () => void;
  onDownloadVCF: () => void;
  isDownloadingExcel: boolean;
  isDownloadingPDF: boolean;
  isDownloadingVCF: boolean;
  juz: string;
}

export function DaftarUlangV2Filters({ 
  searchQuery,
  batchId,
  submissionStatus,
  akadStatus,
  halaqahStatus,
  onChange,
  onRefresh, 
  isLoading, 
  batches,
  juzOptions,
  onDownloadExcel,
  onDownloadPDF,
  onDownloadVCF,
  isDownloadingExcel,
  isDownloadingPDF,
  isDownloadingVCF,
  juz
}: DaftarUlangV2FiltersProps) {
  
  const handleClear = () => {
    onChange({ search: '', batchId: 'all', submissionStatus: 'all', akadStatus: 'all', halaqahStatus: 'all', juz: 'all' });
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex flex-col gap-3">
        
        {/* Top Row: Search & Export Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari Nama, Email, WhatsApp..."
              value={searchQuery}
              onChange={(e) => onChange({ search: e.target.value, batchId, submissionStatus, akadStatus, halaqahStatus, juz })}
              className="w-full pl-9 pr-8 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-xs sm:text-sm font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => onChange({ search: '', batchId, submissionStatus, akadStatus, halaqahStatus, juz })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onDownloadExcel}
              disabled={isDownloadingExcel}
              className="flex-1 sm:flex-initial px-3 py-2 sm:py-2.5 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold transition-colors border border-emerald-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingExcel ? (
                <div className="h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
              <span>Excel</span>
            </button>
            
            <button
              onClick={onDownloadPDF}
              disabled={isDownloadingPDF}
              className="flex-1 sm:flex-initial px-3 py-2 sm:py-2.5 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold transition-colors border border-red-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingPDF ? (
                <div className="h-3.5 w-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
              <span>PDF</span>
            </button>

            <button
              onClick={onDownloadVCF}
              disabled={isDownloadingVCF}
              className="flex-1 sm:flex-initial px-3 py-2 sm:py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold transition-colors border border-blue-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingVCF ? (
                <div className="h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
              <span>VCF</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 sm:gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 bg-gray-50/70 border border-gray-200 rounded-xl px-2.5 py-1 sm:py-1.5 focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600">
            <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
            <select
              value={batchId}
              onChange={(e) => onChange({ search: searchQuery, batchId: e.target.value, submissionStatus, akadStatus, halaqahStatus, juz })}
              className="w-full bg-transparent text-xs sm:text-sm font-bold focus:outline-none cursor-pointer py-1 text-gray-800"
            >
              <option value="all">Semua Batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50/70 border border-gray-200 rounded-xl px-2.5 py-1 sm:py-1.5 focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
            <select
              value={submissionStatus}
              onChange={(e) => onChange({ search: searchQuery, batchId, submissionStatus: e.target.value, akadStatus, halaqahStatus, juz })}
              className="w-full bg-transparent text-xs sm:text-sm font-bold focus:outline-none cursor-pointer py-1 text-gray-800"
            >
              <option value="all">Status Pendaftaran</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50/70 border border-gray-200 rounded-xl px-2.5 py-1 sm:py-1.5 focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
            <select
              value={akadStatus}
              onChange={(e) => onChange({ search: searchQuery, batchId, submissionStatus, akadStatus: e.target.value, halaqahStatus, juz })}
              className="w-full bg-transparent text-xs sm:text-sm font-bold focus:outline-none cursor-pointer py-1 text-gray-800"
            >
              <option value="all">Status Akad</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50/70 border border-gray-200 rounded-xl px-2.5 py-1 sm:py-1.5 focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
            <select
              value={halaqahStatus}
              onChange={(e) => onChange({ search: searchQuery, batchId, submissionStatus, akadStatus, halaqahStatus: e.target.value, juz })}
              className="w-full bg-transparent text-xs sm:text-sm font-bold focus:outline-none cursor-pointer py-1 text-gray-800"
            >
              <option value="all">Status Halaqah</option>
              <option value="has_halaqah">Sudah Ada Halaqah</option>
              <option value="no_halaqah">Belum Ada Halaqah</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50/70 border border-gray-200 rounded-xl px-2.5 py-1 sm:py-1.5 focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600">
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
            <select
              value={juz}
              onChange={(e) => onChange({ search: searchQuery, batchId, submissionStatus, akadStatus, halaqahStatus, juz: e.target.value })}
              className="w-full bg-transparent text-xs sm:text-sm font-bold focus:outline-none cursor-pointer py-1 text-gray-800"
            >
              <option value="all">Semua Juz</option>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num.toString()}>
                  Juz {num}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || batchId !== 'all' || submissionStatus !== 'all' || akadStatus !== 'all' || halaqahStatus !== 'all' || juz !== 'all') && (
            <button
              onClick={handleClear}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
