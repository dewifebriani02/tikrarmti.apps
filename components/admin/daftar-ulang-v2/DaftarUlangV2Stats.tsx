import { Users, FileText, Clock, CheckCircle, X, FolderTree } from 'lucide-react';
import { DaftarUlangStatsData } from './types';
import { cn } from '@/lib/utils';

export function DaftarUlangV2Stats({ stats, isLoading }: { stats: DaftarUlangStatsData | null, isLoading: boolean }) {
  const cards = [
    { label: 'Total', value: stats?.total, icon: Users, color: 'bg-blue-500' },
    { label: 'Draft', value: stats?.draft, icon: FileText, color: 'bg-gray-500' },
    { label: 'Submitted', value: stats?.submitted, icon: Clock, color: 'bg-indigo-500' },
    { label: 'Approved', value: stats?.approved, icon: CheckCircle, color: 'bg-emerald-500' },
    { label: 'Rejected', value: stats?.rejected, icon: X, color: 'bg-red-500' },
    { label: 'Pilih Halaqah', value: stats?.withHalaqah, icon: FolderTree, color: 'bg-purple-500' },
    { label: 'Upload Akad', value: stats?.withAkad, icon: FileText, color: 'bg-amber-500' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      {cards.map((card, i) => {
        const isLastAndOdd = i === cards.length - 1 && cards.length % 2 !== 0;
        return (
          <div 
            key={i} 
            className={cn(
              "bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95 group",
              isLastAndOdd && "col-span-2 sm:col-span-1"
            )}
          >
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors truncate">
                {card.label}
              </p>
              {isLoading ? (
                <div className="h-5 sm:h-6 w-10 sm:w-12 bg-gray-200 rounded animate-pulse" />
              ) : (
                <h3 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
                  {(card.value || 0).toLocaleString()}
                </h3>
              )}
            </div>
            <div className={cn(
              "p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-white shadow-sm transition-transform duration-300 group-hover:scale-110 flex-shrink-0 ml-2",
              card.color
            )}>
              <card.icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </div>
        );
      })}
      
      {/* Per Juz */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 bg-white shadow-sm col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-7 mt-1 sm:mt-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Sebaran Juz</p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {isLoading ? (
            <p className="text-gray-400 text-xs">Loading...</p>
          ) : stats && Object.keys(stats.juzCount).length > 0 ? (
            Object.entries(stats.juzCount).sort(([a], [b]) => a.localeCompare(b)).map(([juz, count]) => (
              <div key={juz} className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gray-50 border border-gray-100 rounded-md sm:rounded-lg text-[11px] sm:text-xs">
                <span className="text-gray-500 font-medium">Juz {juz}:</span>
                <span className="font-extrabold text-gray-900">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-xs">Belum ada data</p>
          )}
        </div>
      </div>
    </div>
  );
}
