'use client';

import { MoreHorizontal, Shield, User, Clock, ChevronLeft, ChevronRight, Ban, CheckCircle, Info, Key, Eye, MessageSquare, RefreshCw } from 'lucide-react';
import { AdminUser } from './types';
import { cn } from '@/lib/utils';
import { getWhatsAppUrl } from '@/lib/utils/whatsapp';

interface UserTableProps {
  users: AdminUser[];
  isLoading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null;
  onPageChange: (page: number) => void;
  onAction: (action: 'detail' | 'edit' | 'role' | 'blacklist' | 'resetPassword' | 'preview' | 'merge', user: AdminUser) => void;
  detectDuplicates?: boolean;
}

export function UserTable({ users, isLoading, pagination, onPageChange, onAction, detectDuplicates }: UserTableProps) {
  if (isLoading && users.length === 0) {
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
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">WhatsApp</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Domisili</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Tidak ada data user ditemukan.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 truncate">
                            {user.full_name || 'Hamba Allah'}
                          </span>
                          {user.student_id_number && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Nomor Induk Tholibah">
                              {user.student_id_number}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 truncate">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {user.whatsapp ? (
                        <a 
                          href={getWhatsAppUrl(user.whatsapp, user.full_name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1.5"
                          title="Chat WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {user.whatsapp}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                      
                      {detectDuplicates && (
                        <>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold w-fit border border-orange-200 uppercase tracking-tighter shadow-sm animate-pulse">
                            Akun Ganda
                          </span>
                          
                          {user.activity_meta && (
                            <div className="flex flex-col gap-1 mt-1.5 p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium leading-tight">
                                <Clock className="h-2.5 w-2.5 text-gray-400" />
                                <span>
                                  {user.activity_meta.latest_jurnal_date 
                                    ? new Date(user.activity_meta.latest_jurnal_date).toLocaleDateString('id-ID', { day: 'numeric', 
                                        month: 'short', 
                                        year: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit', timeZone: 'Asia/Jakarta' }) 
                                    : 'Belum pernah lapor'}
                                </span>
                              </div>
                              <div className="text-[10px]">
                                <span className="font-bold text-gray-700">{user.activity_meta.total_jurnal}</span>
                                <span className="text-gray-500 ml-1">laporan jurnal</span>
                              </div>
                              
                              {user.activity_meta.registered_batches.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 border-t border-gray-200/50 pt-1">
                                  {user.activity_meta.registered_batches.map(batchName => (
                                    <span 
                                      key={batchName} 
                                      className={cn(
                                        "px-1 py-0.5 rounded text-[9px] font-bold border",
                                        user.activity_meta?.has_active_reg && batchName.includes('Batch 10') // Heuristic for active batch
                                          ? "bg-green-100 text-green-700 border-green-200" 
                                          : "bg-white text-gray-500 border-gray-200"
                                      )}
                                    >
                                      {batchName}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {user.activity_meta.is_unauthorized_activity && (
                                <div className="mt-2 p-1.5 rounded bg-red-50 border border-red-100 flex items-center gap-1.5 animate-pulse">
                                  <div className="h-1.5 w-1.5 rounded-full bg-red-600" />
                                  <span className="text-[10px] font-black text-red-700 uppercase tracking-tighter">
                                    DATA KEOS: Jurnal Tanpa Batch
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 truncate block max-w-[150px]">
                      {user.kota ? `${user.kota}, ${user.provinsi}` : user.negara || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((role) => (
                        <span
                          key={role}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            role === 'admin' 
                              ? "bg-purple-100 text-purple-700" 
                              : "bg-emerald-100 text-emerald-700"
                          )}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_blacklisted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold">
                        <Ban className="h-3 w-3" />
                        Blacklisted
                      </span>
                    ) : user.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-bold">
                        <CheckCircle className="h-3 w-3" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">
                        <Clock className="h-3 w-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a 
                        href={getWhatsAppUrl(user.whatsapp || '', user.full_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm border",
                          user.whatsapp ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed pointer-events-none"
                        )}
                        title={user.whatsapp ? "Chat via WhatsApp" : "No WhatsApp number"}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Chat
                      </a>
                      <button
                        onClick={() => onAction('detail', user)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                        title="Lihat Profil"
                      >
                        <Info className="h-4 w-4" />
                        Profil
                      </button>
                      <button
                        onClick={() => onAction('edit', user)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                        title="Edit User"
                      >
                        <User className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => onAction('preview', user)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                        title="Preview Dashboard Thalibah"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </button>
                      <button
                        onClick={() => onAction('merge', user)}
                        className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                        title="Gabungkan Akun Duplikat"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Gabung
                      </button>
                      <button
                        onClick={() => onAction('role', user)}
                        className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                        title="Ubah Role"
                      >
                        <Shield className="h-4 w-4" />
                        Role
                      </button>
                      <button
                        onClick={() => onAction('blacklist', user)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors",
                          user.is_blacklisted 
                            ? "bg-green-50 hover:bg-green-100 text-green-700" 
                            : "bg-red-50 hover:bg-red-100 text-red-700"
                        )}
                        title={user.is_blacklisted ? 'Kembalikan Akses' : 'Blacklist User'}
                      >
                        <Ban className="h-4 w-4" />
                        {user.is_blacklisted ? 'Whitelist' : 'Ban'}
                      </button>
                      <button
                        onClick={() => onAction('resetPassword', user)}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                        title="Reset Password ke MTI123!"
                      >
                        <Key className="h-4 w-4" />
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{' '}
            <span className="font-medium text-gray-900">
              {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}
            </span> of{' '}
            <span className="font-medium text-gray-900">{pagination.totalCount}</span> users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                // Logic for simple sliding window pagination
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
                    onClick={() => onPageChange(pageNum)}
                    className={cn(
                      "h-10 w-10 rounded-lg text-sm font-bold transition-all",
                      pagination.page === pageNum
                        ? "bg-green-600 text-white shadow-md border border-green-700"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
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
