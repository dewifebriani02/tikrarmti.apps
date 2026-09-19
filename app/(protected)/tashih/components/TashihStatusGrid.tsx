'use client'

import React from 'react'
import { CheckCircle, Lock, Info, ChevronRight, BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TashihBlock {
  block_code: string
  week_number: number
  is_completed: boolean
  tashih_date?: string
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

  return (
    <div className="space-y-3 animate-fadeInUp">
      {isAdminPreview && (
        <div className="p-3 bg-emerald-50/50 backdrop-blur-sm border border-emerald-100 rounded-2xl flex items-center gap-3">
          <Info className="w-4 h-4 text-emerald-600" />
          <div className="text-[10px] text-emerald-900 font-bold leading-tight uppercase tracking-tight">
            <span className="text-emerald-600">Mode Pratinjau Admin:</span> Tampilan contoh Juz 30A.
          </div>
        </div>
      )}

      {/* ULTRA COMPACT: One Card Per Week */}
      <div className="flex flex-col gap-2">
        {sortedWeeks.map(weekNum => {
          const weekBlocks = blocksByWeek.get(weekNum)!
          const completedInWeek = weekBlocks.filter(b => b.is_completed).length
          const isFullyCompleted = completedInWeek === weekBlocks.length && weekBlocks.length > 0
          
          // Get block range label (e.g., H21A - H21D)
          const firstBlock = weekBlocks[0]?.block_code || ''
          const lastBlock = weekBlocks[weekBlocks.length - 1]?.block_code || ''
          const blockRange = firstBlock === lastBlock ? firstBlock : `${firstBlock} - ${lastBlock}`

          return (
            <button
              key={weekNum}
              onClick={() => onBlockClick(firstBlock, weekNum)}
              className="w-full text-left transition-all duration-300 active:scale-[0.98] group"
            >
              <Card className={cn(
                "overflow-hidden border-none shadow-sm flex items-center justify-between p-3 sm:p-4 rounded-2xl transition-all",
                isFullyCompleted 
                  ? "bg-gradient-to-r from-green-600 to-green-500 border-green-500 text-white shadow-green-600/20" 
                  : "bg-white border border-gray-100 text-gray-900 hover:border-green-400 hover:shadow-md"
              )}>
                <div className="flex items-center gap-3">
                  {/* Compact Week ID */}
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm",
                    isFullyCompleted ? "bg-white/20 text-white" : "bg-green-900 text-white"
                  )}>
                    {weekNum}
                  </div>
                  
                  {/* Week Labels */}
                  <div>
                    <h3 className={cn(
                      "text-xs font-bold leading-none mb-1",
                      isFullyCompleted ? "text-white" : "text-gray-900"
                    )}>
                      Pekan {weekNum}
                    </h3>
                    <div className="flex items-center gap-1.5">
                       <BookOpen className={cn("w-3 h-3", isFullyCompleted ? "text-green-100/60" : "text-slate-600")} />
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-tighter",
                         isFullyCompleted ? "text-green-100/60" : "text-slate-600"
                       )}>
                         {blockRange}
                       </span>
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                      <p className={cn(
                        "text-[8px] font-black uppercase tracking-tighter",
                        isFullyCompleted ? "text-white/80" : "text-gray-400"
                      )}>
                        {completedInWeek}/{weekBlocks.length} SELESAI
                      </p>
                    </div>
                    {isFullyCompleted ? (
                      <CheckCircle className="w-5 h-5 text-white animate-fadeIn" />
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
      <div className="flex justify-center gap-4 pt-2 text-[8px] font-black text-gray-600 uppercase tracking-tighter">
         <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500" /><span>Selesai</span></div>
         <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-white border border-green-200" /><span>Tersedia / Siap Input</span></div>
      </div>
    </div>
  )
}
