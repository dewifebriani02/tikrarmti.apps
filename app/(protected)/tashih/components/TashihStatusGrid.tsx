'use client'

import React from 'react'
import { CheckCircle, Lock, Info, ChevronRight, BookOpen, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TashihBlock {
  block_code: string
  week_number: number
  is_completed: boolean
  tashih_date?: string
  start_page?: number
  end_page?: number
}

interface TashihStatusGridProps {
  blocks: TashihBlock[]
  currentWeekNumber: number
  onBlockClick: (blockCode: string, weekNumber: number) => void
  isAdminPreview?: boolean
}

export function TashihStatusGrid({ blocks, currentWeekNumber, onBlockClick, isAdminPreview }: TashihStatusGridProps) {
  // Group blocks by week_number
  const blocksByWeek = new Map<number, TashihBlock[]>()
  blocks.forEach(block => {
    const weekNum = block.week_number
    if (!blocksByWeek.has(weekNum)) {
      blocksByWeek.set(weekNum, [])
    }
    blocksByWeek.get(weekNum)!.push(block)
  })

  // Sort weeks
  const sortedWeeks = Array.from(blocksByWeek.keys()).sort((a, b) => a - b)
  const activeTashihWeek = currentWeekNumber || 1
  const ziyadahWeek = Math.max(1, activeTashihWeek - 1)

  const handleWeekClick = (firstBlock: string, weekNum: number, isFutureWeek: boolean) => {
    if (isFutureWeek) {
      toast.info(`Tashih Pekan ${weekNum} belum dibuka. Jadwal Tashih angkatan saat ini masih Pekan ke-${activeTashihWeek}.`)
      return
    }
    onBlockClick(firstBlock, weekNum)
  }

  return (
    <div className="space-y-3 animate-fadeInUp">
      {isAdminPreview && (
        <div className="p-3 bg-emerald-50/50 backdrop-blur-sm border border-emerald-100 rounded-2xl flex items-center gap-3">
          <Info className="w-4 h-4 text-emerald-600" />
          <div className="text-[10px] text-emerald-900 font-bold leading-tight uppercase tracking-tight">
            <span className="text-emerald-600">Mode Pratinjau Admin:</span> Tampilan contoh Juz 30A (Semua Pekan Terbuka).
          </div>
        </div>
      )}

      {/* Helper Banner: Clarifies Active Tashih vs Ziyadah Schedule */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50 via-teal-50 to-emerald-50 border border-blue-100/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-900 leading-tight">
              Jadwal Angkatan: <span className="text-blue-700 font-extrabold">Pekan {activeTashihWeek} Tashih</span>
              <span className="text-gray-300 mx-1.5">&bull;</span>
              <span className="text-emerald-700 font-extrabold">Pekan {ziyadahWeek} Ziyadah</span>
            </p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              Tashih berjalan 1 pekan lebih awal untuk persiapan bacaan pekan depan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-extrabold text-blue-800 bg-blue-100/90 px-2.5 py-1 rounded-lg border border-blue-200">
            Pekan Tashih Aktif: P{activeTashihWeek}
          </span>
        </div>
      </div>

      {/* COMPACT: One Card Per Week */}
      <div className="flex flex-col gap-2">
        {sortedWeeks.map(weekNum => {
          const weekBlocks = blocksByWeek.get(weekNum)!
          const completedInWeek = weekBlocks.filter(b => b.is_completed).length
          const isFullyCompleted = completedInWeek === weekBlocks.length && weekBlocks.length > 0
          const isFutureWeek = !isAdminPreview && weekNum > activeTashihWeek
          
          // Get block range label (e.g., H21A - H21D)
          const firstBlock = weekBlocks[0]?.block_code || ''
          const lastBlock = weekBlocks[weekBlocks.length - 1]?.block_code || ''
          const blockRange = firstBlock === lastBlock ? firstBlock : `${firstBlock} - ${lastBlock}`

          return (
            <button
              key={weekNum}
              type="button"
              onClick={() => handleWeekClick(firstBlock, weekNum, isFutureWeek)}
              className={cn(
                "w-full text-left transition-all duration-300",
                isFutureWeek ? "cursor-not-allowed opacity-60" : "active:scale-[0.98] cursor-pointer group"
              )}
            >
              <Card className={cn(
                "overflow-hidden shadow-sm flex items-center justify-between p-3 sm:p-4 rounded-2xl transition-all border",
                isFullyCompleted 
                  ? "bg-gradient-to-r from-green-600 to-green-500 border-green-500 text-white shadow-green-600/20" 
                  : isFutureWeek
                    ? "bg-gray-50 border-gray-200 text-gray-400"
                    : "bg-white border-gray-100 text-gray-900 hover:border-green-400 hover:shadow-md"
              )}>
                <div className="flex items-center gap-3">
                  {/* Compact Week ID */}
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm",
                    isFutureWeek 
                      ? "bg-gray-300 text-gray-600" 
                      : isFullyCompleted 
                        ? "bg-white/20 text-white" 
                        : "bg-green-900 text-white"
                  )}>
                    {isFutureWeek ? <Lock className="w-3.5 h-3.5" /> : weekNum}
                  </div>
                  
                  {/* Week Labels */}
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={cn(
                        "text-xs font-bold leading-none",
                        isFullyCompleted ? "text-white" : isFutureWeek ? "text-gray-500" : "text-gray-900"
                      )}>
                        Pekan {weekNum}
                      </h3>

                      <div className="flex items-center gap-1.5">
                         <BookOpen className={cn("w-3 h-3", isFullyCompleted ? "text-green-100/80" : isFutureWeek ? "text-gray-400" : "text-slate-600")} />
                         <span className={cn(
                           "text-[9px] font-black uppercase tracking-tighter",
                           isFullyCompleted ? "text-green-100/80" : isFutureWeek ? "text-gray-400" : "text-slate-600"
                         )}>
                           {blockRange}
                         </span>
                      </div>

                      {weekNum === activeTashihWeek && !isFutureWeek && (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-md", 
                          isFullyCompleted ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-800"
                        )}>
                          Jadwal Pekan Ini
                        </span>
                      )}

                      {isFutureWeek && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-600 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Belum Dibuka
                        </span>
                      )}
                    </div>

                    <p className={cn(
                      "text-[8px] font-black uppercase tracking-tighter", 
                      isFullyCompleted ? "text-green-100/70" : isFutureWeek ? "text-gray-400" : "text-gray-500"
                    )}>
                      {isFutureWeek 
                        ? `Akan dibuka sesuai jadwal pekan ke-${weekNum}` 
                        : `${completedInWeek}/${weekBlocks.length} SELESAI`
                      }
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {isFullyCompleted ? (
                      <CheckCircle className="w-5 h-5 text-white animate-fadeIn" />
                    ) : isFutureWeek ? (
                      <Lock className="w-4 h-4 text-gray-400" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-green-200/50 flex items-center justify-center group-hover:border-green-500 transition-colors">
                         <ChevronRight className="w-3 h-3 text-green-500" />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 pt-4 text-[8px] font-black text-gray-600 uppercase tracking-tighter">
         <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500" /><span>Selesai</span></div>
         <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-white border-2 border-green-200" /><span>Sedang Berjalan</span></div>
         <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-gray-300" /><span>Terkunci</span></div>
      </div>
    </div>
  )
}
