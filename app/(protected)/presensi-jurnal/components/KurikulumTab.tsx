import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Copy, CheckCircle2, Calendar, Download, ChevronLeft, ChevronRight, Sparkles, BookOpen, GraduationCap, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PosterPreview } from './PosterPreview';
import { 
  MURAJAAH_SCHEDULE, 
  generateMurajaahDailyText, 
  generateMurajaahWeeklyRecap, 
  generatePengumumanUjianAkhir,
  generatePanduanMurajaah40x,
  formatHijriDate, 
  getMurajaahWeekMonday,
  getMurajaahDate,
  getDefaultMurajaahStartDate,
  MurajaahScheduleItem 
} from '@/lib/kurikulum-murajaah';

interface JuzOption {
  id: string;
  code: string;
  name: string;
  part: 'A' | 'B';
  juz_number: number;
  start_page: number;
  end_page: number;
  is_active: boolean;
  sort_order: number;
}

interface KurikulumTabProps {
  currentWeek?: number;
}

export function KurikulumTab({ currentWeek }: KurikulumTabProps = {}) {
  const [juzOptions, setJuzOptions] = useState<JuzOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [manualPekan, setManualPekan] = useState<number | null>(null);
  const [murajaahMode, setMurajaahMode] = useState<'daily' | 'weekly_recap' | 'ujian' | 'panduan40x'>('daily');
  const [selectedMurajaahCode, setSelectedMurajaahCode] = useState<string>('M1');

  const [generatedText, setGeneratedText] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const posterRef = useRef<HTMLDivElement>(null);

  // Calculate pekan based on selected date and currentWeek baseline
  const getCalculatedPekan = () => {
    if (!currentWeek) return 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find Monday of the current week
    const todayDay = today.getDay();
    const daysSinceMonday = todayDay === 0 ? 6 : todayDay - 1;
    const baselineMonday = new Date(today);
    baselineMonday.setDate(today.getDate() - daysSinceMonday);
    
    // Find Monday of the selected date
    const selectedDay = selectedDate.getDay();
    const selectedDaysSinceMonday = selectedDay === 0 ? 6 : selectedDay - 1;
    const selectedMonday = new Date(selectedDate);
    selectedMonday.setDate(selectedDate.getDate() - selectedDaysSinceMonday);
    
    // Calculate difference in weeks
    const diffTime = selectedMonday.getTime() - baselineMonday.getTime();
    const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
    
    const calculated = currentWeek + diffWeeks;
    return Math.max(1, Math.min(11, calculated)); // clamp between 1 and 11
  };

  const calculatedPekan = getCalculatedPekan();
  const selectedPekan = manualPekan !== null ? manualPekan : calculatedPekan;
  const allDays = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const selectedHari = allDays[selectedDate.getDay()];

  useEffect(() => {
    fetchJuzOptions();
  }, []);

  const fetchJuzOptions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/juz');
      const data = await res.json();
      
      if (res.ok && data.data) {
        const sortedJuz = (data.data as JuzOption[]).sort((a, b) => a.sort_order - b.sort_order);
        setJuzOptions(sortedJuz);
      } else {
        setError(data.error || 'Gagal memuat opsi juz');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync active murajaah day code when selectedDate changes (if in daily mode)
  useEffect(() => {
    if (selectedPekan === 11 && murajaahMode === 'daily') {
      const match = MURAJAAH_SCHEDULE.find(m => m.day === selectedHari);
      if (match) {
        setSelectedMurajaahCode(match.code);
      }
    }
  }, [selectedHari, selectedPekan, murajaahMode]);

  const getDailyConfig = (pekan: number, hari: string, dateObj: Date) => {
    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = dateObj.toLocaleDateString('id-ID', dateOptions).toUpperCase();
    const hijriDateStr = formatHijriDate(dateObj);
    const dateHeader = `${hari.toUpperCase()}, ${dateStr} / ${hijriDateStr}`;

    let blockString = '';
    let rabthString = '(belum ada)';
    let murojaahString = '(belum ada)';

    if (pekan <= 10) {
      const daysMap: Record<string, number> = {
        'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4
      };
      
      const dayNum = daysMap[hari];
      if (dayNum) {
        const absoluteIndex = (pekan - 1) * 4 + dayNum;
        
        const getFormat = (idx: number) => {
           const p = Math.ceil(idx / 4);
           const parts = ['a', 'b', 'c', 'd'];
           const pt = parts[(idx - 1) % 4];
           return `H${p}${pt}/H${p+10}${pt}`;
        };

        const getPartOnly = (idx: number, offset: number = 0) => {
           const p = Math.ceil(idx / 4) + offset;
           const parts = ['a', 'b', 'c', 'd'];
           const pt = parts[(idx - 1) % 4];
           return `H${p}${pt}`;
        };

        blockString = getFormat(absoluteIndex);

        if (absoluteIndex === 1) {
           murojaahString = '(belum ada)';
           rabthString = '(belum ada)';
        } else if (absoluteIndex === 2) {
           murojaahString = getFormat(1);
           rabthString = '(belum ada)';
        } else {
           murojaahString = getFormat(absoluteIndex - 1);
           const rabthEnd = absoluteIndex - 1;
           const rabthStart = Math.max(1, rabthEnd - 10 + 1);

           if (rabthStart === rabthEnd) {
             rabthString = getFormat(rabthStart);
           } else {
             rabthString = `${getPartOnly(rabthStart, 0)}-${getPartOnly(rabthEnd, 0)}/${getPartOnly(rabthStart, 10)}-${getPartOnly(rabthEnd, 10)}`;
           }
        }
      } else {
        blockString = '[MURAJAAH/RABTH PEKANAN]';
        murojaahString = '[MURAJAAH/RABTH PEKANAN]';
        rabthString = '[MURAJAAH/RABTH PEKANAN]';
      }
    } else {
      // Pekan 11: Muraja'ah
      const mSchedule = MURAJAAH_SCHEDULE.find(m => m.code === selectedMurajaahCode) ||
                        MURAJAAH_SCHEDULE.find(m => m.day === hari) || 
                        MURAJAAH_SCHEDULE[0];
      blockString = `${mSchedule.code} (${mSchedule.day}): ${mSchedule.desc} (Target ${mSchedule.target})`;
      murojaahString = `${mSchedule.code} target ${mSchedule.target}`;
      rabthString = `${mSchedule.code} target ${mSchedule.target}`;
    }
    
    return { dateHeader, blockString, rabthString, murojaahString };
  };

  const updateGeneratedText = () => {
    if (selectedPekan === 11) {
      const monday = getMurajaahWeekMonday(selectedDate);
      if (murajaahMode === 'weekly_recap') {
        const text = generateMurajaahWeeklyRecap({ startDate: monday, juzOptions });
        setGeneratedText(text);
        return;
      } else if (murajaahMode === 'ujian') {
        const text = generatePengumumanUjianAkhir();
        setGeneratedText(text);
        return;
      } else if (murajaahMode === 'panduan40x') {
        const text = generatePanduanMurajaah40x();
        setGeneratedText(text);
        return;
      } else {
        const mSchedule = MURAJAAH_SCHEDULE.find(m => m.code === selectedMurajaahCode) ||
                          MURAJAAH_SCHEDULE.find(m => m.day === selectedHari) || 
                          MURAJAAH_SCHEDULE[0];
        const dayDate = getMurajaahDate(monday, mSchedule.code);
        const text = generateMurajaahDailyText({ item: mSchedule, date: dayDate, juzOptions });
        setGeneratedText(text);
        return;
      }
    }

    const text = generateDailyText(selectedPekan, selectedHari, selectedDate);
    setGeneratedText(text);
  };

  useEffect(() => {
    if (juzOptions.length > 0) {
      updateGeneratedText();
    }
  }, [selectedDate, selectedPekan, juzOptions, murajaahMode, selectedMurajaahCode]);

  const generateDailyText = (pekan: number, hari: string, dateObj: Date) => {
    const { dateHeader, blockString, rabthString, murojaahString } = getDailyConfig(pekan, hari, dateObj);

    let text = `*KURIKULUM HARI INI*\n*PROGRAM TIKRAR TAHFIDZ MTI*\n*${dateHeader}*\n\n`;

    text += `1. Mendengarkan murottal ${blockString} 3x\n`;
    text += `2. Membaca ${blockString} 40x\n`;
    text += `3. Merekam *tanpa salah* ${blockString} 3x\n`;
    text += `4. Mendengarkan rekaman tadi dengan melihat mushaf, jika ada yang salah maka poin 3 di ulang\n`;
    text += `5. Rabth ${rabthString === '(belum ada)' ? '(belum ada)' : rabthString} 1x. Setor ke pasangan\n`;
    text += `6. Muroja'ah ${murojaahString === '(belum ada)' ? '(belum ada)' : murojaahString} 5x. Setor ke pasangan\n`;
    text += `7. Tikrar ke pasangan (tanpa melihat mushaf/bil ghaib) ${blockString} 40x\n\n`;

    text += `Kurikulum tambahannya (optional)\n`;
    text += `1. Baca/simak tafsir ${blockString}\n`;
    text += `2. Menulis ayat ${blockString}\n\n`;

    text += `Notes:\n`;
    juzOptions.forEach(j => {
      const codeOnly = j.name.replace(/Juz\s*/i, '').replace(/\s*\(.*?\)/, '').trim();
      text += `Juz ${codeOnly} mulai dari hal ${j.start_page}\n`;
    });
    text += `\n`;

    text += `Yassarallah \nBarakallahufiikunna..\n\n━━━━━━━━━━━━━━━━❁❁\n\n𝗠𝗔𝗥𝗞𝗔𝗭 𝗧𝗜𝗞𝗥𝗔𝗥 𝗜𝗡𝗗𝗢𝗡𝗘𝗦𝗜𝗔\n\n📱 *MTI OFFICIAL : 081330000784*\n🪩  *Website MTI : markaztikrar.id*\n🔗 *Tap Lynk : https://lynk.id/markaztikrar.id*`;

    return text.trim();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setIsCopied(true);
      toast.success('Teks berhasil disalin!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin teks');
    }
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    try {
      setIsDownloading(true);
      // Dynamic import to prevent SSR/Canvas issues
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(posterRef.current, {
        scale: 2, // 2x scale for crisp export
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `kurikulum-${selectedPekan === 11 ? 'murajaah' : `pekan-${selectedPekan}`}-${selectedHari.toLowerCase()}-${selectedDate.toISOString().split('T')[0]}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success('Poster berhasil di-download!');
    } catch (err) {
      console.error('Download poster error:', err);
      toast.error('Gagal mendownload poster');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="text-sm font-medium animate-pulse">Memuat kurikulum...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-center">
        <p className="text-rose-600 font-medium">{error}</p>
        <button 
          onClick={fetchJuzOptions}
          className="mt-4 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-200 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const { dateHeader, blockString, rabthString, murojaahString } = getDailyConfig(selectedPekan, selectedHari, selectedDate);
  const isLibur = ['Jumat', 'Sabtu', 'Ahad'].includes(selectedHari) && selectedPekan <= 10;

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const navDateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const navDateStr = selectedDate.toLocaleDateString('id-ID', navDateOptions).toUpperCase();
  const murajaahMonday = getMurajaahWeekMonday(selectedDate);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-4 sm:p-6 border border-gray-100 rounded-2xl shadow-sm relative overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${selectedPekan === 11 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
              {selectedPekan === 11 ? <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" /> : <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-gray-900">
                  {selectedPekan === 11 ? "Kurikulum Pekan Muraja'ah" : "Kurikulum Hari Ini"}
                </h2>
                {selectedPekan === 11 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                    Pekan 11
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                {selectedPekan === 11 
                  ? "Template pesan muraja'ah M1–M7, broadcast sepekan, pengumuman ujian, & panduan 40x" 
                  : "Buat jurnal harian & poster untuk disalin ke grup kelas"
                }
              </p>
            </div>
          </div>
          
          {(!isLibur || selectedPekan === 11) && (
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={handleDownloadPoster}
                disabled={isDownloading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-xs sm:text-sm shadow-sm disabled:opacity-70"
              >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                <span>{isDownloading ? 'Memproses...' : 'Download Poster'}</span>
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-bold text-xs sm:text-sm shadow-sm"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                <span>Copy Text</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Week Switcher / Pekan 11 Murajaah Banner */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-amber-50 border border-emerald-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-bold text-emerald-950">
              {selectedPekan === 11 ? "Sedang aktif: Kurikulum Pekan Muraja'ah" : "Pekan Pembelajaran Aktif"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setManualPekan(11);
                setMurajaahMode('daily');
                setSelectedMurajaahCode('M1');
                const defaultMonday = getDefaultMurajaahStartDate();
                setSelectedDate(defaultMonday);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedPekan === 11
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-300/60'
              }`}
            >
              📖 Masuk Pekan Muraja'ah (P11)
            </button>

            {manualPekan !== null && (
              <button
                type="button"
                onClick={() => setManualPekan(null)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-gray-500 hover:text-gray-800 bg-white border border-gray-200"
              >
                Reset ke Pekan Berjalan
              </button>
            )}
          </div>
        </div>

        {/* Pekan 11 Mode & Day Selector */}
        {selectedPekan === 11 && (
          <div className="mb-5 p-3.5 bg-white border border-emerald-200/80 rounded-2xl shadow-sm space-y-3">
            {/* Category Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setMurajaahMode('weekly_recap')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  murajaahMode === 'weekly_recap'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span>📢 Rekap Sepekan (M1–M7)</span>
              </button>

              <button
                type="button"
                onClick={() => setMurajaahMode('ujian')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  murajaahMode === 'ujian'
                    ? 'bg-purple-800 text-white shadow-sm'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Pengumuman Ujian Akhir</span>
              </button>

              <button
                type="button"
                onClick={() => setMurajaahMode('panduan40x')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  murajaahMode === 'panduan40x'
                    ? 'bg-teal-800 text-white shadow-sm'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Panduan Muraja'ah 40x</span>
              </button>
            </div>

            {/* Daily Selector M1 - M7 */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                <span>Target Harian Muraja'ah:</span>
                <span className="text-[10px] text-gray-400 font-normal">Klik untuk memilih hari target</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {MURAJAAH_SCHEDULE.map(m => {
                  const isActive = murajaahMode === 'daily' && selectedMurajaahCode === m.code;
                  const targetDate = getMurajaahDate(murajaahMonday, m.code);
                  const dayDateStr = targetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });
                  return (
                    <button
                      key={m.code}
                      type="button"
                      onClick={() => {
                        setMurajaahMode('daily');
                        setSelectedMurajaahCode(m.code);
                        setSelectedDate(targetDate);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/20'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/70'
                      }`}
                    >
                      <span>{m.code}</span> <span className="opacity-75">({m.day.slice(0, 3)}, {dayDateStr})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {murajaahMode === 'daily' && (
              <div className="text-xs bg-emerald-50/70 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-2">
                <span className="font-bold">
                  {MURAJAAH_SCHEDULE.find(m => m.code === selectedMurajaahCode)?.code} ({MURAJAAH_SCHEDULE.find(m => m.code === selectedMurajaahCode)?.day}):
                </span>
                <span>
                  {MURAJAAH_SCHEDULE.find(m => m.code === selectedMurajaahCode)?.desc} • Target {MURAJAAH_SCHEDULE.find(m => m.code === selectedMurajaahCode)?.target}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Date Navigator */}
        <div className="flex items-center gap-1.5 sm:gap-3 mb-6 bg-gray-50 rounded-2xl px-2 sm:px-3 py-2 border border-gray-100 shadow-inner">
          <button
            onClick={handlePrevDay}
            className="p-1.5 sm:p-2 rounded-xl text-gray-500 hover:text-amber-600 hover:bg-white transition-all shadow-sm border border-transparent hover:border-gray-200 flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] sm:text-xs font-bold border border-amber-100 flex-shrink-0">
              {selectedPekan === 11 ? 'P11 (Murajaah)' : `Pekan ${selectedPekan}`}
            </span>
            <span className="text-xs sm:text-sm font-black text-gray-900 tracking-wide text-center">
              {navDateStr}
            </span>
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg bg-gray-100 text-gray-700 text-[10px] sm:text-xs font-bold border border-gray-200 flex-shrink-0">
              {selectedHari}
            </span>
          </div>

          <button
            onClick={handleNextDay}
            className="p-1.5 sm:p-2 rounded-xl text-gray-500 hover:text-amber-600 hover:bg-white transition-all shadow-sm border border-transparent hover:border-gray-200 flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {isLibur ? (
          <div className="flex flex-col items-center justify-center py-16 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
            <div className="p-4 bg-gray-100 rounded-full mb-3">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Libur Ziyadah</h3>
            <p className="text-sm text-gray-500">Tidak ada kurikulum hari ini.</p>
          </div>
        ) : (
          <div className="relative">
            <textarea
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              className="w-full h-[380px] sm:h-[500px] p-4 sm:p-6 bg-[#fdfbf7] border border-[#e8e4d9] rounded-2xl text-xs sm:text-sm text-gray-800 font-mono leading-relaxed focus:ring-2 focus:ring-amber-500/20 resize-y shadow-inner"
              placeholder="Template kurikulum..."
            />
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 text-right">
              *Ukhti dapat mengedit teks di atas sebelum menyalinnya.
            </p>
          </div>
        )}

        {/* Hidden Poster DOM element used for html2canvas */}
        <PosterPreview 
          ref={posterRef}
          dateHeader={dateHeader} 
          blockString={blockString} 
          rabthString={rabthString}
          murojaahString={murojaahString}
          juzOptions={juzOptions}
          pekan={selectedPekan}
        />
      </div>
    </div>
  );
}
