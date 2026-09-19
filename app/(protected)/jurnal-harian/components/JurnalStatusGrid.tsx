'use client'

import React, { useState } from 'react'
import { CheckCircle, MapPin, School, AlertCircle, Calendar, ChevronDown, BookOpen, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
  const [expandedWeek, setExpandedWeek] = useState<number | null>(currentWeekNumber)

  // Identify unlocked blocks - a block is unlocked if it's the first one, if previous block completed, or in preview/admin
  const unlockedBlocks = new Set<string>()
  if (blocks.length > 0) {
    unlockedBlocks.add(blocks[0].block_code)
    for (let i = 1; i < blocks.length; i++) {
      if (blocks[i - 1].is_completed || isAdminPreview || (blocks[i].week_number > 10 && currentWeekNumber >= 11)) {
        unlockedBlocks.add(blocks[i].block_code)
      }
    }
  }

  // Group blocks by week_number
  const blocksByWeek = new Map<number, JurnalBlock[]>()
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
          <AlertCircle className="w-4 h-4 text-emerald-600" />
          <div className="text-[10px] text-emerald-900 font-bold uppercase tracking-tight">
            Pratinjau Admin: Juz 30A
          </div>
        </div>
      )}

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
                        ? "border-green-300 shadow-md scale-[1.01]" 
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
                      <ChevronDown className={cn("w-4 h-4 text-green-600 transition-transform", isExpanded && "rotate-180")} />
                    )}
                  </div>
                </Card>
              </button>

              {/* Individual Block Selector (Unlocked by clicking Week) */}
              {isExpanded && (
                <div className="grid grid-cols-4 gap-2 px-1 animate-fadeInDown">
                  {weekBlocks.map(block => {
                    const isUnlocked = unlockedBlocks.has(block.block_code) || isAdminPreview
                    
                    return (
                      <button
                        key={block.block_code}
                        disabled={!isUnlocked}
                        onClick={() => onBlockClick(block.block_code, weekNum)}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 min-h-[58px] relative",
                          block.is_completed
                            ? "bg-green-50 border-green-200 text-green-700"
                            : !isUnlocked
                              ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-60"
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
                        ) : !isUnlocked ? (
                          <Lock className="w-3 h-3 mt-1 text-gray-300" />
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
         <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-100 border border-green-200" /><span>Sedang Jalan</span></div>
         <div className="flex items-center gap-1"><div className="w-[10px] h-[10px] flex items-center justify-center"><Lock className="w-2 h-2" /></div><span>Terkunci</span></div>
      </div>
    </div>
  )
}
