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
  Send,
  Users,
  Search,
  MapPin,
  GraduationCap,
  Sparkles,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState<'testimoni' | 'database'>('testimoni');

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
      <div className="min-h-screen bg-[#F8FAF9] py-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-900 mx-auto mb-4"></div>
          <p className="text-green-900 font-medium text-xs">Memuat Halaman Alumni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadeInUp pb-24 font-sans">
      {/* 1. Header Halaman (Standar Jurnal Harian) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Ruang Alumni MTI
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h1>
            <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest leading-none mt-1">
              Silaturahmi & Jejaring Santri
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-800 px-3 py-1.5 rounded-2xl shadow-sm">
            <GraduationCap className="w-3.5 h-3.5 text-purple-700" />
            <span className="text-xs font-black uppercase tracking-wider">Alumni MTI</span>
          </div>
        </div>

        {/* 2. Hero Status Card (Gradien Hijau Tua Elegan) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-4 sm:p-5 text-white shadow-lg border border-white/10">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                <MessageSquare className="w-5 h-5 text-green-200" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Barakallahu Fiikum, Ukhti!
                </h2>
                <p className="text-green-100/70 text-[10px] font-black uppercase tracking-tighter">
                  {testimonial?.is_approved ? 'Ulasan Testimoni Disetujui' : testimonial ? 'Ulasan Menunggu Verifikasi' : 'Ulasan Belum Diisi'}
                </p>
              </div>
            </div>
            <div className="text-right">
              {testimonial ? (
                testimonial.is_approved ? (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-300" /> Disetujui
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/30 text-amber-100 px-2.5 py-1 rounded-lg border border-amber-400/30 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-300" /> Review
                  </span>
                )
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 text-green-100 px-2.5 py-1 rounded-lg border border-white/10">
                  Wajib Diisi
                </span>
              )}
            </div>
          </div>

          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-yellow-400/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-green-400/5 rounded-full blur-2xl" />
        </div>
      </div>

      {/* 3. Banner Link Cepat ke Muraja'ah 40x */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-900 leading-tight">
              Program Muraja'ah 40x Pasca-Kelulusan
            </p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              Muraja'ah kini mandiri di menunya sendiri untuk mempermudah pencatatan putaran.
            </p>
          </div>
        </div>
        <Link href="/murojaah" className="self-start sm:self-auto shrink-0">
          <Button size="sm" className="bg-green-900 hover:bg-green-800 text-white rounded-xl text-xs font-bold gap-1 px-3 py-1.5 h-auto shadow-sm">
            Buka Muraja'ah 40x <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* 4. Sub-Tabs: Testimoni vs Database Alumni */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('testimoni')}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === 'testimoni'
              ? "bg-white text-green-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          )}
        >
          <MessageSquare className="w-3.5 h-3.5 text-green-800" />
          <span>Testimoni Alumni</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === 'database'
              ? "bg-white text-green-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          )}
        >
          <Users className="w-3.5 h-3.5 text-green-800" />
          <span>Database Alumni</span>
          <span className="text-[9px] bg-green-100 text-green-800 font-extrabold px-1.5 py-0.2 rounded-md">
            Segera
          </span>
        </button>
      </div>

      {/* 5. Konten Tab */}
      {activeTab === 'testimoni' ? (
        <div className="space-y-6">
          {/* Form / Kartu Ulasan Saya */}
          <Card className="rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  {testimonial && !isEditingTestimonial ? 'Ulasan Testimoni Ukhti' : 'Tulis Testimoni'}
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Berikan kesan pesan pengalaman belajar Ukhti di MTI untuk memotivasi calon hafidzah lainnya.
                </p>
              </div>
            </div>

            {testimonial && !isEditingTestimonial ? (
              <div className="space-y-4">
                <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 sm:p-5 relative space-y-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "w-5 h-5",
                          star <= testimonial.rating
                            ? "text-amber-400 fill-amber-400"
                            : "text-gray-200"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 italic text-xs sm:text-sm leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span>{new Date(testimonial.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}</span>
                    <span className="font-semibold text-emerald-700">
                      {testimonial.is_approved ? 'Tampil di Halaman Utama' : 'Sedang diverifikasi admin'}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setIsEditingTestimonial(true)}
                  variant="outline"
                  className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold"
                >
                  Ubah Testimoni
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSaveTestimonial} className="space-y-4">
                {testimonial && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-amber-900 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Catatan:</strong> Mengubah testimoni akan mereset status ke <strong>menunggu verifikasi</strong> untuk dicek ulang oleh admin.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Rating Penilaian</Label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setTestimonialRating(star)}
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(null)}
                        className="focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={cn(
                            "w-6 h-6",
                            star <= (ratingHover ?? testimonialRating)
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-200"
                          )}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-gray-600 ml-2">
                      {testimonialRating === 5 ? 'Sangat Puas' : 
                       testimonialRating === 4 ? 'Puas' : 
                       testimonialRating === 3 ? 'Cukup Baik' : 'Kurang'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="testimonial" className="text-xs font-bold text-gray-700">Isi Ulasan Testimoni</Label>
                  <Textarea
                    id="testimonial"
                    placeholder="Ceritakan pengalaman berkesan Ukhti selama menghafal di Markaz Tikrar Indonesia..."
                    rows={4}
                    value={testimonialContent}
                    onChange={(e) => setTestimonialContent(e.target.value)}
                    className="rounded-xl border-gray-200 focus:border-green-800 text-xs resize-none"
                  />
                  <p className="text-[10px] text-gray-400">
                    Tuliskan ulasan minimal 10 kata yang menceritakan manfaat nyata yang Ukhti rasakan di MTI.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <Button
                    type="submit"
                    disabled={savingTestimonial}
                    className="flex-1 bg-green-900 hover:bg-green-800 text-white rounded-xl py-5 font-bold text-xs shadow-md shadow-green-900/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {savingTestimonial ? (
                      <>
                        <div className="w-3.5 h-3.5 animate-spin rounded-full border-b-2 border-white" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim Testimoni</span>
                      </>
                    )}
                  </Button>

                  {testimonial && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditingTestimonial(false);
                        setTestimonialContent(testimonial.content);
                        setTestimonialRating(testimonial.rating);
                      }}
                      className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold"
                    >
                      Batal
                    </Button>
                  )}
                </div>
              </form>
            )}
          </Card>

          {/* Daftar Testimoni Alumni Lainnya */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-green-900" />
                Testimoni Alumni MTI
              </h3>
              <span className="text-[10px] font-bold bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded-full">
                {allTestimonials.length} Testimoni
              </span>
            </div>

            {loadingAll ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-900 mx-auto mb-2"></div>
                <p className="text-xs text-gray-500 font-medium">Memuat ulasan alumni...</p>
              </div>
            ) : allTestimonials.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm text-gray-500 text-xs">
                Belum ada testimoni alumni yang disetujui.
              </div>
            ) : (
              <div className="space-y-2.5">
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
                    <Card key={t.id} className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white space-y-2.5">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-green-50 text-green-900 border border-green-100 font-black text-xs flex items-center justify-center">
                            {initials}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs">{t.user?.full_name || 'Hamba Allah'}</h4>
                            <p className="text-[10px] text-gray-400">
                              {locationName ? `${locationName} • ` : ''}
                              {new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "w-3 h-3",
                                star <= t.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-gray-700 text-xs italic leading-relaxed">
                        "{t.content}"
                      </p>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* FAQ Singkat */}
          <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl space-y-1.5">
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
              Mengapa Testimoni Penting?
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Testimoni jujur Ukhti membantu calon santri baru termotivasi untuk istiqamah menghafal Al-Qur'an dan menjadi masukan berharga bagi perbaikan kurikulum Markaz Tikrar Indonesia.
            </p>
          </div>
        </div>
      ) : (
        /* Database Alumni Tab */
        <div className="space-y-4">
          <Card className="rounded-2xl border border-gray-100 shadow-sm p-6 bg-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Direktori & Jejaring Alumni</h3>
                <p className="text-[11px] text-gray-500">Fitur sedang dalam proses pengembangan.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Modul database alumni akan segera hadir untuk menghubungkan seluruh wisudawati Tikrar MTI dari berbagai angkatan dan kota, memudahkan silaturahmi luring, daurah lokal, serta verifikasi keaslian syahadah kelulusan.
            </p>

            <div className="pt-2">
              <Link href="/kelulusan-sertifikat">
                <Button variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold">
                  Lihat Sertifikat Kelulusan Saya
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
