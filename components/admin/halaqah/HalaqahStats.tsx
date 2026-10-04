import { BookOpen, Users, UserCheck, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HalaqahStatsData {
  total: number;
  active: number;
  muallimah: number;
  capacity: number;
  used: number;
}

interface HalaqahStatsProps {
  stats: HalaqahStatsData | null;
  isLoading: boolean;
}

export function HalaqahStats({ stats, isLoading }: HalaqahStatsProps) {
  const safeStats = stats || {
    total: 0,
    active: 0,
    muallimah: 0,
    capacity: 0,
    used: 0
  };

  const cards = [
    {
      id: 'total',
      label: 'Total Halaqah',
      value: safeStats.total,
      icon: BookOpen,
      color: 'bg-blue-500 shadow-blue-200',
    },
    {
      id: 'active',
      label: 'Halaqah Aktif',
      value: safeStats.active,
      icon: Activity,
      color: 'bg-emerald-500 shadow-emerald-200',
    },
    {
      id: 'muallimah',
      label: 'Total Muallimah',
      value: safeStats.muallimah,
      icon: UserCheck,
      color: 'bg-purple-500 shadow-purple-200',
    },
    {
      id: 'capacity',
      label: 'Kapasitas Thalibah',
      value: `${safeStats.used} / ${safeStats.capacity}`,
      icon: Users,
      color: 'bg-amber-500 shadow-amber-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group min-w-0"
          >
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <p className="text-xs sm:text-sm font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors truncate">
                {card.label}
              </p>
              {isLoading ? (
                <div className="h-6 sm:h-8 w-16 sm:w-24 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <h3 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
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
