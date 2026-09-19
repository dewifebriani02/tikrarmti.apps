'use client';

import { Award, Clock, CheckCircle, XCircle, Info, Edit, Trash2, Undo2, MessageSquare, AlertCircle, FileText, Mic, Users } from 'lucide-react';
import { TikrarTahfidz } from './types';
import { cn } from '@/lib/utils';

interface TikrarTableProps {
  tikrar: TikrarTahfidz[];
  isLoading: boolean;
  onAction: (action: 'review' | 'edit' | 'delete' | 'unapprove', data: TikrarTahfidz) => void;
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
}

export function TikrarTable({ 
  tikrar, 
  isLoading, 
  onAction, 
  selectedIds, 
  onSelectAll, 
  onSelectOne 
}: TikrarTableProps) {
  
  const isSelected = (id: string) => selectedIds.includes(id);
  const isAllSelected = tikrar.length > 0 && tikrar.every(t => t.status !== 'pending' || isSelected(t.id));

  const getWhatsAppUrl = (t: TikrarTahfidz) => {
    const contactNumber = t.wa_phone || t.user?.whatsapp;
    if (!contactNumber) return null;

    let phoneNumber = contactNumber.replace(/\D/g, '');
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '62' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('62')) {
      phoneNumber = '62' + phoneNumber;
    }

    const userName = t.full_name || t.user?.full_name || 'Ukhti';
    const batchName = t.batch_name || t.batch?.name || '';
    const message = `Assalamu'alaikum warahmatullahi wabarakatuh, Ukhti ${userName}\n\nBarakallahu fiik atas pendaftaran Ukhti di *Program Tikrar Tahfidz MTI*${batchName ? ` (${batchName})` : ''} 🌙\n\nKami dari Markaz Tikrar Indonesia ingin menginformasikan mengenai status pendaftaran Ukhti...`;
    
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };



  if (isLoading && tikrar.length === 0) {
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
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">Thalibah</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">Tgl Daftar</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">Daftar Ulang</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">Infaq / Kader</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">Juz & Slot</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">Nilai VN</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/75 border-b border-gray-100 select-none text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tikrar.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 font-medium">
                  Tidak ada pendaftaran Tikrar ditemukan.
                </td>
              </tr>
            ) : (
              tikrar.map((t) => {
                const waUrl = getWhatsAppUrl(t);
                const hasDaftarUlang = ((t as any).daftar_ulang_submissions?.some((du: any) => du.status === 'submitted' || du.status === 'approved'));
                
                return (
                  <tr key={t.id} className={cn(
                    "transition-colors group",
                    hasDaftarUlang ? "bg-green-50/30 hover:bg-green-50/60" : "hover:bg-gray-50/50"
                  )}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => onAction('review', t)}
                            className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline text-left truncate"
                          >
                            {t.full_name || t.user?.full_name || 'Hamba Allah'}
                          </button>
                          {t.isAlumni ? (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100 select-none">
                              Alumni
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-gray-50 text-gray-400 border border-gray-100 select-none">
                              Baru
                            </span>
                          )}
                          {t.isDuplicate && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 select-none" title="Pendaftaran Ganda Terdeteksi">
                              Ganda
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-550 truncate">{t.user?.email || '-'}</span>
                        {(t.wa_phone || t.user?.whatsapp) && (
                          <a 
                            href={getWhatsAppUrl(t) || '#'}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 mt-0.5 truncate w-fit font-medium"
                            title="Chat WhatsApp"
                          >
                            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                            </svg>
                            {t.wa_phone || t.user?.whatsapp}
                          </a>
                        )}
                        <span className="text-[10px] text-gray-400 mt-1">{t.batch_name || t.batch?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-bold">{t.submission_date ? new Date(t.submission_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{t.submission_date ? new Date(t.submission_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {hasDaftarUlang ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 select-none">
                          <CheckCircle className="h-3.5 w-3.5" />
                          SUDAH
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5 select-none">
                          BELUM
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        {t.ready_for_team === 'ready' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
                            <Users className="w-3 h-3" /> Siap Kader
                          </span>
                        ) : t.ready_for_team === 'not_ready' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full w-fit">
                            <Users className="w-3 h-3" /> Belum Siap
                          </span>
                        ) : t.ready_for_team === 'infaq' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full w-fit">
                            <Users className="w-3 h-3" /> Infaq Rutin
                          </span>
                        ) : null}
                        
                        {t.infaq_amount && (
                          <div className="text-xs text-gray-600 mt-1">
                            <span className="font-semibold text-gray-700">Infaq:</span><br/>
                            {t.infaq_amount}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-gray-700">Juz {t.chosen_juz || '-'}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-tight font-medium">{t.main_time_slot || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Oral VN</span>
                        {t.oral_total_score !== null && t.oral_total_score !== undefined && !isNaN(Number(t.oral_total_score)) ? (
                          <span className={cn(
                            "text-sm font-black",
                            Number(t.oral_total_score) >= 80 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {Number(t.oral_total_score).toFixed(0)}
                          </span>
                        ) : t.oral_submission_url || t.oral_submitted_at ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5 mt-0.5 w-fit" title="Sudah mengirim rekaman (VN) - Menunggu penilaian">
                            <Mic className="h-2.5 w-2.5 text-emerald-600" />
                            ✓ VN
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 font-bold italic">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider select-none">Seleksi VN</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider w-fit border",
                          t.selection_status === 'selected' ? "bg-blue-50 text-blue-700 border-blue-100" :
                          t.selection_status === 'not_selected' ? "bg-orange-50 text-orange-700 border-orange-100" :
                          "bg-white text-gray-400 border-gray-100"
                        )}>
                          {t.selection_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {waUrl && (
                          <a 
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-xs flex items-center gap-1.5 transition-colors border border-emerald-100"
                            title="Chat via WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Chat
                          </a>
                        )}
                        <button
                          onClick={() => onAction('review', t)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs flex items-center gap-1.5 transition-colors border border-blue-100"
                          title="Review Detail"
                        >
                          <FileText className="h-4 w-4" />
                          Detail
                        </button>
                        <button
                          onClick={() => onAction('edit', t)}
                          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-xs flex items-center gap-1.5 transition-colors border border-gray-100"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => onAction('delete', t)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs flex items-center gap-1.5 transition-colors border border-red-100"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
