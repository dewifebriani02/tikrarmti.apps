'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, Calendar, Clock, DollarSign, Users, BookOpen, ShieldCheck, Video, MessageSquare } from 'lucide-react';
import { AutoFlyerCanvas, FlyerClassData } from './AutoFlyerCanvas';
import { toast } from 'sonner';

interface MuallimahPaidClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // For edit mode
  muallimahName?: string;
}

const DAY_OPTIONS = [
  'Senin & Kamis',
  'Selasa & Jumat',
  'Rabu & Sabtu',
  'Sabtu & Ahad',
  'Senin, Rabu & Jumat',
  'Selasa & Kamis',
  'Setiap Hari (Senin - Jumat)',
  'Akhir Pekan (Sabtu - Ahad)',
];

const STANDARD_TIME_SLOTS = [
  { label: 'Slot 1: Ba\'da Subuh (05:30 - 06:30 WIB)', start: '05:30', end: '06:30' },
  { label: 'Slot 2: Pagi Dhuha (08:30 - 09:30 WIB)', start: '08:30', end: '09:30' },
  { label: 'Slot 3: Siang Menjelang Dzuhur (10:00 - 11:00 WIB)', start: '10:00', end: '11:00' },
  { label: 'Slot 4: Ba\'da Dzuhur (13:00 - 14:00 WIB)', start: '13:00', end: '14:00' },
  { label: 'Slot 5: Ba\'da Ashar (16:00 - 17:00 WIB)', start: '16:00', end: '17:00' },
  { label: 'Slot 6: Ba\'da Maghrib (18:30 - 19:30 WIB)', start: '18:30', end: '19:30' },
  { label: 'Slot 7: Ba\'da Isya (20:00 - 21:00 WIB)', start: '20:00', end: '21:00' },
];

