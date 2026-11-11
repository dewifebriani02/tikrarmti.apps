'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Layers, ChevronDown, Check } from 'lucide-react';
import { useActiveBatch, useBatches } from '@/hooks/useBatches';
import { cn } from '@/lib/utils';

export function HeaderBatchSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { activeBatch } = useActiveBatch();
  const { batches: allBatches } = useBatches({ limit: 10 });

  // Merge activeBatch and allBatches into unique list
  const availableBatches = useMemo(() => {
    const map = new Map<string, any>();
    if (activeBatch) {
      map.set(activeBatch.id, activeBatch);
    }
    if (allBatches && allBatches.length > 0) {
      allBatches.forEach(b => {
        if (!map.has(b.id)) {
          map.set(b.id, b);
        }
      });
    }
    return Array.from(map.values());
  }, [activeBatch, allBatches]);

  // Selected batch logic
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  useEffect(() => {
    const urlBatchId = searchParams?.get('batch_id');
    if (urlBatchId) {
      setSelectedBatchId(urlBatchId);
      return;
    }
    const stored = typeof window !== 'undefined' ? localStorage.getItem('selected_batch_id') : null;
    if (stored) {
      setSelectedBatchId(stored);
      return;
    }
    if (activeBatch?.id) {
      setSelectedBatchId(activeBatch.id);
    }
  }, [searchParams, activeBatch]);

  // Listen to batch-changed events dispatched elsewhere
  useEffect(() => {
    const handleBatchChange = (e: any) => {
      if (e.detail?.batchId) {
        setSelectedBatchId(e.detail.batchId);
      }
    };
    window.addEventListener('batch-changed', handleBatchChange);
    return () => window.removeEventListener('batch-changed', handleBatchChange);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedBatch = useMemo(() => {
    return availableBatches.find(b => b.id === selectedBatchId) || activeBatch || availableBatches[0];
  }, [availableBatches, selectedBatchId, activeBatch]);

  const formatBatchDisplay = (name?: string) => {
    if (!name) return 'Batch';
    const match = name.match(/Batch\s*(\d+)/i) || name.match(/Angkatan\s*(\d+)/i);
    if (match) {
      return `Batch ${match[1]}`;
    }
    return name.length > 10 ? name.substring(0, 10) + '...' : name;
  };

  const handleSelect = (batch: any) => {
    setSelectedBatchId(batch.id);
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_batch_id', batch.id);
      window.dispatchEvent(new CustomEvent('batch-changed', { detail: { batchId: batch.id, batch } }));
    }

    if (pathname === '/dashboard') {
      const params = new URLSearchParams(window.location.search);
      params.set('batch_id', batch.id);
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  // If no batches loaded yet, show subtle placeholder
  if (availableBatches.length === 0 && !activeBatch) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs select-none",
          isOpen
            ? "bg-amber-100 text-amber-900 border-amber-400/80"
            : "bg-amber-50/80 hover:bg-amber-100/80 text-amber-900 border-amber-300/70"
        )}
        title="Ganti Angkatan / Batch"
      >
        <Layers className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span className="text-[11px] sm:text-xs font-bold text-amber-900 whitespace-nowrap">
          {formatBatchDisplay(selectedBatch?.name)}
        </span>
        <ChevronDown className={cn("w-3 h-3 text-amber-700 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 sm:w-64 bg-white/95 backdrop-blur-xl border border-amber-200/80 rounded-2xl shadow-xl p-2 z-[100] animate-fadeIn">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-amber-600" />
              Pilih Angkatan
            </p>
            <span className="text-[9px] font-bold text-gray-400">{availableBatches.length} Batch</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
            {availableBatches.map(b => {
              const isSelected = selectedBatch?.id === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b)}
                  className={cn(
                    "w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer",
                    isSelected
                      ? "bg-amber-50 text-amber-900 border border-amber-300/80 shadow-2xs"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate font-bold text-gray-900">{b.name}</span>
                  </div>

                  {b.status && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase shrink-0",
                      b.status === 'ongoing' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      b.status === 'open' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "bg-gray-100 text-gray-500"
                    )}>
                      {b.status === 'ongoing' ? 'Berjalan' : b.status === 'open' ? 'Registrasi' : b.status}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
