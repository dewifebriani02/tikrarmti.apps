'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { CheckCircle, AlertCircle, ChevronDown, Sparkles, Calendar, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface JurnalBlock {
  block_code: string
  week_number: number
  is_completed: boolean
  start_page: number
  end_page: number
  jurnal_date?: string
}

interface JurnalStatusGridProps {
  blocks: JurnalBlock[]
  currentWeekNumber: number
  onBlockClick: (blockCode: string, weekNumber: number) => void
  isAdminPreview?: boolean
}

export function JurnalStatusGrid({ blocks, currentWeekNumber, onBlockClick, isAdminPreview }: JurnalStatusGridProps) {
  // Group blocks by week_number
  const blocksByWeek = useMemo(() => {
    const map = new Map<number, JurnalBlock[]>()
    blocks.forEach(block => {
      const weekNum = block.week_number
      if (!map.has(weekNum)) {
        map.set(weekNum, [])
      }
      map.get(weekNum)!.push(block)
    })
    return map
  }, [blocks])

  // Sort weeks
  const sortedWeeks = useMemo(() => {
    return Array.from(blocksByWeek.keys()).sort((a, b) => a - b)
  }, [blocksByWeek])

  const calendarWeek = currentWeekNumber || 1
  const tashihWeek = Math.min(10, calendarWeek + 1)

  // Smart default week: find the first week that is not fully completed
  const firstIncompleteWeek = useMemo(() => {
    for (const weekNum of sortedWeeks) {
      const weekBlocks = blocksByWeek.get(weekNum) || []
      const isDone = weekBlocks.length > 0 && weekBlocks.every(b => b.is_completed)
      if (!isDone) {
        return weekNum
      }
    }
    return calendarWeek
  }, [sortedWeeks, blocksByWeek, calendarWeek])

  const [expandedWeek, setExpandedWeek] = useState<number | null>(firstIncompleteWeek)

  useEffect(() => {
    setExpandedWeek(firstIncompleteWeek)
  }, [firstIncompleteWeek])

  const isBehindSchedule = firstIncompleteWeek < calendarWeek

  return (
    <div className="space-y-3 animate-fadeInUp">
      {isAdminPreview && (
        <div className="p-3 bg-emerald-50/50 backdrop-blur-sm border border-emerald-100 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-emerald-600" />
          <div className="text-[10px] text-emerald-900 font-bold uppercase tracking-tight">
            Pratinjau Admin: Juz 30A
          </div>
        </div>
      )}

      {/* Helper Banner: Clarifies Active Ziyadah vs Tashih Schedule */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-900 leading-tight">
              Jadwal Angkatan: <span className="text-emerald-700 font-extrabold">Pekan {calendarWeek} Ziyadah</span>
              <span className="text-gray-300 mx-1.5">&bull;</span>
              <span className="text-blue-700 font-extrabold">Pekan {tashihWeek} Tashih</span>
            </p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              Tashih berjalan 1 pekan lebih awal untuk persiapan hafalan pekan depan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isBehindSchedule ? (
            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
              <span>Lengkapi Pekan {firstIncompleteWeek}</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          ) : (
            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-lg border border-emerald-200">
              Pekan Berjalan Aktif
            </span>
          )}
        </div>
      </div>

      {/* COMPACT: One Card Per Week with Inner Blocks */}
      <div className="flex flex-col gap-2">
        {sortedWeeks.map(weekNum => {
          const weekBlocks = blocksByWeek.get(weekNum)!
          const completedInWeek = weekBlocks.filter(b => b.is_completed).length
          const isFullyCompleted = completedInWeek === weekBlocks.length && weekBlocks.length > 0
          const isExpanded = expandedWeek === weekNum
          
          // Determine progress percentage
          const progressPercent = (completedInWeek / weekBlocks.length) * 100
          
          // Build dynamic style for partial fill
          const progressStyle = !isFullyCompleted && completedInWeek > 0 
            ? { background: `linear-gradient(to right, #bbf7d0 ${progressPercent}%, white ${progressPercent}%)` }
            : {}

          return (
            <div key={weekNum} className="space-y-2">
              <button
                type="button"
                onClick={() => setExpandedWeek(isExpanded ? null : weekNum)}
                className="w-full text-left transition-all active:scale-[0.99]"
              >
                <Card 
                  style={progressStyle}
                  className={cn(
                    "overflow-hidden border shadow-sm flex items-center justify-between p-3 rounded-2xl transition-all duration-300 relative",
                    isFullyCompleted 
                      ? "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-green-600/10 border-transparent" 
                      : isExpanded 
                        ? "border-green-400 shadow-md ring-1 ring-green-300 scale-[1.005]" 
                        : "bg-white border-gray-100 text-gray-900 hover:border-green-200"
                  )}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm",
                      weekNum > 10 ? "bg-amber-500 text-white" : isFullyCompleted ? "bg-white/20 text-white" : "bg-green-900 text-white"
                    )}>
                      {weekNum > 10 ? 'M' : weekNum}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={cn("text-xs font-bold leading-none", isFullyCompleted ? "text-white" : "text-gray-900")}>
                          {weekNum > 10 ? `Pekan Murajaah ${weekNum - 10}` : `Pekan ${weekNum}`}
                        </h3>
                        <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full", 
                          isFullyCompleted ? "bg-white/20 text-white" : weekNum > 10 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>
                          Hal. {Math.min(...weekBlocks.map(b => b.start_page))}
                          {weekNum > 10 && ` - ${Math.max(...weekBlocks.map(b => b.end_page))}`}
                        </span>
                        {weekNum === calendarWeek && (
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded-md", 
                            isFullyCompleted ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-800")}>
                            Jadwal Pekan Ini
                          </span>
                        )}
                      </div>
                      <p className={cn("text-[8px] font-black uppercase tracking-tighter mt-1", 
                        isFullyCompleted ? "text-green-100/60" : "text-gray-500")}>
                        {`${completedInWeek}/${weekBlocks.length} ${weekNum > 10 ? 'Hari' : 'Blok'} Selesai`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 relative z-10">
                    {isFullyCompleted ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <ChevronDown className={cn("w-4 h-4 text-green-600 transition-transform duration-200", isExpanded && "rotate-180")} />
                    )}
                  </div>
                </Card>
              </button>

              {/* Individual Block Selector (Unlocked by clicking Week) */}
              {isExpanded && (
                <div className="grid grid-cols-4 gap-2 px-1 animate-fadeInDown">
                  {weekBlocks.map(block => {
                    return (
                      <button
                        key={block.block_code}
                        type="button"
                        onClick={() => onBlockClick(block.block_code, weekNum)}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-200 min-h-[58px] relative active:scale-95 cursor-pointer",
                          block.is_completed
                            ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100/70"
                            : "bg-white border-green-100 text-gray-700 hover:border-green-500 hover:bg-green-50 shadow-sm"
                        )}
                      >
                        <span className="text-[10px] font-black tracking-tight leading-tight">{weekNum > 10 ? (block as any).part : block.block_code}</span>
                        <span className="text-[7px] font-medium opacity-60">
                          Hal. {block.start_page}{block.start_page !== block.end_page ? `-${block.end_page}` : ''}
                        </span>
                        {weekNum > 10 && (block as any).target && (
                          <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1 rounded mt-0.5">{(block as any).target}</span>
                        )}
                        
                        {block.is_completed ? (
                          <CheckCircle className="w-3 h-3 mt-1 text-green-600" />
                        ) : (
                          <div className="w-3 h-3 mt-1 border-2 border-green-200 rounded-full" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Simple Legend */}
      <div className="flex justify-center gap-4 pt-4 text-[8px] font-black text-gray-600 uppercase tracking-tighter">
         <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500" /><span>Selesai</span></div>
         <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-white border-2 border-green-200" /><span>Belum Diisi</span></div>
      </div>
    </div>
  )
}