export function MuallimahPaidClassModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  muallimahName = 'Ustadzah MTI'
}: MuallimahPaidClassModalProps) {
  const isEdit = !!initialData?.id;

  const [formData, setFormData] = useState({
    class_name: '',
    scheme: '80_20',
    subject_material: '',
    description: '',
    schedule_day: 'Senin & Kamis',
    time_start: '05:30',
    time_end: '06:30',
    max_students: 10,
    fee_amount: 150000,
    facilities: 'Ruang Zoom MTI, E-Sertifikat Kelulusan, Rekaman Kelas, Modul PDF',
    whatsapp_group_link: '',
    zoom_link: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  useEffect(() => {
    if (initialData) {
      setFormData({
        class_name: initialData.class_name || '',
        scheme: initialData.scheme || '80_20',
        subject_material: initialData.subject_material || '',
        description: initialData.description || '',
        schedule_day: initialData.schedule_day || 'Senin & Kamis',
        time_start: initialData.time_start || '05:30',
        time_end: initialData.time_end || '06:30',
        max_students: initialData.max_students || 10,
        fee_amount: Number(initialData.fee_amount) || 150000,
        facilities: initialData.facilities || 'Ruang Zoom MTI, E-Sertifikat Kelulusan, Rekaman Kelas, Modul PDF',
        whatsapp_group_link: initialData.whatsapp_group_link || '',
        zoom_link: initialData.zoom_link || '',
      });
    } else {
      setFormData({
        class_name: '',
        scheme: '80_20',
        subject_material: '',
        description: '',
        schedule_day: 'Senin & Kamis',
        time_start: '05:30',
        time_end: '06:30',
        max_students: 10,
        fee_amount: 150000,
        facilities: 'Ruang Zoom MTI, E-Sertifikat Kelulusan, Rekaman Kelas, Modul PDF',
        whatsapp_group_link: '',
        zoom_link: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSlotSelect = (slot: { start: string; end: string }) => {
    setFormData(prev => ({
      ...prev,
      time_start: slot.start,
      time_end: slot.end
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.class_name.trim()) {
      toast.error('Harap isi judul program kelas');
      return;
    }
    if (!formData.subject_material.trim()) {
      toast.error('Harap isi materi bimbingan');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEdit
        ? `/api/muallimah/paid-classes/${initialData.id}`
        : '/api/muallimah/paid-classes';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal menyimpan data kelas');
      }

      toast.success(
        isEdit
          ? 'Perubahan kelas berbayar berhasil disimpan!'
          : 'Alhamdulillah, pengajuan Kelas Berbayar MTI berhasil dikirim ke Admin!'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewData: FlyerClassData = {
    class_name: formData.class_name || 'Contoh: Bimbingan Tahsin & Talaqqi',
    muallimah_name: muallimahName,
    subject_material: formData.subject_material || 'Makharij & Shifatul Huruf',
    schedule_day: formData.schedule_day,
    time_start: formData.time_start,
    time_end: formData.time_end,
    fee_amount: formData.fee_amount,
    max_students: formData.max_students,
    facilities: formData.facilities,
    whatsapp_group_link: formData.whatsapp_group_link
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                {isEdit ? 'Ubah Rincian Kelas Berbayar' : 'Form Pengajuan Kelas Berbayar MTI'}
              </h2>
              <p className="text-xs text-emerald-100">
                Layanan Bimbingan Al-Quran Berbayar Resmi MTI dengan Skema Transparan & Auto-Flyer AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle for Small Screens */}
        <div className="flex sm:hidden border-b border-gray-100 bg-gray-50/70 p-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'form' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500'
            }`}
          >
            Form Input Kelas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'preview' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500'
            }`}
          >
            Live Auto-Flyer AI
          </button>
        </div>

        {/* Modal Body: Two Columns on Desktop */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Fields */}
          <form
            id="paid-class-form"
            onSubmit={handleSubmit}
            className={`space-y-4 lg:col-span-7 ${
              activeTab === 'form' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Judul & Materi */}
            <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100">
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                1. Program & Materi Bimbingan
              </h3>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Judul Kelas Berbayar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bimbingan Tahsin Lanjutan & Talaqqi"
                  value={formData.class_name}
                  onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Fokus Materi Pembelajaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Makharijul Huruf, Sifatul Huruf, Ahkam At-Tajwid"
                  value={formData.subject_material}
                  onChange={e => setFormData({ ...formData, subject_material: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Deskripsi / Keterangan Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan ringkas target capaian bimbingan ini..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Skema Bagi Hasil */}
            <div className="space-y-3 p-4 rounded-2xl bg-amber-50/40 border border-amber-100">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                2. Skema Bagi Hasil MTI
              </h3>

              <div className="grid grid-cols-1 gap-2">
                <label
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition-all ${
                    formData.scheme === '80_20'
                      ? 'bg-amber-100/70 border-amber-500 text-amber-950 font-bold shadow-xs'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scheme"
                    value="80_20"
                    checked={formData.scheme === '80_20'}
                    onChange={() => setFormData({ ...formData, scheme: '80_20' })}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500 accent-amber-600"
                  />
                  <div>
                    <div className="font-bold text-sm">Skema 80:20 (Rekomendasi Utama MTI)</div>
                    <div className="text-[11px] font-normal text-amber-800 mt-0.5">
                      80% untuk Mu'allimah, 20% infaq dakwah MTI. Didampingi musyrifah & fasilitas ruang zoom resmi MTI.
                    </div>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition-all ${
                    formData.scheme === '60_40'
                      ? 'bg-amber-100/70 border-amber-500 text-amber-950 font-bold shadow-xs'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scheme"
                    value="60_40"
                    checked={formData.scheme === '60_40'}
                    onChange={() => setFormData({ ...formData, scheme: '60_40' })}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500 accent-amber-600"
                  />
                  <div>
                    <div className="font-bold text-sm">Skema 60:40 (Insentif Khusus)</div>
                    <div className="text-[11px] font-normal text-amber-800 mt-0.5">
                      60% untuk Mu'allimah, 40% infaq dakwah MTI (khusus kelas dengan dukungan penuh promosi).
                    </div>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition-all ${
                    formData.scheme === '100'
                      ? 'bg-amber-100/70 border-amber-500 text-amber-950 font-bold shadow-xs'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scheme"
                    value="100"
                    checked={formData.scheme === '100'}
                    onChange={() => setFormData({ ...formData, scheme: '100' })}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500 accent-amber-600"
                  />
                  <div>
                    <div className="font-bold text-sm">Skema 100% (Tanpa Potongan MTI)</div>
                    <div className="text-[11px] font-normal text-amber-800 mt-0.5">
                      100% hak Mu'allimah (syarat: Mu'allimah aktif mengampu minimal 2 kelas reguler gratis MTI).
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Jadwal Hari & Waktu */}
            <div className="space-y-3 p-4 rounded-2xl bg-teal-50/30 border border-teal-100">
              <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-700" />
                3. Jadwal & Waktu Bimbingan (WIB)
              </h3>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Pilihan Hari</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DAY_OPTIONS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setFormData({ ...formData, schedule_day: day })}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                        formData.schedule_day === day
                          ? 'bg-teal-700 text-white border-teal-700 font-bold shadow-xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-teal-500'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.schedule_day}
                  onChange={e => setFormData({ ...formData, schedule_day: e.target.value })}
                  placeholder="Ketik hari lain jika tidak ada di pilihan di atas"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Preset 7 Slot Jam Standar MTI
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                  {STANDARD_TIME_SLOTS.map(slot => (
                    <button
                      key={slot.label}
                      type="button"
                      onClick={() => handleSlotSelect(slot)}
                      className={`text-left p-2 rounded-lg border text-[11px] transition-all ${
                        formData.time_start === slot.start && formData.time_end === slot.end
                          ? 'bg-teal-700 text-white border-teal-700 font-bold shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-teal-400'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600">Jam Mulai (WIB)</label>
                    <input
                      type="time"
                      value={formData.time_start}
                      onChange={e => setFormData({ ...formData, time_start: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600">Jam Selesai (WIB)</label>
                    <input
                      type="time"
                      value={formData.time_end}
                      onChange={e => setFormData({ ...formData, time_end: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Kuota, Tarif, dan Fasilitas */}
            <div className="space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                4. Kuota, SPP & Fasilitas
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Kuota Maksimal Thalibah
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.max_students}
                    onChange={e => setFormData({ ...formData, max_students: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Tarif SPP / Infaq (Rp / Thalibah)
                  </label>
                  <input
                    type="number"
                    step={5000}
                    value={formData.fee_amount}
                    onChange={e => setFormData({ ...formData, fee_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-emerald-700 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Fasilitas Bimbingan (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={formData.facilities}
                  onChange={e => setFormData({ ...formData, facilities: e.target.value })}
                  placeholder="Ruang Zoom MTI, E-Sertifikat, Rekaman Kelas, Modul PDF"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Link Grup WhatsApp (Opsional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://chat.whatsapp.com/..."
                    value={formData.whatsapp_group_link}
                    onChange={e => setFormData({ ...formData, whatsapp_group_link: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Link Ruang Zoom (Opsional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/..."
                    value={formData.zoom_link}
                    onChange={e => setFormData({ ...formData, zoom_link: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Right Column: Live Auto-Flyer Canvas Preview */}
          <div
            className={`lg:col-span-5 flex flex-col items-center justify-start ${
              activeTab === 'preview' ? 'block' : 'hidden lg:flex'
            }`}
          >
            <div className="w-full text-center mb-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Live Preview Auto-Flyer AI
              </span>
              <p className="text-[11px] text-gray-500">
                Otomatis di-render & siap diunduh atau dibuat ulang di Canva/ChatGPT
              </p>
            </div>

            <AutoFlyerCanvas data={previewData} className="w-full" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-500 hidden sm:block">
            * Pengajuan akan ditinjau oleh Admin MTI sebelum dipublikasikan.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              form="paid-class-form"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-200" />
                  <span>{isEdit ? 'Simpan Perubahan' : 'Kirim Pengajuan Kelas'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
