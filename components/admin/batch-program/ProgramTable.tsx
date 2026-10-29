'use client';

import { BookOpen, ChevronLeft, ChevronRight, Edit3, Users as UsersIcon, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Program, PaginationMeta } from './types';

interface ProgramTableProps {
  programs: Program[];
  isLoading: boolean;
  pagination?: PaginationMeta | null;
  onPageChange?: (page: number) => void;
  onEdit: (program: Program) => void;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  open: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  ongoing: 'bg-blue-50 text-blue-700 border-blue-100',
  completed: 'bg-purple-50 text-purple-700 border-purple-100',
  cancelled: 'bg-red-50 text-red-700 border-red-100',
};

export function ProgramTable({ programs, isLoading, pagination, onPageChange, onEdit }: ProgramTableProps) {
  if (isLoading && programs.length === 0) {
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
      <div className="w-full overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Program</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Batch</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Durasi</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pendaftar</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {programs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <BookOpen className="h-10 w-10" />
                    <span className="text-sm font-medium">Belum ada program terdaftar.</span>
                  </div>
                </td>
              </tr>
            ) : (
              programs.map((program) => {
                const max = program.max_thalibah || 0;
                const reg = program.registration_count || 0;
                const pct = max > 0 ? Math.min(100, Math.round((reg / max) * 100)) : 0;
                return (
                  <tr key={program.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 flex-shrink-0">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate">{program.name}</span>
                          {program.target_level && (
                            <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {program.target_level}
                            </span>
                          )}
                          {program.description && (
                            <span className="text-xs text-gray-500 truncate max-w-[260px] mt-0.5">{program.description}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-700">{program.batch?.name || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-700">
                        {program.duration_weeks ? `${program.duration_weeks} pekan` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 min-w-[140px]">
                        <div className="flex items-center gap-1.5">
                          <UsersIcon className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-sm font-bold text-gray-900">{reg}</span>
                          {max > 0 && <span className="text-xs text-gray-400">/ {max}</span>}
                        </div>
                        {max > 0 && (
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border uppercase tracking-wide',
                          STATUS_STYLES[program.status] || STATUS_STYLES.draft
                        )}
                      >
                        {program.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onEdit(program)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
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
            dari <span className="font-medium text-gray-900">{pagination.total}</span> program
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
