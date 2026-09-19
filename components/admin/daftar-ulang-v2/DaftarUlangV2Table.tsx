'use client';

import { Eye, FileText, RefreshCw, RotateCcw, MessageSquare, ArrowUp, ArrowDown, ArrowUpDown, Heart, CheckCircle, XCircle, MoreVertical, Edit, Trash2, Undo2, AppWindow, Users } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { DaftarUlangSubmission } from './types';
import { getWhatsAppUrl } from '@/lib/utils/whatsapp';
import { cn, parseAkadFiles } from '@/lib/utils';

interface DaftarUlangV2TableProps {
  submissions: DaftarUlangSubmission[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onViewDetail: (submission: DaftarUlangSubmission) => void;
  onEdit: (submission: DaftarUlangSubmission) => void;
  onDelete: (submissionId: string) => void;
  onResetHalaqah: (submissionId: string) => void;
  onResetAkad?: (submissionId: string) => void;
  onUpdateStatus: (submissionId: string, type: 'akad' | 'partner', status: 'draft' | 'submitted' | 'approved') => void;
  resettingId: string | null;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onEditExamScore?: (submission: DaftarUlangSubmission) => void;
  onResetExamScore?: (submissionId: string) => void;
}


function ActionMenu({ submission, onView, onEdit, onDelete, onUpdateStatus, onResetHalaqah, onResetAkad, resettingId, onResetExamScore }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 overflow-hidden">
          <button
            onClick={() => { setIsOpen(false); onView(submission); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-gray-400" /> View Detail
          </button>
          
          <button
            onClick={() => { setIsOpen(false); onEdit(submission); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Edit className="w-4 h-4 text-blue-500" /> Edit Data
          </button>

          <div className="h-px bg-gray-100 my-1"></div>

          <button
            onClick={() => { setIsOpen(false); onUpdateStatus(submission.id, 'akad', 'draft'); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            title="Ubah status Akad menjadi Draft"
          >
            <Undo2 className="w-4 h-4 text-orange-500" /> Revert Akad
          </button>

          <button
            onClick={() => { setIsOpen(false); onUpdateStatus(submission.id, 'partner', 'draft'); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            title="Ubah status Pasangan menjadi Draft"
          >
            <Undo2 className="w-4 h-4 text-orange-500" /> Revert Pasangan
          </button>

          {submission.status === 'draft' && (submission.ujian_halaqah_id || submission.tashih_halaqah_id) && (
            <button
              onClick={() => { setIsOpen(false); onResetHalaqah(submission.id); }}
              disabled={resettingId === submission.id}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-amber-500" /> Reset Halaqah
            </button>
          )}

          {submission.exam_status === 'completed' && onResetExamScore && (
            <button
              onClick={() => { setIsOpen(false); onResetExamScore(submission); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              title="Reset ujian yang gagal agar user bisa mengulang, dan ubah juz kembali"
            >
              <RotateCcw className="w-4 h-4 text-amber-500" /> Reset Ujian Akhir
            </button>
          )}

          
          {onResetAkad && (
            <button
              onClick={() => { setIsOpen(false); onResetAkad(submission.id); }}
              disabled={resettingId === submission.id}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
              title="Hapus file akad dan set status menjadi Draft"
            >
              <RotateCcw className="w-4 h-4" /> Tolak & Hapus Akad
            </button>
          )}

          <div className="h-px bg-gray-100 my-1"></div>

          <button
            onClick={() => { setIsOpen(false); onDelete(submission.id); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Hapus Data
          </button>
        </div>
      )}
    </div>
  );
}

export function DaftarUlangV2Table({
  submissions,
  isLoading,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onViewDetail,
  onEdit,
  onDelete,
  onResetHalaqah,
  onResetAkad,
  onUpdateStatus,
  resettingId,
  sortField,
  sortOrder,
  onSort,
  onEditExamScore,
  onResetExamScore,
}: DaftarUlangV2TableProps) {
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit', timeZone: 'Asia/Jakarta' });
  };

  const renderStatusDropdown = (submission: DaftarUlangSubmission, type: 'akad' | 'partner') => {
    const status = type === 'akad' 
      ? (submission.akad_status || submission.status || 'draft') 
      : (submission.partner_status || submission.status || 'draft');
      
    const styles = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      submitted: 'bg-blue-50 text-blue-700 border-blue-200',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    };

    return (
      <div className="relative inline-block w-28">
        <select
          value={status}
          disabled={resettingId === submission.id}
          onChange={(e) => {
            const newStatus = e.target.value as 'draft' | 'submitted' | 'approved';
            if (newStatus === status) return;
            
            if (newStatus === 'draft') {
              if (window.confirm(`Yakin ingin mengembalikan status ${type === 'akad' ? 'Akad' : 'Pasangan/Halaqah'} ke Draft?`)) {
                onUpdateStatus(submission.id, type, newStatus);
              } else {
                e.target.value = status;
              }
            } else {
              onUpdateStatus(submission.id, type, newStatus);
            }
          }}
          className={cn(
            "w-full appearance-none px-2.5 py-1.5 pr-6 rounded-lg text-[11px] font-bold border shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50",
            styles[status as keyof typeof styles] || styles.draft
          )}
        >
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
        </select>
        {resettingId === submission.id ? (
          <RefreshCw className="w-3 h-3 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-70 pointer-events-none" />
        ) : (
          <ArrowUpDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-50 pointer-events-none" />
        )}
      </div>
    );
  };

  const getPartnerLabel = (submission: DaftarUlangSubmission) => {
    if (submission.partner_type === 'self_match') {
      return (
        <div className="flex items-center gap-1.5">
          <span>{submission.partner_user?.full_name || (submission.partner_user_id ? 'User Deleted / Not Found' : '-')}</span>
          {submission.is_mutual_match && (
            <span title="Mutual Self Match (Jodoh)" className="inline-flex">
              <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
            </span>
          )}
        </div>
      );
    }
    if (submission.partner_type === 'family') {
      return (
        <div className="flex items-center gap-1.5">
          <span>{submission.partner_name || '-'}</span>
          <span title="Family Match" className="inline-flex">
            <Users className="w-3.5 h-3.5 text-orange-500" />
          </span>
        </div>
      );
    }
    if (submission.partner_type === 'tarteel') {
      return (
        <div className="flex items-center gap-1.5">
          <span>{submission.partner_name || '-'}</span>
          <span title="Tarteel Match" className="inline-flex">
            <AppWindow className="w-3.5 h-3.5 text-indigo-500" />
          </span>
        </div>
      );
    }
    if (submission.partner_type === 'system_match') {
      return (
        <div className="flex items-center gap-1.5">
          <span>System Match</span>
          <span title="System Match" className="inline-flex">
            <Heart className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
          </span>
        </div>
      );
    }
    return '-';
  };

  const getWhatsAppButton = (phoneNumber?: string, name?: string) => {
    if (!phoneNumber) return null;

    const whatsappUrl = getWhatsAppUrl(
      phoneNumber, 
      name, 
      `Assalamu'alaikum ${name || 'Thalibah'},\n\nIni adalah pesan dari admin Markaz Tikrar Indonesia terkait pendaftaran ulang Program Tikrar Tahfidz MTI.\n\nJazakillahu khairan`
    );

    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-all"
        title={`WhatsApp ${phoneNumber}`}
      >
        <MessageSquare className="w-4 h-4" />
      </a>
    );
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> 
      : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Tidak ada data daftar ulang ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden relative">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="px-6 py-4 w-12">
                <input
                  type="checkbox"
                  checked={submissions.length > 0 && selectedIds.size === submissions.length}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => onSort('name')}>
                <div className="flex items-center gap-2">Thalibah {getSortIcon('name')}</div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => onSort('score_test')}>
                <div className="flex items-center gap-2">Score Test {getSortIcon('score_test')}</div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => onSort('pengabdian')}>
                <div className="flex items-center gap-2">Pengabdian {getSortIcon('pengabdian')}</div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => onSort('akad_files')}>
                <div className="flex items-center gap-2">Akad Files {getSortIcon('akad_files')}</div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => onSort('status')}>
                <div className="flex items-center gap-2">Status Akad {getSortIcon('status')}</div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => onSort('submitted_at')}>
                <div className="flex items-center gap-2">Submitted At (Akad) {getSortIcon('submitted_at')}</div>
              </th>
              <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[250px] cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => onSort('halaqah')}>
                <div className="flex items-center gap-2">Halaqah {getSortIcon('halaqah')}</div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => onSort('partner')}>
                <div className="flex items-center gap-2">Partner {getSortIcon('partner')}</div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => onSort('partner_status')}>
                <div className="flex items-center gap-2">Status Pasangan {getSortIcon('partner_status')}</div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => onSort('partner_submitted_at')}>
                <div className="flex items-center gap-2">Submitted At {getSortIcon('partner_submitted_at')}</div>
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map((submission) => {
              const isSelected = selectedIds.has(submission.id);
              return (
                <tr 
                  key={submission.id} 
                  className={cn(
                    "hover:bg-blue-50/30 transition-colors group",
                    isSelected ? "bg-blue-50/50" : "bg-white"
                  )}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onSelectOne(submission.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold text-gray-900">
                        {submission.confirmed_full_name || submission.user?.full_name || '-'}
                      </p>
                      
                      {submission.user?.whatsapp && (
                        <a 
                          href={getWhatsAppUrl(
                            submission.user.whatsapp, 
                            submission.confirmed_full_name || submission.user.full_name, 
                            `Assalamu'alaikum ${submission.confirmed_full_name || submission.user.full_name || 'Thalibah'},\n\nIni adalah pesan dari admin Markaz Tikrar Indonesia terkait pendaftaran ulang Program Tikrar Tahfidz MTI.\n\nJazakillahu khairan`
                          )}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 truncate w-fit font-medium"
                          title="Chat WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                          </svg>
                          {submission.user.whatsapp}
                        </a>
                      )}

                      <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 flex-wrap">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded-md text-gray-600">
                          Juz {submission.confirmed_chosen_juz || '-'}
                          {submission.registration?.final_juz ? ` (Turun ke: ${submission.registration.final_juz})` : ''}
                        </span>
                        <span className="bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100">
                          {submission.confirmed_main_time_slot || '-'}
                        </span>
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      {/* Kuis Akad (Fase 3) */}
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900">
                          {submission.akad_quiz?.score ?? '-'}
                        </span>
                        <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap">KUIS AKAD (F3)</span>
                      </div>

                      {/* Ujian Tulis (Fase 3 Placement) */}
                      <div className="flex flex-col pl-3 border-l border-gray-100 min-w-[90px]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-gray-900 flex items-center gap-1">
                            {submission.registration?.exam_score ?? '-'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditExamScore && onEditExamScore(submission)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit Nilai"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            {submission.registration?.exam_score != null && (
                              <button
                                onClick={() => onResetExamScore && onResetExamScore(submission.registration.id)}
                                disabled={resettingId === submission.registration.id}
                                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                title="Hapus/Reset Nilai"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col mt-0.5">
                          <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap">UJIAN TULIS (F3)</span>
                          {submission.registration?.exam_score == null && submission.is_alumni && (
                            <span className="text-[8px] text-blue-500 font-semibold">(Alumni)</span>
                          )}
                          {submission.registration?.exam_score == null && !submission.is_alumni && submission.registration?.chosen_juz?.startsWith('30') && (
                            <span className="text-[8px] text-orange-500 font-semibold">(Juz 30)</span>
                          )}
                        </div>
                      </div>

                      {/* Lisan / Oral */}
                      {submission.registration?.oral_total_score !== null && submission.registration?.oral_total_score !== undefined ? (
                        <div className="flex flex-col pl-3 border-l border-gray-100">
                          <span className="text-sm font-black text-blue-600">
                            {submission.registration.oral_total_score}
                          </span>
                          <span className="text-[9px] text-gray-400 font-medium">LISAN</span>
                        </div>
                      ) : (
                        <div className="flex flex-col pl-3 border-l border-gray-100">
                          <span className="text-xs text-gray-300 font-bold italic">N/A</span>
                          <span className="text-[9px] text-gray-400 font-medium mt-0.5">LISAN</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium text-gray-700">
                      {(() => {
                        const val = (submission.pengabdian_type || submission.pengabdian_choice || '').toLowerCase();
                        if (!val || val === '-' || val === 'tidak, qadarullah belum bisa.') {
                          return <span className="text-gray-400 italic">-</span>;
                        }
                        if (val.includes('donasi') || val.includes('donatur')) {
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded-md border border-amber-100 w-fit">
                                Donasi
                              </span>
                              {submission.donasi_amount && (
                                <span className="text-[11px] text-gray-600 font-medium mt-0.5">
                                  Rp {Number(submission.donasi_amount).toLocaleString('id-ID')}
                                </span>
                              )}
                            </div>
                          );
                        }
                        
                        // Otherwise it's Mengabdi
                        const roles = [];
                        if (val.includes('muallimah')) roles.push('Muallimah');
                        if (val.includes('musyrifah')) roles.push('Musyrifah');
                        if (val.includes('admin')) roles.push('Admin');
                        
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-teal-700 font-semibold bg-teal-50 px-2 py-1 rounded-md border border-teal-100 w-fit">
                              Mengabdi
                            </span>
                            {roles.length > 0 && (
                              <span className="text-[11px] text-gray-600 font-medium mt-0.5">
                                {roles.join(', ')}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const files = parseAkadFiles(submission.akad_files);
                      return files.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {files.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors w-max"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {file.name || `File ${idx + 1}`}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">Belum upload</span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    {renderStatusDropdown(submission, 'akad')}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600">
                    {formatDate(submission.submitted_at || submission.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium text-gray-700">
                      <div className="flex flex-col gap-0.5">
                        <span className={cn("font-bold text-sm", submission.ujian_halaqah?.name ? "text-blue-700" : "text-gray-900")}>
                          {submission.ujian_halaqah?.name || 'Belum pilih'}
                        </span>
                        {submission.ujian_halaqah?.program?.batch?.name && (
                          <span className="text-orange-600 font-semibold text-[10px] bg-orange-50 w-fit px-1.5 py-0.5 rounded border border-orange-100">
                            {submission.ujian_halaqah.program.batch.name}
                          </span>
                        )}
                        {submission.ujian_halaqah?.muallimah_name && (
                          <span className="text-gray-500 text-[11px] mt-0.5">
                            {submission.ujian_halaqah.muallimah_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">
                      {getPartnerLabel(submission)}
                    </div>
                    <div className="text-[11px] text-gray-500 uppercase tracking-wide font-medium mt-0.5">
                      {submission.partner_type ? submission.partner_type.replace('_', ' ') : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {renderStatusDropdown(submission, 'partner')}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600">
                    {formatDate(submission.submitted_at || submission.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ActionMenu 
                      submission={submission}
                      onView={onViewDetail}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onUpdateStatus={onUpdateStatus}
                      onResetHalaqah={onResetHalaqah}
                      onResetAkad={onResetAkad}
                      resettingId={resettingId}
                      onResetExamScore={onResetExamScore}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
