'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Star, ChevronLeft, ChevronRight, MapPin, X, Sparkles, ArrowRight, MessageSquareQuote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface Testimonial {
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

export function LandingTestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | 'all'>('all');
  const [isPaused, setIsPaused] = useState(false);

  // Filter testimonials based on selected star
  const filteredTestimonials = selectedStarFilter === 'all'
    ? testimonials
    : testimonials.filter((t) => t.rating === selectedStarFilter);

  // Statistics calculation
  const totalCount = testimonials.length;
  const averageRating = totalCount > 0
    ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / totalCount).toFixed(1)
    : '5.0';

  const starCounts: Record<number, number> = {
    5: testimonials.filter((t) => t.rating === 5).length,
    4: testimonials.filter((t) => t.rating === 4).length,
    3: testimonials.filter((t) => t.rating === 3).length,
    2: testimonials.filter((t) => t.rating === 2).length,
    1: testimonials.filter((t) => t.rating === 1).length,
  };

  // Periodic shuffle / auto-rotation
  useEffect(() => {
    if (isPaused || filteredTestimonials.length <= 1) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const maxScroll = scrollWidth - clientWidth;
        const cardWidth = 360;

        if (scrollLeft >= maxScroll - 20) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollTo({
            left: scrollLeft + cardWidth,
            behavior: 'smooth',
          });
        }
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, filteredTestimonials.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const cardWidth = 360;
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      scrollRef.current.scrollTo({
        left: scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Helper to format proper case
  const toProperCase = (str: string | null) => {
    if (!str) return '';
    return str.toLowerCase().replace(/(^\w|\s\w|-\w|\.\w|,\s*\w)/g, (letter) => letter.toUpperCase());
  };

  // Helper to calculate age
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

  // Helper to truncate text
  const truncateText = (text: string, limit: number = 160) => {
    if (text.length <= limit) return text;
    return text.substring(0, limit) + '...';
  };

  return (
    <div className="relative max-w-6xl mx-auto px-4 space-y-8">
      {/* 1. TOP STATS & STAR BREAKDOWN BAR */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Rating score & Stars */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-850 to-green-900 text-white flex flex-col items-center justify-center shrink-0 shadow-md">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none tracking-tight">
              {averageRating}
            </span>
            <span className="text-[10px] sm:text-xs text-amber-300 font-bold mt-0.5">
              dari 5.0
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star key={idx} className="w-4 h-4 text-amber-400 fill-amber-400" />
              ))}
              <span className="text-xs font-bold text-gray-800 ml-1.5">
                (Kepuasan Santriwati)
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-gray-900">
              {totalCount} Ulasan Alumni Terverifikasi
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-500">
              Evaluasi murni dari thalibah yang telah menyelesaikan tahfidz di MTI
            </p>
          </div>
        </div>

        {/* Middle: Star Breakdown Pills Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedStarFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedStarFilter === 'all'
                ? 'bg-emerald-850 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua ({totalCount})
          </button>

          {[5, 4, 3, 2, 1].map((stars) => {
            const count = starCounts[stars] || 0;
            const isSelected = selectedStarFilter === stars;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => setSelectedStarFilter(stars)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-850 text-white shadow-xs'
                    : count > 0
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'bg-gray-50 text-gray-400 border border-gray-100 opacity-60'
                }`}
              >
                <span>{stars}</span>
                <Star className={`w-3 h-3 ${isSelected ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                <span className="text-[10px] font-semibold opacity-90">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Right: CTA to Dedicated /testimoni Page */}
        <div className="flex items-center justify-start lg:justify-end">
          <Link
            href="/testimoni"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-850 to-green-800 hover:from-emerald-900 hover:to-green-900 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all hover:scale-102"
          >
            <span>Lihat Semua Testimoni</span>
            <ArrowRight className="w-4 h-4 text-emerald-200" />
          </Link>
        </div>
      </div>

      {/* 2. CAROUSEL SLIDER CONTAINER */}
      <div
        className="relative group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 pt-2 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredTestimonials.map((t) => {
            const isLong = t.content.length > 160;
            const initials = t.user?.full_name
              ? t.user.full_name.substring(0, 2).toUpperCase()
              : 'HA';
            const locationName = toProperCase(t.user?.kota || null);
            const age = calculateAge(t.user?.tanggal_lahir);
            const locationAndAge = locationName
              ? `${locationName}${age ? `, ${age} thn` : ''}`
              : (age ? `${age} thn` : null);

            return (
              <div
                key={t.id}
                className="w-[290px] sm:w-[340px] flex-shrink-0 snap-start snap-always"
              >
                <Card className="h-[285px] border border-emerald-500/10 hover:border-emerald-500/20 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-3xl bg-white flex flex-col justify-between p-6 relative overflow-hidden group/card">
                  {/* Decorative quote icon mark */}
                  <div className="absolute right-6 top-6 text-emerald-800/[0.04] text-8xl font-serif select-none pointer-events-none group-hover/card:scale-110 transition-transform">
                    ”
                  </div>

                  <div>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mb-3.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3.5 h-3.5 ${
                            idx < t.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Content */}
                    <p className="text-gray-700 text-xs sm:text-sm italic leading-relaxed relative z-10">
                      &ldquo;{truncateText(t.content)}&rdquo;
                    </p>

                    {/* Read More link */}
                    {isLong && (
                      <button
                        onClick={() => setSelectedTestimonial(t)}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-bold mt-2 hover:underline relative z-20 flex items-center gap-0.5"
                      >
                        Baca Selengkapnya
                      </button>
                    )}
                  </div>

                  {/* Profile info & Domicile */}
                  <div className="pt-4 border-t border-gray-150/70 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-100/50 text-emerald-700 flex items-center justify-center font-black text-sm">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm truncate">
                        {t.user?.full_name || 'Hamba Allah'}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-700/80 font-semibold mt-0.5">
                        {locationAndAge ? (
                          <>
                            <MapPin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            <span className="truncate">{locationAndAge}</span>
                          </>
                        ) : (
                          <span>Alumni Program MTI</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 transition-all z-10 opacity-0 group-hover:opacity-100 md:opacity-100"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-emerald-800" />
        </button>

        <button
          onClick={() => scroll('right')}
          className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 transition-all z-10 opacity-0 group-hover:opacity-100 md:opacity-100"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-emerald-800" />
        </button>
      </div>

      {/* 3. BOTTOM CTA BAR */}
      <div className="text-center pt-2">
        <p className="text-xs text-gray-500 inline-flex items-center gap-1.5 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
          <MessageSquareQuote className="w-4 h-4 text-emerald-700" />
          <span>Ingin membaca seluruh kisah santriwati atau membagikan pengalaman Ukhti?</span>
          <Link href="/testimoni" className="font-bold text-emerald-850 hover:underline">
            Kunjungi Halaman Testimoni &rarr;
          </Link>
        </p>
      </div>

      {/* Modern Pop-up Modal for Read More */}
      {selectedTestimonial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            onClick={() => setSelectedTestimonial(null)}
          />

          <div className="relative bg-white rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-up z-10">
            {/* Header banner decoration */}
            <div className="bg-gradient-to-r from-emerald-850 to-emerald-700 bg-emerald-900 p-5 pr-14 text-white flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse flex-shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight">Kisah Inspiratif Alumni</h3>
                <p className="text-[10px] sm:text-xs text-emerald-100/90 font-medium mt-0.5">Ulasan dan testimoni lengkap alumni program Markaz Tikrar</p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedTestimonial(null)}
              className="absolute right-4 top-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all focus:outline-none"
              aria-label="Tutup modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Scrollable Testimony Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-100/50 text-emerald-700 flex items-center justify-center font-black text-base shadow-sm">
                  {selectedTestimonial.user?.full_name
                    ? selectedTestimonial.user.full_name.substring(0, 2).toUpperCase()
                    : 'HA'}
                </div>
                <div className="flex flex-col">
                  <h4 className="font-bold text-gray-900 text-lg">
                    {selectedTestimonial.user?.full_name || 'Hamba Allah'}
                  </h4>
                  <div className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                    {(selectedTestimonial.user?.kota || selectedTestimonial.user?.tanggal_lahir) ? (
                      <>
                        <MapPin className="w-4 h-4 text-amber-500" />
                        <span>
                          {toProperCase(selectedTestimonial.user?.kota || null)}
                          {selectedTestimonial.user?.kota && selectedTestimonial.user?.tanggal_lahir ? ', ' : ''}
                          {calculateAge(selectedTestimonial.user?.tanggal_lahir) ? `${calculateAge(selectedTestimonial.user?.tanggal_lahir)} thn` : ''}
                        </span>
                      </>
                    ) : (
                      <span>Alumni Program MTI</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rating stars inside modal */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`w-4 h-4 ${
                      idx < selectedTestimonial.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>

              {/* Testimony content text */}
              <p className="text-gray-750 italic leading-relaxed text-sm sm:text-base bg-gray-50/50 p-5 rounded-2xl border border-gray-150/70">
                &ldquo;{selectedTestimonial.content}&rdquo;
              </p>

              <div className="text-[10px] sm:text-xs text-gray-400">
                Dikirim pada: {new Date(selectedTestimonial.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setSelectedTestimonial(null)}
                className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-950 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
