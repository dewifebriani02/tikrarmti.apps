'use client';

import { useState, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, MapPin, X, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Testimonial {
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

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const cardWidth = 360; // Approximate card width + gap
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      scrollRef.current.scrollTo({
        left: scrollLeft + scrollAmount,
        behavior: 'smooth'
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
    <div className="relative max-w-6xl mx-auto px-4">
      {/* Slider Container with snaps */}
      <div className="relative group">
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-8 pt-4 px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {testimonials.map((t) => {
            const isLong = t.content.length > 160;
            const initials = t.user?.full_name
              ? t.user.full_name.substring(0, 2).toUpperCase()
              : 'HA';
            const locationName = toProperCase(t.user?.kota || null);
            const age = calculateAge(t.user?.tanggal_lahir);
            const locationAndAge = locationName ? `${locationName}${age ? `, ${age} thn` : ''}` : (age ? `${age} thn` : null);

            return (
              <div
                key={t.id}
                className="w-[290px] sm:w-[340px] flex-shrink-0 snap-start snap-always"
              >
                <Card className="h-[280px] border border-emerald-500/10 hover:border-emerald-500/20 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-3xl bg-white flex flex-col justify-between p-6 relative overflow-hidden group/card">
                  {/* Decorative quote icon mark */}
                  <div className="absolute right-6 top-6 text-emerald-800/[0.03] text-8xl font-serif select-none pointer-events-none group-hover/card:scale-110 transition-transform">
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
                      "{truncateText(t.content)}"
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

        {/* Navigation Buttons - visible on hover & larger screens */}
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

      {/* Modern Pop-up Modal for Read More */}
      {selectedTestimonial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glassmorphism Backdrop Overlay */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            onClick={() => setSelectedTestimonial(null)}
          />

          {/* Modal Card Content */}
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
                "{selectedTestimonial.content}"
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
