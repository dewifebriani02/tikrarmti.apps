'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HelpCircle,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ExternalLink,
  BookOpen,
  Sparkles,
  GraduationCap,
  Users,
  Shield,
  Lightbulb,
  CheckCircle,
  Clock,
  Heart,
  Award,
  AlertCircle,
  Info,
  ArrowRight
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  HelpCircle,
  Info,
  BookOpen,
  Shield,
  GraduationCap,
  Users,
  Lightbulb,
  Clock,
  AlertCircle,
  CheckCircle,
  Heart,
  Award
};

interface FAQQuestion {
  q: string;
  a: string;
}

interface FAQCategory {
  id?: string;
  category: string;
  icon?: string;
  color?: string;
  questions: FAQQuestion[];
}

export function GlobalFaqWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [faqData, setFaqData] = useState<FAQCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);

  // Listen to custom global event: 'open-faq-modal'
  useEffect(() => {
    const handleOpenModal = () => {
      setIsOpen(true);
    };

    window.addEventListener('open-faq-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-faq-modal', handleOpenModal);
    };
  }, []);

  // Fetch FAQs lazily when opened or pre-fetched
  useEffect(() => {
    if ((isOpen || !hasLoaded) && faqData.length === 0 && !isLoading) {
      setIsLoading(true);
      fetch('/api/public/faqs', { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setFaqData(json.data);
          } else {
            // Default fallback
            setFaqData([
              {
                category: 'Program Umum',
                icon: 'BookOpen',
                color: 'green',
                questions: [
                  {
                    q: "Apa itu Program Tahfidz Tikrar MTI?",
                    a: "Program Tahfidz Tikrar MTI adalah program hafalan Al-Qur'an gratis yang menggunakan metode Tikrar 40x untuk Ibu rumah tangga dan remaja putri yang berkomitmen menghafal Al-Qur'an."
                  },
                  {
                    q: "Apakah program ini gratis?",
                    a: "Ya, 100% gratis tanpa biaya pendaftaran atau biaya bulanan."
                  }
                ]
              }
            ]);
          }
          setHasLoaded(true);
        })
        .catch((err) => {
          console.error('Failed to load global FAQs:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, hasLoaded, faqData.length, isLoading]);

  // Flattened and filtered questions based on search and category
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const results: { categoryName: string; categoryColor?: string; q: string; a: string; key: string }[] = [];

    faqData.forEach((cat, catIdx) => {
      if (selectedCategory !== 'all' && cat.category !== selectedCategory) {
        return;
      }

      cat.questions?.forEach((qItem, qIdx) => {
        const qText = (qItem.q || '').toLowerCase();
        const aText = (qItem.a || '').toLowerCase();
        const matchesQuery = !query || qText.includes(query) || aText.includes(query);

        if (matchesQuery) {
          results.push({
            categoryName: cat.category,
            categoryColor: cat.color,
            q: qItem.q,
            a: qItem.a,
            key: `${catIdx}-${qIdx}`
          });
        }
      });
    });

    return results;
  }, [faqData, searchQuery, selectedCategory]);

  // Don't render floating launcher on the dedicated /faq page itself to avoid redundancy
  const isDedicatedFaqPage = pathname === '/faq';

  return (
    <>
      {/* Floating Launcher Button */}
      {!isDedicatedFaqPage && (
        <aside
          aria-label="Pusat Bantuan dan FAQ"
          className="fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 z-[65] flex items-center group pointer-events-auto"
        >
          <button
            onClick={() => setIsOpen(true)}
            type="button"
            className="flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 hover:from-emerald-650 hover:to-teal-850 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-400/30 backdrop-blur-md focus:outline-none focus:ring-4 focus:ring-emerald-500/40"
            title="Buka Pusat Bantuan & Pertanyaan Sering Diajukan (FAQ)"
          >
            <div className="relative flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-amber-300 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-wide">
              FAQ & Bantuan
            </span>
          </button>
        </aside>
      )}

      {/* Modal / Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
          {/* Backdrop click */}
          <div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-emerald-900/15 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-teal-900 text-white p-5 sm:p-6 relative flex-shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                type="button"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Tutup Bantuan"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-amber-300 flex-shrink-0">
                  <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                    Pusat Bantuan &amp; FAQ
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                    Markaz Tikrar Indonesia (MTI)
                  </p>
                </div>
              </div>

              {/* Quick Search Input */}
              <div className="mt-4 relative">
                <Search className="w-4 h-4 text-emerald-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pertanyaan... (misal: syarat, alur, infaq, jadwal)"
                  className="w-full bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-gray-900 placeholder:text-emerald-200 focus:placeholder:text-gray-400 pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-white/20 focus:border-emerald-500 outline-none transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white focus:outline-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              {faqData.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    type="button"
                    className={`px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-amber-400 text-amber-950 font-bold shadow-sm'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    Semua ({faqData.reduce((acc, c) => acc + (c.questions?.length || 0), 0)})
                  </button>
                  {faqData.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedCategory(cat.category)}
                      type="button"
                      className={`px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                        selectedCategory === cat.category
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-sm'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {cat.category} ({cat.questions?.length || 0})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Body: Question List */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-stone-50/60">
              {isLoading ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-gray-500 font-medium">Memuat daftar pertanyaan...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-10 px-4 text-center space-y-3 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">
                    Pertanyaan Tidak Ditemukan
                  </h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Jawaban untuk kata kunci &ldquo;<span className="font-semibold text-gray-700">{searchQuery}</span>&rdquo; belum tersedia dalam FAQ cepat.
                  </p>
                  <a
                    href="https://wa.me/628123456789"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-xs transition-all"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-300" />
                    Tanyakan Langsung ke Admin WA
                  </a>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isExpanded = expandedIndex === item.key;
                  return (
                    <div
                      key={item.key}
                      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? 'bg-white border-emerald-300 shadow-sm ring-1 ring-emerald-200'
                          : 'bg-white border-gray-200/90 hover:border-emerald-200 hover:shadow-xs'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedIndex(isExpanded ? null : item.key)}
                        className="w-full p-3.5 sm:p-4 text-left flex items-start justify-between gap-3 focus:outline-none"
                      >
                        <div className="space-y-1 flex-1">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                            {item.categoryName}
                          </span>
                          <p
                            className="text-xs sm:text-sm font-bold text-gray-900 leading-snug"
                            dangerouslySetInnerHTML={{ __html: item.q }}
                          />
                        </div>
                        <div className="p-1 rounded-md text-gray-400 group-hover:text-emerald-700 mt-1">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3.5 pb-4 sm:px-4 sm:pb-4 pt-1 border-t border-emerald-100/80 bg-emerald-50/20">
                          <div
                            className="prose prose-xs sm:prose-sm max-w-none text-gray-700 text-xs sm:text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: item.a }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-gray-100 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs flex-shrink-0">
              <Link
                href="/faq"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1.5 font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
              >
                <span>Buka Halaman Lengkap FAQ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href="https://wa.me/628123456789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-100 hover:bg-emerald-200/80 text-emerald-900 font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Admin WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="hidden sm:inline-block px-3 py-1.5 text-gray-500 hover:text-gray-800 font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
