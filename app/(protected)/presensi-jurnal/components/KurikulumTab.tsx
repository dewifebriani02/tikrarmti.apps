import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Copy, CheckCircle2, Calendar, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PosterPreview } from './PosterPreview';

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

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis'];

// Reliable cross-browser Hijri date conversion (not relying on Intl locale support)
const HIJRI_MONTHS_ID = [
  'Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir',
  'Jumadilawal', 'Jumadilakhir', 'Rajab', 'Syakban',
  'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah'
];

function toHijri(date: Date): { day: number; month: number; year: number } {
  // Julian Day Number calculation
  const Y = date.getFullYear();
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const JD = Math.floor((1461 * (Y + 4800 + Math.floor((M - 14) / 12))) / 4) +
    Math.floor((367 * (M - 2 - 12 * Math.floor((M - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((Y + 4900 + Math.floor((M - 14) / 12)) / 100)) / 4) +
    D - 32075;

  // Convert JD to Hijri
  const l = JD - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { day: hDay, month: hMonth, year: hYear };
}

function formatHijriDate(date: Date): string {
  const h = toHijri(date);
  const monthName = HIJRI_MONTHS_ID[h.month - 1] || '';
  return `${h.day} ${monthName.toUpperCase()} ${h.year} H`;
}

const murajaahSchedule = [
  { day: 'Senin', range: [1, 3], parts: ['A', 'B'], target: '4×', code: 'M1' },
  { day: 'Selasa', range: [3, 5], parts: ['C', 'D'], target: '4×', code: 'M2' },
  { day: 'Rabu', range: [1, 5], parts: ['A', 'D'], target: '2×', code: 'M3' },
  { day: 'Kamis', range: [6, 8], parts: ['A', 'B'], target: '4×', code: 'M4' },
  { day: 'Jumat', range: [8, 10], parts: ['C', 'D'], target: '4×', code: 'M5' },
  { day: 'Sabtu', range: [6, 10], parts: ['A', 'D'], target: '2×', code: 'M6' },
  { day: 'Ahad', range: [1, 10], parts: ['A', 'D'], target: '1×', code: 'M7' },
];

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

  const selectedPekan = getCalculatedPekan();
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

  useEffect(() => {
    if (juzOptions.length > 0) {
      updateGeneratedText();
    }
  }, [selectedDate, currentWeek, juzOptions]);

  const getDailyConfig = (pekan: number, hari: string, dateObj: Date) => {
    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = dateObj.toLocaleDateString('id-ID', dateOptions).toUpperCase();
    
    // Reliable cross-browser Hijri date
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
           const rabthEnd = absoluteIndex - 2;
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
      const mSchedule = murajaahSchedule.find(m => m.day === hari);
      if (mSchedule) {
        blockString = `${mSchedule.code} target ${mSchedule.target}`;
        murojaahString = blockString;
        rabthString = blockString;
      }
    }
    
    return { dateHeader, blockString, rabthString, murojaahString };
  };

  const updateGeneratedText = () => {
    const text = generateDailyText(selectedPekan, selectedHari, selectedDate);
    setGeneratedText(text);
  };

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
      // Strip "Juz " prefix and "(Hal X-Y)" range from name → keep only code like "1A"
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
      toast.success('Kurikulum berhasil disalin!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Gagal menyalin text');
    }
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    try {
      setIsDownloading(true);
      // Dynamically load html2canvas to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default;
      
      // We need to briefly make it visible to screen to render properly, or html2canvas handles it?
      // html2canvas can render off-screen elements if they are in the DOM, but using absolute -9999px is standard.
      const canvas = await html2canvas(posterRef.current, {
        scale: 2, 
        useCORS: true,
        backgroundColor: null
      });
      
      const link = document.createElement('a');
      link.download = `Kurikulum_${selectedHari}_Pekan${selectedPekan}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Poster berhasil diunduh!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat poster. Pastikan koneksi stabil.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-green-600">
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

  // Format date for display in the navigator
  const navDateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const navDateStr = selectedDate.toLocaleDateString('id-ID', navDateOptions).toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Kurikulum Hari Ini</h2>
              <p className="text-sm text-gray-500">Buat jurnal harian & poster untuk disalin ke grup kelas</p>
            </div>
          </div>
          
          {!isLibur && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPoster}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-sm shadow-sm disabled:opacity-70"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isDownloading ? 'Memproses...' : 'Download Poster'}
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-bold text-sm shadow-sm"
              >
                {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copy Text
              </button>
            </div>
          )}
        </div>


        {/* Date Navigator - inline: pekan + tanggal + hari sejajar */}
        <div className="flex items-center gap-3 mb-6 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-100 shadow-inner">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl text-gray-500 hover:text-amber-600 hover:bg-white transition-all shadow-sm border border-transparent hover:border-gray-200 flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center justify-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100 flex-shrink-0">
              {selectedPekan === 11 ? 'Pekan 11 (Murajaah)' : `Pekan ${selectedPekan}`}
            </span>
            <span className="text-sm font-black text-gray-900 tracking-wide text-center">
              {navDateStr}
            </span>
            <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 flex-shrink-0">
              {selectedHari}
            </span>
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl text-gray-500 hover:text-amber-600 hover:bg-white transition-all shadow-sm border border-transparent hover:border-gray-200 flex-shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {['Jumat', 'Sabtu', 'Ahad'].includes(selectedHari) && selectedPekan <= 10 ? (
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
              className="w-full h-[500px] p-6 bg-[#fdfbf7] border border-[#e8e4d9] rounded-2xl text-sm text-gray-800 font-mono leading-relaxed focus:ring-2 focus:ring-amber-500/20 resize-y shadow-inner"
              placeholder="Template kurikulum..."
            />
            <p className="text-xs text-gray-400 mt-2 text-right">
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

