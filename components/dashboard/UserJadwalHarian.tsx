'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Video, Users, AlertCircle, ChevronRight, MessageCircle, BookOpen, ArrowRightLeft, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { formatTimeShort } from '@/lib/reminder-generator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransferScheduleModal } from './TransferScheduleModal';
import { SitInModal } from './SitInModal';

const DAYS = [
  'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'
];

export function UserJadwalHarian({ user, activeBatch, daftarUlangData }: { user: any, activeBatch: any, daftarUlangData?: any }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPraTikrar, setExpandedPraTikrar] = useState(false);
  const [expandedTikrar, setExpandedTikrar] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSitInModalOpen, setIsSitInModalOpen] = useState(false);
  const [transferStatus, setTransferStatus] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSchedules() {
      if (!user?.id || !activeBatch?.id) {
        setLoading(false);
        return;
      }
      try {
        // Fetch ALL active halaqahs for this batch
        const [halaqahsResponse, quotaResponse] = await Promise.all([
          supabase.from('halaqah')
            .select(`
              id, name, day_of_week, start_time, end_time, zoom_link, location, max_students, libur_date,
              zoom:batch_zoom_links!halaqah_zoom_link_id_fkey(name, url, meeting_id, passcode),
              muallimah:users!halaqah_muallimah_id_fkey(full_name, nama_kunyah, whatsapp),
              program:programs!inner(batch_id, class_type),
              students:halaqah_students(status),
              mentors:halaqah_mentors(role, user:users!halaqah_mentors_mentor_id_fkey(full_name))
            `)
            .eq('program.batch_id', activeBatch.id)
            .eq('status', 'active'),
          fetch(`/api/shared/halaqah-quota?batch_id=${activeBatch.id}`)
        ]);
          
        const quotaData = quotaResponse.ok ? await quotaResponse.json() : null;
        const quotaMap = new Map();
        if (quotaData && quotaData.success && quotaData.data?.halaqah) {
          quotaData.data.halaqah.forEach((q: any) => quotaMap.set(q.id, q.total_current_students));
        }

        const combined = (halaqahsResponse.data || []).map((h: any) => ({
          ...h,
          current_students: quotaMap.has(h.id) ? quotaMap.get(h.id) : (h.students?.filter((st: any) => st.status === 'active').length || 0)
        }));
        
        // Sort by day (relative to today) and then time
        const todayDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();
        
        combined.sort((a: any, b: any) => {
          const aDay = a.day_of_week || 1;
          const bDay = b.day_of_week || 1;
          
          // Calculate distance from today (0 = today, 1 = tomorrow, ..., 6 = yesterday)
          const aDist = (aDay - todayDayOfWeek + 7) % 7;
          const bDist = (bDay - todayDayOfWeek + 7) % 7;
          
          if (aDist !== bDist) return aDist - bDist;
          return (a.start_time || '').localeCompare(b.start_time || '');
        });

        setSchedules(combined);

        // Check if there's a pending transfer request
        const { data: requestData } = await supabase
          .from('transfer_schedule_requests')
          .select('id, status, to_halaqah:halaqah!transfer_schedule_requests_to_halaqah_id_fkey(name)')
          .eq('user_id', user.id)
          .eq('batch_id', activeBatch.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (requestData) {
          setTransferStatus(requestData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSchedules();
  }, [user?.id, activeBatch?.id]);

  if (loading || schedules.length === 0) return null;

  const ownSchedules = schedules.filter((s: any) => s.program?.class_type === 'tahfidz' || s.program?.class_type === 'tikrar_tahfidz');
  const praTikrarSchedules = schedules.filter((s: any) => s.program?.class_type === 'pra_tahfidz');
  
  const displayedPraTikrar = expandedPraTikrar ? praTikrarSchedules : praTikrarSchedules.slice(0, 3);
  const displayedTikrar = expandedTikrar ? ownSchedules : ownSchedules.slice(0, 3);

  const renderScheduleCard = (schedule: any) => {
    // Calculate if it's libur this week
    const todayDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();
    const classDay = schedule.day_of_week || 1;
    let daysToAdd = classDay - todayDayOfWeek;
    if (daysToAdd < 0) daysToAdd += 7;
    const classDate = new Date();
    classDate.setDate(new Date().getDate() + daysToAdd);
    const classDateString = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}-${String(classDate.getDate()).padStart(2, '0')}`;
    const isLibur = schedule.libur_date === classDateString;

    const topBarColor = isLibur ? 'bg-red-500' : (schedule.program?.class_type === 'pra_tahfidz' ? 'bg-fuchsia-500' : 'bg-emerald-500');
    const boxBg = isLibur ? 'bg-red-50 border-red-100' : (schedule.program?.class_type === 'pra_tahfidz' ? 'bg-fuchsia-50 border-fuchsia-100' : 'bg-emerald-50 border-emerald-100');
    const boxText = isLibur ? 'text-red-600' : (schedule.program?.class_type === 'pra_tahfidz' ? 'text-fuchsia-600' : 'text-emerald-600');
    const badgeBg = isLibur ? 'bg-red-100 text-red-700 border-red-200' : (schedule.program?.class_type === 'pra_tahfidz' ? 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200/50' : 'bg-emerald-100 text-emerald-700 border-emerald-200/50');
    
    return (
    <Card key={schedule.id} className={`border-none shadow-md shadow-gray-200/40 overflow-hidden rounded-[1.25rem] transition-shadow ${isLibur ? 'opacity-80 grayscale-[20%]' : ''}`}>
      <div className={`h-1.5 w-full ${topBarColor}`}></div>
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-white">
        <div className="flex items-start gap-4">
          <div className={`rounded-xl p-3 text-center min-w-[70px] border ${boxBg}`}>
            <div className={`text-[11px] font-bold uppercase mb-0.5 tracking-wider ${boxText}`}>
              {schedule.day_of_week ? DAYS[schedule.day_of_week] : '-'}
            </div>
            <div className="text-sm font-black text-gray-900">
              {formatTimeShort(schedule.start_time)}
            </div>
          </div>
          
          <div className="pt-0.5">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${badgeBg}`}>
                {schedule.program?.class_type === 'pra_tahfidz' ? 'PRA TIKRAR' : 'TIKRAR TAHFIDZ'}
              </span>
              {isLibur && (
                <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-red-600 text-white shadow-sm flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" /> LIBUR PEKAN INI
                </span>
              )}
            </div>
            <h4 className={`font-bold text-base leading-tight ${isLibur ? 'text-gray-500 line-through decoration-red-400 decoration-2' : 'text-gray-900'}`}>
              {(() => {
                if (!schedule.name.includes(' | ')) return schedule.name;
                const parts = schedule.name.split(' | ');
                const prefixPart = parts[0];
                
                const muallimahName = schedule.muallimah?.nama_kunyah || schedule.muallimah?.full_name || parts[parts.length - 1];
                const newNamePart = `Ustadzah ${muallimahName.replace('Ustadzah ', '')}`;

                // Jika Pra-Tikrar, jangan tampilkan Juz (hanya Prefix | Nama)
                if (prefixPart.toLowerCase().includes('pra')) {
                  return `${prefixPart} | ${newNamePart}`;
                }
                
                // Jika Tikrar biasa, pertahankan Juz jika ada
                if (parts.length > 2) {
                  return `${parts.slice(0, -1).join(' | ')} | ${newNamePart}`;
                }
                
                return `${prefixPart} | ${newNamePart}`;
              })()}
            </h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5">
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 w-full">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    {schedule.muallimah?.whatsapp ? (
                      <a href={`https://wa.me/${schedule.muallimah.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600 transition-colors" title="Hubungi Mu'allimah via WhatsApp">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-gray-300 cursor-not-allowed" title="Nomor WhatsApp tidak terdaftar">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {schedule.muallimah ? `Ustadzah ${schedule.muallimah.nama_kunyah || schedule.muallimah.full_name}` : 'Menunggu Muallimah'}
                  </span>
                </div>
                {schedule.mentors?.filter((m: any) => m.user?.full_name !== schedule.muallimah?.full_name).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-0.5">
                    {schedule.mentors
                      .filter((m: any) => m.user?.full_name !== schedule.muallimah?.full_name)
                      .map((m: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="font-semibold text-emerald-700 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50 flex items-center gap-1">
                          {m.user?.whatsapp ? (
                            <a href={`https://wa.me/${m.user.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 transition-colors" title="Hubungi via WhatsApp">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-gray-300 cursor-not-allowed" title="Nomor WhatsApp tidak terdaftar">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {m.user?.full_name || 'Menunggu'}
                          <span className="opacity-70 font-normal capitalize">({m.role})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {schedule.current_students !== undefined ? schedule.current_students : (schedule.students?.filter((st: any) => st.status === 'active').length || 0)} / {schedule.max_students || '-'} Thalibah
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {schedule.zoom_link || schedule.zoom?.url ? (
          <Button 
            className={`rounded-xl font-bold w-full sm:w-auto shadow-sm hover:shadow-md transition-all ${
              schedule.program?.class_type === 'pra_tahfidz' 
                ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            onClick={() => window.open(schedule.zoom?.url || schedule.zoom_link, '_blank')}
          >
            <Video className="w-4 h-4 mr-2" />
            Join Kelas
          </Button>
        ) : (
          <div className="text-xs text-gray-400 italic text-center px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-100">Link belum tersedia</div>
        )}
      </CardContent>
      {schedule.zoom && (schedule.zoom.meeting_id || schedule.zoom.passcode) && (
        <div className="bg-gray-50 px-4 py-2.5 text-[11px] text-gray-500 font-medium flex items-center justify-center gap-3 border-t border-gray-100">
          {schedule.zoom.meeting_id && <span>ID: <span className="font-bold text-gray-700">{schedule.zoom.meeting_id}</span></span>}
          {schedule.zoom.meeting_id && schedule.zoom.passcode && <span className="text-gray-300">|</span>}
          {schedule.zoom.passcode && <span>Pass: <span className="font-bold text-gray-700">{schedule.zoom.passcode}</span></span>}
        </div>
      )}
    </Card>
    );
  };

  return (
    <div className="mb-8 mt-2 max-w-6xl mx-auto w-full px-4 md:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 pl-1">
          <div className="bg-emerald-100/80 p-2.5 rounded-xl border border-emerald-200/50">
            <Calendar className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Jadwal Kelas</h3>
            <p className="text-xs text-gray-500 font-medium">Jadwal Tikrar dan Pra-Tikrar</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsSitInModalOpen(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl shadow-sm transition-all"
            variant="outline"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Lihat Kuota Kelas Lain (Sit-In)
          </Button>

          {activeBatch?.transfer_schedule_end_date && new Date() <= new Date(activeBatch.transfer_schedule_end_date) && (
            <Button 
              onClick={() => setIsTransferModalOpen(true)}
              className="bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200 font-bold rounded-xl shadow-sm transition-all"
              variant="outline"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Ajukan Pindah Jadwal
            </Button>
          )}
        </div>
      </div>

      {transferStatus && transferStatus.status === 'pending' && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <p className="text-sm font-medium text-orange-800">
              Pengajuan pindah jadwal ke <span className="font-bold">{transferStatus.to_halaqah?.name}</span> sedang diproses Admin.
            </p>
          </div>
        </div>
      )}
      
      <Tabs defaultValue={ownSchedules.length > 0 ? "tikrar" : "pra-tikrar"} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4 bg-gray-100/80 p-1 rounded-xl h-auto">
          <TabsTrigger 
            value="tikrar" 
            className="rounded-lg py-2.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm text-sm font-bold transition-all"
          >
            Kelas Tikrar ({ownSchedules.length})
          </TabsTrigger>
          <TabsTrigger 
            value="pra-tikrar" 
            className="rounded-lg py-2.5 data-[state=active]:bg-fuchsia-500 data-[state=active]:text-white data-[state=active]:shadow-sm text-sm font-bold transition-all"
          >
            Pra-Tikrar ({praTikrarSchedules.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tikrar" className="mt-0 outline-none">
          {ownSchedules.length > 0 ? (
            <div className="grid grid-cols-1 gap-3.5">
              {displayedTikrar.map(renderScheduleCard)}
              
              {ownSchedules.length > displayedTikrar.length && !expandedTikrar && (
                <Button 
                  variant="ghost" 
                  onClick={() => setExpandedTikrar(true)}
                  className="w-full text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-bold rounded-xl mt-1"
                >
                  Lihat Selengkapnya ({ownSchedules.length - displayedTikrar.length} jadwal lainnya) <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
              )}
              {expandedTikrar && ownSchedules.length > 3 && (
                <Button 
                  variant="ghost" 
                  onClick={() => setExpandedTikrar(false)}
                  className="w-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 font-medium rounded-xl mt-1"
                >
                  Tutup jadwal <ChevronUp className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-2xl">
              Belum ada jadwal kelas Tikrar.
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="pra-tikrar" className="mt-0 outline-none">
          <div className="bg-gradient-to-r from-fuchsia-50 via-purple-50 to-indigo-50 border border-fuchsia-200/80 rounded-2xl p-4 mb-3.5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-fuchsia-600 shrink-0 mt-0.5" />
            <div className="text-xs text-fuchsia-950">
              <div className="font-bold text-sm mb-0.5">Sistem Sesi Terbuka & Fleksibel (Tanpa Kelas Tetap) 🌸</div>
              Program Pra-Tikrar tidak mengunci santriwati pada kelas tetap. Ukhti bebas masuk dan mengikuti sesi tatap muka Zoom mana pun di bawah ini sesuai keluangan waktu Ukhti tanpa perlu mengajukan permohonan mutasi/pindah jadwal!
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3.5">
            {displayedPraTikrar.map(renderScheduleCard)}
            
            {praTikrarSchedules.length > displayedPraTikrar.length && !expandedPraTikrar && (
              <Button 
                variant="ghost" 
                onClick={() => setExpandedPraTikrar(true)}
                className="w-full text-fuchsia-700 hover:bg-fuchsia-50 hover:text-fuchsia-800 font-bold rounded-xl mt-1"
              >
                Lihat Selengkapnya ({praTikrarSchedules.length - displayedPraTikrar.length} jadwal lainnya) <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            )}
            {expandedPraTikrar && praTikrarSchedules.length > 3 && (
              <Button 
                variant="ghost" 
                onClick={() => setExpandedPraTikrar(false)}
                className="w-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 font-medium rounded-xl mt-1"
              >
                Tutup jadwal <ChevronUp className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <TransferScheduleModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        user={user}
        activeBatch={activeBatch}
        currentHalaqah={ownSchedules.find((s: any) => s.students?.some((st: any) => st.status === 'active')) || praTikrarSchedules.find((s: any) => s.students?.some((st: any) => st.status === 'active'))}
        onSuccess={() => {
          setIsTransferModalOpen(false);
          // Just reload page to show pending status
          window.location.reload();
        }}
      />
      <SitInModal
        isOpen={isSitInModalOpen}
        onClose={() => setIsSitInModalOpen(false)}
        user={user}
        activeBatch={activeBatch}
        currentHalaqah={ownSchedules.find((s: any) => s.students?.some((st: any) => st.status === 'active')) || praTikrarSchedules.find((s: any) => s.students?.some((st: any) => st.status === 'active'))}
      />
    </div>
  );
}
