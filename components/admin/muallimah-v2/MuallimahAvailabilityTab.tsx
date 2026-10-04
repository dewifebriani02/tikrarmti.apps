import { useState, useEffect, useMemo } from "react";
import { Users, BarChart3, Award, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Batch } from "@/types";

export function MuallimahAvailabilityTab() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [programTab, setProgramTab] = useState<
    "tikrar" | "pra_tikrar" | "kelas_berbayar"
  >("tikrar");
  const [muallimahStats, setMuallimahStats] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const formatDay = (day: string | number) => {
    if (!day || day === '-') return '-';
    const dayMap: Record<string, string> = {
      '1': 'Senin',
      '2': 'Selasa',
      '3': 'Rabu',
      '4': 'Kamis',
      '5': 'Jumat',
      '6': 'Sabtu',
      '7': 'Ahad'
    };
    return dayMap[day.toString()] || day.toString();
  };

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      loadHalaqahAvailability(selectedBatchId, programTab);
    }
  }, [selectedBatchId, programTab]);

  const loadBatches = async () => {
    try {
      const response = await fetch("/api/admin/batches");
      if (!response.ok) throw new Error("Failed to fetch batches");
      const result = await response.json();
      if (result.success && result.data) {
        setBatches(result.data);
        const activeBatch = result.data.find((b: Batch) => b.status === "open");
        if (activeBatch) {
          setSelectedBatchId(activeBatch.id);
        } else if (result.data.length > 0) {
          setSelectedBatchId(result.data[0].id);
        }
      }
    } catch (error) {
      toast.error("Gagal memuat data batch");
    } finally {
      setLoading(false);
    }
  };

  const loadHalaqahAvailability = async (
    batchId: string,
    tab: string = "semua"
  ) => {
    setLoading(true);
    try {
      const [resPendaftar, resDaftarUlang] = await Promise.all([
        fetch(`/api/admin/analysis/halaqah-availability?batch_id=${batchId}&mode=pendaftar&program_tab=${tab}`),
        fetch(`/api/admin/analysis/halaqah-availability?batch_id=${batchId}&mode=daftar_ulang&program_tab=${tab}`)
      ]);
      
      if (!resPendaftar.ok || !resDaftarUlang.ok) {
        toast.error("Failed to load data");
        return;
      }

      const pendaftarData = await resPendaftar.json();
      const daftarUlangData = await resDaftarUlang.json();
      
      const estimasi = pendaftarData.data?.availability || [];
      const aktual = daftarUlangData.data?.availability || [];
      // Kelas berbayar berasal dari akad Muallimah dan belum tentu sudah dibuatkan
      // halaqah aktual. Gunakan data estimasi agar nama, jadwal, dan kuotanya tetap tampil.
      const availabilitySource = programTab === "kelas_berbayar" ? estimasi : aktual;
      
      const stats: any[] = [];
      
      availabilitySource.forEach((juz: any) => {
        const details = juz.halaqah_details || [];
        details.forEach((m: any) => {
          const primarySchedule = m.schedules?.find((schedule: any) => !schedule.is_backup) || m.schedules?.[0];
          stats.push({
            name: m.muallimah_name || "Unknown",
            juz: m.preferred_juz ? (String(m.preferred_juz).toLowerCase().includes('juz') ? m.preferred_juz : `Juz ${m.preferred_juz}`) : (juz.juz_name || `Juz ${juz.juz_number}`),
            jadwal: formatDay(m.day_name || m.day_of_week || primarySchedule?.day_name || '-'),
            jam: (m.start_time || m.end_time || primarySchedule)
              ? `${m.start_time || primarySchedule?.start_time || '-'} - ${m.end_time || primarySchedule?.end_time || '-'}`
              : '-',
            kapasitas: m.max_students || 0,
            terisi: m.current_students || 0,
            tersedia: m.available_slots || 0
          });
        });
      });

      // Sort by Muallimah name
      stats.sort((a, b) => a.name.localeCompare(b.name));

      setMuallimahStats(stats);
    } catch (error) {
      toast.error("Failed to load muallimah availability");
    } finally {
      setLoading(false);
    }
  };

  const sortedStats = useMemo(() => {
    let sortableItems = [...muallimahStats];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle numeric sorting for strings like 'Juz 2' vs 'Juz 10'
        if (sortConfig.key === 'juz') {
           const aMatch = String(aValue).match(/\d+/);
           const bMatch = String(bValue).match(/\d+/);
           if (aMatch && bMatch) {
             aValue = parseInt(aMatch[0], 10);
             bValue = parseInt(bMatch[0], 10);
           }
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [muallimahStats, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-100" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-3 w-3 text-blue-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-600" />
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-gray-900">
              Ketersediaan Halaqah per Muallimah
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
              Daftar halaqah resmi (aktual) beserta ketersediaan kuota untuk masing-masing muallimah.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial min-w-[160px]">
              <Award className="h-4 w-4 text-gray-500 shrink-0" />
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setLoading(true);
                }}
                className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 bg-white cursor-pointer"
              >
                <option value="">-- Pilih Batch --</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.status === "open" ? "(Aktif)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => loadHalaqahAvailability(selectedBatchId, programTab)}
              disabled={loading || !selectedBatchId}
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white" />
              ) : (
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex gap-1.5 sm:gap-2 p-1 bg-gray-100/80 rounded-xl w-fit">
          <button
            onClick={() => setProgramTab("tikrar")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${programTab === "tikrar" ? "bg-white text-indigo-700 shadow-xs" : "text-gray-500 hover:text-gray-700"}`}
          >
            Tikrar Tahfidz
          </button>
          <button
            onClick={() => setProgramTab("pra_tikrar")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${programTab === "pra_tikrar" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500 hover:text-gray-700"}`}
          >
            Pra-Tikrar
          </button>
          <button
            onClick={() => setProgramTab("kelas_berbayar")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${programTab === "kelas_berbayar" ? "bg-white text-amber-700 shadow-xs" : "text-gray-500 hover:text-gray-700"}`}
          >
            Kelas Berbayar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : muallimahStats.length > 0 ? (
        <>
          {/* Mobile Card List View (< md) */}
          <div className="block md:hidden space-y-3">
            {sortedStats.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 truncate">{stat.name}</h4>
                    {programTab === "tikrar" && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-100">
                        {stat.juz}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    stat.tersedia <= 0 ? 'bg-red-100 text-red-700' : 
                    (stat.tersedia <= 2 || stat.terisi / (stat.kapasitas || 1) >= 0.8) ? 'bg-amber-100 text-amber-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {stat.tersedia < 0 ? `Kurang ${Math.abs(stat.tersedia)}` : `Sisa ${stat.tersedia}`}
                  </span>
                </div>

                <div className="text-[11px] text-gray-600 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-700">{stat.jadwal}</span>
                  <span>&bull;</span>
                  <span className="text-gray-500">{stat.jam}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 text-center text-xs">
                  <div className="bg-gray-50/80 rounded-lg p-1.5">
                    <div className="text-[10px] text-gray-400 font-semibold">Kapasitas</div>
                    <div className="font-black text-gray-800">{stat.kapasitas}</div>
                  </div>
                  <div className="bg-blue-50/80 rounded-lg p-1.5">
                    <div className="text-[10px] text-blue-500 font-semibold">Terisi</div>
                    <div className="font-black text-blue-700">{stat.terisi}</div>
                  </div>
                  <div className="bg-emerald-50/80 rounded-lg p-1.5">
                    <div className="text-[10px] text-emerald-600 font-semibold">Tersedia</div>
                    <div className="font-black text-emerald-700">{stat.tersedia}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th onClick={() => requestSort("name")} className="px-6 py-4 font-bold text-gray-700 whitespace-nowrap border-r border-gray-200 align-middle cursor-pointer group hover:bg-gray-100">
                      <div className="flex items-center gap-1">Nama Muallimah <SortIcon columnKey="name" /></div>
                    </th>
                    {programTab === "tikrar" && (
                      <th onClick={() => requestSort("juz")} className="px-4 py-4 font-bold text-gray-700 whitespace-nowrap border-r border-gray-200 align-middle text-center cursor-pointer group hover:bg-gray-100">
                        <div className="flex items-center justify-center gap-1">Juz <SortIcon columnKey="juz" /></div>
                      </th>
                    )}
                    <th onClick={() => requestSort("jadwal")} className="px-4 py-4 font-bold text-gray-700 whitespace-nowrap border-r border-gray-200 align-middle text-center cursor-pointer group hover:bg-gray-100">
                      <div className="flex items-center justify-center gap-1">Jadwal <SortIcon columnKey="jadwal" /></div>
                    </th>
                    <th onClick={() => requestSort("jam")} className="px-4 py-4 font-bold text-gray-700 whitespace-nowrap border-r border-gray-200 align-middle text-center cursor-pointer group hover:bg-gray-100">
                      <div className="flex items-center justify-center gap-1">Jam <SortIcon columnKey="jam" /></div>
                    </th>
                    <th onClick={() => requestSort("kapasitas")} className="px-4 py-4 font-bold text-gray-700 text-center bg-emerald-50/50 cursor-pointer group hover:bg-emerald-100">
                      <div className="flex items-center justify-center gap-1">Kapasitas <SortIcon columnKey="kapasitas" /></div>
                    </th>
                    <th onClick={() => requestSort("terisi")} className="px-4 py-4 font-bold text-gray-700 text-center bg-emerald-50/50 cursor-pointer group hover:bg-emerald-100">
                      <div className="flex items-center justify-center gap-1">Terisi <SortIcon columnKey="terisi" /></div>
                    </th>
                    <th onClick={() => requestSort("tersedia")} className="px-4 py-4 font-bold text-gray-700 text-center bg-emerald-50/50 cursor-pointer group hover:bg-emerald-100">
                      <div className="flex items-center justify-center gap-1">Sisa Kuota <SortIcon columnKey="tersedia" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedStats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-100">
                        {stat.name}
                      </td>
                      {programTab === "tikrar" && (
                        <td className="px-4 py-4 text-center border-r border-gray-100 text-gray-600">
                          {stat.juz}
                        </td>
                      )}
                      <td className="px-4 py-4 text-center border-r border-gray-100 text-gray-600">
                        {stat.jadwal}
                      </td>
                      <td className="px-4 py-4 text-center border-r border-gray-100 text-gray-600">
                        {stat.jam}
                      </td>
                      
                      {/* Aktual Cols */}
                      <td className="px-4 py-4 text-center align-middle font-bold text-gray-700">{stat.kapasitas}</td>
                      <td className="px-4 py-4 text-center align-middle font-bold text-gray-700">{stat.terisi}</td>
                      <td className="px-4 py-4 text-center align-middle">
                         <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            stat.tersedia <= 0 ? 'bg-red-100 text-red-700' : 
                            (stat.tersedia <= 2 || stat.terisi / (stat.kapasitas || 1) >= 0.8) ? 'bg-amber-100 text-amber-700' : 
                            'bg-green-100 text-green-700'
                         }`}>
                           {stat.tersedia < 0 ? `Kurang ${Math.abs(stat.tersedia)}` : stat.tersedia}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 sm:h-16 sm:w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900">Belum Ada Data</h3>
          <p className="text-gray-500 text-xs sm:text-sm max-w-sm mt-1">
            Data ketersediaan muallimah belum tersedia.
          </p>
        </div>
      )}
    </div>
  );
}
