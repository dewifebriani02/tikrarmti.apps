'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, MessageSquare, Sparkles, Filter, CheckCircle2, Search, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { MUROJAAH_TIME_SLOTS, buildMurojaahWhatsAppInvite } from '@/lib/murojaah';

interface CommunityPartner {
  progress_id: string;
  user_id: string;
  full_name: string;
  whatsapp: string | null;
  domicile: string | null;
  juz_code: string;
  total_completed: number;
  time_slot_main: string | null;
  time_slot_main_label: string;
  time_slot_backup: string | null;
  time_slot_backup_label: string;
  is_same_juz: boolean;
  is_main_match: boolean;
  is_backup_match: boolean;
  is_schedule_match: boolean;
  match_score: number;
}

interface MurojaahCommunityDirectoryProps {
  myProfile?: {
    full_name?: string;
    juz_code?: string;
    time_slot_main?: string;
    time_slot_main_label?: string;
  };
  onOpenEnrollModal?: () => void;
}

export function MurojaahCommunityDirectory({
  myProfile,
  onOpenEnrollModal
}: MurojaahCommunityDirectoryProps) {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<CommunityPartner[]>([]);
  const [selectedJuzFilter, setSelectedJuzFilter] = useState<string>('ALL');
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedJuzFilter !== 'ALL') params.append('juz_code', selectedJuzFilter);
      if (selectedSlotFilter !== 'ALL') params.append('time_slot', selectedSlotFilter);

      const res = await fetch(`/api/alumni/murojaah-40x/partners?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setPartners(json.data?.partners || []);
      }
    } catch (err) {
      console.error('Error fetching murojaah partners:', err);
      toast.error('Gagal memuat direktori pasangan simak');
    } finally {
      setLoading(false);
    }
  }, [selectedJuzFilter, selectedSlotFilter]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const filteredList = partners.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.full_name.toLowerCase().includes(q) || (p.domicile && p.domicile.toLowerCase().includes(q));
  });

  const handleContactWhatsApp = (partner: CommunityPartner) => {
    if (!partner.whatsapp) {
      toast.error(`Nomor WhatsApp untuk ${partner.full_name} belum dicantumkan.`);
      return;
    }
    const cleanPhone = partner.whatsapp.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
    
    const message = buildMurojaahWhatsAppInvite({
      senderName: myProfile?.full_name || 'Thalibah MTI',
      partnerName: partner.full_name,
      juzCode: partner.juz_code,
      timeSlotLabel: partner.time_slot_main_label
    });

    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      {/* Directory Banner Header */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Direktori Komunitas Pasangan Simak</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                7 Slot WIB
              </span>
            </h3>
            <p className="text-xs text-gray-600 mt-0.5 max-w-xl">
              Temukan sesama thalibah MTI yang memiliki kesamaan porsi juz dan kecocokan jam luang WIB untuk saling simak putaran murojaah.
            </p>
          </div>
        </div>

        {myProfile?.time_slot_main && (
          <div className="bg-white/90 border border-emerald-200/80 rounded-xl p-2.5 px-3 text-xs shrink-0 self-start sm:self-auto shadow-2xs">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Jadwal Utama Ukhti:</span>
            <span className="font-extrabold text-emerald-800">{myProfile.time_slot_main_label}</span>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama thalibah atau domisili..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50"
            />
          </div>

          {/* Time Slot Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <select
              value={selectedSlotFilter}
              onChange={(e) => setSelectedSlotFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Jam WIB</option>
              {MUROJAAH_TIME_SLOTS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Time Slots Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-hide">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Slot:</span>
          <button
            type="button"
            onClick={() => setSelectedSlotFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
              selectedSlotFilter === 'ALL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua
          </button>
          {MUROJAAH_TIME_SLOTS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSlotFilter(s.id === selectedSlotFilter ? 'ALL' : s.id)}
              className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition-all flex items-center gap-1 ${
                selectedSlotFilter === s.id
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-gray-50 text-gray-700 hover:bg-emerald-50 border border-gray-100'
              }`}
            >
              <Clock className="w-3 h-3 opacity-60" />
              <span>{s.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Partner Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium">Memuat calon pasangan simak...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <Card className="p-8 text-center bg-white border border-dashed border-gray-200 rounded-2xl shadow-xs space-y-2">
          <Users className="w-10 h-10 text-gray-300 mx-auto" />
          <h4 className="text-sm font-bold text-gray-800">Belum Ada Calon Pasangan yang Cocok</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {selectedSlotFilter !== 'ALL'
              ? 'Belum ada thalibah di slot jam ini. Coba pilih "Semua Jam WIB" untuk melihat lebih banyak.'
              : 'Jadilah yang pertama mengaktifkan pencarian pasangan simak di porsi ini!'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredList.map(partner => (
            <Card
              key={partner.progress_id}
              className={`overflow-hidden rounded-2xl border transition-all ${
                partner.is_schedule_match
                  ? 'border-emerald-300 bg-gradient-to-br from-white to-emerald-50/40 shadow-xs ring-1 ring-emerald-200/60'
                  : 'border-gray-100 bg-white hover:border-gray-200 shadow-2xs'
              }`}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header Card: Name & Match Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-gray-900">{partner.full_name}</h4>
                      {partner.is_schedule_match && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Jadwal Cocok
                        </span>
                      )}
                    </div>
                    {partner.domicile && (
                      <p className="text-[10px] text-gray-500">{partner.domicile}</p>
                    )}
                  </div>

                  <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-800 text-[10px] font-black uppercase">
                    Juz {partner.juz_code}
                  </span>
                </div>

                {/* Schedule Slots */}
                <div className="bg-gray-50 rounded-xl p-2.5 space-y-1 text-[11px] border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Slot Utama:</span>
                    <span className="font-bold text-gray-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      {partner.time_slot_main_label}
                    </span>
                  </div>
                  {partner.time_slot_backup && (
                    <div className="flex items-center justify-between text-gray-500 text-[10px]">
                      <span>Slot Cadangan:</span>
                      <span className="font-semibold text-gray-700">{partner.time_slot_backup_label}</span>
                    </div>
                  )}
                </div>

                {/* Progress & WhatsApp CTA */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <div className="text-[10px] text-gray-500">
                    Progress: <span className="font-black text-emerald-700">{partner.total_completed} / 40</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleContactWhatsApp(partner)}
                    className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ajak Simak</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
