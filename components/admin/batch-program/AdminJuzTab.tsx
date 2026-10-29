'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, BookOpen, Save, X, Check, BookMarked, Edit, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { toggleJuzOptionActive, createJuzOption, getJuzOptionsAdmin, updateJuzOption } from '@/app/(protected)/admin/actions';

interface JuzOption {
  id: string;
  code: string;
  name: string;
  juz_number: number;
  part: 'A' | 'B';
  start_page: number;
  end_page: number;
  total_pages?: number;
  is_active: boolean;
  sort_order: number;
}

export function AdminJuzTab() {
  const [juzList, setJuzList] = useState<JuzOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJuz, setEditingJuz] = useState<JuzOption | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for new Juz option
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    juz_number: 30,
    part: 'A' as 'A' | 'B',
    start_page: 582,
    end_page: 591,
    is_active: true,
    sort_order: 9,
  });

  const fetchJuzOptions = async () => {
    setIsLoading(true);
    try {
      const result = await getJuzOptionsAdmin();
      if (result.success && result.data) {
        setJuzList(result.data as JuzOption[]);
      } else {
        toast.error(result.error || 'Gagal memuat pilihan juz');
      }
    } catch (error) {
      console.error('Error fetching juz options:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJuzOptions();
  }, []);

  const handleToggleActive = async (code: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    setJuzList(prev =>
      prev.map(j => (j.code === code ? { ...j, is_active: newStatus } : j))
    );

    try {
      const result = await toggleJuzOptionActive(code, newStatus);
      if (result.success) {
        toast.success(`Juz ${code} berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      } else {
        // Revert UI if failed
        setJuzList(prev =>
          prev.map(j => (j.code === code ? { ...j, is_active: currentStatus } : j))
        );
        toast.error(result.error || 'Gagal mengubah status juz');
      }
    } catch (error) {
      // Revert UI if error
      setJuzList(prev =>
        prev.map(j => (j.code === code ? { ...j, is_active: currentStatus } : j))
      );
      console.error('Error toggling active status:', error);
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  const handleSaveJuz = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formattedCode = `${formData.juz_number}${formData.part}`;
      const submitData = {
        ...formData,
        code: formattedCode,
      };

      let result;
      if (editingJuz) {
        result = await updateJuzOption(editingJuz.id, submitData);
      } else {
        result = await createJuzOption(submitData);
      }

      if (result.success) {
        toast.success(editingJuz ? `Opsi Juz ${formattedCode} berhasil diperbarui!` : `Opsi Juz ${formattedCode} berhasil ditambahkan!`);
        setShowAddModal(false);
        setEditingJuz(null);
        // Reset form
        setFormData({
          code: '',
          name: '',
          juz_number: 30,
          part: 'A',
          start_page: 582,
          end_page: 591,
          is_active: true,
          sort_order: juzList.length + 1,
        });
        fetchJuzOptions();
      } else {
        toast.error(result.error || 'Gagal menyimpan opsi juz');
      }
    } catch (error: any) {
      console.error('Error saving juz option:', error);
      toast.error(error?.message || 'Terjadi kesalahan sistem');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alert Info */}
      <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded-2xl text-sm flex items-start gap-3 shadow-sm">
        <BookMarked className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Pengaturan Dinamis Pilihan Juz Pendaftaran</p>
          <p className="opacity-90">
            Centang atau aktifkan juz yang ingin dibuka untuk pendaftaran Thalibah di menu <strong>Tikrar Tahfidz</strong>. 
            Pilihan juz yang dinonaktifkan (checklist mati) otomatis disembunyikan dari dropdown registrasi. 
            Semua juz dibagi menjadi <strong>setengah juz (Bagian A dan B)</strong> untuk kemudahan target pekanan program MTI.
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          <span className="font-bold text-gray-700">{juzList.length}</span> Pilihan Juz Terdaftar (
          <span className="font-bold text-green-700">{juzList.filter(j => j.is_active).length} Aktif</span>)
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchJuzOptions}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition-all flex items-center gap-2"
            title="Refresh Data"
          >
            <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => {
              setFormData({
                code: '',
                name: '',
                juz_number: 30,
                part: 'A',
                start_page: 582,
                end_page: 591,
                is_active: true,
                sort_order: juzList.length + 1,
              });
              setEditingJuz(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Pilihan Juz
          </button>
        </div>
      </div>

      {/* Table of Juz */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700"></div>
          <p className="text-sm text-gray-500 font-medium">Memuat pilihan juz...</p>
        </div>
      ) : juzList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada pilihan juz yang terdaftar di database.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="w-full overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-4 w-28">Kode Juz</th>
                  <th className="px-4 py-4">Nama Pilihan Juz</th>
                  <th className="px-4 py-4 w-48">Rentang Halaman</th>
                  <th className="px-4 py-4 text-center w-32">Total Halaman</th>
                  <th className="px-2 py-4 text-center w-16">Urutan</th>
                  <th className="px-4 py-4 text-right w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {juzList.map((juz) => (
                  <tr 
                    key={juz.id} 
                    className={cn(
                      "hover:bg-gray-50/50 transition-colors",
                      !juz.is_active && "opacity-75 bg-gray-50/20"
                    )}
                  >
                    <td className="px-4 py-4 font-bold text-gray-900 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border whitespace-nowrap inline-block",
                        juz.is_active 
                          ? "bg-green-50 border-green-200 text-green-700" 
                          : "bg-gray-100 border-gray-200 text-gray-500"
                      )}>
                        Juz {juz.code}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-900 whitespace-nowrap">{juz.name}</td>
                    <td className="px-4 py-4 text-gray-500 font-medium whitespace-nowrap">
                      Halaman {juz.start_page} s/d {juz.end_page}
                    </td>
                    <td className="px-4 py-4 text-center text-gray-500 font-bold whitespace-nowrap">
                      {juz.total_pages || (juz.end_page - juz.start_page + 1)}
                    </td>
                    <td className="px-2 py-4 text-center text-gray-500 font-medium whitespace-nowrap">
                      #{juz.sort_order}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <span className={cn(
                          "text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap",
                          juz.is_active 
                            ? "bg-green-50 border-green-100 text-green-700" 
                            : "bg-gray-50 border-gray-100 text-gray-400"
                        )}>
                          {juz.is_active ? 'Dibuka' : 'Ditutup'}
                        </span>

                        <button
                          onClick={() => handleToggleActive(juz.code, juz.is_active)}
                          className={cn(
                            "relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:ring-offset-2 p-1",
                            juz.is_active ? "bg-green-600" : "bg-gray-200"
                          )}
                          title={juz.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out",
                              juz.is_active ? "translate-x-8" : "translate-x-0"
                            )}
                          />
                        </button>

                        <button
                          onClick={() => {
                            setFormData({
                              code: juz.code,
                              name: juz.name,
                              juz_number: juz.juz_number,
                              part: juz.part,
                              start_page: juz.start_page,
                              end_page: juz.end_page,
                              is_active: juz.is_active,
                              sort_order: juz.sort_order,
                            });
                            setEditingJuz(juz);
                            setShowAddModal(true);
                          }}
                          className="px-2.5 py-1 rounded-xl border border-gray-200 hover:bg-amber-50 hover:border-amber-200 text-gray-600 hover:text-amber-700 transition-all flex items-center gap-1 text-xs font-bold"
                          title="Edit Opsi Juz"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-800 to-amber-700 p-6 flex items-center justify-between text-white relative">
              <button
                onClick={() => { setShowAddModal(false); setEditingJuz(null); }}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-yellow-300 uppercase tracking-[0.2em] mb-0.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Data Master MTI
                  </div>
                  <h2 className="text-xl font-bold">{editingJuz ? 'Edit Pilihan Juz' : 'Tambah Opsi Juz'}</h2>
                </div>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveJuz} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nomor Juz (1-30)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="30"
                      value={formData.juz_number}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 30;
                        setFormData({ ...formData, juz_number: val });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Bagian (Setengah Juz)</label>
                    <select
                      value={formData.part}
                      onChange={(e) => setFormData({ ...formData, part: e.target.value as 'A' | 'B' })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-700 text-sm bg-white"
                    >
                      <option value="A">Bagian A (Halaman Awal)</option>
                      <option value="B">Bagian B (Halaman Akhir)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Kode Preview (Kode Database)</label>
                  <input
                    type="text"
                    disabled
                    value={`${formData.juz_number}${formData.part}`}
                    className="w-full px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 font-bold text-sm"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Dibuat otomatis: angka juz + huruf bagian.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nama Pilihan Juz (Ditampilkan ke Thalibah)</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Juz 30A - An-Naba s/d Al-Buruj"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-700 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Halaman Mulai</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="604"
                      value={formData.start_page}
                      onChange={(e) => setFormData({ ...formData, start_page: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Halaman Selesai</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="604"
                      value={formData.end_page}
                      onChange={(e) => setFormData({ ...formData, end_page: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-700 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">No. Urut (Sort Order)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Status Pendaftaran</label>
                    <select
                      value={formData.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-700 text-sm bg-white"
                    >
                      <option value="active">Langsung Dibuka (Aktif)</option>
                      <option value="inactive">Simpan Dulu (Nonaktif)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingJuz(null); }}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:bg-gray-300 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Menyimpan...' : (editingJuz ? 'Simpan Perubahan' : 'Simpan Pilihan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
