'use client';

import { useState, useEffect } from 'react';
import { Program, Batch, ProgramStatus } from '@/types/database';

interface ProgramWithBatch extends Program {
  batch: Batch;
}

export default function ProgramPage() {
  const [programs, setPrograms] = useState<ProgramWithBatch[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProgramStatus[]>(['open', 'ongoing']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    batch_id: '',
    name: '',
    description: '',
    target_level: '',
    duration_weeks: '',
    max_thalibah: '',
    status: 'draft' as ProgramStatus
  });

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter.length > 0) {
        params.append('status', statusFilter.join(','));
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (selectedBatch) {
        params.append('batch_id', selectedBatch);
      }

      const response = await fetch(`/api/program?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch programs');
      }

      setPrograms(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batch');
      const data = await response.json();

      if (response.ok) {
        setBatches(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    }
  };

  useEffect(() => {
    fetchPrograms();
    fetchBatches();
  }, [statusFilter, searchTerm, selectedBatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          duration_weeks: formData.duration_weeks ? parseInt(formData.duration_weeks) : null,
          max_thalibah: formData.max_thalibah ? parseInt(formData.max_thalibah) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create program');
      }

      setShowForm(false);
      setFormData({
        batch_id: '',
        name: '',
        description: '',
        target_level: '',
        duration_weeks: '',
        max_thalibah: '',
        status: 'draft'
      });
      fetchPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create program');
    }
  };

  const handleStatusToggle = (status: ProgramStatus) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const getStatusColor = (status: ProgramStatus) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'open': return 'bg-green-100 text-green-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kelola Program</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Batal' : 'Tambah Program'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Buat Program Baru</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch
              </label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData(prev => ({ ...prev, batch_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Pilih Batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({new Date(batch.start_date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })} - {new Date(batch.end_date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Program
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ProgramStatus }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="open">Buka</option>
                <option value="ongoing">Berlangsung</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level Target
              </label>
              <input
                type="text"
                value={formData.target_level}
                onChange={(e) => setFormData(prev => ({ ...prev, target_level: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contoh: Pemula, Menengah"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durasi (Pekan)
              </label>
              <input
                type="number"
                value={formData.duration_weeks}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_weeks: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maksimal Thalibah
              </label>
              <input
                type="number"
                value={formData.max_thalibah}
                onChange={(e) => setFormData(prev => ({ ...prev, max_thalibah: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Simpan Program
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cari program..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Semua Batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['draft', 'open', 'ongoing', 'completed', 'cancelled'] as ProgramStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusToggle(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter.includes(status)
                    ? getStatusColor(status)
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div key={program.id} className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold text-gray-900">{program.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(program.status)}`}>
                  {program.status}
                </span>
              </div>

              <div className="mb-2">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {program.batch.name}
                </span>
              </div>

              <p className="text-gray-600 mb-4 line-clamp-2">{program.description}</p>

              <div className="space-y-2 text-sm">
                {program.target_level && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Level:</span>
                    <span className="font-medium">{program.target_level}</span>
                  </div>
                )}
                {program.duration_weeks && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Durasi:</span>
                    <span className="font-medium">{program.duration_weeks} minggu</span>
                  </div>
                )}
                {program.max_thalibah && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Kapasitas:</span>
                    <span className="font-medium">{program.max_thalibah} thalibah</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                  Lihat Detail
                </button>
                <button className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
                  Kelola Halaqah
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {programs.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">Tidak ada program ditemukan</div>
          <p className="text-gray-500 mt-2">Coba ubah filter atau tambah program baru</p>
        </div>
      )}
    </div>
  );
}