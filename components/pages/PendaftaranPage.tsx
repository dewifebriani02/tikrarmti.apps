'use client';

import { useState, useEffect } from 'react';
import { Pendaftaran, Program, Batch, PendaftaranStatus, User } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';

interface PendaftaranWithDetails extends Pendaftaran {
  thalibah: User;
  program: Program & { batch: Batch };
}

export default function PendaftaranPage() {
  const { user: authUser } = useAuth();
  const [pendaftaran, setPendaftaran] = useState<PendaftaranWithDetails[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PendaftaranStatus[]>(['pending', 'approved']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    program_id: '',
    notes: ''
  });

  const fetchPendaftaran = async () => {
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
      if (selectedProgram) {
        params.append('program_id', selectedProgram);
      }

      const response = await fetch(`/api/pendaftaran?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pendaftaran');
      }

      setPendaftaran(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/program?status=open');
      const data = await response.json();

      if (response.ok) {
        setPrograms(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batch?status=open,closed');
      const data = await response.json();

      if (response.ok) {
        setBatches(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    }
  };

  useEffect(() => {
    fetchPendaftaran();
    fetchPrograms();
    fetchBatches();
  }, [statusFilter, searchTerm, selectedBatch, selectedProgram]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!authUser?.id) {
        throw new Error('User not authenticated');
      }

      const selectedProgramData = programs.find(p => p.id === formData.program_id);
      if (!selectedProgramData) {
        throw new Error('Program not found');
      }

      const response = await fetch('/api/pendaftaran', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thalibah_id: authUser.id,
          program_id: formData.program_id,
          batch_id: selectedProgramData.batch_id,
          notes: formData.notes
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create pendaftaran');
      }

      setShowForm(false);
      setFormData({
        program_id: '',
        notes: ''
      });
      fetchPendaftaran();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pendaftaran');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      if (!authUser?.id) throw new Error('User not authenticated');

      const response = await fetch(`/api/pendaftaran/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved_by: authUser.id
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve pendaftaran');
      }

      fetchPendaftaran();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve pendaftaran');
    }
  };

  const handleReject = async (id: string) => {
    try {
      if (!authUser?.id) throw new Error('User not authenticated');

      const response = await fetch(`/api/pendaftaran/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved_by: authUser.id
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject pendaftaran');
      }

      fetchPendaftaran();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject pendaftaran');
    }
  };

  const handleStatusToggle = (status: PendaftaranStatus) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const getStatusColor = (status: PendaftaranStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
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
        <h1 className="text-3xl font-bold text-gray-900">Kelola Pendaftaran</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Batal' : 'Daftar Program'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Form Pendaftaran Program</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pilih Program
              </label>
              <select
                value={formData.program_id}
                onChange={(e) => setFormData(prev => ({ ...prev, program_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Pilih Program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name} - {batches.find(b => b.id === program.batch_id)?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan (Opsional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tambahkan catatan atau alasan ingin mendaftar..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Ajukan Pendaftaran
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                Batal
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
              placeholder="Cari nama thalibah..."
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
          <div>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Semua Program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['pending', 'approved', 'rejected', 'withdrawn', 'completed'] as PendaftaranStatus[]).map((status) => (
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

      {/* Pendaftaran Table */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thalibah
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Daftar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catatan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendaftaran.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {p.thalibah.full_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {p.thalibah.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{p.program.name}</div>
                    {p.program.target_level && (
                      <div className="text-sm text-gray-500">Level: {p.program.target_level}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.program.batch.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {p.registration_date ? new Date(p.registration_date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {p.notes || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {p.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(p.id)}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleReject(p.id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                    {p.status === 'approved' && (
                      <button className="text-blue-600 hover:text-blue-900 font-medium">
                        Lihat Detail
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pendaftaran.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">Tidak ada pendaftaran ditemukan</div>
            <p className="text-gray-500 mt-2">Coba ubah filter atau tunggu ada pendaftaran baru</p>
          </div>
        )}
      </div>
    </div>
  );
}