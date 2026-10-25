'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, Calendar, Clock, Video, Users, CheckCircle2, AlertCircle, 
  Sparkles, Headphones, GraduationCap, ShieldCheck, MessageCircle, 
  ChevronRight, Save, History, Award, Info, FileText, Check, X,
  UserCheck, RefreshCw, Search, PlusCircle, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  getPraTikrarContext, 
  savePraTikrarDailyEntry, 
  submitTashihByMuallimah, 
  submitPresensiByMusyrifah,
  submitBatchPresensiByMusyrifah,
  getHalaqahJournalRecords,
  PraTikrarContextResponse,
  PraTikrarEntryInput,
  PraTikrarStudentRecord
} from './actions';

const JUZ_30_SURAT = [
  "78. An-Naba'",
  "79. An-Nazi'at",
  "80. 'Abasa",
  "81. At-Takwir",
  "82. Al-Infithar",
  "83. Al-Muthaffifin",
  "84. Al-Insyiqaq",
  "85. Al-Buruj",
  "86. Ath-Thariq",
  "87. Al-A'la",
  "88. Al-Ghasyiyah",
  "89. Al-Fajr",
  "90. Al-Balad",
  "91. Asy-Syams",
  "92. Al-Lail",
  "93. Adh-Dhuha",
  "94. Asy-Syarh",
  "95. At-Tin",
  "96. Al-'Alaq",
  "97. Al-Qadr",
  "98. Al-Bayyinah",
  "99. Az-Zalzalah",
  "100. Al-'Adiyat",
  "101. Al-Qari'ah",
  "102. At-Takatsur",
  "103. Al-'Ashr",
  "104. Al-Humazah",
  "105. Al-Fil",
  "106. Quraisy",
  "107. Al-Ma'un",
  "108. Al-Kautsar",
  "109. Al-Kafirun",
  "110. An-Nashr",
  "111. Al-Lahab",
  "112. Al-Ikhlas",
  "113. Al-Falaq",
  "114. An-Naas"
];

const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

