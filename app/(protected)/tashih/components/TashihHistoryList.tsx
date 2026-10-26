'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { 
  History, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  School, 
  Building2, 
  Filter, 
  Edit3, 
  ChevronRight,
  BookOpen,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRA_TIKRAR_TASHIH_CLASS_TYPES } from '@/lib/pra-tikrar'

export interface TashihHistoryRecord {
  id: string
  blok: string
  lokasi: string
  lokasi_detail?: string | null
  nama_pemeriksa?: string | null
  ustadzah_id?: string | null
  halaqah_id?: string | null
  halaqah_ids?: any
  halaqah_names?: string | null
  jenis_kelas?: any
  asal_bimbingan?: string | null
  kategori_kelas?: string | null
  surat_ayat?: string | null
  jumlah_kesalahan_tajwid?: number | null
  masalah_tajwid?: any
  catatan_tambahan?: string | null
  waktu_tashih: string
  created_at?: string
}

interface TashihHistoryListProps {
  records: TashihHistoryRecord[]
  onEditRecord: (record: TashihHistoryRecord) => void
  isPraTikrar?: boolean
}

export function TashihHistoryList({
  records,
  onEditRecord,
  isPraTikrar = false
}: TashihHistoryListProps) {
  const [filterAsal, setFilterAsal] = useState<'all' | 'mti' | 'luar'>('all')
  const [filterKelas, setFilterKelas] = useState<string>('all')

  // Map helper untuk nama jenis kelas
  const classLabelMap = useMemo(() => {
    const map = new Map<string, { label: string; icon: string }>()
    PRA_TIKRAR_TASHIH_CLASS_TYPES.forEach(item => {
      map.set(item.id, { label: item.label, icon: item.icon })
    })
    return map
  }, [])

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Filter Asal
      if (filterAsal === 'mti') {
        const isMti = r.lokasi === 'mti' || r.asal_bimbingan === 'mti' || r.asal_bimbingan === 'internal';
        if (!isMti) return false;
      } else if (filterAsal === 'luar') {
        const isLuar = r.lokasi === 'luar' || r.asal_bimbingan === 'luar' || r.asal_bimbingan === 'eksternal';
        if (!isLuar) return false;
      }

      // Filter Jenis Kelas
      if (filterKelas !== 'all') {
        let classes: string[] = []
        if (Array.isArray(r.jenis_kelas)) {
          classes = r.jenis_kelas
        } else if (typeof r.jenis_kelas === 'string') {
          try { classes = JSON.parse(r.jenis_kelas) } catch {}
        }
        if (!classes.includes(filterKelas)) return false;
      }

      return true
    })
  }, [records, filterAsal, filterKelas])

  // Summary stats
  const totalRecords = records.length
  const totalFlawless = records.filter(r => (r.jumlah_kesalahan_tajwid || 0) === 0).length
  const totalWithNotes = records.filter(r => !!r.catatan_tambahan || (r.jumlah_kesalahan_tajwid || 0) > 0).length

  return (
    <div className="space-y-3 pt-3">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-gray-100 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-1.5">
              <span>Riwayat &amp; Log Setoran Tashih</span>
              <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                {totalRecords} Setoran
              </span>
            </h3>
            <p className="text-[9px] text-gray-500 font-medium">
              Daftar seluruh sesi tashih yang telah diverifikasi dan tersimpan
            </p>
          </div>
        </div>

        {/* Mini Counters */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-[9px] font-bold">
            <span className="font-black text-xs text-emerald-700 mr-1">{totalFlawless}</span>
            Lancar (0 Kesalahan)
          </div>
          {totalWithNotes > 0 && (
            <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-[9px] font-bold">
              <span className="font-black text-xs text-amber-700 mr-1">{totalWithNotes}</span>
              Ada Catatan Tajwid
            </div>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-col gap-2 p-3 bg-gray-50/70 border border-gray-100 rounded-2xl">
        <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-600 uppercase tracking-widest">
          <Filter className="w-3 h-3 text-emerald-600" />
          <span>Filter Asal &amp; Bimbingan:</span>
        </div>

        {/* Asal Bimbingan Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterAsal('all')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
              filterAsal === 'all'
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50"
            )}
          >
            Semua Asal ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterAsal('mti')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
              filterAsal === 'mti'
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50"
            )}
          >
            Internal MTI
          </button>
          <button
            type="button"
            onClick={() => setFilterAsal('luar')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
              filterAsal === 'luar'
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50"
            )}
          >
            Bimbingan Luar MTI
          </button>
        </div>

        {/* Jenis Kelas Chips (Pra-Tikrar / Multi-Kategori) */}
        {isPraTikrar && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-200/60">
            <button
              type="button"
              onClick={() => setFilterKelas('all')}
              className={cn(
                "px-2 py-0.5 rounded-md text-[9px] font-bold transition-all",
                filterKelas === 'all'
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-indigo-50"
              )}
            >
              Semua Metode
            </button>
            {PRA_TIKRAR_TASHIH_CLASS_TYPES.slice(0, 5).map(ct => (
              <button
                key={ct.id}
                type="button"
                onClick={() => setFilterKelas(filterKelas === ct.id ? 'all' : ct.id)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[9px] font-bold transition-all flex items-center gap-1",
                  filterKelas === ct.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-indigo-50"
                )}
              >
                <span>{ct.icon}</span>
                <span className="truncate max-w-[120px]">{ct.label.split('(')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Record Cards */}
      {filteredRecords.length === 0 ? (
        <Card className="p-8 text-center bg-white border border-dashed border-gray-200 rounded-2xl shadow-xs">
          <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-700">Belum ada riwayat setoran yang cocok</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {records.length === 0
              ? 'Silakan klik salah satu pekan di atas untuk mengisi formulir tashih.'
              : 'Ubah opsi filter di atas untuk melihat catatan lainnya.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredRecords.map((r, idx) => {
            // Parse array fields
            let classes: string[] = []
            if (Array.isArray(r.jenis_kelas)) {
              classes = r.jenis_kelas
            } else if (typeof r.jenis_kelas === 'string') {
              try { classes = JSON.parse(r.jenis_kelas) } catch {}
            }

            let problems: string[] = []
            if (Array.isArray(r.masalah_tajwid)) {
              problems = r.masalah_tajwid
            } else if (typeof r.masalah_tajwid === 'string') {
              try { problems = JSON.parse(r.masalah_tajwid) } catch {}
            }

            const isLuar = r.lokasi === 'luar' || r.asal_bimbingan === 'luar' || r.asal_bimbingan === 'eksternal'
            const formattedDate = new Date(r.waktu_tashih || (r as any).created_at).toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })

            return (
              <Card
                key={r.id || idx}
                className="overflow-hidden border border-gray-100 bg-white p-3.5 rounded-2xl shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col gap-2.5"
              >
                {/* Top Row: Date, Blok, & Edit Button */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-[11px] font-black text-gray-900">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{formattedDate}</span>
                    </div>

                    <div className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-tight">
                      Blok: {r.blok}
                    </div>

                    {isLuar ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-extrabold uppercase">
                        <Building2 className="w-2.5 h-2.5" /> Luar MTI
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-extrabold uppercase">
                        <School className="w-2.5 h-2.5" /> Internal MTI
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditRecord(r)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 text-[10px] font-bold transition-all shrink-0 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>

                {/* Middle Row: Pengajar & Sesi */}
                <div className="text-[11px] text-gray-700 space-y-1">
                  <div>
                    <span className="text-gray-400 font-semibold text-[10px]">Ustadzah / Penguji: </span>
                    <span className="font-bold text-gray-900">{r.nama_pemeriksa || r.lokasi_detail || 'Ustadzah MTI'}</span>
                  </div>

                  {r.halaqah_names && (
                    <div className="text-[10px] text-indigo-900 bg-indigo-50/70 p-2 rounded-xl border border-indigo-100 flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Sesi Zoom: </span>
                        <span>{r.halaqah_names}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Class Types Badges */}
                {classes.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    {classes.map(cid => {
                      const meta = classLabelMap.get(cid)
                      return (
                        <span
                          key={cid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-[9px] font-bold"
                        >
                          {meta?.icon && <span>{meta.icon}</span>}
                          <span>{meta ? meta.label.split('(')[0] : cid}</span>
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Tajwid Problems & Notes */}
                <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(r.jumlah_kesalahan_tajwid || 0) === 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> 0 Kesalahan Tajwid (Mutqin)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-md">
                        <AlertTriangle className="w-3 h-3" /> {r.jumlah_kesalahan_tajwid} Kesalahan Tajwid
                      </span>
                    )}

                    {problems.length > 0 && (
                      <span className="text-gray-500 font-medium">
                        Fokus: <span className="font-bold uppercase text-gray-700">{problems.join(', ')}</span>
                      </span>
                    )}
                  </div>

                  {r.catatan_tambahan && (
                    <div className="text-[10px] text-gray-600 italic bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 max-w-full sm:max-w-md truncate">
                      &quot;{r.catatan_tambahan}&quot;
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
