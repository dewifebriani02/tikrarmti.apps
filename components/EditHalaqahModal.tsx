'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Save, Search, UserMinus, UserPlus, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateHalaqah, searchUsersForAsisten, assignAsisten, removeAsisten } from '@/app/(protected)/admin/halaqah/actions';

interface Halaqah {
  id: string;
  name: string;
  description?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  location?: string;
  max_students?: number;
  waitlist_max?: number;
  preferred_juz?: string;
  zoom_link?: string;
  zoom_link_id?: string;
  libur_date?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  program_id: string | null;
  program?: {
    id: string;
    name?: string;
    class_type?: string;
    batch_id: string;
    batch?: {
      id: string;
      name: string;
    };
  };
  mentors?: {
    id: string;
    mentor_id: string;
    role: string;
    users?: { full_name: string; email: string };
  }[];
}

interface Program {
  id: string;
  name: string;
}

interface EditHalaqahModalProps {
  halaqah: Halaqah;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditHalaqahModal({ halaqah, onClose, onSuccess }: EditHalaqahModalProps) {
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [zoomLinks, setZoomLinks] = useState<{id: string, name: string, url: string}[]>([]);
  const [isCustomZoom, setIsCustomZoom] = useState(false);

  // Assistant Assignment State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [existingAssistant, setExistingAssistant] = useState<any>(
    halaqah.mentors?.find(m => m.role === 'musyrifah' || m.role === 'roisah' || m.role === 'raisah') || null
  );
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: halaqah.name,
    description: halaqah.description || '',
    program_id: halaqah.program_id || '',
    day_of_week: halaqah.day_of_week || '',
    start_time: halaqah.start_time || '',
    end_time: halaqah.end_time || '',
    location: halaqah.location || '',
    max_students: halaqah.max_students || 5,
    waitlist_max: halaqah.waitlist_max || 0,
    preferred_juz: halaqah.preferred_juz || '',
    zoom_link: halaqah.zoom_link || '',
    zoom_link_id: halaqah.zoom_link_id || '',
    libur_date: halaqah.libur_date || '',
    status: halaqah.status,
  });

  useEffect(() => {
    loadDependencies();
  }, []);

  const loadDependencies = async () => {
    try {
      // Get batch_id from halaqah's program
      const batchId = halaqah.program?.batch_id;

      if (!batchId) {
        console.log('[EditHalaqahModal] No batch_id found, skipping dependency load');
        return;
      }

      const [programsRes, zoomRes] = await Promise.all([
        fetch(`/api/programs?batch_id=${batchId}`),
        fetch(`/api/admin/batch/${batchId}/zoom-links`)
      ]);

      const programsResult = await programsRes.json();
      if (programsRes.ok && programsResult.data) {
        setPrograms(programsResult.data);
      }

      const zoomResult = await zoomRes.json();
      if (zoomRes.ok && zoomResult.success) {
        setZoomLinks(zoomResult.data);
        
        // Determine if custom zoom
        const hasMTILink = halaqah.zoom_link_id 
          ? zoomResult.data.some((z: any) => z.id === halaqah.zoom_link_id)
          : halaqah.zoom_link 
            ? zoomResult.data.some((z: any) => z.url === halaqah.zoom_link)
            : false;
            
        if ((halaqah.zoom_link || halaqah.zoom_link_id) && !hasMTILink) {
          setIsCustomZoom(true);
        }
      }
    } catch (error) {
      console.error('Error loading dependencies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const result = await updateHalaqah({
        id: halaqah.id,
        name: formData.name,
        description: formData.description || undefined,
        program_id: formData.program_id || undefined,
        day_of_week: formData.day_of_week ? Number(formData.day_of_week) : undefined,
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        max_students: formData.max_students,
        waitlist_max: formData.waitlist_max,
        preferred_juz: formData.preferred_juz || undefined,
        zoom_link: formData.zoom_link || null,
        zoom_link_id: formData.zoom_link_id || null,
        libur_date: formData.libur_date || null,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update halaqah');
      }

      toast.success('Halaqah updated successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating halaqah:', error);
      toast.error('Failed to update halaqah: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getDayName = (dayNum: number) => {
    const days = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    return days[dayNum] || '-';
  };

  // Assistant Logic
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsSearching(true);
        const res = await searchUsersForAsisten(searchQuery);
        if (res.success && res.data) {
          setSearchResults(res.data);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleAssignAssistant = async (userId: string, userFullName: string) => {
    setAssigningUserId(userId);
    const asistenRole = halaqah.program?.class_type?.toLowerCase().includes('pra') ? 'musyrifah' : 'roisah';
    
    const res = await assignAsisten(halaqah.id, userId, asistenRole);
    
    if (res.success) {
      toast.success(`Berhasil menugaskan ${userFullName} sebagai ${asistenRole}`);
      setExistingAssistant({
        mentor_id: userId,
        role: asistenRole,
        users: { full_name: userFullName, email: '' }
      });
      setSearchQuery('');
      setSearchResults([]);
      onSuccess(); // Trigger reload
    } else {
      toast.error('Gagal menugaskan asisten: ' + res.error);
    }
    setAssigningUserId(null);
  };

  const handleRemoveAssistant = async () => {
    if (!existingAssistant || !existingAssistant.mentor_id) return;
    
    setAssigningUserId('removing');
    const res = await removeAsisten(halaqah.id, existingAssistant.mentor_id);
    
    if (res.success) {
      toast.success('Berhasil menghapus asisten');
      setExistingAssistant(null);
      onSuccess();
    } else {
      toast.error('Gagal menghapus asisten: ' + res.error);
    }
    setAssigningUserId(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Edit Halaqah</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                disabled={saving}
              />
            </div>

            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <label className="block text-sm font-medium text-red-900 mb-1 flex items-center gap-2">
                Tandai Libur (Pilih Tanggal)
              </label>
              <p className="text-xs text-red-700 mb-2">Jika diisi, jadwal halaqah pada tanggal ini akan tampil dengan warna merah (LIBUR) di layar santri. Kosongkan untuk mengaktifkan kembali.</p>
              <input
                type="date"
                value={formData.libur_date}
                onChange={(e) => setFormData({ ...formData, libur_date: e.target.value })}
                className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                disabled={saving}
              />
            </div>
          </div>

          {/* Program Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Program Assignment</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Program
              </label>
              <select
                value={formData.program_id}
                onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                disabled={saving}
              >
                <option value="">No Program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assistant Assignment (Roisah / Musyrifah) */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-700" />
              Asisten Halaqah (Raisah / Musyrifah)
            </h3>
            
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              {existingAssistant ? (
                <div className="flex justify-between items-center bg-white p-3 border border-gray-200 rounded-md">
                  <div>
                    <p className="font-medium text-gray-900">{existingAssistant.users?.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize bg-green-100 text-green-800 px-2 py-0.5 rounded-full inline-block mt-1">
                      {halaqah.program?.class_type?.toLowerCase().includes('pra') ? 'Musyrifah' : 'Raisah'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAssistant}
                    disabled={assigningUserId === 'removing'}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove assistant"
                  >
                    {assigningUserId === 'removing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Cari thalibah untuk ditugaskan sebagai {halaqah.program?.class_type?.toLowerCase().includes('pra') ? 'Musyrifah' : 'Raisah'}.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Cari nama atau email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    />
                  </div>
                  
                  {isSearching && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                    </div>
                  )}
                  
                  {searchResults.length > 0 && !isSearching && (
                    <ul className="mt-2 bg-white border border-gray-200 rounded-md divide-y divide-gray-200 max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <li key={user.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{user.full_name}</span>
                            <span className="text-xs text-gray-500">{user.email}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssignAssistant(user.id, user.full_name)}
                            disabled={assigningUserId === user.id}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            {assigningUserId === user.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <UserPlus className="w-3 h-3 mr-1" />
                            )}
                            Assign
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {searchQuery.length >= 3 && searchResults.length === 0 && !isSearching && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Tidak ada user ditemukan.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day of Week
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                  disabled={saving}
                >
                  <option value="">Not Set</option>
                  <option value="1">Senin</option>
                  <option value="2">Selasa</option>
                  <option value="3">Rabu</option>
                  <option value="4">Kamis</option>
                  <option value="5">Jumat</option>
                  <option value="6">Sabtu</option>
                  <option value="7">Minggu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                  disabled={saving}
                  placeholder="e.g., Zoom, Google Meet"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Students
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waitlist Max
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.waitlist_max}
                  onChange={(e) => setFormData({ ...formData, waitlist_max: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Juz
              </label>
              <input
                type="text"
                value={formData.preferred_juz}
                onChange={(e) => setFormData({ ...formData, preferred_juz: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                disabled={saving}
                placeholder="e.g., 1, 30, 1A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zoom Link
              </label>
              {zoomLinks.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={isCustomZoom ? "custom" : (formData.zoom_link_id || formData.zoom_link || "")}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomZoom(true);
                        setFormData({ ...formData, zoom_link_id: '', zoom_link: '' });
                      } else {
                        setIsCustomZoom(false);
                        const selectedRoom = zoomLinks.find(z => z.id === e.target.value || z.url === e.target.value);
                        setFormData({ 
                          ...formData, 
                          zoom_link_id: selectedRoom ? selectedRoom.id : '',
                          zoom_link: selectedRoom ? selectedRoom.url : e.target.value 
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                    disabled={saving}
                  >
                    <option value="">-- Pilih Room Zoom MTI --</option>
                    {zoomLinks.map((link, idx) => (
                      <option key={idx} value={link.id || link.url}>
                        {link.name}
                      </option>
                    ))}
                    <option value="custom">Gunakan Link Custom (Luar MTI)</option>
                  </select>
                  
                  {isCustomZoom && (
                    <input
                      type="url"
                      value={formData.zoom_link}
                      onChange={(e) => setFormData({ ...formData, zoom_link: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                      disabled={saving}
                      placeholder="Masukkan URL Zoom atau Google Meet manual..."
                      autoFocus
                    />
                  )}
                </div>
              ) : (
                <input
                  type="url"
                  value={formData.zoom_link}
                  onChange={(e) => setFormData({ ...formData, zoom_link: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                  disabled={saving}
                  placeholder="https://zoom.us/j/..."
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-900 text-white rounded-md hover:bg-green-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
