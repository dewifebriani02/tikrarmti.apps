"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  HeartHandshake,
  BookOpen,
  ChevronRight,
  FileText,
  Award,
  MessageCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface Batch {
  id: string;
  name: string;
  status: string;
}

interface MuallimaRegistration {
  id: string;
  status: string;
  preferred_max_thalibah: number | null;
  user_id: string;
}

interface ThalibahRegistration {
  id: string;
  status: string;
  selection_status: string | null;
}

interface Halaqah {
  id: string;
  program_id: string | null;
  max_students: number | null;
  muallimah_id: string | null;
}

interface HalaqahStudent {
  id: string;
}

interface DaftarUlangSubmission {
  id: string;
  status: string;
  ujian_halaqah_id: string | null;
  tashih_halaqah_id: string | null;
  is_tashih_umum: boolean;
  user_id: string;
}

interface BatchAnalysis {
  batch_id: string;
  batch_name: string;
  batch_status: string;

  // Muallimah stats
  total_muallimah: number;
  approved_muallimah: number;
  pending_muallimah: number;
  rejected_muallimah: number;

  // Thalibah stats (from pendaftaran_tikrar_tahfidz)
  total_thalibah: number;
  approved_thalibah: number;
  pending_thalibah: number;
  selected_thalibah: number;

  // Daftar Ulang stats
  total_daftar_ulang: number;
  submitted_daftar_ulang: number;
  approved_daftar_ulang: number;

  // Halaqah stats
  total_halaqah: number;
  halaqah_with_program: number;
  halaqah_without_program: number;

  // Capacity analysis (including daftar ulang submissions)
  total_halaqah_capacity: number;
  total_filled_slots: number;
  total_available_slots: number;
  capacity_percentage: number;

  // Ratio analysis
  muallimah_thalibah_ratio: string;
  avg_thalibah_per_muallimah: number;

  // Status
  is_adequate: boolean;
  recommendation: string;
}

interface HalaqahAvailability {
  juz_number: number;
  juz_name: string;
  total_thalibah: number;
  thalibah_breakdown: Record<
    string,
    { code: string; name: string; part: string; thalibah_count: number }
  >;
  total_halaqah: number;
  total_capacity: number;
  total_filled: number;
  total_available: number;
  needed_halaqah: number;
  utilization_percentage: number;
  total_schedules?: number;
  halaqah_details: any[];
}

type AnalysisTabType = "overview";

