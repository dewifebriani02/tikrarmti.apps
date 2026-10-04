'use client';

import { Award, Clock, CheckCircle, XCircle, Info, Edit, Trash2, Undo2, MessageSquare, AlertCircle, FileText } from 'lucide-react';
import { MuallimahV2Type } from './types';
import { cn } from '@/lib/utils';

interface MuallimahV2TableProps {
  muallimah: MuallimahV2Type[];
  isLoading: boolean;
  onAction: (action: 'review' | 'edit' | 'delete' | 'unapprove', data: MuallimahV2Type) => void;
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onToggleExcludeCapacity?: (id: string, exclude: boolean) => void;
}

export function MuallimahV2Table({ 
  muallimah, 
  isLoading, 
  onAction, 
  selectedIds, 
  onSelectAll, 
  onSelectOne,
  onToggleExcludeCapacity
}: MuallimahV2TableProps) {
  
  const isSelected = (id: string) => selectedIds.includes(id);
  const isAllSelected = muallimah.length > 0 && muallimah.every(t => t.status !== 'pending' || isSelected(t.id));

  const getWhatsAppUrl = (t: MuallimahV2Type) => {
    const contactNumber = t.whatsapp || t.user?.whatsapp;
    if (!contactNumber) return null;

    let phoneNumber = contactNumber.replace(/\D/g, '');
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '62' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('62')) {
      phoneNumber = '62' + phoneNumber;
    }

    const userName = t.full_name || t.user?.full_name || 'Ukhti';
    const batchName = t.batch?.name || '';
    const message = `Assalamu'alaikum warahmatullahi wabarakatuh, Ustadzah ${userName}\n\nBarakallahu fiik atas kesediaan Ukhti untuk mengajar di *Markaz Tikrar Indonesia*${batchName ? ` (${batchName})` : ''} 🌙\n\nKami ingin menginformasikan mengenai status Ukhti...`;
    
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  const checkReadiness = (t: MuallimahV2Type) => {
    const missingFields: string[] = [];
    if (!t.understands_commitment) missingFields.push('Menyetujui akad');
    if (!t.class_type) missingFields.push('Tipe Kelas');
    if (!t.preferred_juz) missingFields.push('Pilihan Juz');
    if (!t.preferred_schedule) missingFields.push('Jadwal');
    
    return {
      isReady: missingFields.length === 0,
      missingFields
    };
  };

  if (isLoading && muallimah.length === 0) {
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
    <>
      {/* Mobile Card List (< md) */}
      <div className="block md:hidden space-y-3">
        {muallimah.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500 font-medium border border-gray-100 shadow-xs">
            Tidak ada data Muallimah ditemukan.
          </div>
        ) : (
          muallimah.map((t) => {
            const readiness = checkReadiness(t);
            const waUrl = getWhatsAppUrl(t);
            
            // Parse jadwal
            let schedule = { day: '-', time_start: '-', time_end: '-' };
            let isNewFormat = false;
            let scheduleObj: any = null;
            
            if (t.preferred_schedule) {
              try {
                const parsed = typeof t.preferred_schedule === 'string' 
                  ? JSON.parse(t.preferred_schedule) 
                  : t.preferred_schedule;
                
                if (parsed) {
                  if (parsed.tikrar || parsed.pra_tahfidz || parsed.berbayar) {
                    isNewFormat = true;
                    scheduleObj = parsed;
                  } else if (parsed.day) {
                    schedule = parsed;
                  }
                }
              } catch (e) { }
            }

            if (isNewFormat && scheduleObj) {
              const firstProgram = scheduleObj.tikrar || scheduleObj.pra_tahfidz || scheduleObj.berbayar;
              if (firstProgram && firstProgram.day) {
                schedule = {
                  day: firstProgram.day || '-',
                  time_start: firstProgram.time_start || '-',
                  time_end: firstProgram.time_end || '-'
                };
              }
            }
            
            const classTypesList: string[] = [];
            const rawTypes = (t.class_type || '').split(', ').map(type => type.trim().toLowerCase());
            
            if (rawTypes.includes('tikrar_tahfidz')) classTypesList.push('Tikrar');
            if (rawTypes.includes('pra_tahfidz')) classTypesList.push('Pra-Tikrar');
            if (t.paid_class_scheme && t.paid_class_scheme !== 'none') classTypesList.push('Berbayar');
            
            rawTypes.forEach(rt => {
              if (rt !== 'tikrar_tahfidz' && rt !== 'pra_tahfidz' && rt) {
                const formatted = rt.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                if (!classTypesList.includes(formatted)) classTypesList.push(formatted);
              }
            });

            const classTypeStr = classTypesList.join(', ') || '-';
            const dayStr = (schedule && schedule.day && schedule.day !== '-') 
              ? String(schedule.day).charAt(0).toUpperCase() + String(schedule.day).slice(1).toLowerCase() 
              : '-';
            const statusStr = (t.status || 'pending').toUpperCase();

            return (
              <div key={t.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {t.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={isSelected(t.id)}
                        onChange={(e) => onSelectOne(t.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer mt-1 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => onAction('review', t)}
                        className="text-sm font-bold text-blue-600 hover:text-blue-800 text-left line-clamp-1"
                      >
                        {t.full_name || t.user?.full_name || 'Hamba Allah'}
                      </button>
                      <p className="text-xs text-gray-500 truncate">{t.email || t.user?.email || '-'}</p>
                      {t.batch?.name && (
                        <span className="text-[10px] text-gray-400 font-medium">{t.batch.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider",
                      t.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                      t.status === 'rejected' ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {statusStr}
                    </span>
                    {readiness.isReady ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle className="h-3 w-3" /> Ready
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-500 flex items-center gap-0.5">
                        <AlertCircle className="h-3 w-3" /> Incomplete
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-gray-50/70 p-2.5 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Kelas & Juz</span>
                    <span className="font-bold text-gray-800">{classTypeStr}</span>
                    <span className="text-[11px] text-gray-500 block">Juz: {t.preferred_juz || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Jadwal</span>
                    <span className="font-bold text-gray-800">{dayStr}</span>
                    <span className="text-[10px] text-gray-500 block">
                      {schedule.time_start && schedule.time_start !== '-' ? `${schedule.time_start}-${schedule.time_end}` : 'Jam: -'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-500 text-[11px]">Kecualikan Kapasitas:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.exclude_from_capacity || false}
                      onChange={(e) => onToggleExcludeCapacity && onToggleExcludeCapacity(t.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100 flex-wrap">
                  {waUrl && (
                    <a 
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1 border border-emerald-100"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>WA</span>
                    </a>
                  )}
                  <button
                    onClick={() => onAction('review', t)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 border border-blue-100"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Review</span>
                  </button>
                  <button
                    onClick={() => onAction('edit', t)}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1 border border-gray-200"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  {t.status === 'approved' && (
                    <button
                      onClick={() => onAction('unapprove', t)}
                      className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center gap-1 border border-orange-100"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      <span>Batal</span>
                    </button>
                  )}
                  <button
                    onClick={() => onAction('delete', t)}
                    className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1 border border-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Muallimah</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal Daftar</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kesiapan Data</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kelas & Juz</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Jadwal Utama</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kecualikan Kapasitas</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {muallimah.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 font-medium">
                    Tidak ada data Muallimah ditemukan.
                  </td>
                </tr>
              ) : (
                muallimah.map((t) => {
                  const readiness = checkReadiness(t);
                  const waUrl = getWhatsAppUrl(t);
                  
                  // Parse jadwal
                  let schedule = { day: '-', time_start: '-', time_end: '-' };
                  let isNewFormat = false;
                  let scheduleObj: any = null;
                  
                  if (t.preferred_schedule) {
                    try {
                      const parsed = typeof t.preferred_schedule === 'string' 
                        ? JSON.parse(t.preferred_schedule) 
                        : t.preferred_schedule;
                      
                      if (parsed) {
                        if (parsed.tikrar || parsed.pra_tahfidz || parsed.berbayar) {
                          isNewFormat = true;
                          scheduleObj = parsed;
                        } else if (parsed.day) {
                          schedule = parsed;
                        }
                      }
                    } catch (e) { }
                  }

                  // Ambil jadwal representatif untuk ditampilkan di kolom tabel
                  if (isNewFormat && scheduleObj) {
                    const firstProgram = scheduleObj.tikrar || scheduleObj.pra_tahfidz || scheduleObj.berbayar;
                    if (firstProgram && firstProgram.day) {
                      schedule = {
                        day: firstProgram.day || '-',
                        time_start: firstProgram.time_start || '-',
                        time_end: firstProgram.time_end || '-'
                      };
                    }
                  }
                  
                  const classTypesList: string[] = [];
                  const rawTypes = (t.class_type || '').split(', ').map(type => type.trim().toLowerCase());
                  
                  if (rawTypes.includes('tikrar_tahfidz')) {
                    classTypesList.push('Tikrar');
                  }
                  if (rawTypes.includes('pra_tahfidz')) {
                    classTypesList.push('Pra-Tikrar');
                  }
                  if (t.paid_class_scheme && t.paid_class_scheme !== 'none') {
                    classTypesList.push('Berbayar');
                  }
                  
                  // Fallback untuk tipe kelas kustom legacy lainnya
                  rawTypes.forEach(rt => {
                    if (rt !== 'tikrar_tahfidz' && rt !== 'pra_tahfidz' && rt) {
                      const formatted = rt.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                      if (!classTypesList.includes(formatted)) {
                        classTypesList.push(formatted);
                      }
                    }
                  });

                  const classTypeStr = classTypesList.join(', ') || '-';
                    
                  const dayStr = (schedule && schedule.day && schedule.day !== '-') 
                    ? String(schedule.day).charAt(0).toUpperCase() + String(schedule.day).slice(1).toLowerCase() 
                    : '-';
                    
                  const statusStr = (t.status || 'pending').toUpperCase();

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        {t.status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={isSelected(t.id)}
                            onChange={(e) => onSelectOne(t.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col min-w-0">
                          <button
                            onClick={() => onAction('review', t)}
                            className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline text-left truncate"
                          >
                            {t.full_name || t.user?.full_name || 'Hamba Allah'}
                          </button>
                          <span className="text-xs text-gray-500 truncate">{t.email || t.user?.email || '-'}</span>
                          {t.whatsapp || t.user?.whatsapp ? (
                            <a href={getWhatsAppUrl(t) || '#'} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-green-600 hover:text-green-700 hover:underline flex items-center mt-1 gap-1 truncate w-max">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                              {t.whatsapp || t.user?.whatsapp}
                            </a>
                          ) : null}
                          <span className="text-[10px] text-gray-400 mt-0.5">{t.batch?.name || 'No Batch'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-700">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {readiness.isReady ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs" title="Semua data lengkap">
                            <CheckCircle className="h-4 w-4" />
                            <span>READY</span>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-1.5 text-red-500 font-bold text-xs cursor-help group/ready relative"
                            title={`Belum lengkap: ${readiness.missingFields.join(', ')}`}
                          >
                            <AlertCircle className="h-4 w-4" />
                            <span>INCOMPLETE</span>
                            
                            <div className="invisible group-hover/ready:visible absolute z-50 left-0 top-6 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-lg">
                              <ul className="list-disc list-inside space-y-0.5">
                                {readiness.missingFields.slice(0, 5).map((f, i) => <li key={i}>{f}</li>)}
                                {readiness.missingFields.length > 5 && <li>...dan {readiness.missingFields.length - 5} lainnya</li>}
                              </ul>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-gray-700">{classTypeStr}</span>
                          <span className="text-[10px] text-gray-500 font-medium">Juz: {t.preferred_juz || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-gray-700">{dayStr}</span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {schedule.time_start && schedule.time_start !== '-' && schedule.time_end && schedule.time_end !== '-'
                              ? `${schedule.time_start} - ${schedule.time_end}`
                              : 'Jam belum diisi'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={t.exclude_from_capacity || false}
                            onChange={(e) => onToggleExcludeCapacity && onToggleExcludeCapacity(t.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider w-fit",
                          t.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                          t.status === 'rejected' ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {statusStr}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {waUrl && (
                            <a 
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm border border-emerald-100"
                              title="Chat via WhatsApp"
                            >
                              <MessageSquare className="h-4 w-4 shrink-0" />
                              <span className="hidden lg:inline">Chat</span>
                            </a>
                          )}
                          <button
                            onClick={() => onAction('review', t)}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm border border-blue-100"
                            title="Review Detail"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="hidden lg:inline">Review</span>
                          </button>
                          <button
                            onClick={() => onAction('edit', t)}
                            className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm border border-gray-200"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 shrink-0" />
                            <span className="hidden lg:inline">Edit</span>
                          </button>
                          {t.status === 'approved' && (
                            <button
                              onClick={() => onAction('unapprove', t)}
                              className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm border border-orange-100"
                              title="Batalkan Persetujuan"
                            >
                              <Undo2 className="h-4 w-4 shrink-0" />
                              <span className="hidden lg:inline">Batal</span>
                            </button>
                          )}
                          <button
                            onClick={() => onAction('delete', t)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm border border-red-100"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4 shrink-0" />
                            <span className="hidden lg:inline">Hapus</span>
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
    </>
  );
}
