'use client';

import { X, Shield, Ban, CheckCircle, Info, Calendar, MapPin, Briefcase, Phone, Mail, User, Clock, AlertTriangle, RefreshCw, Eye, MessageSquare, Key } from 'lucide-react';
import { AdminUser, MuallimahRegistration } from './types';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getPrimaryRole } from '@/lib/roles';

// Re-export specific modal
export { MergeUserModal } from './MergeUserModal';
export { EditUserModal } from './EditUserModal';
export { DeleteUserModal } from './DeleteUserModal';

// --- USER DETAIL MODAL ---
interface UserDetailModalProps {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
}

export function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-green-900 to-green-800 p-6 flex flex-col items-center text-white relative">
          <button onClick={onClose} className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
          
          <div className="h-24 w-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden mb-4 shadow-xl">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 opacity-50" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold">{user.full_name || 'Hamba Allah'}</h2>
          <div className="flex gap-2 mt-2">
            {user.roles?.map(role => (
              <span key={role} className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] uppercase font-bold tracking-widest border border-white/10">
                {role}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Informasi Kontak */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Informasi Kontak</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 group">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Email</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{user.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">WhatsApp</span>
                    <span className="text-sm font-medium text-gray-900">{user.whatsapp || '-'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 flex-shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Domisili</span>
                    <span className="text-sm font-medium text-gray-900">
                      {user.kota ? `${user.kota}, ${user.provinsi}` : user.negara}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Informasi Pribadi */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Profil Thalibah</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 flex-shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">TTL</span>
                    <span className="text-sm font-medium text-gray-900 leading-tight">
                      {user.tempat_lahir ? `${user.tempat_lahir}, ` : ''}
                      {user.tanggal_lahir ? new Date(user.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 flex-shrink-0">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Pekerjaan</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{user.pekerjaan || '-'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center border border-gray-100 flex-shrink-0">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Batch Aktif</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{user.current_tikrar_batch?.name || 'Belum Terdaftar'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Biodata Lengkap</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Nama Kunyah</span>
                <p className="text-sm text-gray-900 font-medium">{user.nama_kunyah || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Telegram</span>
                <p className="text-sm text-gray-900 font-medium">{user.telegram || '-'}</p>
              </div>
              <div className="md:col-span-2 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Alamat Lengkap</span>
                <p className="text-sm text-gray-900 font-medium leading-relaxed">{user.alamat || '-'}</p>
              </div>
              <div className="md:col-span-2 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Alasan Mendaftar</span>
                <p className="text-sm text-gray-700 italic border-l-2 border-green-200 pl-3 py-1 bg-green-50/30 rounded-r-lg">
                  "{user.alasan_daftar || 'Tidak ada alasan yang diberikan.'}"
                </p>
              </div>
            </div>
          </div>

          {user.is_blacklisted && (
            <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-4">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900 mb-1">Blacklist Information</h4>
                <p className="text-xs text-red-700 font-medium mb-1 capitalize">Reason: {user.blacklist_reason || 'Manual Blacklist'}</p>
                <p className="text-xs text-red-600 italic">"{user.blacklist_notes || 'No notes provided.'}"</p>
                <div className="mt-2 text-[10px] text-red-400 font-bold uppercase tracking-wider">
                  Blacklisted at {user.blacklisted_at ? new Date(user.blacklisted_at).toLocaleString() : '-'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            <Clock className="h-3 w-3" />
            Terdaftar: {new Date(user.created_at).toLocaleString('id-ID')}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// --- EDIT ROLE MODAL ---
interface EditRoleModalProps {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditRoleModal({ user, isOpen, onClose, onSuccess }: EditRoleModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles || []);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role) 
        : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      toast.error('User must have at least one role');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: getPrimaryRole(selectedRoles),
          roles: selectedRoles
        }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      toast.success('Roles updated successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Gagal memperbarui peran');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Atur Peran User</h2>
              <p className="text-xs text-gray-500 font-medium">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 space-y-4">
          <button
            onClick={() => toggleRole('admin')}
            className={cn(
              "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
              selectedRoles.includes('admin')
                ? "border-purple-600 bg-purple-50 text-purple-900"
                : "border-gray-100 hover:border-gray-200"
            )}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">ADMIN</span>
              <span className="text-xs opacity-70 font-medium">Akses penuh ke seluruh sistem manajemen</span>
            </div>
            {selectedRoles.includes('admin') && <CheckCircle className="h-5 w-5 text-purple-600" />}
          </button>

          <button
            onClick={() => toggleRole('roisah')}
            className={cn(
              "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
              selectedRoles.includes('roisah')
                ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                : "border-gray-100 hover:border-gray-200"
            )}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">ROISAH</span>
              <span className="text-xs opacity-70 font-medium">Kepala Musyrifah / Pimpinan</span>
            </div>
            {selectedRoles.includes('roisah') && <CheckCircle className="h-5 w-5 text-indigo-600" />}
          </button>

          <button
            onClick={() => toggleRole('musyrifah')}
            className={cn(
              "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
              selectedRoles.includes('musyrifah')
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-gray-100 hover:border-gray-200"
            )}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">MUSYRIFAH</span>
              <span className="text-xs opacity-70 font-medium">Pembina Muallimah & Pengawas</span>
            </div>
            {selectedRoles.includes('musyrifah') && <CheckCircle className="h-5 w-5 text-blue-600" />}
          </button>

          <button
            onClick={() => toggleRole('muallimah')}
            className={cn(
              "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
              selectedRoles.includes('muallimah')
                ? "border-amber-600 bg-amber-50 text-amber-900"
                : "border-gray-100 hover:border-gray-200"
            )}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">MUALLIMAH</span>
              <span className="text-xs opacity-70 font-medium">Pengajar Halaqah</span>
            </div>
            {selectedRoles.includes('muallimah') && <CheckCircle className="h-5 w-5 text-amber-600" />}
          </button>

          <button
            onClick={() => toggleRole('thalibah')}
            className={cn(
              "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
              selectedRoles.includes('thalibah')
                ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                : "border-gray-100 hover:border-gray-200"
            )}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">THALIBAH</span>
              <span className="text-xs opacity-70 font-medium">Akses standart sebagai thalibah aktif</span>
            </div>
            {selectedRoles.includes('thalibah') && <CheckCircle className="h-5 w-5 text-emerald-600" />}
          </button>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-8 py-2.5 bg-green-900 text-white text-sm font-bold rounded-xl hover:bg-green-800 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}

// --- BLACKLIST MODAL ---
interface BlacklistModalProps {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BlacklistModal({ user, isOpen, onClose, onSuccess }: BlacklistModalProps) {
  const [reason, setReason] = useState(user.blacklist_reason || 'pelanggaran_adat');
  const [notes, setNotes] = useState(user.blacklist_notes || '');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const isWhitelisting = user.is_blacklisted;

  const handleAction = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/role`, { // Using the update API for status
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_blacklisted: !isWhitelisting,
          blacklist_reason: isWhitelisting ? null : reason,
          blacklist_notes: isWhitelisting ? null : notes,
          blacklist_at: isWhitelisting ? null : new Date().toISOString()
        }),
      });

      if (!response.ok) throw new Error('Action failed');

      toast.success(isWhitelisting ? 'User telah di-whitelist' : 'User telah di-blacklist');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Gagal memproses permintaan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-300">
        <div className={cn(
          "p-6 flex flex-col items-center",
          isWhitelisting ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
           <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
             {isWhitelisting ? <CheckCircle className="h-8 w-8" /> : <Ban className="h-8 w-8" />}
           </div>
           <h2 className="text-xl font-bold">{isWhitelisting ? 'Whitelist User' : 'Blacklist User'}</h2>
           <p className="text-sm opacity-80 font-medium">{user.full_name || user.email}</p>
        </div>

        <div className="p-8 space-y-6">
          {!isWhitelisting ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Alasan Utama</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium"
                >
                  <option value="pelanggaran_adat">Pelanggaran Adab/Aturan</option>
                  <option value="duplikasi_akun">Duplikasi Akun</option>
                  <option value="spam_abuse">Spam & Abuse</option>
                  <option value="lainnya">Alasan Lainnya</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Catatan Tambahan</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Berikan detail tambahan tentang alasan blacklist..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-sm"
                />
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 font-medium leading-relaxed">
                Apakah <em>Ukhti</em> yakin ingin mengembalikan akses user ini ke sistem? Status blacklist akan dihapus sepenuhnya.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleAction}
            disabled={isLoading}
            className={cn(
              "px-8 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2",
              isWhitelisting 
                ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" 
                : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
            )}
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            Konfirmasi {isWhitelisting ? 'Whitelist' : 'Blacklist'}
          </button>
        </div>
      </div>
    </div>
  );
}