export default function JurnalPraTikrarPage() {
  const [context, setContext] = useState<PraTikrarContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'harian' | 'bimbingan' | 'pengawalan' | 'riwayat'>('harian');

  // Day filter for available sessions
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all' | 'today'>('all');

  // Form State (Thalibah Daily Entry)
  const [formData, setFormData] = useState<PraTikrarEntryInput>({
    tanggal: new Date().toISOString().split('T')[0],
    pekan_ke: 1,
    simak_1: false,
    simak_2: false,
    simak_3: false,
    metode_simak: 'murni',
    surat_nama: "78. An-Naba'",
    ayat_range: '1-10',
    durasi_menit: 30,
    catatan_santri: '',
    halaqah_id: '',
  });

  // Management State for Mu'allimah & Musyrifah
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rosterRecords, setRosterRecords] = useState<PraTikrarStudentRecord[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Student search & add for open session grading
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentForTashih, setSelectedStudentForTashih] = useState<PraTikrarStudentRecord | null>(null);
  const [tashihNote, setTashihNote] = useState('');
  const [statusBacaan, setStatusBacaan] = useState('cukup');
  const [tajwidNotes, setTajwidNotes] = useState('');

  // Bulk Attendance State (Musyrifah)
  const [attendanceState, setAttendanceState] = useState<Record<string, { status: string; note: string }>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPraTikrarContext();
      if (!res.success) {
        toast.error(res.error || 'Gagal memuat data Pra-Tikrar');
      } else {
        setContext(res);
        if (res.todayEntry) {
          setFormData({
            tanggal: res.todayEntry.tanggal,
            pekan_ke: res.todayEntry.pekan_ke || 1,
            simak_1: !!res.todayEntry.simak_1,
            simak_2: !!res.todayEntry.simak_2,
            simak_3: !!res.todayEntry.simak_3,
            metode_simak: res.todayEntry.metode_simak || 'murni',
            surat_nama: res.todayEntry.surat_nama || "78. An-Naba'",
            ayat_range: res.todayEntry.ayat_range || '1-10',
            durasi_menit: res.todayEntry.durasi_menit || 30,
            catatan_santri: res.todayEntry.catatan_santri || '',
            halaqah_id: res.todayEntry.halaqah_id || '',
            batch_id: res.todayEntry.batch_id || res.activeBatch?.id,
          });
          setTashihNote(res.todayEntry.catatan_muallimah || '');
          setStatusBacaan(res.todayEntry.status_bacaan || 'cukup');
        } else {
          setFormData(prev => ({
            ...prev,
            batch_id: res.activeBatch?.id,
          }));
        }

        // Set default managed halaqah if available
        if (res.availableSessions && res.availableSessions.length > 0) {
          setSelectedHalaqahId(res.availableSessions[0].id);
        }
      }
    } catch (e: any) {
      toast.error(e?.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load roster records when halaqah or date changes
  const loadRoster = useCallback(async () => {
    try {
      setLoadingRoster(true);
      const res = await getHalaqahJournalRecords(selectedHalaqahId || null, selectedDate);
      if (res.success && res.records) {
        setRosterRecords(res.records);
        // Initialize attendance state for Musyrifah
        const initialAttendance: Record<string, { status: string; note: string }> = {};
        res.records.forEach((rec: PraTikrarStudentRecord) => {
          initialAttendance[rec.student_id] = {
            status: rec.kehadiran_zoom || 'hadir',
            note: rec.catatan_musyrifah || '',
          };
        });
        setAttendanceState(initialAttendance);
      }
    } catch (e: any) {
      console.error('Error loading roster:', e);
    } finally {
      setLoadingRoster(false);
    }
  }, [selectedHalaqahId, selectedDate]);

  useEffect(() => {
    if (context?.isMuallimah || context?.isMusyrifah || context?.isAdmin) {
      loadRoster();
    }
  }, [selectedHalaqahId, selectedDate, context?.isMuallimah, context?.isMusyrifah, context?.isAdmin, loadRoster]);

  // Current day of week (0 = Sunday, 1 = Monday, ..., 7 = Sunday for system)
  const todayDayIndex = new Date().getDay() === 0 ? 7 : new Date().getDay();

  // Filtered available sessions
  const filteredSessions = useMemo(() => {
    if (!context?.availableSessions) return [];
    if (selectedDayFilter === 'all') return context.availableSessions;
    if (selectedDayFilter === 'today') {
      return context.availableSessions.filter((s: any) => s.day_of_week === todayDayIndex);
    }
    return context.availableSessions.filter((s: any) => s.day_of_week === selectedDayFilter);
  }, [context?.availableSessions, selectedDayFilter, todayDayIndex]);

  // Search filtered students for quick grading
  const filteredStudentsForPicker = useMemo(() => {
    if (!context?.praStudentsList) return [];
    if (!studentSearchQuery.trim()) return context.praStudentsList.slice(0, 15);
    const q = studentSearchQuery.toLowerCase();
    return context.praStudentsList.filter((st: any) => 
      st.full_name?.toLowerCase().includes(q) || 
      st.nama_kunyah?.toLowerCase().includes(q) ||
      st.whatsapp?.includes(q) ||
      st.email?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [context?.praStudentsList, studentSearchQuery]);

  const handleSaveDaily = async () => {
    try {
      setSaving(true);
      const res = await savePraTikrarDailyEntry({
        ...formData,
        halaqah_id: formData.halaqah_id || null,
        batch_id: formData.batch_id || context?.activeBatch?.id || null,
      });

      if (res.success) {
        toast.success(res.message);
        loadData();
      } else {
        toast.error(res.error || 'Gagal menyimpan jurnal');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghubungi server');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTashihForStudent = async () => {
    if (!selectedStudentForTashih) {
      toast.error('Pilih santriwati terlebih dahulu untuk dinilai.');
      return;
    }
    try {
      setSaving(true);
      const res = await submitTashihByMuallimah({
        studentId: selectedStudentForTashih.student_id,
        halaqahId: selectedHalaqahId || null,
        batchId: context?.activeBatch?.id,
        tanggal: selectedDate,
        status_bacaan: statusBacaan,
        catatan_muallimah: tashihNote,
        evaluasi_tajwid: tajwidNotes ? [{ kategori: 'catatan_khusus', deskripsi: tajwidNotes }] : [],
      });

      if (res.success) {
        toast.success(res.message);
        loadRoster();
        setSelectedStudentForTashih(null);
        setTashihNote('');
        setTajwidNotes('');
      } else {
        toast.error(res.error);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan catatan tashih');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllAttendance = async () => {
    if (rosterRecords.length === 0) {
      toast.error('Tidak ada data santriwati untuk diabsen.');
      return;
    }
    try {
      setSaving(true);
      const items = rosterRecords.map(rec => ({
        studentId: rec.student_id,
        kehadiran_zoom: attendanceState[rec.student_id]?.status || 'hadir',
        catatan_musyrifah: attendanceState[rec.student_id]?.note || '',
      }));

      const res = await submitBatchPresensiByMusyrifah(
        items,
        selectedHalaqahId || '',
        context?.activeBatch?.id || null,
        selectedDate
      );

      if (res.success) {
        toast.success(res.message);
        loadRoster();
      } else {
        toast.error(res.error);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan presensi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-3 sm:px-6 py-4">
      {/* 1. HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-emerald-950 text-white p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Program Pra-Tikrar MTI (Juz 30)
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              🌸 Bebas Ikut Sesi Mana Pun (Tanpa Kelas Tetap)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Jurnal & Sesi Terbuka Pra-Tikrar
          </h1>
          <p className="text-indigo-100/90 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Program Pra-Tikrar difokuskan untuk memfasihkan makharijul huruf, sifat huruf, dan pembiasaan menyimak murottal Juz 30. <strong className="text-white">Santriwati tidak terikat pada satu kelas tetap</strong>—Ukhti bebas menghadiri sesi tatap muka Zoom mana pun di bawah ini sesuai keluangan waktu masing-masing.
          </p>
        </div>
      </div>

      {/* 2. KATALOG SESI TATAP MUKA ZOOM TERBUKA (PEKAN INI) */}
      <Card className="border border-indigo-100 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 w-full" />
        <CardHeader className="p-5 pb-3 border-b border-gray-100 bg-gradient-to-b from-indigo-50/40 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" />
                Jadwal Sesi Zoom Terbuka Pra-Tikrar ({context?.availableSessions?.length || 0} Sesi Tersedia)
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Pilih sesi yang sesuai dengan waktu luang Ukhti, lalu klik "Masuk Zoom" untuk bergabung dengan Mu'allimah pengampu.
              </CardDescription>
            </div>

            {/* Filter Hari */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedDayFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${selectedDayFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Semua ({context?.availableSessions?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayFilter('today')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${selectedDayFilter === 'today' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}`}
              >
                Hari Ini ({context?.availableSessions?.filter((s: any) => s.day_of_week === todayDayIndex).length || 0})
              </button>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDayFilter(d)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${selectedDayFilter === d ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {DAYS[d]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs italic border-2 border-dashed border-gray-100 rounded-xl">
              Tidak ada jadwal sesi Pra-Tikrar pada filter hari ini. Silakan pilih "Semua" untuk melihat jadwal sepekan penuh.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSessions.map((session: any) => {
                const isToday = session.day_of_week === todayDayIndex;
                const zoomLink = session.zoom_url || session.zoom_link;
                const muallimahName = session.muallimah_name || 'Ustadzah Pembimbing';
                const musyrifahName = session.musyrifah_name || 'Musyrifah Pengawal';

                return (
                  <div 
                    key={session.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isToday 
                        ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30' 
                        : 'bg-white border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                        <Clock className={`w-3.5 h-3.5 ${isToday ? 'text-emerald-600' : 'text-indigo-600'}`} />
                        <span>{DAYS[session.day_of_week]}, {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)} WIB</span>
                      </div>
                      {isToday && (
                        <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> HARI INI
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-gray-800 truncate mb-1">
                      {session.name.replace('Pra-Tikrar | Juz 30 | ', '')}
                    </div>

                    <div className="text-[11px] text-gray-600 space-y-1 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Mu'allimah:</span>
                        <span className="font-semibold text-gray-900">{muallimahName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Musyrifah:</span>
                        <span className="font-semibold text-gray-700">{musyrifahName}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-gray-100/80 flex items-center justify-between gap-2">
                      {zoomLink ? (
                        <a 
                          href={zoomLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" /> Masuk Zoom
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Link belum disematkan</span>
                      )}

                      {session.muallimah_wa && (
                        <a
                          href={`https://wa.me/${session.muallimah_wa.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-gray-100 hover:bg-emerald-50 text-emerald-700 transition-colors"
                          title="Konsultasi WA Mu'allimah"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {session.zoom_meeting_id && (
                      <div className="mt-1.5 text-[10px] text-gray-400 font-mono text-center">
                        ID: {session.zoom_meeting_id} {session.zoom_passcode ? `• Pass: ${session.zoom_passcode}` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. TABS NAVIGASI UTAMA */}
      <Tabs defaultValue="harian" className="w-full space-y-6" onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-gray-100 p-1 rounded-xl h-auto">
          <TabsTrigger value="harian" className="py-2.5 text-xs sm:text-sm font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs">
            <BookOpen className="w-4 h-4 mr-1.5 hidden sm:inline" /> 1. Jurnal Harian Santri
          </TabsTrigger>
          <TabsTrigger value="bimbingan" className="py-2.5 text-xs sm:text-sm font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs">
            <GraduationCap className="w-4 h-4 mr-1.5 hidden sm:inline" /> 2. Bimbingan Mu'allimah
          </TabsTrigger>
          <TabsTrigger value="pengawalan" className="py-2.5 text-xs sm:text-sm font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs">
            <ShieldCheck className="w-4 h-4 mr-1.5 hidden sm:inline" /> 3. Presensi Musyrifah
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="py-2.5 text-xs sm:text-sm font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs">
            <History className="w-4 h-4 mr-1.5 hidden sm:inline" /> 4. Riwayat & Panduan
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: JURNAL HARIAN SANTRI */}
        <TabsContent value="harian" className="space-y-6">
          <Card className="border border-gray-200 shadow-xs rounded-2xl bg-white">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" /> Lembar Pengisian Jurnal Mandiri
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Catat kebiasaan simak murottal 3x sehari dan latihan bacaan mandiri surat-surat Juz 30.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="tanggal-jurnal" className="text-xs font-semibold text-gray-600">Tanggal:</Label>
                    <Input 
                      id="tanggal-jurnal"
                      type="date" 
                      value={formData.tanggal}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      className="text-xs h-9 w-36 rounded-lg font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pekan-ke" className="text-xs font-semibold text-gray-600">Pekan ke:</Label>
                    <select
                      id="pekan-ke"
                      value={formData.pekan_ke}
                      onChange={(e) => setFormData({ ...formData, pekan_ke: parseInt(e.target.value) || 1 })}
                      className="text-xs h-9 px-2.5 rounded-lg font-medium border border-gray-200 bg-white"
                    >
                      {Array.from({ length: 13 }, (_, i) => i + 1).map(p => (
                        <option key={p} value={p}>Pekan {p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Bagian A: SOP Simak Murottal 3x Sehari */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-indigo-600" />
                    SOP Menyimak Murottal 3x Sehari (Juz 30)
                  </h4>
                  <span className="text-[11px] text-indigo-600 bg-indigo-50 font-semibold px-2.5 py-0.5 rounded-full">
                    Minimal 3 Kali Sehari
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.simak_1 ? 'bg-indigo-50/70 border-indigo-300' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                      type="checkbox" 
                      checked={formData.simak_1}
                      onChange={(e) => setFormData({ ...formData, simak_1: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-gray-900">Simak ke-1 (Pagi / Shubuh)</div>
                      <div className="text-[11px] text-gray-500">Mendengar murni fokus pada makhraj</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.simak_2 ? 'bg-indigo-50/70 border-indigo-300' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                      type="checkbox" 
                      checked={formData.simak_2}
                      onChange={(e) => setFormData({ ...formData, simak_2: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-gray-900">Simak ke-2 (Siang / Zhuhur)</div>
                      <div className="text-[11px] text-gray-500">Menyimak sambil memandang mushaf</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.simak_3 ? 'bg-indigo-50/70 border-indigo-300' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                      type="checkbox" 
                      checked={formData.simak_3}
                      onChange={(e) => setFormData({ ...formData, simak_3: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-gray-900">Simak ke-3 (Sore / Malam)</div>
                      <div className="text-[11px] text-gray-500">Menyelaraskan ketukan & tajwid</div>
                    </div>
                  </label>
                </div>

                {/* Pilihan Metode Simak */}
                <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80 space-y-2">
                  <Label className="text-xs font-bold text-gray-700">Metode Simakan Dominan Hari Ini:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'murni', label: '1. Simak Murni', desc: 'Fokus mendengar tanpa bersuara' },
                      { id: 'gerak_bibir', label: '2. Gerak Bibir & Mushaf', desc: 'Menirukan gerak bibir & harakat' },
                      { id: 'selaras_ketukan', label: '3. Selaras Ketukan Murottal', desc: 'Menyamakan tempo dan makhraj' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, metode_simak: m.id })}
                        className={`p-2.5 text-left rounded-lg border text-xs transition-all ${formData.metode_simak === m.id ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500/30' : 'bg-white/60 border-gray-200 hover:bg-white'}`}
                      >
                        <div className="font-bold text-gray-900">{m.label}</div>
                        <div className="text-[10px] text-gray-500">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bagian B: Latihan & Setoran Surat Juz 30 */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Materi Latihan / Setoran Mandiri Hari Ini
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Sesi Zoom yang Diikuti (Fleksibel) */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="sesi-zoom" className="text-xs font-semibold text-gray-700">
                      Sesi Zoom yang Diikuti Hari Ini (Opsional):
                    </Label>
                    <select
                      id="sesi-zoom"
                      value={formData.halaqah_id || ''}
                      onChange={(e) => setFormData({ ...formData, halaqah_id: e.target.value })}
                      className="w-full text-xs h-10 px-3 rounded-lg border border-gray-200 bg-white font-medium"
                    >
                      <option value="">-- Belajar Mandiri / Belum Ikut Zoom --</option>
                      {context?.availableSessions?.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {DAYS[s.day_of_week]}, {s.start_time?.slice(0,5)} WIB • {s.muallimah_name || 'Ustadzah'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="surat-nama" className="text-xs font-semibold text-gray-700">Nama Surat:</Label>
                    <select
                      id="surat-nama"
                      value={formData.surat_nama}
                      onChange={(e) => setFormData({ ...formData, surat_nama: e.target.value })}
                      className="w-full text-xs h-10 px-3 rounded-lg border border-gray-200 bg-white font-medium"
                    >
                      {JUZ_30_SURAT.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="ayat-range" className="text-xs font-semibold text-gray-700">Rentang Ayat:</Label>
                    <Input 
                      id="ayat-range"
                      placeholder="Contoh: 1-10 atau 1-Selesai"
                      value={formData.ayat_range}
                      onChange={(e) => setFormData({ ...formData, ayat_range: e.target.value })}
                      className="text-xs h-10 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="durasi" className="text-xs font-semibold text-gray-700">Durasi Belajar (Menit):</Label>
                    <Input 
                      id="durasi"
                      type="number"
                      min={5}
                      step={5}
                      value={formData.durasi_menit}
                      onChange={(e) => setFormData({ ...formData, durasi_menit: parseInt(e.target.value) || 0 })}
                      className="text-xs h-10 rounded-lg font-medium"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="catatan-santri" className="text-xs font-semibold text-gray-700">Catatan Santriwati (Kendala Huruf / Tajwid):</Label>
                    <Input 
                      id="catatan-santri"
                      placeholder="Tuliskan kendala makhraj huruf (misal: huruf 'Ain, Dhad, atau ghunnah)..."
                      value={formData.catatan_santri}
                      onChange={(e) => setFormData({ ...formData, catatan_santri: e.target.value })}
                      className="text-xs h-10 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Action Save Button */}
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSaveDaily}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md shadow-emerald-600/20"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {saving ? 'Menyimpan...' : 'Simpan Jurnal Pra-Tikrar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CATATAN BIMBINGAN MU'ALLIMAH */}
        <TabsContent value="bimbingan" className="space-y-6">
          {/* A. STAFF VIEW: If Mu'allimah or Admin */}
          {(context?.isMuallimah || context?.isAdmin) && (
            <Card className="border border-emerald-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <div className="h-1.5 bg-emerald-600 w-full" />
              <CardHeader className="pb-4 border-b border-gray-100 bg-emerald-50/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-emerald-700" />
                      Evaluasi & Penilaian Bimbingan Mu'allimah (Sesi Terbuka)
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600">
                      Pilih sesi mengajar Ukhti dan catat penilaian tashih santriwati mana pun yang hadir di Zoom.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Sesi selector */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-gray-700">Sesi:</Label>
                      <select
                        value={selectedHalaqahId}
                        onChange={(e) => setSelectedHalaqahId(e.target.value)}
                        className="text-xs h-9 px-2.5 rounded-lg border border-gray-300 bg-white font-semibold"
                      >
                        <option value="">-- Semua Sesi Hari Ini --</option>
                        {context.availableSessions?.map((h: any) => (
                          <option key={h.id} value={h.id}>
                            {DAYS[h.day_of_week]}, {h.start_time?.slice(0,5)} WIB • {h.muallimah_name || 'Ustadzah'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date picker */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-gray-700">Tanggal:</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-xs h-9 w-36 rounded-lg font-medium"
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadRoster}
                      disabled={loadingRoster}
                      className="h-9 px-3 rounded-lg text-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingRoster ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Search & Pick any Pra-Tikrar student who joined the Zoom */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-emerald-600" />
                      Cari & Nilai Santriwati yang Hadir di Sesi Ini ({context.praStudentsList?.length || 0} Santri Pra-Tikrar Aktif):
                    </Label>
                    <span className="text-[10px] text-gray-500">Pilih santriwati untuk mengisi lembar penilaian</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Ketik nama atau nomor WhatsApp santriwati..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="text-xs h-9 rounded-lg bg-white"
                    />

                    <select
                      onChange={(e) => {
                        const stId = e.target.value;
                        const found = context.praStudentsList?.find((s: any) => s.id === stId);
                        if (found) {
                          setSelectedStudentForTashih({
                            student_id: found.id,
                            student_name: found.full_name,
                            student_kunyah: found.nama_kunyah,
                            student_wa: found.whatsapp,
                          });
                          setStatusBacaan('cukup');
                          setTashihNote('');
                          setTajwidNotes('');
                        }
                      }}
                      className="text-xs h-9 px-2.5 rounded-lg border border-gray-300 bg-white font-medium"
                    >
                      <option value="">-- Pilih dari hasil pencarian ({filteredStudentsForPicker.length}) --</option>
                      {filteredStudentsForPicker.map((st: any) => (
                        <option key={st.id} value={st.id}>
                          {st.full_name} {st.nama_kunyah ? `(${st.nama_kunyah})` : ''} • {st.whatsapp || 'No WA'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Form Input Tashih untuk Santri Terpilih */}
                {selectedStudentForTashih && (
                  <div className="p-5 rounded-2xl border-2 border-emerald-400 bg-emerald-50/40 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-emerald-700" />
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">Lembar Penilaian Bimbingan:</div>
                          <div className="text-sm font-extrabold text-gray-900">{selectedStudentForTashih.student_name}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedStudentForTashih(null)}
                        className="text-gray-500 hover:text-gray-800 text-xs"
                      >
                        Batal
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-700">Tingkat Kelancaran Bacaan:</Label>
                        <select 
                          value={statusBacaan}
                          onChange={(e) => setStatusBacaan(e.target.value)}
                          className="w-full text-xs h-10 px-3 rounded-lg border border-gray-300 bg-white font-semibold"
                        >
                          <option value="lancar_mutqin">✓ Lancar & Mutqin</option>
                          <option value="cukup">✓ Cukup (Sesuai Standar)</option>
                          <option value="perlu_bimbingan">⚠ Perlu Bimbingan Ekstra</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-700">Kategori Huruf / Tajwid yang Perlu Diperbaiki:</Label>
                        <Input 
                          placeholder="Contoh: Makhraj 'Ain & Kaf, Mad Wajib, Ghunnah"
                          value={tajwidNotes}
                          onChange={(e) => setTajwidNotes(e.target.value)}
                          className="text-xs h-10 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Catatan & Nasihat Edukasi Mu'allimah:</Label>
                      <Textarea 
                        placeholder="Tuliskan arahan dan motivasi untuk santriwati agar bacaan semakin fasih..."
                        value={tashihNote}
                        onChange={(e) => setTashihNote(e.target.value)}
                        className="text-xs min-h-[80px] rounded-lg bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        onClick={handleSaveTashihForStudent}
                        disabled={saving}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        {saving ? 'Menyimpan...' : 'Simpan Catatan Tashih Santriwati'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Table of students graded/recorded today */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Rekap Santriwati yang Telah Dinilai / Mengisi Jurnal ({rosterRecords.length} orang pada tanggal {selectedDate})
                  </h4>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                          <th className="py-3 px-4">Nama Santriwati</th>
                          <th className="py-3 px-4 text-center">Simak 3x</th>
                          <th className="py-3 px-4">Surat & Ayat</th>
                          <th className="py-3 px-4">Catatan Santri</th>
                          <th className="py-3 px-4">Status Bacaan</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingRoster ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-gray-400">
                              Memuat data...
                            </td>
                          </tr>
                        ) : rosterRecords.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-gray-400">
                              Belum ada santriwati yang mengisi jurnal atau dinilai pada tanggal ini. Gunakan kotak pencarian di atas untuk menilai santriwati yang hadir di sesi Zoom.
                            </td>
                          </tr>
                        ) : (
                          rosterRecords.map((st) => (
                            <tr key={st.student_id} className={`hover:bg-gray-50/80 transition-colors ${selectedStudentForTashih?.student_id === st.student_id ? 'bg-emerald-50/50' : ''}`}>
                              <td className="py-3 px-4">
                                <div className="font-bold text-gray-900">{st.student_name}</div>
                                {st.student_wa && (
                                  <a
                                    href={`https://wa.me/${st.student_wa.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 mt-0.5"
                                  >
                                    <MessageCircle className="w-3 h-3" /> {st.student_wa}
                                  </a>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex gap-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${st.simak_1 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>1</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${st.simak_2 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>2</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${st.simak_3 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>3</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-gray-800">{st.surat_nama || '-'}</span>
                                {st.ayat_range && <span className="text-gray-500"> ({st.ayat_range})</span>}
                              </td>
                              <td className="py-3 px-4 max-w-[200px]">
                                <p className="text-[11px] text-gray-600 truncate" title={st.catatan_santri || ''}>
                                  {st.catatan_santri || '-'}
                                </p>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  st.status_bacaan === 'lancar_mutqin' ? 'bg-emerald-100 text-emerald-800' :
                                  st.status_bacaan === 'cukup' ? 'bg-blue-100 text-blue-800' :
                                  st.status_bacaan === 'perlu_bimbingan' ? 'bg-amber-100 text-amber-800' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {st.status_bacaan ? st.status_bacaan.replace('_', ' ') : 'Belum Tashih'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStudentForTashih(st);
                                    setStatusBacaan(st.status_bacaan || 'cukup');
                                    setTashihNote(st.catatan_muallimah || '');
                                    const rawTajwid = Array.isArray(st.evaluasi_tajwid) ? st.evaluasi_tajwid[0]?.deskripsi : '';
                                    setTajwidNotes(rawTajwid || '');
                                  }}
                                  className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold ${selectedStudentForTashih?.student_id === st.student_id ? 'bg-emerald-800 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                                >
                                  {selectedStudentForTashih?.student_id === st.student_id ? 'Sedang Dinilai' : 'Nilai Ulang'}
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* B. THALIBAH VIEW: Review catatan bimbingan pribadi */}
          <Card className="border border-emerald-100 shadow-xs rounded-2xl bg-white">
            <CardHeader className="pb-4 border-b border-gray-100">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" /> 
                Evaluasi & Bimbingan Bacaan Santriwati
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Pemeriksaan makharijul huruf, sifat huruf, dan hukum tajwid pada bacaan surat Juz 30.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Status Kelancaran Bacaan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Status Evaluasi Terakhir:</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      context?.todayEntry?.status_bacaan === 'lancar_mutqin' ? 'bg-emerald-200 text-emerald-900' :
                      context?.todayEntry?.status_bacaan === 'cukup' ? 'bg-blue-100 text-blue-900' :
                      context?.todayEntry?.status_bacaan === 'perlu_bimbingan' ? 'bg-amber-100 text-amber-900' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {context?.todayEntry?.status_bacaan === 'lancar_mutqin' ? '✓ Lancar & Mutqin' :
                       context?.todayEntry?.status_bacaan === 'cukup' ? '✓ Cukup / Baik' :
                       context?.todayEntry?.status_bacaan === 'perlu_bimbingan' ? '⚠ Perlu Bimbingan Ekstra' :
                       'Belum Ditashih Hari Ini'}
                    </span>
                  </div>
                  {context?.todayEntry?.tashih_at && (
                    <p className="text-[11px] text-gray-500">
                      Waktu penilaian: {new Date(context.todayEntry.tashih_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1">
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Penilai:</span>
                  <div className="text-sm font-bold text-gray-900">
                    {context?.todayEntry?.muallimah_nama_lengkap || 'Ustadzah Pembimbing Sesi'}
                  </div>
                  <p className="text-xs text-gray-500">
                    Koreksi diberikan secara berkala selama sesi tatap muka Zoom maupun evaluasi berkala.
                  </p>
                </div>
              </div>

              {/* Catatan Arahan Bacaan */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <Label className="text-xs font-bold text-gray-700">Arahan Tajwid & Perbaikan Huruf:</Label>
                <div className="text-sm text-gray-800 bg-gray-50/70 p-3.5 rounded-lg border border-gray-200/80 min-h-[60px] italic">
                  {context?.todayEntry?.catatan_muallimah || 'Belum ada catatan perbaikan dari Mu\'allimah untuk entri hari ini. Teruslah berlatih dan simak murottal secara istiqomah.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PENGAWALAN & PRESENSI KELAS OLEH MUSYRIFAH */}
        <TabsContent value="pengawalan" className="space-y-6">
          {/* A. STAFF VIEW: If Musyrifah or Admin */}
          {(context?.isMusyrifah || context?.isAdmin) && (
            <Card className="border border-blue-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <div className="h-1.5 bg-blue-600 w-full" />
              <CardHeader className="pb-4 border-b border-gray-100 bg-blue-50/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-700" />
                      Presensi Tatap Muka Zoom oleh Musyrifah (Sesi Terbuka)
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600">
                      Catat kehadiran seluruh santriwati yang hadir pada sesi Zoom tatap muka hari ini.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-gray-700">Sesi:</Label>
                      <select
                        value={selectedHalaqahId}
                        onChange={(e) => setSelectedHalaqahId(e.target.value)}
                        className="text-xs h-9 px-2.5 rounded-lg border border-gray-300 bg-white font-semibold"
                      >
                        <option value="">-- Semua Sesi Hari Ini --</option>
                        {context.availableSessions?.map((h: any) => (
                          <option key={h.id} value={h.id}>
                            {DAYS[h.day_of_week]}, {h.start_time?.slice(0,5)} WIB • {h.muallimah_name || 'Ustadzah'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-gray-700">Tanggal:</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-xs h-9 w-36 rounded-lg font-medium"
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadRoster}
                      disabled={loadingRoster}
                      className="h-9 px-3 rounded-lg text-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingRoster ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Daftar Kehadiran Santriwati ({rosterRecords.length} orang)
                    </h4>
                    <span className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-semibold">
                      Klik status kehadiran untuk setiap santri
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                          <th className="py-3 px-4">Nama Santriwati</th>
                          <th className="py-3 px-4">Status Kehadiran</th>
                          <th className="py-3 px-4">Keterangan / Udzur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingRoster ? (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-gray-400">
                              Memuat data presensi...
                            </td>
                          </tr>
                        ) : rosterRecords.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-gray-400">
                              Belum ada entri santriwati pada tanggal ini.
                            </td>
                          </tr>
                        ) : (
                          rosterRecords.map((st) => {
                            const curStatus = attendanceState[st.student_id]?.status || 'hadir';
                            const curNote = attendanceState[st.student_id]?.note || '';

                            return (
                              <tr key={st.student_id} className="hover:bg-gray-50/80 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-gray-900">{st.student_name}</div>
                                  {st.student_wa && (
                                    <a
                                      href={`https://wa.me/${st.student_wa.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                                    >
                                      <MessageCircle className="w-3 h-3" /> {st.student_wa}
                                    </a>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-wrap gap-1.5">
                                    {[
                                      { id: 'hadir', label: 'Hadir', activeClass: 'bg-emerald-600 text-white' },
                                      { id: 'izin_syari', label: 'Izin', activeClass: 'bg-blue-600 text-white' },
                                      { id: 'sakit', label: 'Sakit', activeClass: 'bg-amber-600 text-white' },
                                      { id: 'alpa', label: 'Alpa', activeClass: 'bg-rose-600 text-white' },
                                    ].map((opt) => (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                          setAttendanceState(prev => ({
                                            ...prev,
                                            [st.student_id]: {
                                              status: opt.id,
                                              note: prev[st.student_id]?.note || '',
                                            }
                                          }));
                                        }}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                          curStatus === opt.id 
                                            ? opt.activeClass 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <Input
                                    placeholder="Alasan izin / catatan..."
                                    value={curNote}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setAttendanceState(prev => ({
                                        ...prev,
                                        [st.student_id]: {
                                          status: prev[st.student_id]?.status || 'hadir',
                                          note: val,
                                        }
                                      }));
                                    }}
                                    className="text-xs h-8 rounded-lg max-w-xs"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button
                      onClick={handleSaveAllAttendance}
                      disabled={saving || rosterRecords.length === 0}
                      className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md"
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      {saving ? 'Menyimpan...' : 'Simpan Seluruh Presensi'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* B. THALIBAH VIEW */}
          <Card className="border border-blue-100 shadow-xs rounded-2xl bg-white">
            <CardHeader className="pb-4 border-b border-gray-100">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Presensi & Pengawalan Kelas oleh Musyrifah
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Pengelolaan kehadiran sesi tatap muka Zoom dan penanganan udzur syar'i.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-2">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Status Presensi Kelas:</span>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    context?.todayEntry?.kehadiran_zoom === 'hadir' ? 'bg-emerald-100 text-emerald-900' :
                    context?.todayEntry?.kehadiran_zoom === 'izin_syari' ? 'bg-blue-100 text-blue-900' :
                    context?.todayEntry?.kehadiran_zoom === 'sakit' ? 'bg-amber-100 text-amber-900' :
                    context?.todayEntry?.kehadiran_zoom === 'alpa' ? 'bg-rose-100 text-rose-900' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {context?.todayEntry?.kehadiran_zoom === 'hadir' ? '✓ Hadir di Kelas Zoom' :
                     context?.todayEntry?.kehadiran_zoom === 'izin_syari' ? 'ℹ Izin Syar\'i' :
                     context?.todayEntry?.kehadiran_zoom === 'sakit' ? '🏥 Sakit' :
                     context?.todayEntry?.kehadiran_zoom === 'alpa' ? '✗ Tidak Hadir Tanpa Keterangan' :
                     'Belum Tercatat untuk Hari Ini'}
                  </span>
                </div>
                {context?.todayEntry?.absen_at && (
                  <p className="text-[11px] text-gray-500">
                    Dicatat: {new Date(context.todayEntry.absen_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: RIWAYAT & PANDUAN */}
        <TabsContent value="riwayat" className="space-y-6">
          <Card className="border border-gray-200 shadow-xs rounded-2xl bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                Riwayat Jurnal Pra-Tikrar (30 Hari Terakhir)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Surat & Ayat</th>
                      <th className="py-3 px-4 text-center">Simak 3x</th>
                      <th className="py-3 px-4">Bimbingan Mu'allimah</th>
                      <th className="py-3 px-4">Presensi Musyrifah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {context?.history && context.history.length > 0 ? (
                      context.history.map((h: any) => (
                        <tr key={h.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                            {new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-800">{h.surat_nama || '-'}</span>
                            {h.ayat_range && <span className="text-gray-500"> ({h.ayat_range})</span>}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.simak_1 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>1</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.simak_2 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>2</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.simak_3 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>3</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              h.status_bacaan === 'lancar_mutqin' ? 'bg-emerald-100 text-emerald-800' :
                              h.status_bacaan === 'cukup' ? 'bg-blue-100 text-blue-800' :
                              h.status_bacaan === 'perlu_bimbingan' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {h.status_bacaan ? h.status_bacaan.replace('_', ' ') : 'Belum ditashih'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              h.kehadiran_zoom === 'hadir' ? 'bg-emerald-100 text-emerald-800' :
                              h.kehadiran_zoom === 'izin_syari' ? 'bg-blue-100 text-blue-800' :
                              h.kehadiran_zoom === 'sakit' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {h.kehadiran_zoom ? h.kehadiran_zoom.replace('_', ' ') : 'Belum diabsen'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400 text-xs">
                          Belum ada riwayat pengisian jurnal Pra-Tikrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Panduan 3 Metode Simak */}
          <Card className="border border-indigo-100 shadow-xs rounded-2xl bg-indigo-50/40 p-6 space-y-4">
            <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <Headphones className="w-4 h-4 text-indigo-700" />
              Panduan Edukasi 3 Metode Menyimak Murottal Pra-Tikrar
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-1">
                <div className="font-bold text-indigo-900">1. Simak Murni (Pagi Hari)</div>
                <p className="text-gray-600 leading-relaxed">
                  Dengarkan lantunan qari (misal Syaikh Al-Hushari/Al-Minshawi) dengan telinga penuh, tanpa membaca mushaf, untuk menangkap keindahan makhraj dan mad.
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-1">
                <div className="font-bold text-indigo-900">2. Gerak Bibir & Mushaf (Siang Hari)</div>
                <p className="text-gray-600 leading-relaxed">
                  Menyimak sambil membuka mushaf dan menggerakkan bibir mengikuti bacaan qari secara lirih tanpa suara keras, fokus pada ketepatan harakat.
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-1">
                <div className="font-bold text-indigo-900">3. Selaras Ketukan (Sore / Malam)</div>
                <p className="text-gray-600 leading-relaxed">
                  Membaca bersamaan dengan tempo dan ketukan murottal, melatih ritme nafas dan kestabilan panjang pendek tajwid.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
