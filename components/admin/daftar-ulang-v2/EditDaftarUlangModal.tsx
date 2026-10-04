import React, { useState, useEffect } from 'react';
import { DaftarUlangSubmission } from './types';
import { X, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditDaftarUlangModalProps {
  submission: DaftarUlangSubmission;
  onClose: () => void;
  onSaved: () => void;
}

export function EditDaftarUlangModal({ submission, onClose, onSaved }: EditDaftarUlangModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    confirmed_full_name: submission.confirmed_full_name || '',
    confirmed_chosen_juz: submission.confirmed_chosen_juz || '',
    confirmed_main_time_slot: submission.confirmed_main_time_slot || '',
    confirmed_backup_time_slot: submission.confirmed_backup_time_slot || '',
    pengabdian_choice: submission.pengabdian_choice || '',
    donasi_amount: submission.donasi_amount || 0,
    partner_type: submission.partner_type || '',
    ujian_halaqah_id: submission.ujian_halaqah_id || '',
    tashih_halaqah_id: submission.tashih_halaqah_id || ''
  });

  const [halaqahs, setHalaqahs] = useState<any[]>([]);
  const [loadingHalaqah, setLoadingHalaqah] = useState(false);
  const [juzOptions, setJuzOptions] = useState<any[]>([]);
  const [loadingJuz, setLoadingJuz] = useState(false);

  useEffect(() => {
    const fetchHalaqah = async () => {
      setLoadingHalaqah(true);
      try {
        const res = await fetch(`/api/halaqah?batch_id=${submission.batch_id}`);
        const data = await res.json();
        if (data.success) {
          setHalaqahs(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingHalaqah(false);
      }
    };
    if (submission.batch_id) {
      fetchHalaqah();
    }
  }, [submission.batch_id]);

  useEffect(() => {
    const fetchJuzOptions = async () => {
      setLoadingJuz(true);
      try {
        const res = await fetch('/api/juz');
        const data = await res.json();
        if (data.data) {
          setJuzOptions(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingJuz(false);
      }
    };
    fetchJuzOptions();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'donasi_amount' ? parseInt(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/daftar-ulang/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Gagal menyimpan data');
      toast.success('Data berhasil disimpan');
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Edit Data Daftar Ulang</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Mengubah data milik {submission.user?.full_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          <form id="edit-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Konfirmasi Data Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span> Data Konfirmasi
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap</label>
                  <input type="text" name="confirmed_full_name" value={formData.confirmed_full_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pilihan Juz</label>
                  <select 
                    name="confirmed_chosen_juz" 
                    value={formData.confirmed_chosen_juz} 
                    onChange={handleChange} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loadingJuz}
                  >
                    <option value="">(Belum Memilih)</option>
                    {juzOptions.map(j => (
                      <option key={j.id} value={j.code}>Juz {j.juz_number} Part {j.part} ({j.name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Waktu Utama</label>
                  <input type="text" name="confirmed_main_time_slot" value={formData.confirmed_main_time_slot} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Waktu Cadangan</label>
                  <input type="text" name="confirmed_backup_time_slot" value={formData.confirmed_backup_time_slot} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            </div>

            {/* Pengabdian & Donasi */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span> Pengabdian & Donasi
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pilihan Pengabdian</label>
                  <select name="pengabdian_choice" value={formData.pengabdian_choice} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option value="">(Kosong)</option>
                    <option value="mengabdi">Mengabdi</option>
                    <option value="donasi">Donasi</option>
                    <option value="muallimah">Muallimah (Legacy)</option>
                    <option value="musyrifah">Musyrifah (Legacy)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nominal Donasi (Rp)</label>
                  <input type="number" name="donasi_amount" value={formData.donasi_amount} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
              </div>

            </div>

            {/* Pasangan & Halaqah */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span> Pasangan & Halaqah
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Pasangan</label>
                  <select name="partner_type" value={formData.partner_type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                    <option value="">(Belum Ada)</option>
                    <option value="system_match">Dipasangkan Sistem</option>
                    <option value="self_match">Cari Sendiri</option>
                    <option value="family">Keluarga (1 Halaqah)</option>
                    <option value="tarteel">Aplikasi Tarteel</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Halaqah</label>
                  <select 
                    name="halaqah" 
                    value={formData.ujian_halaqah_id || formData.tashih_halaqah_id || ''} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        ujian_halaqah_id: val, 
                        tashih_halaqah_id: val 
                      }));
                    }} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">(Belum Dialokasikan)</option>
                    {halaqahs
                      .filter(h => !h.program?.name?.toLowerCase().includes('pra-tikrar') && !h.program?.name?.toLowerCase().includes('pra tikrar'))
                      .map(h => {
                      const totalUsed = h.quota_details?.total_used || 0;
                      const maxStudents = h.max_students || 0;
                      const sisaKuota = maxStudents > 0 ? maxStudents - totalUsed : 0;
                      
                      const days = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
                      const dayName = h.day_of_week ? days[h.day_of_week] : '';
                      const timeString = (h.start_time || h.end_time) ? 
                        ` (${dayName ? dayName + ', ' : ''}${h.start_time ? h.start_time.slice(0, 5) : ''}${h.end_time ? ' - ' + h.end_time.slice(0, 5) : ''})` 
                        : (dayName ? ` (${dayName})` : '');
                      
                      return (
                        <option key={h.id} value={h.id}>
                          {h.name} - Muallimah: {h.muallimah?.full_name}{timeString} (Sisa Kuota: {sisaKuota})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-2xl shrink-0">
          <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 text-center">
            Batal
          </button>
          <button type="submit" form="edit-form" disabled={loading} className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}
