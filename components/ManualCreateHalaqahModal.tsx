'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Users, Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatMuallimahName } from '@/lib/roles';

interface Batch {
  id: string;
  name: string;
  status: string;
}

interface Program {
  id: string;
  name: string;
  batch_id: string;
  class_type?: string;
}

interface Muallimah {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  preferred_juz?: string;
}

interface ManualCreateHalaqahModalProps {
  onClose: () => void;
  onSuccess: () => void;
  batchId?: string;
}

interface HalaqahFormData {
  name: string;
  description: string;
  program_id: string;
  muallimah_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  max_students: number;
  preferred_juz: string;
}

const DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
];

export function ManualCreateHalaqahModal({ onClose, onSuccess, batchId }: ManualCreateHalaqahModalProps) {
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [muallimahs, setMuallimahs] = useState<Muallimah[]>([]);
  const [selectedClassType, setSelectedClassType] = useState<string>('tikrar_tahfidz');

  const [formData, setFormData] = useState<HalaqahFormData>({
    name: '',
    description: '',
    program_id: '',
    muallimah_id: '',
    day_of_week: 1,
    start_time: '',
    end_time: '',
    location: '',
    max_students: 5,
    preferred_juz: '',
  });

  useEffect(() => {
    if (batchId) {
      loadData();
    }
  }, [batchId]);

  const loadData = async () => {
    if (!batchId) return;

    setLoading(true);
    try {
      // Load programs and muallimahs in parallel
      const [programsResponse, muallimahsResponse] = await Promise.all([
        fetch(`/api/programs?batch_id=${batchId}`),
        fetch(`/api/muallimah-akads?batch_id=${batchId}&status=approved`)
      ]);

      const programsResult = await programsResponse.json();
      const muallimahsResult = await muallimahsResponse.json();

      if (programsResult.data) {
        setPrograms(programsResult.data);
      }

      if (muallimahsResult.data) {
        setMuallimahs(muallimahsResult.data);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Nama halaqah wajib diisi');
      return;
    }
    if (!formData.program_id) {
      toast.error('Program wajib dipilih');
      return;
    }
    if (!formData.muallimah_id) {
      toast.error('Muallimah wajib dipilih');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      toast.error('Waktu mulai dan selesai wajib diisi');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      toast.error('Waktu selesai harus lebih besar dari waktu mulai');
      return;
    }

    setLoading(true);

    try {
      // Find the muallimah registration to get the user_id
      const selectedMuallimahReg = muallimahs.find(m => m.id === formData.muallimah_id);
      if (!selectedMuallimahReg) {
        toast.error('Muallimah tidak ditemukan');
        return;
      }

      const response = await fetch('/api/halaqah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: formData.program_id,
          muallimah_id: selectedMuallimahReg.user_id, // Use user_id, not muallimah_registrations.id
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          day_of_week: formData.day_of_week,
          start_time: formData.start_time,
          end_time: formData.end_time,
          location: formData.location.trim() || null,
          preferred_juz: formData.preferred_juz.trim() || null,
          max_students: formData.max_students,
          waitlist_max: 5,
          status: 'active',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create halaqah');
      }

      toast.success('Halaqah berhasil dibuat!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating halaqah:', error);
      toast.error('Gagal membuat halaqah: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tambah Halaqah Manual</h2>
            <p className="text-sm text-gray-600 mt-1">
              Buat halaqah baru untuk daftar ulang
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mx-6 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Buat halaqah manual untuk menambahkan kelompok belajar baru. Thalibah dapat memilih halaqah ini saat melakukan daftar ulang.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Class Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jenis Halaqah (Filter Program)
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="classType"
                  value="tikrar_tahfidz"
                  checked={selectedClassType === 'tikrar_tahfidz'}
                  onChange={(e) => {
                    setSelectedClassType(e.target.value);
                    setFormData({ ...formData, program_id: '' });
                  }}
                  className="text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Tikrar Per Juz</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="classType"
                  value="pra_tahfidz"
                  checked={selectedClassType === 'pra_tahfidz'}
                  onChange={(e) => {
                    setSelectedClassType(e.target.value);
                    setFormData({ ...formData, program_id: '' });
                  }}
                  className="text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Pra Tikrar</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="classType"
                  value="tikrar_berbayar"
                  checked={selectedClassType === 'tikrar_berbayar'}
                  onChange={(e) => {
                    setSelectedClassType(e.target.value);
                    setFormData({ ...formData, program_id: '' });
                  }}
                  className="text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Berbayar</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="classType"
                  value="muallimah"
                  checked={selectedClassType === 'muallimah'}
                  onChange={(e) => {
                    setSelectedClassType(e.target.value);
                    setFormData({ ...formData, program_id: '' });
                  }}
                  className="text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Muallimah</span>
              </label>
            </div>
          </div>

          {/* Program Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.program_id}
              onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
              disabled={loading || programs.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            >
              <option value="">Pilih program...</option>
              {programs
                .filter(p => {
                  if (selectedClassType === 'muallimah') {
                    return !p.class_type && p.name.toLowerCase().includes('muallimah');
                  }
                  if (selectedClassType === 'tikrar_berbayar') {
                    return p.class_type === 'tikrar_berbayar' || p.name.toLowerCase().includes('berbayar');
                  }
                  return p.class_type === selectedClassType;
                })
                .map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            {programs.length === 0 && !loading && (
              <p className="mt-1 text-sm text-amber-600">Tidak ada program untuk batch ini</p>
            )}
          </div>

          {/* Muallimah Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Muallimah <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.muallimah_id}
              onChange={(e) => {
                const selectedMuallimah = muallimahs.find(m => m.id === e.target.value);
                setFormData({
                  ...formData,
                  muallimah_id: e.target.value,
                  preferred_juz: selectedMuallimah?.preferred_juz || '',
                });
              }}
              disabled={loading || muallimahs.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            >
              <option value="">Pilih muallimah...</option>
              {muallimahs.map((muallimah) => (
                <option key={muallimah.id} value={muallimah.id}>
                  {formatMuallimahName(muallimah.full_name)} {muallimah.email ? `(${muallimah.email})` : ''} {muallimah.preferred_juz ? `- Juz ${muallimah.preferred_juz}` : ''}
                </option>
              ))}
            </select>
            {muallimahs.length === 0 && !loading && (
              <p className="mt-1 text-sm text-amber-600">Tidak ada muallimah approved untuk batch ini</p>
            )}
          </div>

          {/* Halaqah Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Halaqah <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Halaqah Juz 1 - Grup A"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi opsional..."
              rows={2}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Day of Week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Hari <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              >
                {DAYS.map((day, index) => (
                  <option key={index} value={index + 1}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Waktu Mulai <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Waktu Selesai <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Lokasi
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Contoh: Zoom, Nama Masjid, dll."
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Preferred Juz */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Juz yang Diajarkan
            </label>
            <input
              type="text"
              value={formData.preferred_juz}
              onChange={(e) => setFormData({ ...formData, preferred_juz: e.target.value })}
              placeholder="Contoh: 1, 2, 3 atau 28A, 28B"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Max Students */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Kuota Maksimum Thalibah
            </label>
            <input
              type="number"
              value={formData.max_students}
              onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 5 })}
              min="1"
              max="100"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-900 text-white rounded-md hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Buat Halaqah
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
