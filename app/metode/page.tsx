import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Heart,
  Star,
  Users,
  BookOpen,
  Repeat,
  Mic,
  Headphones,
  FileText,
  Shield
} from "lucide-react";

export default function MetodePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Minimal Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-green-900/5 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-yellow-500/5 rounded-full opacity-20 blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-green-50/50 via-white to-yellow-50/30 mobile-container">
        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10 mobile-no-overflow">
          {/* Simple Badge */}
          <div className="mb-8">
            <Badge className="bg-green-900 text-white border-0 px-6 py-3 text-sm font-semibold shadow-lg">
              <Shield className="w-4 h-4 mr-2" />
              Metode Teruji & Terbukti
            </Badge>
          </div>

          {/* Clean Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-black mb-6 sm:mb-8 leading-tight mobile-text-wrap">
            Program Tikrar MTI
          </h1>

          {/* Concise Description */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed mobile-text-wrap">
            Sebuah program hafalan yang terstruktur dan disiplin, dirancang untuk menghasilkan hafalan yang kuat (mutqin) melalui kurikulum wajib dan tambahan.
          </p>

          {/* Key Information Card */}
          <Card className="max-w-4xl mx-auto bg-green-50 border-green-200 shadow-lg">
            <CardContent className="p-8 text-left">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-green-900 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-800 leading-relaxed text-lg">
                    Program Tikrar MTI merupakan adaptasi dari metode Tikrar Itqan di Madinah. Perbedaannya terletak pada target harian; jika di Madinah targetnya adalah satu halaman per hari, maka di MTI targetnya disesuaikan menjadi <strong className="font-bold text-green-900">1/4 halaman per hari</strong> atau setara dengan <strong className="font-bold text-green-900">satu halaman per pekan</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tahapan Section */}
      <section id="tahapan" className="py-16 sm:py-24 bg-gray-50 mobile-container">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl mobile-no-overflow">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-green-100 rounded-full px-6 py-3 mb-6">
              <BookOpen className="w-5 h-5 text-green-900 mr-2" />
              <span className="text-green-900 font-semibold text-sm">Proses Pembelajaran Terstruktur</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-green-900 mb-6 mobile-text-wrap">Kurikulum Wajib (7 Tahapan)</h2>
            <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed mobile-text-wrap">
              Tujuh tahapan harian yang disiplin untuk menghasilkan hafalan yang kuat dan mutqin
            </p>
          </div>

          {/* Kurikulum Wajib */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mobile-no-overflow">
            {/* Tahap 1 */}
            <div className="card-modern group hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-islamic rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  1
                </div>
                <div className="flex-1 w-full">
                  <h3 className="text-xl sm:text-2xl font-bold text-main mb-3 mobile-text-wrap">Rabth (Menyambung Hafalan)</h3>
                  <p className="text-secondary leading-relaxed text-sm sm:text-base mobile-text-wrap">
                    Sebelum memulai hafalan baru, lakukan pemanasan dengan menyambungkan 10 blok hafalan terakhir sebanyak 1 kali tanpa melihat mushaf. Ini bertujuan untuk mengikat hafalan lama agar tidak terputus.
                  </p>
                </div>
              </div>
            </div>

            {/* Tahap 2 */}
            <div className="card-modern group hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-islamic rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  2
                </div>
                <div className="flex-1 w-full">
                  <h3 className="text-xl sm:text-2xl font-bold text-main mb-3 mobile-text-wrap">Muraja&apos;ah Blok Terakhir</h3>
                  <p className="text-secondary leading-relaxed text-sm sm:text-base mobile-text-wrap">
                    Ulangi hafalan blok kemarin sebanyak 5 kali tanpa melihat mushaf. Tujuannya adalah untuk memantapkan hafalan yang baru saja dipelajari sebelum menambah yang baru.
                  </p>
                </div>
              </div>
            </div>

            {/* Tahap 3 */}
            <div className="card-modern group hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-islamic rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  3
                </div>
                <div className="flex-1 w-full">
                  <h3 className="text-xl sm:text-2xl font-bold text-main mb-3 mobile-text-wrap">Simak Murattal</h3>
                  <p className="text-secondary leading-relaxed text-sm sm:text-base mobile-text-wrap">
                    Dengarkan bacaan murattal dari qari terpercaya untuk blok hafalan hari ini sebanyak 3 kali. Tahap ini membantu membiasakan lisan dengan irama, makhraj, dan tajwid yang benar.
                  </p>
                </div>
              </div>
            </div>

            {/* Tahap 4 */}
            <div className="card-modern group hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-islamic rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  4
                </div>
                <div className="flex-1 w-full">
                  <h3 className="text-xl sm:text-2xl font-bold text-main mb-3 mobile-text-wrap">Tikrar Bi An-Nadzar (Melihat Mushaf)</h3>
                  <p className="text-secondary leading-relaxed text-sm sm:text-base mobile-text-wrap">
                    Ini adalah inti dari program. Baca blok hafalan hari ini sebanyak 40 kali sambil melihat mushaf dengan saksama. Fokus pada setiap huruf, harakat, dan tata letak ayat di halaman.
                  </p>
                </div>
              </div>
            </div>

            {/* Tahap 5 */}
            <div className="card-modern group hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-islamic rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  5
                </div>
                <div className="flex-1 w-full">
                  <h3 className="text-xl sm:text-2xl font-bold text-main mb-3 mobile-text-wrap">Tasmi&apos; via Rekaman</h3>
                  <p className="text-secondary leading-relaxed text-sm sm:text-base mobile-text-wrap">
                    Setelah merasa cukup hafal, rekam bacaan Ukhti tanpa melihat mushaf. Usahakan mendapatkan 3 rekaman yang lancar tanpa kesalahan sama sekali. Ini melatih kepercayaan diri dan menguji kejujuran hafalan.
                  </p>
                </div>
              </div>
            </div>

            {/* Tahap 6 */}
            <div className="card-modern group hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-islamic rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  6
                </div>
                <div className="flex-1 w-full">
                  <h3 className="text-xl sm:text-2xl font-bold text-main mb-3 mobile-text-wrap">Simak Rekaman Pribadi</h3>
                  <p className="text-secondary leading-relaxed text-sm sm:text-base mobile-text-wrap">
                    Dengarkan kembali rekaman terbaik Ukhti sambil menyimak dengan mushaf. Tahap ini adalah proses kualiti kontrol pribadi untuk menemukan dan memperbaiki kesalahan yang mungkin tidak disadari saat membaca.
                  </p>
                </div>
              </div>
            </div>

            {/* Tahap 7 */}
            <div className="card-modern group hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-islamic rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  7
                </div>
                <div className="flex-1 w-full">
                  <h3 className="text-xl sm:text-2xl font-bold text-main mb-3 mobile-text-wrap">Tikrar Bil Ghaib (Tanpa Mushaf)</h3>
                  <p className="text-secondary leading-relaxed text-sm sm:text-base mobile-text-wrap">
                    Setorkan hafalan blok hari ini kepada pasangan setoran sebanyak 40 kali tanpa melihat mushaf. Ini adalah tahap final untuk mengunci hafalan di dalam ingatan jangka panjang.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-16 text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-primary"></div>
              <span className="text-xs text-primary font-semibold">TAHAPAN TAMBAHAN</span>
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-primary"></div>
            </div>
          </div>

          {/* Kurikulum Tambahan Section */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-main mb-4">Kurikulum Tambahan (Opsional)</h2>
            <p className="text-secondary max-w-2xl mx-auto">
              Tahapan tambahan untuk memperkuat dan memperdalam pemahaman hafalan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tambahan 1: Membaca Tafsir */}
            <div className="card-modern group hover:shadow-2xl transition-all duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-card rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-gradient-islamic group-hover:scale-110 transition-all duration-300">
                  <span className="text-2xl font-bold text-main group-hover:text-white">1</span>
                </div>
                <h3 className="text-xl font-bold text-main mb-3">Membaca Tafsir</h3>
                <p className="text-secondary leading-relaxed">
                  Pahami makna dan konteks ayat yang akan dihafal dengan membaca tafsir ringkas. Memahami arti akan membuat hafalan lebih meresap dan bertahan lama.
                </p>
              </div>
            </div>

            {/* Tambahan 2: Menulis Ayat */}
            <div className="card-modern group hover:shadow-2xl transition-all duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-card rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-gradient-islamic group-hover:scale-110 transition-all duration-300">
                  <span className="text-2xl font-bold text-main group-hover:text-white">2</span>
                </div>
                <h3 className="text-xl font-bold text-main mb-3">Menulis Ayat</h3>
                <p className="text-secondary leading-relaxed">
                  Tulis kembali blok ayat yang sedang dihafal tanpa melihat mushaf. Aktivitas ini melibatkan memori motorik dan visual, sehingga memperkuat ikatan hafalan di otak.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-hero relative overflow-hidden mobile-container">
        {/* Background Pattern */}
        <div className="absolute inset-0 pattern-islamic opacity-20"></div>

        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>

        <div className="relative container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center mobile-no-overflow">
            {/* Section Header */}
            <div className="inline-flex items-center bg-green-600/90 backdrop-blur-sm rounded-full px-6 py-3 mb-6 shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
              <span className="text-white font-bold text-sm">Bergabung Sekarang</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-900 mb-6 mobile-text-wrap">
              Siap Memulai Perjalanan Ukhti?
            </h2>

            <p className="text-base sm:text-lg text-green-800 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed mobile-text-wrap">
              Jika Ukhti serius dan berkomitmen, daftarkan diri Ukhti sekarang dan jadilah bagian dari keluarga besar Markaz Tikrar Indonesia.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                            <Link
                href="/#features"
                className="bg-white/90 backdrop-blur-sm text-primary font-bold px-8 py-4 text-lg rounded-xl hover:bg-white transition-all duration-300 inline-flex items-center group border border-white/50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Pelajari Lebih Lanjut</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}