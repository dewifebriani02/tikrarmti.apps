import React from 'react'
import { UserCheck, HeartHandshake, BookOpen, Home } from 'lucide-react'
import { PairingStats } from './types'

interface Props {
  stats: PairingStats
}

export function PairingStatsCard({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
      {/* Total Submissions Stats */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl gap-2 border border-indigo-400 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group text-white">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-indigo-100">Total Daftar Ulang</p>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {stats.total || 0}
            {stats.totalApproved !== undefined && (
              <span className="text-indigo-200 text-sm font-normal"> / {stats.totalApproved}</span>
            )}
          </h3>
          <p className="text-indigo-200 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider leading-tight">Thalibah Unik / Approved</p>
        </div>
        <div className="p-2 sm:p-4 shrink-0 rounded-xl text-indigo-600 bg-white shadow-lg shadow-indigo-400/50 transition-transform duration-300 group-hover:scale-110">
          <UserCheck className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
      </div>
      {/* Self Match Stats */}
      <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl gap-2 border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Pilih Sendiri</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {stats.selfMatch.approved}
            <span className="text-gray-400 text-sm font-normal"> / {stats.selfMatch.submitted}</span>
          </h3>
          <p className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider leading-tight">Dipasangkan / Menunggu</p>
        </div>
        <div className="p-2 sm:p-4 shrink-0 rounded-xl text-white bg-blue-500 shadow-lg shadow-blue-200 transition-transform duration-300 group-hover:scale-110">
          <UserCheck className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
      </div>

      {/* System Match Stats */}
      <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl gap-2 border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Dipasangkan Sistem</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {stats.systemMatch.approved}
            <span className="text-gray-400 text-sm font-normal"> / {stats.systemMatch.submitted}</span>
          </h3>
          <p className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider leading-tight">Dipasangkan / Menunggu</p>
        </div>
        <div className="p-2 sm:p-4 shrink-0 rounded-xl text-white bg-emerald-500 shadow-lg shadow-emerald-200 transition-transform duration-300 group-hover:scale-110">
          <HeartHandshake className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
      </div>

      {/* Tarteel Stats */}
      <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl gap-2 border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Tarteel</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {stats.tarteel.approved}
            <span className="text-gray-400 text-sm font-normal"> / {stats.tarteel.submitted}</span>
          </h3>
          <p className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider leading-tight">Dipasangkan / Menunggu</p>
        </div>
        <div className="p-2 sm:p-4 shrink-0 rounded-xl text-white bg-purple-500 shadow-lg shadow-purple-200 transition-transform duration-300 group-hover:scale-110">
          <BookOpen className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
      </div>

      {/* Family Stats */}
      <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl gap-2 border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-95 group">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Family</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {stats.family.approved}
            <span className="text-gray-400 text-sm font-normal"> / {stats.family.submitted}</span>
          </h3>
          <p className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider leading-tight">Dipasangkan / Menunggu</p>
        </div>
        <div className="p-2 sm:p-4 shrink-0 rounded-xl text-white bg-amber-500 shadow-lg shadow-amber-200 transition-transform duration-300 group-hover:scale-110">
          <Home className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