export function MuallimahAnalysisTab() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalysisTabType>("overview");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [analysis, setAnalysis] = useState<BatchAnalysis | null>(null);
  const [halaqahData, setHalaqahData] = useState<HalaqahAvailability[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<
    "pendaftar" | "daftar_ulang"
  >("daftar_ulang");
  const [programTab, setProgramTab] = useState<
    "tikrar" | "pra_tikrar" | "kelas_berbayar"
  >("tikrar");
  const [rawAnalysisData, setRawAnalysisData] = useState<any>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      if (activeTab === "overview") {
        loadAnalysis(selectedBatchId);
        loadHalaqahAvailability(selectedBatchId, analysisMode, programTab);
      }
    }
  }, [selectedBatchId, activeTab]);

  useEffect(() => {
    if (rawAnalysisData) {
      processAnalysisData(rawAnalysisData, analysisMode);
      loadHalaqahAvailability(selectedBatchId, analysisMode, programTab);
    }
  }, [rawAnalysisData, analysisMode, programTab]);

  const handleDragStart = (e: React.DragEvent, muallimahId: string) => {
    e.dataTransfer.setData("muallimah_id", muallimahId);
  };

  const handleAssignJuz = async (muallimahId: string, targetJuz: string) => {
    if (!muallimahId || !selectedBatchId) return;

    try {
      const toastId = toast.loading("Memindahkan muallimah...");
      const res = await fetch("/api/admin/muallimah/assign-juz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          muallimah_id: muallimahId,
          assigned_juz: targetJuz,
          batch_id: selectedBatchId,
        }),
      });

      if (res.ok) {
        toast.success("Muallimah berhasil dipindahkan", { id: toastId });
        loadAnalysis(selectedBatchId);
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal memindahkan muallimah", {
          id: toastId,
        });
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const handleDrop = async (e: React.DragEvent, targetJuz: string) => {
    e.preventDefault();
    const muallimahId = e.dataTransfer.getData("muallimah_id");
    if (!muallimahId || !selectedBatchId) return;

    try {
      const toastId = toast.loading("Memindahkan muallimah...");
      const res = await fetch("/api/admin/muallimah/assign-juz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          muallimah_id: muallimahId,
          assigned_juz: targetJuz,
          batch_id: selectedBatchId,
        }),
      });

      if (res.ok) {
        toast.success("Muallimah berhasil dipindahkan", { id: toastId });
        loadAnalysis(selectedBatchId);
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal memindahkan muallimah", {
          id: toastId,
        });
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const loadBatches = async () => {
    try {
      const response = await fetch("/api/admin/batches?limit=1000");
      if (response.ok) {
        const result = await response.json();
        const activeBatches = (result.data || []).filter(
          (b: Batch) =>
            b.status === "open" ||
            b.status === "closed" ||
            b.status === "ongoing",
        );
        setBatches(activeBatches);

        // Find the currently active batch
        const active =
          activeBatches.find(
            (b: any) =>
              b.registration_start_date &&
              b.registration_end_date &&
              new Date(b.registration_start_date) <= new Date() &&
              new Date(b.registration_end_date) >= new Date(),
          ) ||
          activeBatches.find((b: any) => b.status === "open") ||
          activeBatches[0];

        if (active && !selectedBatchId) {
          setSelectedBatchId(active.id);
        }
      }
    } catch (error) {
      console.error("Error loading batches:", error);
      toast.error("Failed to load batches");
    } finally {
      setLoading(false);
    }
  };

  const processAnalysisData = (
    data: any,
    mode: "pendaftar" | "daftar_ulang",
  ) => {
    try {
      const { batch } = data;
      let {
        muallimahs,
        thalibahs,
        halaqahs,
        students,
        daftarUlangSubmissions,
      } = data;

      // Filter by program tab
        // Filter Muallimah based on preferred_schedule
        muallimahs = (muallimahs || []).filter((m: any) => {
          let pSched = m.preferred_schedule;
          if (typeof pSched === "string") {
            try {
              pSched = JSON.parse(pSched);
            } catch (e) {
              pSched = null;
            }
          }
          if (programTab === "tikrar") return pSched?.tikrar;
          if (programTab === "pra_tikrar") return pSched?.pra_tahfidz;
          if (programTab === "kelas_berbayar")
            return (
              pSched?.berbayar ||
              (m.paid_class_scheme && m.paid_class_scheme !== "none")
            );
          return true;
        });

        // Filter Thalibah based on programs.class_type and selection_status (for Pendaftar mode)
        thalibahs = (thalibahs || []).filter((t: any) => {
          const cType = t.programs?.class_type;

          if (mode === "pendaftar") {
            if (programTab === "tikrar") {
              return (
                cType === "tikrar_tahfidz" &&
                ["selected", "waitlist", "passed"].includes(t.selection_status)
              );
            }
            if (programTab === "pra_tikrar") {
              return (
                cType === "pra_tahfidz" ||
                (cType === "tikrar_tahfidz" &&
                  t.selection_status === "not_selected")
              );
            }
            if (programTab === "kelas_berbayar") return false;

            // For 'semua' tab in pendaftar mode
            return (
              ["selected", "waitlist", "passed", "not_selected"].includes(
                t.selection_status,
              ) || cType === "pra_tahfidz"
            );
          } else {
            // Logika default / daftar_ulang
            if (programTab === "tikrar") return cType === "tikrar_tahfidz";
            if (programTab === "pra_tikrar") return cType === "pra_tahfidz";
            if (programTab === "kelas_berbayar") return false; // Biasanya tidak ada thalibah untuk kelas berbayar di tabel pendaftaran_tikrar_tahfidz
            return true;
          }
        });

        // Filter Halaqah based on programs.class_type
        halaqahs = (halaqahs || []).filter((h: any) => {
          const cType = h.programs?.class_type;
          if (programTab === "tikrar") return cType === "tikrar_tahfidz";
          if (programTab === "pra_tikrar") return cType === "pra_tahfidz";
          if (programTab === "kelas_berbayar")
            return cType === "kelas_berbayar";
          return true;
        });

        // Filter Daftar Ulang
        daftarUlangSubmissions = (daftarUlangSubmissions || []).filter(
          (d: any) => {
            // Check if halaqah in daftar ulang matches the program
            const halaqahMatch = (halaqahs || []).find(
              (h: any) =>
                h.id === d.ujian_halaqah_id || h.id === d.tashih_halaqah_id,
            );
            return halaqahMatch !== undefined;
          },
        );

      // Process muallimah stats
      const muallimaList = (muallimahs || []) as MuallimaRegistration[];
      const totalMuallimah = muallimaList.length;
      const approvedMuallimah = muallimaList.filter(
        (m: any) => m.status === "approved" && !m.exclude_from_capacity,
      ).length;
      const pendingMuallimah = muallimaList.filter(
        (m: any) => m.status === "pending" || m.status === "review",
      ).length;
      const rejectedMuallimah = muallimaList.filter(
        (m: any) => m.status === "rejected",
      ).length;

      // Process thalibah stats
      const thalibahList = (thalibahs || []) as ThalibahRegistration[];
      const totalThalibah = thalibahList.length;
      const approvedThalibah = thalibahList.filter(
        (t: ThalibahRegistration) => t.status === "approved",
      ).length;
      const pendingThalibah = thalibahList.filter(
        (t: ThalibahRegistration) => t.status === "pending",
      ).length;
      const selectedThalibah = thalibahList.filter(
        (t: ThalibahRegistration) => t.selection_status === "selected",
      ).length;

      // Process daftar ulang stats
      const daftarUlangList = (daftarUlangSubmissions ||
        []) as DaftarUlangSubmission[];
      const totalDaftarUlang = daftarUlangList.length;
      const submittedDaftarUlang = daftarUlangList.filter(
        (d: DaftarUlangSubmission) => d.status === "submitted",
      ).length;
      const approvedDaftarUlang = daftarUlangList.filter(
        (d: DaftarUlangSubmission) => d.status === "approved",
      ).length;

      // Filter halaqahs by muallimah from this batch
      const approvedMuallimaIds = muallimaList
        .filter((m: any) => m.status === "approved" && !m.exclude_from_capacity)
        .map((m: any) => m.user_id);
      const halaqahList = (halaqahs || []) as Halaqah[];
      const batchHalaqahs = halaqahList.filter(
        (h: Halaqah) =>
          h.muallimah_id && approvedMuallimaIds.includes(h.muallimah_id),
      );

      let totalHalaqah = batchHalaqahs.length;
      const halaqahWithProgram = batchHalaqahs.filter(
        (h: Halaqah) => h.program_id !== null,
      ).length;
      const halaqahWithoutProgram = batchHalaqahs.filter(
        (h: Halaqah) => h.program_id === null,
      ).length;

      let totalCapacity = batchHalaqahs.reduce(
        (sum: number, h: Halaqah) => sum + (h.max_students || 0),
        0,
      );
      const batchHalaqahIds = batchHalaqahs.map((h) => h.id);
      const halaqahStudentMap = new Map<string, Set<string>>();

      daftarUlangList.forEach((submission: DaftarUlangSubmission) => {
        const uniqueHalaqahIds: string[] = [];
        if (
          submission.ujian_halaqah_id &&
          batchHalaqahIds.includes(submission.ujian_halaqah_id)
        ) {
          uniqueHalaqahIds.push(submission.ujian_halaqah_id);
        }
        if (
          submission.tashih_halaqah_id &&
          !submission.is_tashih_umum &&
          batchHalaqahIds.includes(submission.tashih_halaqah_id)
        ) {
          if (!uniqueHalaqahIds.includes(submission.tashih_halaqah_id)) {
            uniqueHalaqahIds.push(submission.tashih_halaqah_id);
          }
        }
        for (let i = 0; i < uniqueHalaqahIds.length; i++) {
          const halaqahId = uniqueHalaqahIds[i];
          if (!halaqahStudentMap.has(halaqahId)) {
            halaqahStudentMap.set(halaqahId, new Set());
          }
          halaqahStudentMap.get(halaqahId)!.add(submission.user_id);
        }
      });

      const filledSlotsFromStudents = students?.length || 0;
      let filledSlotsFromDaftarUlang = 0;
      const halaqahEntries = Array.from(halaqahStudentMap.entries());
      for (const [halaqahId, userSet] of halaqahEntries) {
        filledSlotsFromDaftarUlang += userSet.size;
      }

      let filledSlots = filledSlotsFromStudents + filledSlotsFromDaftarUlang;

      if (mode === "pendaftar") {
        totalHalaqah = approvedMuallimah;
        totalCapacity = muallimaList
          .filter(
            (m: any) => m.status === "approved" && !m.exclude_from_capacity,
          )
          .reduce(
            (sum: number, m: any) => sum + (m.preferred_max_thalibah || 10),
            0,
          );
        filledSlots = totalThalibah;
      }

      const availableSlots = Math.max(0, totalCapacity - filledSlots);
      const capacityPercentage =
        totalCapacity > 0
          ? Math.round((filledSlots / totalCapacity) * 100)
          : filledSlots > 0
            ? 100
            : 0;

      // Use mode to determine base thalibah count
      const activeThalibahCount =
        mode === "pendaftar"
          ? totalThalibah
          : approvedDaftarUlang > 0
            ? approvedDaftarUlang
            : selectedThalibah;

      const ratio =
        approvedMuallimah > 0
          ? `1:${Math.round(activeThalibahCount / approvedMuallimah)}`
          : "0:0";
      const avgThalibahPerMuallimah =
        approvedMuallimah > 0
          ? Math.round(activeThalibahCount / approvedMuallimah)
          : 0;
      const recommendedRatio = 10;
      const isAdequate = avgThalibahPerMuallimah <= recommendedRatio;

      let recommendation = "";
      if (approvedMuallimah === 0) {
        recommendation =
          "Belum ada muallimah yang diapprove. Segera review dan approve muallimah.";
      } else if (activeThalibahCount === 0) {
        recommendation =
          mode === "pendaftar"
            ? "Belum ada pendaftar thalibah."
            : "Belum ada thalibah yang mendaftar ulang.";
      } else if (avgThalibahPerMuallimah > recommendedRatio) {
        const neededMuallimah =
          Math.ceil(activeThalibahCount / recommendedRatio) - approvedMuallimah;
        recommendation = `Jumlah muallimah kurang memadai. Dibutuhkan tambahan ${neededMuallimah} muallimah untuk rasio ideal (1:10 maksimal).`;
      } else if (avgThalibahPerMuallimah < 5 && activeThalibahCount > 0) {
        recommendation =
          "Jumlah muallimah berlebih. Pertimbangkan untuk meningkatkan kuota thalibah per halaqah.";
      } else {
        recommendation =
          "Rasio muallimah dan thalibah sudah ideal. Siap untuk dijadwalkan ke halaqah.";
      }

      const analysisData: BatchAnalysis = {
        batch_id: batch.id,
        batch_name: batch.name,
        batch_status: batch.status,
        total_muallimah: totalMuallimah,
        approved_muallimah: approvedMuallimah,
        pending_muallimah: pendingMuallimah,
        rejected_muallimah: rejectedMuallimah,
        total_thalibah: totalThalibah,
        approved_thalibah: approvedThalibah,
        pending_thalibah: pendingThalibah,
        selected_thalibah: selectedThalibah,
        total_daftar_ulang: totalDaftarUlang,
        submitted_daftar_ulang: submittedDaftarUlang,
        approved_daftar_ulang: approvedDaftarUlang,
        total_halaqah: totalHalaqah,
        halaqah_with_program: halaqahWithProgram,
        halaqah_without_program: halaqahWithoutProgram,
        total_halaqah_capacity: totalCapacity,
        total_filled_slots: filledSlots,
        total_available_slots: availableSlots,
        capacity_percentage: capacityPercentage,
        muallimah_thalibah_ratio: ratio,
        avg_thalibah_per_muallimah: avgThalibahPerMuallimah,
        is_adequate: isAdequate,
        recommendation: recommendation,
      };

      setAnalysis(analysisData);
      setAnalysisError(null);
    } catch (error) {
      console.error("Error processing analysis data:", error);
      toast.error("Failed to process analysis data");
    }
  };

  const loadAnalysis = async (batchId: string) => {
    setLoading(true);
    setAnalysisError(null);
    try {
      const analysisResponse = await fetch(
        `/api/admin/analysis?batch_id=${batchId}`,
      );
      if (!analysisResponse.ok) {
        toast.error("Failed to load analysis data");
        setLoading(false);
        return;
      }
      const analysisResult = await analysisResponse.json();
      if (!analysisResult.success || !analysisResult.data) {
        toast.error("Invalid analysis data received");
        setLoading(false);
        return;
      }
      setRawAnalysisData(analysisResult.data);
    } catch (error) {
      toast.error("Failed to load analysis");
    } finally {
      setLoading(false);
    }
  };

  const loadHalaqahAvailability = async (
    batchId: string,
    mode: "pendaftar" | "daftar_ulang" = "daftar_ulang",
    tab: string = "semua",
  ) => {
    console.log(
      "[AnalysisTab] Loading halaqah availability for batch:",
      batchId,
    );
    try {
      const response = await fetch(
        `/api/admin/analysis/halaqah-availability?batch_id=${batchId}&mode=${mode}&program_tab=${tab}`,
      );
      console.log(
        "[AnalysisTab] Halaqah availability response status:",
        response.status,
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error("[AnalysisTab] Halaqah availability error:", errorData);
        } catch (e) {
          const responseText = await response.text();
          console.error(
            "[AnalysisTab] Halaqah availability response text:",
            responseText.substring(0, 500),
          );
          errorData = { error: `HTTP ${response.status}` };
        }
        toast.error(errorData.error || "Failed to load halaqah availability");
        setLoading(false);
        return;
      }

      const result = await response.json();
      console.log("[AnalysisTab] Halaqah availability data:", result);
      setHalaqahData(result.data?.availability || []);
    } catch (error) {
      console.error("Error loading halaqah availability:", error);
      toast.error("Failed to load halaqah availability");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analysis && activeTab === "overview") {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-sm text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Batch Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-gray-900">Batch Analysis</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
              Analisis kecukupan muallimah dan ketersediaan halaqah
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
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 p-1.5 sm:p-2 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex gap-1.5 sm:gap-2 w-fit">
            <button
              onClick={() => setProgramTab("tikrar")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${programTab === "tikrar" ? "bg-indigo-50 text-indigo-700 border-indigo-200 border" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Tikrar Tahfidz
            </button>
            <button
              onClick={() => setProgramTab("pra_tikrar")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${programTab === "pra_tikrar" ? "bg-indigo-50 text-indigo-700 border-indigo-200 border" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Pra Tikrar
            </button>
            <button
              onClick={() => setProgramTab("kelas_berbayar")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${programTab === "kelas_berbayar" ? "bg-indigo-50 text-indigo-700 border-indigo-200 border" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Kelas Berbayar
            </button>
          </div>
        </div>
        <div className="p-1.5 sm:p-2 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex gap-1.5 sm:gap-2 w-fit">
            <button
              onClick={() => setAnalysisMode("pendaftar")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${analysisMode === "pendaftar" ? "bg-green-50 text-green-700 border-green-200 border" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Berdasarkan Pendaftar (Estimasi)
            </button>
            <button
              onClick={() => setAnalysisMode("daftar_ulang")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${analysisMode === "daftar_ulang" ? "bg-green-50 text-green-700 border-green-200 border" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Berdasarkan Daftar Ulang (Aktual)
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && analysis && (
        <>
          {/* Recommendation Card */}
          <div
            className={`rounded-2xl shadow-sm p-4 sm:p-6 ${
              analysis.is_adequate
                ? "bg-green-50 border border-green-200"
                : "bg-yellow-50 border border-yellow-200"
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              {analysis.is_adequate ? (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mt-0.5 shrink-0" />
              )}
              <div>
                <h3
                  className={`text-sm sm:text-lg font-bold mb-1 ${
                    analysis.is_adequate ? "text-green-700" : "text-yellow-900"
                  }`}
                >
                  {analysis.is_adequate ? "Rasio Ideal" : "Perlu Perhatian"}
                </h3>
                <p
                  className={`text-xs sm:text-sm ${
                    analysis.is_adequate ? "text-green-800" : "text-yellow-800"
                  }`}
                >
                  {analysis.recommendation}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid (2 columns on mobile, 5 on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
            {/* Muallimah Stats */}
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-500">
                    Total Muallimah
                  </p>
                  <p className="text-xl sm:text-3xl font-black text-gray-900">
                    {analysis.total_muallimah}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3.5 rounded-xl text-white shadow-md bg-purple-500 shadow-purple-200 shrink-0">
                  <UserCheck className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
              </div>
              <div className="pt-2.5 sm:pt-4 border-t border-gray-50 space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved</span>
                  <span className="font-bold text-green-600">{analysis.approved_muallimah}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pending</span>
                  <span className="font-bold text-amber-600">{analysis.pending_muallimah}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rejected</span>
                  <span className="font-bold text-red-600">{analysis.rejected_muallimah}</span>
                </div>
              </div>
            </div>

            {/* Thalibah Stats */}
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-500">
                    Total Thalibah
                  </p>
                  <p className="text-xl sm:text-3xl font-black text-gray-900">
                    {analysis.total_thalibah}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3.5 rounded-xl text-white shadow-md bg-blue-500 shadow-blue-200 shrink-0">
                  <GraduationCap className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
              </div>
              <div className="pt-2.5 sm:pt-4 border-t border-gray-50 space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved</span>
                  <span className="font-bold text-green-600">{analysis.approved_thalibah}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pending</span>
                  <span className="font-bold text-amber-600">{analysis.pending_thalibah}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Selected</span>
                  <span className="font-bold text-purple-600">{analysis.selected_thalibah}</span>
                </div>
              </div>
            </div>

            {/* Daftar Ulang Stats */}
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-500">
                    Daftar Ulang
                  </p>
                  <p className="text-xl sm:text-3xl font-black text-gray-900">
                    {analysis.total_daftar_ulang}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3.5 rounded-xl text-white shadow-md bg-indigo-500 shadow-indigo-200 shrink-0">
                  <FileText className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
              </div>
              <div className="pt-2.5 sm:pt-4 border-t border-gray-50 space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Submitted</span>
                  <span className="font-bold text-blue-600">{analysis.submitted_daftar_ulang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved</span>
                  <span className="font-bold text-green-600">{analysis.approved_daftar_ulang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-bold text-gray-700">
                    {analysis.selected_thalibah > 0
                      ? Math.round((analysis.approved_daftar_ulang / analysis.selected_thalibah) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Halaqah Stats */}
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-500">
                    Total Halaqah
                  </p>
                  <p className="text-xl sm:text-3xl font-black text-gray-900">
                    {analysis.total_halaqah}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3.5 rounded-xl text-white shadow-md bg-emerald-500 shadow-emerald-200 shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
              </div>
              <div className="pt-2.5 sm:pt-4 border-t border-gray-50 space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">W/ Program</span>
                  <span className="font-bold text-green-600">{analysis.halaqah_with_program}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">No Program</span>
                  <span className="font-bold text-amber-600">{analysis.halaqah_without_program}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="font-bold text-emerald-600">Aktif</span>
                </div>
              </div>
            </div>

            {/* Ratio Stats (spans 2 columns on mobile) */}
            <div className="col-span-2 lg:col-span-1 bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-500">
                    Rasio M : T
                  </p>
                  <p className="text-xl sm:text-3xl font-black text-gray-900">
                    {analysis.muallimah_thalibah_ratio}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3.5 rounded-xl text-white shadow-md bg-orange-500 shadow-orange-200 shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
              </div>
              <div className="pt-2.5 sm:pt-4 border-t border-gray-50 space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg/Muallimah</span>
                  <span className="font-bold text-orange-600">{analysis.avg_thalibah_per_muallimah}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Max</span>
                  <span className="font-bold text-gray-900">10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Capacity Analysis */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700 shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Analisis Kapasitas Halaqah
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-4 sm:mb-6 text-center sm:text-left">
              <div className="bg-gray-50/60 sm:bg-transparent rounded-xl p-2.5 sm:p-0">
                <p className="text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Total Kapasitas</p>
                <p className="text-lg sm:text-2xl font-black text-gray-900">
                  {analysis.total_halaqah_capacity}
                </p>
              </div>
              <div className="bg-green-50/60 sm:bg-transparent rounded-xl p-2.5 sm:p-0">
                <p className="text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Terisi</p>
                <p className="text-lg sm:text-2xl font-black text-green-600">
                  {analysis.total_filled_slots}
                </p>
              </div>
              <div className="bg-blue-50/60 sm:bg-transparent rounded-xl p-2.5 sm:p-0">
                <p className="text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Tersedia</p>
                <p className="text-lg sm:text-2xl font-black text-blue-600">
                  {analysis.total_available_slots}
                </p>
              </div>
            </div>

            {/* Capacity Bar */}
            <div>
              <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
                <span>Pengisian Kapasitas</span>
                <span className="font-bold text-gray-900">{analysis.capacity_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4">
                <div
                  className={`h-3 sm:h-4 rounded-full transition-all ${
                    analysis.capacity_percentage >= 90
                      ? "bg-red-600"
                      : analysis.capacity_percentage >= 70
                        ? "bg-yellow-500"
                        : "bg-green-600"
                  }`}
                  style={{
                    width: `${Math.min(analysis.capacity_percentage, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-2">
                {analysis.capacity_percentage >= 90
                  ? "Kapasitas hampir penuh. Pertimbangkan membuka halaqah baru."
                  : analysis.capacity_percentage >= 70
                    ? "Kapasitas terisi cukup baik."
                    : "Masih banyak slot tersedia untuk thalibah baru."}
              </p>
            </div>
          </div>

          {/* Halaqah Availability per Juz */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-green-700" />
              <h3 className="text-lg font-semibold text-gray-900">
                Analisis Kapasitas Halaqah per Juz
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Analisis ketersediaan halaqah untuk setiap juz. Minimum kapasitas
              per halaqah adalah 5 thalibah.
            </p>

            {halaqahData.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Belum ada data halaqah. Pilih batch untuk melihat analisis.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {halaqahData.map((juz) => {
                  const needsMoreHalaqah = juz.needed_halaqah > 0;
                  const utilizationColor =
                    juz.utilization_percentage >= 90
                      ? "red"
                      : juz.utilization_percentage >= 70
                        ? "yellow"
                        : "green";
                  const breakdownEntries = Object.entries(
                    juz.thalibah_breakdown || {},
                  );

                  return (
                    <div
                      key={juz.juz_number}
                      className={`border rounded-lg p-6 transition-colors ${
                        needsMoreHalaqah
                          ? "border-red-300 bg-red-50"
                          : "border-gray-100"
                      } hover:border-blue-300`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => handleDrop(e, String(juz.juz_number))}
                    >
                      {/* Juz Header */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">
                              {juz.juz_name}
                            </h4>
                          </div>
                          {needsMoreHalaqah ? (
                            <div className="flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg">
                              <AlertTriangle className="w-5 h-5" />
                              <span className="font-semibold">
                                Butuh {juz.needed_halaqah}{" "}
                                {analysisMode === "pendaftar"
                                  ? "Muallimah"
                                  : "Halaqah"}
                              </span>
                            </div>
                          ) : juz.total_available >= 5 ? (
                            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-semibold">
                                Kapasitas Cukup
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                              <Clock className="w-5 h-5" />
                              <span className="font-semibold">
                                Kapasitas Terbatas
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Thalibah Breakdown */}
                        {breakdownEntries.length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-medium text-blue-900 mb-2">
                              Breakdown per Tipe:
                            </p>
                            <div className="flex gap-3 flex-wrap">
                              {breakdownEntries.map(
                                ([code, data]: [string, any]) => (
                                  <div key={code} className="text-xs">
                                    <span className="font-semibold text-blue-800">
                                      {data.code}:
                                    </span>
                                    <span className="text-blue-700 ml-1">
                                      {data.thalibah_count} thalibah
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs text-gray-600 mb-1">
                            Total Thalibah
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            {juz.total_thalibah}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs text-gray-600 mb-1">
                            {analysisMode === "pendaftar"
                              ? "Total Muallimah"
                              : "Total Halaqah"}
                          </p>
                          <p className="text-2xl font-bold text-purple-600">
                            {juz.total_halaqah}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs text-gray-600 mb-1">
                            Total Jadwal
                          </p>
                          <p className="text-2xl font-bold text-amber-600">
                            {juz.total_schedules || 0}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs text-gray-600 mb-1">
                            Total Kapasitas
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {juz.total_capacity}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs text-gray-600 mb-1">Tersedia</p>
                          <p className="text-2xl font-bold text-green-600">
                            {juz.total_available}
                          </p>
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-sm text-gray-700 mb-2">
                          <span className="font-medium">
                            Utilisasi Kapasitas
                          </span>
                          <span
                            className={`font-bold ${
                              utilizationColor === "red"
                                ? "text-red-600"
                                : utilizationColor === "yellow"
                                  ? "text-yellow-600"
                                  : "text-green-600"
                            }`}
                          >
                            {juz.utilization_percentage}% ({juz.total_filled}/
                            {juz.total_capacity})
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all bg-${utilizationColor}-600`}
                            style={{
                              width: `${Math.min(juz.utilization_percentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          {juz.needed_halaqah > 0
                            ? `Kapasitas tidak cukup. Dibutuhkan setidaknya ${juz.needed_halaqah} ${analysisMode === "pendaftar" ? "muallimah" : "halaqah"} tambahan untuk menampung ${juz.total_thalibah} thalibah (min. 5 per halaqah).`
                            : juz.utilization_percentage >= 90
                              ? "Kapasitas hampir penuh. Pertimbangkan membuka halaqah cadangan."
                              : "Kapasitas memadai untuk menampung semua thalibah."}
                        </p>
                      </div>

                      {/* Halaqah Details */}
                      {juz.halaqah_details && juz.halaqah_details.length > 0 ? (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-gray-600" />
                            <p className="text-sm font-semibold text-gray-900">
                              {analysisMode === "pendaftar"
                                ? "Ketersediaan Muallimah"
                                : "Daftar Halaqah"}{" "}
                              ({juz.halaqah_details.length})
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {juz.halaqah_details.map(
                              (halaqah: any, idx: number) => {
                                const halaqahUtilColor =
                                  halaqah.utilization_percent >= 90
                                    ? "red"
                                    : halaqah.utilization_percent >= 70
                                      ? "yellow"
                                      : "green";
                                return (
                                  <div
                                    key={idx}
                                    className={`rounded-lg border p-3 transition-all duration-200 hover:shadow-md ${halaqah.is_allocated ? "bg-emerald-50/10 border-emerald-300 shadow-sm ring-1 ring-emerald-300" : "bg-white border-gray-200"}`}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex flex-col gap-1">
                                        <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5 flex-wrap">
                                          {halaqah.name}
                                          {halaqah.wa_phone && (
                                            <a
                                              href={`https://wa.me/${halaqah.wa_phone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-green-600 hover:text-green-700 ml-1"
                                              title="Chat WhatsApp"
                                            >
                                              <MessageCircle className="w-3.5 h-3.5" />
                                            </a>
                                          )}
                                          {halaqah.is_allocated && (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-sm border border-emerald-200">
                                              ✓ Mengajar Di Sini
                                            </span>
                                          )}
                                        </p>
                                        {analysisMode === "pendaftar" && (
                                          <select
                                            value={juz.juz_number}
                                            onChange={(e) =>
                                              handleAssignJuz(
                                                halaqah.id,
                                                e.target.value,
                                              )
                                            }
                                            className="text-[10px] py-0.5 px-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer bg-white mt-1"
                                          >
                                            <option disabled>
                                              -- Pilih Juz --
                                            </option>
                                            {halaqahData.map((j: any) => (
                                              <option
                                                key={j.juz_number}
                                                value={j.juz_number}
                                              >
                                                Juz {j.juz_number}
                                              </option>
                                            ))}
                                          </select>
                                        )}
                                      </div>
                                      <div className="flex flex-col items-end gap-2">
                                        <span
                                          className={`text-xs px-2 py-0.5 rounded-lg font-medium ${(() => {
                                            const normalized = (
                                              halaqah.class_type || ""
                                            ).toLowerCase();
                                            if (
                                              normalized.includes(
                                                "tikrar_tahfidz",
                                              ) &&
                                              normalized.includes("pra_tahfidz")
                                            ) {
                                              return "bg-amber-50 text-amber-700 border border-amber-200";
                                            }
                                            if (
                                              normalized.includes(
                                                "tikrar_tahfidz",
                                              )
                                            ) {
                                              return "bg-purple-50 text-purple-700 border border-purple-200";
                                            }
                                            if (
                                              normalized.includes("pra_tahfidz")
                                            ) {
                                              return "bg-blue-50 text-blue-700 border border-blue-200";
                                            }
                                            return "bg-green-50 text-green-700 border border-green-200";
                                          })()}`}
                                        >
                                          {(() => {
                                            if (!halaqah.class_type)
                                              return "Tashih Ujian";
                                            return halaqah.class_type
                                              .split(",")
                                              .map((type: string) => {
                                                const trimmed = type
                                                  .trim()
                                                  .toLowerCase();
                                                if (
                                                  trimmed === "tikrar_tahfidz"
                                                )
                                                  return "Tikrar";
                                                if (trimmed === "pra_tahfidz")
                                                  return "Pra-Tikrar";
                                                if (trimmed === "tahfidz")
                                                  return "Tahfidz";
                                                if (trimmed === "tashih")
                                                  return "Tashih";
                                                return trimmed
                                                  .replace(/_/g, " ")
                                                  .replace(/\b\w/g, (c) =>
                                                    c.toUpperCase(),
                                                  );
                                              })
                                              .join(", ");
                                          })()}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="space-y-1 text-xs">
                                      <div className="flex justify-between items-center py-0.5">
                                        <span className="text-gray-600">
                                          Juz Pilihan:
                                        </span>
                                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px] leading-none uppercase">
                                          {halaqah.preferred_juz || "-"}
                                        </span>
                                      </div>

                                      {halaqah.memorized_juz && (
                                        <div className="flex justify-between items-start py-0.5 mt-1">
                                          <span className="text-gray-600">
                                            Hafalan:
                                          </span>
                                          <span className="text-[10px] font-medium text-gray-800 text-right ml-2 leading-snug">
                                            Juz {halaqah.memorized_juz}
                                          </span>
                                        </div>
                                      )}

                                      {/* Available Schedules */}
                                      <div className="py-1.5 border-t border-b border-gray-100 my-1.5 space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                          Jadwal yang Tersedia (
                                          {halaqah.schedules?.length || 0})
                                        </p>
                                        {(halaqah.schedules || []).map(
                                          (s: any, sIdx: number) => (
                                            <div
                                              key={sIdx}
                                              className={`flex justify-between text-[11px] leading-tight py-1 px-1.5 rounded transition-all ${s.is_allocated_here ? "bg-emerald-50 text-emerald-900 font-semibold border border-emerald-100 shadow-sm" : "text-gray-600"}`}
                                            >
                                              <span className="flex items-center gap-1">
                                                {s.is_allocated_here && (
                                                  <span className="text-emerald-700 font-extrabold">
                                                    ✓
                                                  </span>
                                                )}
                                                {s.type}
                                                {s.is_backup
                                                  ? " (Cadangan)"
                                                  : ""}
                                                :
                                              </span>
                                              <span
                                                className={
                                                  s.is_allocated_here
                                                    ? "font-bold"
                                                    : ""
                                                }
                                              >
                                                {s.day_name}{" "}
                                                {s.start_time !== "-"
                                                  ? `(${s.start_time} - ${s.end_time})`
                                                  : ""}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>

                                    {/* Capacity Horizontal Layout */}
                                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-100 text-[11px]">
                                      <div className="text-center">
                                        <span className="block text-gray-500 mb-0.5">
                                          Kapasitas
                                        </span>
                                        <span className="font-semibold text-gray-700">
                                          {halaqah.max_students}
                                        </span>
                                      </div>
                                      <div className="text-center">
                                        <span className="block text-gray-500 mb-0.5">
                                          Terisi
                                        </span>
                                        <span className="font-semibold text-blue-600">
                                          {halaqah.current_students}
                                        </span>
                                      </div>
                                      <div className="text-center">
                                        <span className="block text-gray-500 mb-0.5">
                                          Tersedia
                                        </span>
                                        <span className="font-semibold text-green-600">
                                          {halaqah.available_slots}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Mini utilization bar */}
                                    <div className="mt-3">
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600">
                                          Utilisasi:
                                        </span>
                                        <span
                                          className={`font-bold text-${halaqahUtilColor}-600`}
                                        >
                                          {halaqah.utilization_percent}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className={`h-1.5 rounded-full bg-${halaqahUtilColor}-500`}
                                          style={{
                                            width: `${Math.min(halaqah.utilization_percent, 100)}%`,
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50/50 rounded-lg">
                          <Users className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            {analysisMode === "pendaftar"
                              ? "Tidak ada muallimah tersedia untuk juz ini."
                              : "Tidak ada halaqah tersedia untuk juz ini."}
                          </p>
                          {juz.total_thalibah > 0 && (
                            <p className="text-xs text-red-600 mt-1">
                              Dibutuhkan setidaknya{" "}
                              {Math.ceil(juz.total_thalibah / 5)}{" "}
                              {analysisMode === "pendaftar"
                                ? "muallimah"
                                : "halaqah"}{" "}
                              untuk {juz.total_thalibah} thalibah.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!analysis && selectedBatchId && activeTab === "overview" && !loading && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
          {analysisError ? (
            <>
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">
                Gagal memuat analisis
              </p>
              <p className="text-gray-600 text-sm mb-2">{analysisError}</p>
              <p className="text-gray-400 text-xs">
                Batch ID: {selectedBatchId}
              </p>
            </>
          ) : (
            <>
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Pilih batch untuk melihat analisis
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
