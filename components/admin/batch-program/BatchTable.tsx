'use client';

import { Calendar, ChevronLeft, ChevronRight, Edit3, Users as UsersIcon, BookOpen, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Batch, PaginationMeta } from './types';

interface BatchTableProps {
  batches: Batch[];
  isLoading: boolean;
  pagination?: PaginationMeta | null;
  onPageChange?: (page: number) => void;
  onEdit: (batch: Batch) => void;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  open: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  ongoing: 'bg-blue-50 text-blue-700 border-blue-100',
  closed: 'bg-red-50 text-red-700 border-red-100',
  archived: 'bg-gray-50 text-gray-500 border-gray-100',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
  } catch {
    return '-';
  }
}
export function BatchTable({ batches, isLoading, pagination, onPageChange, onEdit }: BatchTableProps) {
  if (isLoading && batches.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-50 border-b border-gray-100" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b border-gray-100 mx-4" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Batch</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Periode</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Durasi</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Programs</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pendaftar</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {batches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <Calendar className="h-10 w-10" />
                    <span className="text-sm font-medium">Belum ada batch terdaftar.</span>
                  </div>
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center border border-green-100 flex-shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-gray-900 truncate">{batch.name}</span>
                        {batch.description && (
                          <span className="text-xs text-gray-500 truncate max-w-[260px]">{batch.description}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-gray-900">{formatDate(batch.start_date)}</span>
                      <span className="text-xs text-gray-500">s.d. {formatDate(batch.end_date)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-700">
                      {batch.duration_weeks ? `${batch.duration_weeks} pekan` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                      <BookOpen className="h-3 w-3" />
                      {batch.program_count ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                      <UsersIcon className="h-3 w-3" />
                      {batch.registered_count ?? 0}
                      {batch.total_quota ? <span className="opacity-60">/ {batch.total_quota}</span> : null}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border uppercase tracking-wide',
                        STATUS_STYLES[batch.status] || STATUS_STYLES.draft
                      )}
                    >
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(batch)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Menampilkan{' '}
            <span className="font-medium text-gray-900">{(pagination.page - 1) * pagination.limit + 1}</span> sampai{' '}
            <span className="font-medium text-gray-900">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            dari <span className="font-medium text-gray-900">{pagination.total}</span> batch
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={!pagination.hasPrev || isLoading}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                let pageNum = pagination.page;
                if (pagination.totalPages > 5) {
                  if (pagination.page <= 3) pageNum = i + 1;
                  else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                  else pageNum = pagination.page - 2 + i;
                } else {
                  pageNum = i + 1;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange?.(pageNum)}
                    className={cn(
                      'h-10 w-10 rounded-lg text-sm font-bold transition-all',
                      pagination.page === pageNum
                        ? 'bg-green-700 text-white shadow-md border border-green-800'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasNext || isLoading}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
