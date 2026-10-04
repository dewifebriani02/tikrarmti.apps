'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, ArrowLeft, Video, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Toaster, toast } from 'sonner';
import { ScheduleOverlapAnalysis } from '@/components/admin/halaqah/ScheduleOverlapAnalysis';

interface Batch {
  id: string;
  name: string;
  status: string;
}

export default function AdminAnalisisZoomPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [halaqahs, setHalaqahs] = useState<any[]>([]);
  const [zoomLinks, setZoomLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Load Batches
  useEffect(() => {
    async function loadBatches() {
      try {
        const response = await fetch('/api/admin/batches');
        const result = await response.json();
        if (response.ok && result.data && result.data.length > 0) {
          setBatches(result.data);
          const defaultBatch = result.data.find((b: Batch) => b.status === 'open' || b.status === 'ongoing') || result.data[0];
          setSelectedBatch(defaultBatch.id);
        }
      } catch (err: any) {
        console.error('Error loading batches:', err);
        toast.error('Gagal memuat data batch');
      }
    }
    loadBatches();
  }, []);

  // 2. Load Halaqahs & Zoom Links for selected batch
  const loadBatchData = useCallback(async () => {
    if (!selectedBatch) return;
    setIsLoading(true);
    try {
      const [halaqahRes, zoomRes] = await Promise.all([
        fetch(`/api/halaqah?batch_id=${selectedBatch}`),
        fetch(`/api/admin/batch/${selectedBatch}/zoom-links`)
      ]);

      const halaqahJson = await halaqahRes.json();
      const zoomJson = await zoomRes.json();

      if (halaqahRes.ok && halaqahJson.data) {
        setHalaqahs(halaqahJson.data);
      } else {
        setHalaqahs([]);
      }

      if (zoomRes.ok && zoomJson.success && zoomJson.data) {
        setZoomLinks(zoomJson.data);
      } else {
        setZoomLinks([]);
      }
    } catch (err: any) {
      console.error('Error loading batch data:', err);
      toast.error('Gagal memuat data analisis Zoom');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBatch]);

  useEffect(() => {
    loadBatchData();
  }, [loadBatchData, refreshTrigger]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24 sm:pb-20">
      <Toaster position="top-right" richColors />

      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 mb-4 sm:mb-8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
              <Link
                href="/admin/halaqah"
                className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200 flex-shrink-0"
                title="Kembali ke Manajemen Halaqah"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mb-0.5 sm:mb-1">
                  <Shield className="h-3 w-3" />
                  <span>Authority Console</span>
                </div>
                <h1 className="text-base sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 truncate">
                  <span>Analisis Room Zoom</span>
                  <span className="px-1.5 py-0.5 rounded-md sm:rounded-lg bg-indigo-50 text-indigo-700 text-[10px] sm:text-xs font-bold border border-indigo-100 flex-shrink-0">
                    V2
                  </span>
                </h1>
              </div>
            </div>

            {/* Controls: Batch selector & refresh */}
            <div className="flex items-center gap-2 flex-wrap">
              {batches.length > 0 && (
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[220px] truncate"
                >
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name} ({batch.status})
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => setRefreshTrigger((prev) => prev + 1)}
                disabled={isLoading}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                title="Muat ulang data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-3.5 sm:px-6 lg:px-8">
        {isLoading && halaqahs.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center shadow-sm">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Memuat data halaqah & room Zoom...</p>
          </div>
        ) : (
          <ScheduleOverlapAnalysis
            isPage={true}
            halaqahs={halaqahs}
            zoomLinks={zoomLinks}
            onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
          />
        )}
      </div>
    </div>
  );
}
