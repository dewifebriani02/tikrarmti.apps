'use client';

import { useState } from 'react';
import { X, BookOpen, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Batch, Program, PROGRAM_STATUSES } from './types';

interface ProgramFormModalProps {
  program: Program | null;
  batches: Batch[];
  programs?: Program[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProgramFormModal({ program, batches, programs = [], isOpen, onClose, onSuccess }: ProgramFormModalProps) {
  const uniqueProgramNames = Array.from(new Set(programs.map(p => p.name))).filter(Boolean);
  const isCustomName = program ? !uniqueProgramNames.includes(program.name) : false;
  const [showCustomName, setShowCustomName] = useState(isCustomName);

  const [formData, setFormData] = useState({
    id: program?.id,
    batch_id: program?.batch_id || '',
    name: program?.name || '',
    description: program?.description || '',
    target_level: program?.target_level || '',
    duration_weeks: program?.duration_weeks || 0,
    max_thalibah: program?.max_thalibah || 0,
    status: program?.status || 'draft',
    is_free: program?.is_free ?? true,
    price: program?.price || 0,
  });

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error?.message || result.error || 'Gagal menyimpan program');
      } else {
        toast.success(program ? 'Program berhasil diperbarui' : 'Program berhasil dibuat');
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error('Gagal menyimpan program');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-purple-900 to-purple-700 p-6 flex items-center justify-between text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-yellow-300 uppercase tracking-[0.2em] mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Program Management
              </div>
              <h2 className="text-2xl font-bold">{program ? 'Edit Program' : 'Tambah Program Baru'}</h2>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Informasi Program</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Batch</label>
                  <select
                    required
                    value={formData.batch_id}
                    onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 bg-white"
                  >
                    <option value="">Pilih Batch</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 bg-white"
                  >
                    {PROGRAM_STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Template Program</label>
                  <select
                    value={showCustomName ? 'custom' : (formData.name || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setShowCustomName(true);
                        setFormData({ ...formData, name: '' });
                      } else {
                        setShowCustomName(false);
                        // Auto-fill from most recent matching program
                        const template = programs.find(p => p.name === val);
                        setFormData({
                          ...formData,
                          name: val,
                          ...(template ? {
                            description: template.description || '',
                            target_level: template.target_level || '',
                            duration_weeks: template.duration_weeks || 0,
                            max_thalibah: template.max_thalibah || 0,
                            is_free: template.is_free ?? true,
                            price: template.price || 0,
                          } : {})
                        });
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 bg-white"
                  >
                    <option value="">Pilih Program...</option>
                    {uniqueProgramNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    {!uniqueProgramNames.includes('Pra-Tikrar MTI') && <option value="Pra-Tikrar MTI">Pra-Tikrar MTI</option>}
                    {!uniqueProgramNames.includes('Tikrar Tahfidz MTI') && <option value="Tikrar Tahfidz MTI">Tikrar Tahfidz MTI</option>}
                    {!uniqueProgramNames.includes('Muallimah MTI') && <option value="Muallimah MTI">Muallimah MTI</option>}
                    <option value="custom">Lainnya (Ketik Manual)...</option>
                  </select>
                </div>
                
                {showCustomName ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nama Program Baru</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Masukkan nama program"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    />
                  </div>
                ) : (
                  <div className="flex items-center pt-6">
                    <span className="text-xs text-gray-400 italic px-2">Data akan diisi otomatis jika memilih template</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Target Level</label>
                  <input
                    type="text"
                    value={formData.target_level}
                    onChange={(e) => setFormData({ ...formData, target_level: e.target.value })}
                    placeholder="cth. 5 Juz"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Durasi (Pekan)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duration_weeks || ''}
                    onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Maks Thalibah</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_thalibah || ''}
                    onChange={(e) => setFormData({ ...formData, max_thalibah: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Biaya</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_free: !formData.is_free, price: formData.is_free ? formData.price : 0 })}
                    className={cn(
                      'px-4 py-2.5 rounded-xl border text-xs font-bold transition-all',
                      formData.is_free
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-white border-gray-200 text-gray-600'
                    )}
                  >
                    {formData.is_free ? 'GRATIS' : 'BERBAYAR'}
                  </button>
                  {!formData.is_free && (
                    <input
                      type="number"
                      min="0"
                      value={formData.price || ''}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      placeholder="Rp"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/30 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-bold text-gray-700 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-gray-300 text-white text-sm font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan...' : 'Simpan Program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
