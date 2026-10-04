'use client';

import { Award, Clock, CheckCircle, XCircle } from 'lucide-react';
import { TikrarStatsData } from './types';

import { cn } from '@/lib/utils';

export type TikrarStatFilterType = 'all' | 'pending' | 'approved' | 'rejected';

interface TikrarStatsProps {
  stats: TikrarStatsData | null;
  isLoading: boolean;
  onCardClick?: (filter: TikrarStatFilterType) => void;
  activeFilter?: TikrarStatFilterType;
}

export function TikrarStats({ stats, isLoading, onCardClick, activeFilter }: TikrarStatsProps) {
  const safeStats = stats || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  };

  const cards = [
    {
      id: 'all' as TikrarStatFilterType,
      label: 'Total Pendaftar',
      value: safeStats.total,
      icon: Award,
      color: 'bg-blue-500 shadow-blue-200',
      activeRing: 'ring-2 ring-blue-500',
    },
    {
      id: 'pending' as TikrarStatFilterType,
      label: 'Belum Dinilai',
      value: safeStats.pending,
      icon: Clock,
      color: 'bg-amber-500 shadow-amber-200',
      activeRing: 'ring-2 ring-amber-500',
    },
    {
      id: 'approved' as TikrarStatFilterType,
      label: 'Lulus Seleksi',
      value: safeStats.approved,
      icon: CheckCircle,
      color: 'bg-emerald-500 shadow-emerald-200',
      activeRing: 'ring-2 ring-emerald-500',
    },
    {
      id: 'rejected' as TikrarStatFilterType,
      label: 'Tidak Lulus',
      value: safeStats.rejected,
      icon: XCircle,
      color: 'bg-red-500 shadow-red-200',
      activeRing: 'ring-2 ring-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;
        return (
          <div
            key={card.id}
            onClick={() => onCardClick?.(card.id)}
            className={cn(
              "bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group active:scale-95 min-w-0",
              isActive && card.activeRing
            )}
          >
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <p className="text-xs sm:text-sm font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors truncate">
                {card.label}
              </p>
              {isLoading ? (
                <div className="h-6 sm:h-8 w-16 sm:w-24 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <h3 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {card.value.toLocaleString()}
                </h3>
              )}
            </div>
            <div className={cn(
              "p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl text-white shadow-sm sm:shadow-lg transition-transform duration-300 group-hover:scale-110 flex-shrink-0 ml-2",
              card.color
            )}>
              <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
