'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Star,
  Search,
  MapPin,
  Sparkles,
  ArrowLeft,
  MessageSquareQuote,
  CheckCircle2,
  Filter,
  GraduationCap,
  Heart,
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TestimonialItem {
  id: string;
  content: string;
  rating: number;
  created_at: string;
  user?: {
    full_name: string;
    kota: string | null;
    tanggal_lahir?: string | null;
  };
}

export default function TestimoniPage() {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all');

  useEffect(() => {
    async function loadTestimonials() {
      try {
        setLoading(true);
        const res = await fetch('/api/public/testimonials', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setTestimonials(json.data);
            return;
          }
        }
        // Fallback fetch from general endpoint
        const fallbackRes = await fetch('/api/alumni/testimonials', { cache: 'no-store' });
        if (fallbackRes.ok) {
          const fbJson = await fallbackRes.json();
          if (fbJson.data && Array.isArray(fbJson.data)) {
            setTestimonials(fbJson.data);
          }
        }
      } catch (err) {
        console.error('Failed to load testimonials:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTestimonials();
  }, []);

  // Filtered testimonials
  const filteredList = useMemo(() => {
    return testimonials.filter((t) => {
      const matchRating = selectedRating === 'all' || t.rating === selectedRating;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q
        || (t.content && t.content.toLowerCase().includes(q))
        || (t.user?.full_name && t.user.full_name.toLowerCase().includes(q))
        || (t.user?.kota && t.user.kota.toLowerCase().includes(q));

      return matchRating && matchSearch;
    });
  }, [testimonials, selectedRating, searchQuery]);

  // Statistics
  const totalReviews = testimonials.length;
  const avgRating = totalReviews > 0
    ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / totalReviews).toFixed(1)
    : '5.0';

  const starCounts: Record<number, number> = {
    5: testimonials.filter((t) => t.rating === 5).length,
    4: testimonials.filter((t) => t.rating === 4).length,
    3: testimonials.filter((t) => t.rating === 3).length,
    2: testimonials.filter((t) => t.rating === 2).length,
    1: testimonials.filter((t) => t.rating === 1).length,
  };

  const toProperCase = (str: string | null | undefined) => {
    if (!str) return '';
    return str.toLowerCase().replace(/(^\w|\s\w|-\w|\.\w|,\s*\w)/g, (letter) => letter.toUpperCase());
  };

  const calculateAge = (birthDate: string | null | undefined) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-gray-800">
      {/* 1. HERO SECTION */}
      <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white pt-12 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-5xl mx-auto space-y-4 relative z-10 text-center">
          {/* Breadcrumb */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-bold mb-2">
            <Link href="/" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Beranda
            </Link>
            <span>/</span>
            <span className="text-white">Ulasan &amp; Testimoni Alumni</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Kisah Nyata Santriwati &amp; Alumni MTI
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto leading-relaxed">
            Pengalaman murni dari para thalibah yang telah membuktikan kekuatan Metode Tikrar 40x dalam mengokohkan hafalan Al-Qur&apos;an hingga mutqin.
          </p>
        </div>
      </section>

      {/* 2. STATS OVERVIEW CARDS */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-3xl border-none shadow-lg bg-white p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900 font-mono">
                {avgRating} <span className="text-xs text-gray-400 font-sans">/ 5.0</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Rata-rata Penilaian Alumni</p>
            </div>
          </Card>

          <Card className="rounded-3xl border-none shadow-lg bg-white p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900 font-mono">
                {totalReviews} Ulasan
              </div>
              <p className="text-xs text-gray-500 font-medium">Testimoni Otentik Terverifikasi</p>
            </div>
          </Card>

          <Card className="rounded-3xl border-none shadow-lg bg-gradient-to-br from-emerald-900 to-green-950 text-white p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                100%
              </div>
              <p className="text-xs text-emerald-200 font-medium">Rekomendasi Metode 40X</p>
            </div>
          </Card>
        </div>

        {/* 3. SEARCH & STAR FILTER CONTROLS */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama santriwati, kota, atau kata kunci..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-xs sm:text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all"
              />
            </div>

            {/* Star Filters */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setSelectedRating('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedRating === 'all'
                    ? 'bg-emerald-850 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Semua Bintang ({totalReviews})
              </button>

              {[5, 4, 3, 2, 1].map((stars) => {
                const count = starCounts[stars] || 0;
                const isSelected = selectedRating === stars;
                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => setSelectedRating(stars)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-850 text-white shadow-xs'
                        : count > 0
                        ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                        : 'bg-gray-50 text-gray-400 border border-gray-100 opacity-60'
                    }`}
                  >
                    <span>{stars}</span>
                    <Star className={`w-3.5 h-3.5 ${isSelected ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                    <span className="text-[10px] font-semibold opacity-90">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. TESTIMONIALS CARDS GRID */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500 font-medium">Memuat ulasan alumni...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-2 border-gray-200 p-12 text-center space-y-3 bg-white">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
              <MessageSquareQuote className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-800">Tidak ada testimoni yang cocok</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Coba gunakan kata kunci pencarian yang berbeda atau reset filter bintang.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedRating('all');
              }}
              className="rounded-xl text-xs font-bold"
            >
              Reset Filter
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredList.map((t) => {
              const initials = t.user?.full_name
                ? t.user.full_name.substring(0, 2).toUpperCase()
                : 'HA';
              const locationName = toProperCase(t.user?.kota || null);
              const age = calculateAge(t.user?.tanggal_lahir);
              const locationAndAge = locationName
                ? `${locationName}${age ? `, ${age} thn` : ''}`
                : (age ? `${age} thn` : null);

              return (
                <Card
                  key={t.id}
                  className="rounded-3xl border border-emerald-500/10 hover:border-emerald-500/25 shadow-md hover:shadow-xl transition-all duration-300 bg-white p-6 flex flex-col justify-between relative overflow-hidden group"
                >
                  {/* Decorative quote icon */}
                  <div className="absolute right-5 top-5 text-emerald-800/[0.04] text-7xl font-serif select-none pointer-events-none group-hover:scale-110 transition-transform">
                    ”
                  </div>

                  <div className="space-y-4">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-4 h-4 ${
                            idx < t.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Content */}
                    <p className="text-gray-750 text-xs sm:text-sm leading-relaxed italic relative z-10 whitespace-pre-line">
                      &ldquo;{t.content}&rdquo;
                    </p>
                  </div>

                  {/* Profile info footer */}
                  <div className="pt-4 border-t border-gray-150/70 flex items-center gap-3 mt-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm truncate">
                        {t.user?.full_name || 'Hamba Allah'}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-750 font-semibold mt-0.5">
                        {locationAndAge ? (
                          <>
                            <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{locationAndAge}</span>
                          </>
                        ) : (
                          <span>Alumni Program MTI</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* 5. SHARE TESTIMONY BANNER */}
        <Card className="rounded-3xl border-none bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-950 text-white p-6 sm:p-10 text-center space-y-4 shadow-xl">
          <div className="max-w-xl mx-auto space-y-2">
            <span className="p-1 px-3 rounded-full bg-white/10 text-emerald-200 text-xs font-bold uppercase tracking-wider inline-block">
              Ruang Khusus Alumni
            </span>
            <h3 className="text-xl sm:text-3xl font-black">
              Apakah Ukhti Alumni Program MTI?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Bagikan kisah perjuangan dan manfaat yang Ukhti rasakan selama belajar bersama Al-Qur&apos;an di MTI untuk memotivasi calon santriwati lainnya.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black rounded-2xl px-6 py-5 shadow-md"
            >
              <Link href="/login" className="inline-flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span>Kirim Testimoni Saya</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 rounded-2xl px-6 py-5 font-bold"
            >
              <Link href="/">
                Kembali ke Beranda MTI
              </Link>
            </Button>
          </div>
        </Card>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-8 mt-12 text-center text-xs text-gray-500 space-y-1">
        <p className="font-bold text-gray-700">&copy; 2026 Markaz Tikrar Indonesia (MTI)</p>
        <p className="text-[11px]">Metode Tikrar 40x &bull; Menghafal Al-Qur&apos;an Mutqin</p>
      </footer>
    </div>
  );
}
