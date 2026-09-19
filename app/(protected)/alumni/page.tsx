'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { 
  Star, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  BookOpen,
  Send
} from 'lucide-react';
import Link from 'next/link';

// Import from components/ui/button
import { Button as UIButton } from "@/components/ui/button";

interface Testimonial {
  id: string;
  content: string;
  rating: number;
  is_approved: boolean;
  created_at: string;
  user?: {
    full_name: string;
    kota: string | null;
  };
}

export default function AlumniPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isAlumni, setIsAlumni] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Testimonial States
  const [testimonial, setTestimonial] = useState<Testimonial | null>(null);
  const [testimonialContent, setTestimonialContent] = useState('');
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [ratingHover, setRatingHover] = useState<number | null>(null);
  const [savingTestimonial, setSavingTestimonial] = useState(false);
  const [isEditingTestimonial, setIsEditingTestimonial] = useState(false);

  // List of all testimonials states
  const [allTestimonials, setAllTestimonials] = useState<Testimonial[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAlumniData();
      fetchAllTestimonials();
    }
  }, [user]);

  const fetchAllTestimonials = async () => {
    try {
      setLoadingAll(true);
      const res = await fetch('/api/alumni/testimonials');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAllTestimonials(data.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching all testimonials:', err);
    } finally {
      setLoadingAll(false);
    }
  };

  const fetchAlumniData = async () => {
    try {
      setLoading(true);
      const tRes = await fetch('/api/alumni/testimonial/my');
      if (tRes.ok) {
        const tData = await tRes.json();
        setIsAlumni(tData.isAlumni);
        setIsAdmin(tData.isAdmin || false);
        if (tData.testimonial) {
          setTestimonial(tData.testimonial);
          setTestimonialContent(tData.testimonial.content);
          setTestimonialRating(tData.testimonial.rating);
        }
      }
    } catch (err) {
      console.error('Error fetching alumni data:', err);
      toast.error('Gagal memuat data alumni');
    } finally {
      setLoading(false);
    }
  };

  // Testimonial handlers
  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialContent.trim()) {
      toast.error('Konten testimoni tidak boleh kosong');
      return;
    }

    try {
      setSavingTestimonial(true);
      const res = await fetch('/api/alumni/testimonial/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: testimonialContent,
          rating: testimonialRating
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(testimonial ? 'Testimoni berhasil diperbarui!' : 'Testimoni berhasil dikirim!');
        setTestimonial(data.data);
        setIsEditingTestimonial(false);
        fetchAlumniData();
        fetchAllTestimonials();
      } else {
        toast.error(data.error || 'Gagal menyimpan testimoni');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menyimpan testimoni');
    } finally {
      setSavingTestimonial(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] py-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-800 mx-auto mb-4"></div>
          <p className="text-emerald-800 font-medium">Memuat Halaman Alumni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-emerald-850 to-emerald-700 bg-emerald-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl mb-10 overflow-hidden relative">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-44 h-44 rounded-full bg-emerald-800/30 blur-2xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="bg-emerald-800/60 border border-emerald-600 text-emerald-100 text-xs font-semibold px-3 py-1.5 rounded-full tracking-wide uppercase">
                Alumni MTI
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">Barakallahu Fiikum, Ukhti!</h1>
              <p className="text-emerald-100/90 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
                Selamat atas kelulusan Ukhti di program MTI. Halaman ini adalah wadah silaturahmi dan pengisian testimoni ulasan Ukhti.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
                <MessageSquare className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="text-xs text-emerald-250 font-bold uppercase tracking-wider">Status Testimoni</p>
                <div className="flex items-center gap-2 mt-1">
                  {testimonial ? (
                    testimonial.is_approved ? (
                      <span className="bg-emerald-500/20 text-emerald-200 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Disetujui
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-200 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/30">
                        <Clock className="w-3 h-3 animate-spin" /> Menunggu Review
                      </span>
                    )
                  ) : (
                    <span className="bg-red-500/20 text-red-200 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-red-500/30">
                      <AlertCircle className="w-3 h-3" /> Wajib Diisi
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Section Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-50 pb-6 p-6 sm:p-8">
                <CardTitle className="text-xl font-bold text-gray-900">
                  {testimonial && !isEditingTestimonial ? 'Testimoni Ukhti' : 'Tulis Testimoni'}
                </CardTitle>
                <CardDescription>
                  Berikan umpan balik jujur mengenai pengalaman belajar Ukhti di MTI untuk memotivasi calon hafidzah lainnya.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                {testimonial && !isEditingTestimonial ? (
                  /* Show testimonial summary */
                  <div className="space-y-6">
                    <div className="bg-[#F8FAF9] border border-gray-100 rounded-2xl p-6 relative">
                      <div className="flex items-center gap-1.5 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-6 h-6 ${
                              star <= testimonial.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-700 italic leading-relaxed text-base">
                        "{testimonial.content}"
                      </p>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-550">
                        <span>Dikirim pada: {new Date(testimonial.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}</span>
                        <span className="font-semibold text-emerald-700">
                          {testimonial.is_approved ? 'Ditampilkan di Landing Page' : 'Sedang direview admin'}
                        </span>
                      </div>
                    </div>

                    {testimonial.is_approved && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 text-emerald-900 text-sm">
                        <CheckCircle className="w-5 h-5 text-emerald-750 flex-shrink-0 mt-0.5" />
                        <p>
                          Jazakumullahu khairan! Testimoni Ukhti telah disetujui dan saat ini tampil di halaman utama Markaz Tikrar Indonesia.
                        </p>
                      </div>
                    )}

                    {!testimonial.is_approved && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-900 text-sm">
                        <Clock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                        <p>
                          Testimoni Ukhti sedang menunggu verifikasi admin sebelum ditampilkan di halaman utama. Namun Ukhti tetap dapat melakukan pendaftaran batch baru.
                        </p>
                      </div>
                    )}

                    <UIButton
                      onClick={() => setIsEditingTestimonial(true)}
                      variant="outline"
                      className="border-emerald-800 text-emerald-800 hover:bg-emerald-50/50 rounded-xl px-6 transition-all"
                    >
                      Ubah Testimoni
                    </UIButton>
                  </div>
                ) : (
                  /* Edit/New Form */
                  <form onSubmit={handleSaveTestimonial} className="space-y-6">
                    {testimonial && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-900 text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                        <p>
                          <strong>Perhatian:</strong> Mengubah testimoni akan mereset status persetujuan testimoni Ukhti ke <strong>pending (belum disetujui)</strong> untuk dicek ulang oleh admin.
                        </p>
                      </div>
                    )}

                    {/* Star Rating Selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Rating Penilaian</Label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setTestimonialRating(star)}
                            onMouseEnter={() => setRatingHover(star)}
                            onMouseLeave={() => setRatingHover(null)}
                            className="focus:outline-none transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-8 h-8 ${
                                star <= (ratingHover ?? testimonialRating)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-200'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-sm text-gray-550 ml-2 font-medium">
                          {testimonialRating === 5 ? 'Sangat Puas' : 
                           testimonialRating === 4 ? 'Puas' : 
                           testimonialRating === 3 ? 'Cukup Baik' : 
                           testimonialRating === 2 ? 'Perlu Peningkatan' : 'Kurang'}
                        </span>
                      </div>
                    </div>

                    {/* Content Input */}
                    <div className="space-y-2">
                      <Label htmlFor="testimonial" className="text-sm font-semibold text-gray-700">Isi Ulasan Testimoni</Label>
                      <Textarea
                        id="testimonial"
                        placeholder="Ceritakan pengalaman berkesan Ukhti selama menghafal di Markaz Tikrar Indonesia..."
                        rows={6}
                        value={testimonialContent}
                        onChange={(e) => setTestimonialContent(e.target.value)}
                        className="rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 resize-none text-base"
                      />
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Tuliskan ulasan minimal 10 kata yang menceritakan manfaat nyata yang Ukhti rasakan di MTI.
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <UIButton
                        type="submit"
                        disabled={savingTestimonial}
                        className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl px-6 py-6 shadow-lg shadow-emerald-100 flex items-center gap-2"
                      >
                        {savingTestimonial ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Kirim Testimoni
                          </>
                        )}
                      </UIButton>

                      {testimonial && (
                        <UIButton
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setIsEditingTestimonial(false);
                            setTestimonialContent(testimonial.content);
                            setTestimonialRating(testimonial.rating);
                          }}
                          className="text-gray-500 hover:bg-gray-150 rounded-xl"
                        >
                          Batal
                        </UIButton>
                      )}
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* List of all testimonials */}
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-800" />
                  Daftar Testimoni Alumni MTI
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                  {allTestimonials.length} Testimoni
                </span>
              </div>

              {loadingAll ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-md">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-550 font-medium">Memuat daftar testimoni...</p>
                </div>
              ) : allTestimonials.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-md text-gray-550 text-sm">
                  Belum ada testimoni alumni yang disetujui.
                </div>
              ) : (
                <div className="space-y-4">
                  {allTestimonials.map((t) => {
                    const initials = t.user?.full_name
                      ? t.user.full_name.substring(0, 2).toUpperCase()
                      : 'HA';
                    const locationName = t.user?.kota
                      ? t.user.kota
                          .toLowerCase()
                          .split(' ')
                          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ')
                      : null;

                    return (
                      <Card key={t.id} className="border-0 shadow-md rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6 space-y-4">
                          {/* Header: User & Rating */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-100/50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                                {initials}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{t.user?.full_name || 'Hamba Allah'}</h4>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                  <span>{new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}</span>
                                  {locationName && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-700 font-medium">{locationName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= t.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Content */}
                          <p className="text-gray-750 text-sm italic leading-relaxed">
                            "{t.content}"
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Benefit/FAQ Column */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-emerald-900 text-white rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  Mengapa Testimoni Penting?
                </h3>
                <ul className="space-y-3.5 text-emerald-100/90 text-sm leading-relaxed">
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 mt-2 flex-shrink-0" />
                    Membantu menyebarkan dakwah Al-Qur'an dengan membagikan kisah inspiratif Ukhti.
                  </li>
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 mt-2 flex-shrink-0" />
                    Membantu tim manajemen MTI mengevaluasi sistem kurikulum dan pengajaran untuk batch selanjutnya.
                  </li>
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 mt-2 flex-shrink-0" />
                    Menjadi prasyarat pendaftaran batch berikutnya sebagai bukti komitmen kelulusan alumni.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md rounded-2xl bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold text-gray-900 uppercase tracking-wide">FAQ Testimoni</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-gray-650 leading-relaxed">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Apakah bisa mengubah testimoni?</h4>
                  <p>Bisa Ukhti. Ukhti dapat menekan tombol "Ubah Testimoni" kapan saja. Pengubahan ulasan akan di-review kembali oleh admin.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Apakah semua testimoni dipublikasi?</h4>
                  <p>Tidak semua. Admin menyaring testimoni demi menjaga kerapian dan keamanan konten dari hal-hal yang kurang pantas.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}