'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Undo2,
  BookOpen,
  ArrowRight,
  Hand,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const TARGET_COUNT = 40;
const STORAGE_KEY = 'mti_annaba_1_11_simulation_count';

interface VerseItem {
  number: number;
  arabicNumber: string;
  arabic: string;
  latin: string;
  translation: string;
}

const AN_NABA_VERSES: VerseItem[] = [
  {
    number: 1,
    arabicNumber: '١',
    arabic: 'عَمَّ يَتَسَاءَلُونَ',
    latin: "'Amma yatasā'alūn(a)",
    translation: 'Tentang apakah mereka saling bertanya-tanya?',
  },
  {
    number: 2,
    arabicNumber: '٢',
    arabic: 'عَنِ النَّبَإِ الْعَظِيمِ',
    latin: "'Anin-naba'il-'aẓīm(i)",
    translation: 'Tentang berita yang besar (hari kebangkitan),',
  },
  {
    number: 3,
    arabicNumber: '٣',
    arabic: 'الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ',
    latin: 'Allażī hum fīhi mukhtalifūn(a)',
    translation: 'yang dalam hal itu mereka berselisih.',
  },
  {
    number: 4,
    arabicNumber: '٤',
    arabic: 'كَلَّا سَيَعْلَمُونَ',
    latin: "Kallā saya'lamūn(a)",
    translation: 'Sekali-kali tidak! Kelak mereka akan mengetahui,',
  },
  {
    number: 5,
    arabicNumber: '٥',
    arabic: 'ثُمَّ كَلَّا سَيَعْلَمُونَ',
    latin: "Ṡumma kallā saya'lamūn(a)",
    translation: 'sekali-kali tidak! Kelak mereka akan mengetahui.',
  },
  {
    number: 6,
    arabicNumber: '٦',
    arabic: 'أَلَمْ نَجْعَلِ الْأَرْضَ مِهَادًا',
    latin: "Alam naj'alil-arḍa mihādā(n)",
    translation: 'Bukankah Kami telah menjadikan bumi sebagai hamparan,',
  },
  {
    number: 7,
    arabicNumber: '٧',
    arabic: 'وَالْجِبَالَ أَوْتَادًا',
    latin: 'Wal-jibāla autādā(n)',
    translation: 'dan gunung-gunung sebagai pasak?',
  },
  {
    number: 8,
    arabicNumber: '٨',
    arabic: 'وَخَلَقْنَاكُمْ أَزْوَاجًا',
    latin: 'Wa khalaqnākum azwājā(n)',
    translation: 'Dan Kami menciptakan kamu berpasang-pasangan,',
  },
  {
    number: 9,
    arabicNumber: '٩',
    arabic: 'وَجَعَلْنَا نَوْمَكُمْ سُبَاتًا',
    latin: "Wa ja'alnā naumakum subātā(n)",
    translation: 'dan Kami menjadikan tidurmu untuk istirahat,',
  },
  {
    number: 10,
    arabicNumber: '١٠',
    arabic: 'وَجَعَلْنَا اللَّيْلَ لِبَاسًا',
    latin: "Wa ja'alnal-laila libāsā(n)",
    translation: 'dan Kami menjadikan malam sebagai pakaian,',
  },
  {
    number: 11,
    arabicNumber: '١١',
    arabic: 'وَجَعَلْنَا النَّهَارَ مَعَاشًا',
    latin: "Wa ja'alnan-nahāra ma'āsyā(n)",
    translation: 'dan Kami menjadikan siang untuk mencari penghidupan.',
  },
];

