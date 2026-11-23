'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Search,
  ArrowLeft,
  MessageCircle,
  HelpCircle,
  BookOpen,
  Shield,
  GraduationCap,
  Users,
  Lightbulb,
  Clock,
  Star,
  CheckCircle,
  Heart,
  Award,
  AlertCircle,
  Info,
  Sparkles,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  HelpCircle,
  Info,
  BookOpen,
  Shield,
  GraduationCap,
  Users,
  Lightbulb,
  Star,
  Clock,
  AlertCircle,
  CheckCircle,
  Heart,
  Award,
};

export default function FAQPage() {
  const [faqData, setFaqData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch('/api/user/profile', { cache: 'no-store' })
      .then(res => {
        if (res.ok) setIsLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const res = await fetch('/api/public/faqs', { cache: 'no-store' });
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setFaqData(json.data);
        } else {
          setFaqData([
            {
              category: "Program Umum",
              icon: 'BookOpen',
              color: "green",
              questions: [
                {
                  q: "Apa itu Program Tahfidz Tikrar MTI?",
                  a: "Program Tahfidz Tikrar MTI adalah program hafalan Al-Qur'an intensif berbasis metode Tikrar 40x yang diselenggarakan khusus untuk muslimah (ibu rumah tangga dan remaja putri) secara terarah dan terukur."
                },
                {
                  q: "Apakah program ini benar-benar gratis?",
                  a: "Ya, program utama 100% gratis tanpa biaya pendaftaran atau SPP bulanan. Seluruh pembiayaan operasional didukung oleh donatur dan infaq sukarela dari kaum muslimin."
                }
              ]
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch FAQs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFaqs();
  }, []);

  const totalQuestionsCount = useMemo(() => {
    return faqData.reduce((acc, cat) => acc + (cat.questions?.length || 0), 0);
  }, [faqData]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list: { categoryName: string; categoryColor?: string; q: string; a: string; key: string }[] = [];

    faqData.forEach((cat, catIdx) => {
      if (selectedCategory !== 'all' && cat.category !== selectedCategory) {
        return;
      }

      cat.questions?.forEach((qItem: any, qIdx: number) => {
        const qText = (qItem.q || '').toLowerCase();
        const aText = (qItem.a || '').toLowerCase();
        const matchesQuery = !query || qText.includes(query) || aText.includes(query);

        if (matchesQuery) {
          list.push({
            categoryName: cat.category,
            categoryColor: cat.color,
            q: qItem.q,
            a: qItem.a,
            key: `${catIdx}-${qIdx}`
          });
        }
      });
    });

    return list;
  }, [faqData, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-stone-50/70 pb-20">
      {/* Top Banner / Hero */}
      <section className="bg-gradient-to-b from-emerald-950 via-emerald-900 to-teal-900 text-white pt-12 pb-16 px-4 sm:px-6 relative overflow-hidden">
        {/* Glow decorations */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="mb-6">
            <Link
              href={isLoggedIn ? "/dashboard" : "/"}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-200 hover:text-white bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-xl border border-white/15 transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isLoggedIn ? "Kembali ke Dasbor" : "Kembali ke Beranda"}</span>
            </Link>
          </div>

          <div className="text-center space-y-4">
            <Badge className="bg-amber-400 text-amber-950 font-black px-3.5 py-1 text-xs uppercase tracking-wider shadow-sm hover:bg-amber-300">
              Pusat Informasi &amp; FAQ
            </Badge>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Pertanyaan yang Sering{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-200">
                Diajukan (FAQ)
              </span>
            </h1>

            <p className="text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto leading-relaxed font-medium">
              Temukan seluruh jawaban terkait pendaftaran, komitmen waktu, metode hafalan Tikrar 40x, alur ujian, hingga sertifikat.
            </p>

            {/* Main Search Input */}
            <div className="max-w-xl mx-auto mt-6 relative">
              <Search className="w-5 h-5 text-emerald-300 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik kata kunci pertanyaan... (cth: syarat, zoom, daftar ulang, infaq, jadwal)"
                className="w-full bg-white text-gray-900 placeholder:text-gray-400 pl-12 pr-10 py-3.5 text-sm sm:text-base rounded-2xl shadow-xl border border-emerald-300/40 outline-none focus:ring-4 focus:ring-emerald-400/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 relative z-20">
        {/* Category Pills & Count */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-md border border-gray-200/80 mb-6 space-y-3">
          {/* Horizontal scrollable category pills without truncation or ugly scrollbar */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 px-0.5 -mx-0.5 touch-pan-x">
            <button
              onClick={() => setSelectedCategory('all')}
              type="button"
              className={`shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs ${
                selectedCategory === 'all'
                  ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-800/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
              }`}
            >
              Semua ({totalQuestionsCount})
            </button>
            {faqData.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat.category)}
                type="button"
                className={`shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs ${
                  selectedCategory === cat.category
                    ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-800/20'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                }`}
              >
                {cat.category} ({cat.questions?.length || 0})
              </button>
            ))}
          </div>

          {/* Question count & active filter hint */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500 font-semibold px-1">
            <span>
              Menampilkan <strong className="text-gray-900 font-bold">{filteredItems.length}</strong> pertanyaan
            </span>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px] underline"
              >
                Lihat Semua Kategori
              </button>
            )}
          </div>
        </div>

        {/* FAQ Accordion List */}
        {loading ? (
          <div className="py-20 text-center space-y-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs p-8">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-gray-600">Memuat pertanyaan dan jawaban...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="bg-white border border-gray-200 p-8 sm:p-12 text-center rounded-2xl shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 mx-auto mb-4">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Tidak Ada Pertanyaan yang Cocok
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
              Kami belum menemukan pertanyaan dengan kata kunci &ldquo;<span className="font-semibold">{searchQuery}</span>&rdquo;.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="font-bold text-xs sm:text-sm"
              >
                Reset Pencarian
              </Button>
              <a
                href="https://wa.me/628138884240"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-300" />
                Chat Admin WhatsApp
              </a>
            </div>
          </Card>
        ) : (
          <div className="space-y-3.5">
            {filteredItems.map((item, index) => {
              const isExpanded = expandedIndex === item.key;
              return (
                <div
                  key={item.key}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-emerald-300 ring-2 ring-emerald-100 shadow-md'
                      : 'border-gray-200/90 hover:border-emerald-200 hover:shadow-xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : item.key)}
                    className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 focus:outline-none"
                  >
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 text-xs sm:text-sm font-black flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                          {item.categoryName}
                        </span>
                        <h2
                          className="text-sm sm:text-base font-bold text-gray-900 leading-snug"
                          dangerouslySetInnerHTML={{ __html: item.q }}
                        />
                      </div>
                    </div>
                    <div className="p-1 rounded-lg text-gray-400 mt-1">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-emerald-700" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-6 sm:pb-6 pt-1 border-t border-emerald-100/80 bg-emerald-50/15">
                      <div className="sm:pl-12">
                        <div
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed bg-white p-4 sm:p-5 rounded-xl border border-emerald-200/60 shadow-xs"
                          dangerouslySetInnerHTML={{ __html: item.a }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Contact Help Card */}
        <section className="mt-12 text-center" aria-label="Kontak Bantuan">
          <Card className="bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border-emerald-200/80 shadow-md rounded-2xl overflow-hidden">
            <CardContent className="p-6 sm:p-10">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800 mx-auto mb-4">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
                Masih Belum Menemukan Jawaban?
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto mb-6 leading-relaxed">
                Tim admin dan khadimat Markaz Tikrar Indonesia siap membantu pertanyaan spesifik Ukhti seputar kendala akun atau pendaftaran.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href="https://wa.me/628138884240"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all text-xs sm:text-sm"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-300" />
                  Hubungi Admin via WhatsApp
                </a>
                <a
                  href="https://www.instagram.com/markaztikrar.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-bold px-6 py-3 rounded-xl shadow-xs transition-all text-xs sm:text-sm"
                >
                  Follow Instagram @markaztikrar.id
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
