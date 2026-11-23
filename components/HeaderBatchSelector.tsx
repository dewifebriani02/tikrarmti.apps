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
    return name.length > 12 ? name.substring(0, 12) + '...' : name;
  };

  const parseBatchDisplay = (name?: string) => {
    if (!name) return { title: 'Batch', subtitle: '' };
    const match = name.match(/(Batch\s*\d+|Angkatan\s*\d+)/i);
    if (match) {
      const title = match[1].replace(/\s+/g, ' ');
      const subtitle = name
        .replace(match[0], '')
        .replace(/^[\s\-–—:•|]+|[\s\-–—:•|]+$/g, '')
        .trim();
      return { title, subtitle };
    }
    return { title: name, subtitle: '' };
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
          "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs select-none",
          isOpen
            ? "bg-amber-100 text-amber-900 border-amber-400"
            : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
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
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-amber-200/90 rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn">
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-amber-100 mb-1.5 bg-amber-50/50 rounded-xl">
            <p className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              Pilih Angkatan
            </p>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
              {availableBatches.length} Batch
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
            {availableBatches.map(b => {
              const isSelected = selectedBatch?.id === b.id;
              const { title, subtitle } = parseBatchDisplay(b.name);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer",
                    isSelected
                      ? "bg-amber-50/90 text-amber-950 border border-amber-300 shadow-2xs"
                      : "text-gray-800 hover:bg-amber-50/40 hover:text-gray-900 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {isSelected ? (
                      <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300 shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={cn(
                        "text-xs truncate",
                        isSelected ? "font-black text-amber-950" : "font-bold text-gray-900"
                      )}>
                        {title}
                      </span>
                      {subtitle ? (
                        <span className="text-[10px] text-gray-500 truncate leading-tight mt-0.5 font-medium">
                          {subtitle}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {b.status && (
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0",
                      b.status === 'ongoing' ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                      b.status === 'open' ? "bg-amber-100 text-amber-800 border border-amber-300" :
                      "bg-gray-100 text-gray-600 border border-gray-200"
                    )}>
                      {b.status === 'ongoing' ? 'Berjalan' : b.status === 'open' ? 'Registrasi' : b.status === 'closed' ? 'Selesai' : b.status}
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