export function AnNabaSimulationSection() {
  const [count, setCount] = useState<number>(0);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [pulse, setPulse] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= TARGET_COUNT) {
          setCount(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const updateCount = (next: number) => {
    const clamped = Math.max(0, Math.min(TARGET_COUNT, next));
    setCount(clamped);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      // ignore storage errors
    }
  };

  const handleIncrement = () => {
    if (count >= TARGET_COUNT) return;
    setPulse(true);
    setTimeout(() => setPulse(false), 180);
    updateCount(count + 1);
  };

  const handleDecrement = () => {
    if (count <= 0) return;
    updateCount(count - 1);
  };

  const handleReset = () => {
    updateCount(0);
  };

  const isCompleted = count >= TARGET_COUNT;
  const progressPercent = Math.round((count / TARGET_COUNT) * 100);
  const remaining = Math.max(0, TARGET_COUNT - count);

  return (
    <section id="simulasi" className="py-20 sm:py-24 bg-gradient-to-b from-white via-emerald-50/40 to-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            Simulasi Calon Thalibah
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-950 mt-4 tracking-tight">
            Simulasi Baca An-Naba&apos; 1&ndash;11 Sebanyak 40x
          </h2>
          <p className="text-gray-600 mt-3 text-sm sm:text-base leading-relaxed">
            Sebelum mendaftar, rasakan langsung metode Tikrar 40x! Bacalah{' '}
            <strong className="text-emerald-900">QS. An-Naba&apos; ayat 1&ndash;11</strong> di bawah ini dengan tartil,
            lalu klik tombol hitung setiap kali Ukhti selesai membaca 1 putaran hingga genap 40 kali.
          </p>
        </div>

        <Card className="rounded-3xl border border-emerald-200/70 shadow-xl shadow-emerald-950/5 bg-white overflow-hidden">
          {/* Top Bar */}
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-900 px-5 sm:px-8 py-4 sm:py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                QS. An-Naba&apos; (78) : Ayat 1 &ndash; 11
              </p>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                سُورَةُ النَّبَإِ &bull; Target 40x Putaran
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowTranslation((prev) => !prev)}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-emerald-50 transition-colors cursor-pointer"
            >
              {showTranslation ? 'Sembunyikan Arti & Latin' : 'Tampilkan Arti & Latin'}
            </button>
          </div>

          <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">
            {/* Arabic Passage Block */}
            <div className="bg-gradient-to-br from-emerald-50/70 via-stone-50 to-amber-50/40 border border-emerald-200/60 rounded-2xl p-5 sm:p-7">
              <div className="text-center mb-4 pb-3 border-b border-emerald-200/50">
                <p
                  dir="rtl"
                  lang="ar"
                  className="text-xl sm:text-2xl font-serif text-emerald-950 leading-loose"
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
              </div>

              {!showTranslation ? (
                <p
                  dir="rtl"
                  lang="ar"
                  className="text-right sm:text-justify text-2xl sm:text-3xl leading-[2.4] sm:leading-[2.6] font-serif text-gray-900 select-text"
                >
                  {AN_NABA_VERSES.map((v) => (
                    <span key={v.number} className="inline">
                      {v.arabic}{' '}
                      <span className="inline-flex items-center justify-center text-emerald-800 font-sans text-base sm:text-lg font-bold mx-1 px-1.5 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-200 align-middle">
                        ﴿{v.arabicNumber}﴾
                      </span>{' '}
                    </span>
                  ))}
                </p>
              ) : (
                <div className="space-y-3">
                  {AN_NABA_VERSES.map((v) => (
                    <div
                      key={v.number}
                      className="bg-white/90 rounded-xl p-3.5 sm:p-4 border border-emerald-100 flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold flex items-center justify-center shrink-0 mt-1">
                          {v.number}
                        </span>
                        <p
                          dir="rtl"
                          lang="ar"
                          className="text-right text-xl sm:text-2xl leading-[2] font-serif text-gray-900 flex-1"
                        >
                          {v.arabic}{' '}
                          <span className="text-emerald-700 text-base">﴿{v.arabicNumber}﴾</span>
                        </p>
                      </div>
                      <p className="text-xs font-medium text-emerald-800 italic pl-10">{v.latin}</p>
                      <p className="text-xs sm:text-sm text-gray-600 pl-10">{v.translation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Counter Area */}
            <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-5 sm:p-6 space-y-5">
              {/* Progress & Numbers */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Progres Simulasi Anda
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-4xl sm:text-5xl font-black font-mono transition-transform duration-150 ${
                        pulse ? 'scale-110' : 'scale-100'
                      } ${isCompleted ? 'text-emerald-700' : 'text-emerald-950'}`}
                    >
                      {count}
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-gray-400">
                      / {TARGET_COUNT} kali
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Selesai 40/40 Putaran!
                      </>
                    ) : (
                      <>Sisa {remaining} putaran lagi ({progressPercent}%)</>
                    )}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                      : 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Congratulatory Message after 40 clicks */}
              {isCompleted ? (
                <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-amber-50 border-2 border-emerald-300 rounded-2xl p-5 sm:p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <Sparkles className="w-6 h-6 text-amber-300" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-lg sm:text-xl font-black text-emerald-950">
                      Maa Syaa Allah, Selamat Ukhti! 🎉
                    </h4>
                    <p className="text-sm sm:text-base text-emerald-900 font-medium max-w-xl mx-auto">
                      Selamat! Ukhti sudah berhasil melakukan simulasi membaca{' '}
                      <strong>QS. An-Naba&apos; ayat 1&ndash;11 sebanyak 40x</strong>. InsyaAllah Ukhti siap mengikuti
                      program Tikrar Tahfidz di Markaz Tikrar Indonesia!
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                    <Link href="/register" className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-6 py-5 rounded-xl shadow-md flex items-center justify-center gap-2">
                        <span>Lanjut Daftar Program MTI</span>
                        <ArrowRight className="w-4 h-4 text-amber-300" />
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      className="w-full sm:w-auto border-emerald-300 text-emerald-900 hover:bg-emerald-100/60 font-bold px-5 py-5 rounded-xl flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Ulangi Simulasi</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Click Controls */
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleIncrement}
                    className="flex-1 bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-900 hover:from-emerald-950 hover:to-green-950 text-white font-black text-base sm:text-lg py-6 sm:py-7 rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Hand className="w-5 h-5 text-amber-300" />
                    <span>Klik Selesai Baca 1x ({count} &rarr; {count + 1})</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDecrement}
                      disabled={count === 0}
                      className="flex-1 sm:flex-none border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl py-6 px-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5"
                      title="Kurangi 1 jika salah pencet"
                    >
                      <Undo2 className="w-4 h-4" />
                      <span>-1</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      disabled={count === 0}
                      className="flex-1 sm:flex-none border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl py-6 px-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5"
                      title="Ulangi dari 0"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
