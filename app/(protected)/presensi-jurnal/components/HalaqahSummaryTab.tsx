import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2, BookOpen, CheckCircle, Users, Trophy, Medal } from 'lucide-react';

interface ThalibahSummary {
  user_id: string;
  full_name: string;
  is_blacklisted: boolean;
  jurnal_count: number;
  tashih_count: number;
  jurnal_percentage: number;
  tashih_percentage: number;
  progress_percentage: number;
}

interface HalaqahSummary {
  id: string;
  name: string;
  muallimah_name: string;
  total_thalibah: number;
  avg_progress: number;
  avg_jurnal_progress: number;
  avg_tashih_progress: number;
  thalibah: ThalibahSummary[];
}

interface HalaqahSummaryTabProps {
  batchId?: string;
}

export function HalaqahSummaryTab({ batchId }: HalaqahSummaryTabProps) {
  const [halaqahs, setHalaqahs] = useState<HalaqahSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [batchId]);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const url = batchId ? `/api/musyrifah/halaqah-summary?batch_id=${batchId}` : '/api/musyrifah/halaqah-summary';
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        // Hanya tampilkan halaqah Tikrar (exclude Pra-Tikrar)
        const tikrarHalaqahs = data.data.halaqahs.filter((h: HalaqahSummary) => 
          h.name.toLowerCase().includes('tikrar') && !h.name.toLowerCase().includes('pra')
        );

        // Urutkan halaqah berdasarkan avg_progress lalu total_thalibah
        tikrarHalaqahs.sort((a: HalaqahSummary, b: HalaqahSummary) => {
          if (b.avg_progress !== a.avg_progress) return b.avg_progress - a.avg_progress;
          return b.total_thalibah - a.total_thalibah;
        });

        setHalaqahs(tikrarHalaqahs);
      } else {
        setError(data.error?.message || data.message || 'Gagal memuat ringkasan halaqah');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-green-600">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="text-sm font-medium animate-pulse">Memuat ringkasan per kelas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-center">
        <p className="text-rose-600 font-medium">{error}</p>
        <button 
          onClick={fetchSummary}
          className="mt-4 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-200 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (halaqahs.length === 0) {
    return (
      <div className="p-10 bg-white border border-gray-100 rounded-2xl text-center">
        <p className="text-gray-500 font-medium">Belum ada kelas halaqah di angkatan aktif.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {halaqahs.map((h, hIdx) => {
        const halaqahRank = hIdx + 1;
        let halaqahRankBadge;
        
        if (halaqahRank === 1) {
          halaqahRankBadge = <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />;
        } else if (halaqahRank === 2) {
          halaqahRankBadge = <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />;
        } else if (halaqahRank === 3) {
          halaqahRankBadge = <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />;
        } else {
          halaqahRankBadge = <span className="text-gray-400 font-black text-xs sm:text-sm">{halaqahRank}</span>;
        }

        return (
          <div 
            key={h.id} 
            className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${halaqahRank === 1 ? 'border-yellow-200' : halaqahRank === 2 ? 'border-gray-200' : halaqahRank === 3 ? 'border-amber-200' : 'border-gray-100'}`}
          >
            {/* Header Row */}
            <div 
              onClick={() => toggleExpand(h.id)}
              className={`p-3.5 sm:p-5 cursor-pointer group transition-colors ${halaqahRank === 1 ? 'hover:bg-yellow-50/50' : halaqahRank === 2 ? 'hover:bg-gray-50' : halaqahRank === 3 ? 'hover:bg-amber-50/30' : 'hover:bg-gray-50'}`}
            >
              {/* Desktop layout */}
              <div className="hidden sm:flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    halaqahRank === 1 ? 'bg-yellow-100 border border-yellow-200' :
                    halaqahRank === 2 ? 'bg-gray-100 border border-gray-200' :
                    halaqahRank === 3 ? 'bg-amber-100 border border-amber-200' :
                    'bg-gray-50 border border-gray-100'
                  }`}>
                    {halaqahRankBadge}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 group-hover:text-green-700 transition-colors">
                      {h.name}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                      Mu'allimah: <span className="text-gray-700 font-bold">{h.muallimah_name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Jurnal
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="font-bold text-sm">{h.avg_jurnal_progress}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Tashih
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="font-bold text-sm">{h.avg_tashih_progress}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Total
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg">
                      <span className="font-bold text-sm">{h.avg_progress}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Santri
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg">
                      <Users className="w-3.5 h-3.5" />
                      <span className="font-bold text-sm">{h.total_thalibah}</span>
                    </div>
                  </div>
                  
                  <div className="p-2 rounded-full bg-gray-50 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                    {expandedId === h.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile layout */}
              <div className="sm:hidden space-y-3">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5 ${
                      halaqahRank === 1 ? 'bg-yellow-100 border border-yellow-200' :
                      halaqahRank === 2 ? 'bg-gray-100 border border-gray-200' :
                      halaqahRank === 3 ? 'bg-amber-100 border border-amber-200' :
                      'bg-gray-50 border border-gray-100'
                    }`}>
                      {halaqahRankBadge}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors leading-snug">
                        {h.name}
                      </h3>
                      <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">
                        Mu'allimah: <span className="text-gray-700 font-bold">{h.muallimah_name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="p-1.5 rounded-full bg-gray-50 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600 transition-colors shrink-0">
                    {expandedId === h.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* 4 Metrics grid on mobile */}
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-1.5 text-center">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase block">Jurnal</span>
                    <span className="text-xs font-black text-emerald-800">{h.avg_jurnal_progress}%</span>
                  </div>
                  <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-1.5 text-center">
                    <span className="text-[9px] font-bold text-blue-600 uppercase block">Tashih</span>
                    <span className="text-xs font-black text-blue-800">{h.avg_tashih_progress}%</span>
                  </div>
                  <div className="bg-purple-50/80 border border-purple-100 rounded-xl p-1.5 text-center">
                    <span className="text-[9px] font-bold text-purple-600 uppercase block">Total</span>
                    <span className="text-xs font-black text-purple-800">{h.avg_progress}%</span>
                  </div>
                  <div className="bg-gray-100/80 border border-gray-200/80 rounded-xl p-1.5 text-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase block">Santri</span>
                    <span className="text-xs font-black text-gray-800">{h.total_thalibah}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Content (Thalibah List) */}
            {expandedId === h.id && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-3 sm:p-5">
                {h.thalibah.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">
                    Tidak ada santri aktif di kelas ini.
                  </p>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {/* Desktop header */}
                    <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      <div className="col-span-5">Nama Thalibah</div>
                      <div className="col-span-2 text-center">Total Jurnal</div>
                      <div className="col-span-2 text-center">Total Tashih</div>
                      <div className="col-span-3 text-center">Rata-Rata</div>
                    </div>
                    
                    {(() => {
                      const sortedThalibah = [...h.thalibah].sort((a, b) => {
                        if (b.progress_percentage !== a.progress_percentage) return b.progress_percentage - a.progress_percentage;
                        if (b.jurnal_count !== a.jurnal_count) return b.jurnal_count - a.jurnal_count;
                        return b.tashih_count - a.tashih_count;
                      });
                      
                      return sortedThalibah.map((t, idx) => {
                        const rank = idx + 1;
                        let rankBadge;
                        
                        if (rank === 1) {
                          rankBadge = <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />;
                        } else if (rank === 2) {
                          rankBadge = <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />;
                        } else if (rank === 3) {
                          rankBadge = <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700" />;
                        } else {
                          rankBadge = <span className="text-gray-500 font-bold text-[10px] sm:text-xs">{rank}</span>;
                        }
                        
                        return (
                          <div key={t.user_id}>
                            {/* Desktop row */}
                            <div 
                              className={`hidden sm:grid grid-cols-12 gap-4 items-center bg-white p-3 px-4 rounded-xl border border-gray-100 shadow-sm ${t.is_blacklisted ? 'opacity-50 grayscale' : ''} ${rank === 1 ? 'border-yellow-200 bg-yellow-50/30' : rank === 2 ? 'border-gray-200 bg-gray-50/50' : rank === 3 ? 'border-amber-200/50 bg-amber-50/20' : ''}`}
                            >
                              <div className="col-span-5 flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                  rank === 1 ? 'bg-yellow-100 border border-yellow-200' :
                                  rank === 2 ? 'bg-gray-100 border border-gray-200' :
                                  rank === 3 ? 'bg-amber-100 border border-amber-200' :
                                  'bg-gray-50 border border-gray-100'
                                }`}>
                                  {rankBadge}
                                </div>
                                <div>
                                  <p className={`text-sm font-bold ${t.is_blacklisted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                    {t.full_name}
                                  </p>
                                  {t.is_blacklisted && (
                                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                      Blacklist
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="col-span-2 flex justify-center">
                                <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                  <BookOpen className="w-4 h-4 text-emerald-500" />
                                  <span>{t.jurnal_count}</span>
                                  <span className="text-[10px] text-gray-400 font-normal ml-0.5">({t.jurnal_percentage}%)</span>
                                </div>
                              </div>
                              
                              <div className="col-span-2 flex justify-center">
                                <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                  <CheckCircle className="w-4 h-4 text-blue-500" />
                                  <span>{t.tashih_count}</span>
                                  <span className="text-[10px] text-gray-400 font-normal ml-0.5">({t.tashih_percentage}%)</span>
                                </div>
                              </div>

                              <div className="col-span-3 flex justify-center">
                                <div className="w-full max-w-[120px] flex items-center gap-3">
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${
                                        t.progress_percentage >= 80 ? 'bg-emerald-500' :
                                        t.progress_percentage >= 50 ? 'bg-amber-500' :
                                        'bg-rose-500'
                                      }`}
                                      style={{ width: `${Math.min(100, t.progress_percentage)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-gray-700 w-9 text-right">
                                    {t.progress_percentage}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Mobile Card */}
                            <div className={`sm:hidden bg-white p-3 rounded-xl border border-gray-100 shadow-sm space-y-2.5 ${t.is_blacklisted ? 'opacity-50 grayscale' : ''} ${rank === 1 ? 'border-yellow-200 bg-yellow-50/20' : rank === 2 ? 'border-gray-200 bg-gray-50/40' : rank === 3 ? 'border-amber-200/50 bg-amber-50/10' : ''}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                    rank === 1 ? 'bg-yellow-100 border border-yellow-200' :
                                    rank === 2 ? 'bg-gray-100 border border-gray-200' :
                                    rank === 3 ? 'bg-amber-100 border border-amber-200' :
                                    'bg-gray-50 border border-gray-100'
                                  }`}>
                                    {rankBadge}
                                  </div>
                                  <span className={`text-xs font-bold truncate ${t.is_blacklisted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                    {t.full_name}
                                  </span>
                                </div>
                                {t.is_blacklisted && (
                                  <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded shrink-0">
                                    Blacklist
                                  </span>
                                )}
                                <span className="text-xs font-black text-gray-900 shrink-0">
                                  {t.progress_percentage}%
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    t.progress_percentage >= 80 ? 'bg-emerald-500' :
                                    t.progress_percentage >= 50 ? 'bg-amber-500' :
                                    'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, t.progress_percentage)}%` }}
                                />
                              </div>

                              {/* Jurnal & Tashih counts */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center justify-between px-2 py-1 bg-emerald-50/70 border border-emerald-100/50 rounded-lg text-emerald-800">
                                  <span className="text-[10px] font-medium flex items-center gap-1">
                                    <BookOpen className="w-3 h-3 text-emerald-600" /> Jurnal
                                  </span>
                                  <span className="font-bold text-[11px]">{t.jurnal_count} ({t.jurnal_percentage}%)</span>
                                </div>
                                <div className="flex items-center justify-between px-2 py-1 bg-blue-50/70 border border-blue-100/50 rounded-lg text-blue-800">
                                  <span className="text-[10px] font-medium flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-blue-600" /> Tashih
                                  </span>
                                  <span className="font-bold text-[11px]">{t.tashih_count} ({t.tashih_percentage}%)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
