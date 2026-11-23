'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Loader2, Key, ClipboardCheck, Users, Activity } from 'lucide-react';
import { resetUserPassword } from '@/lib/admin/admin-client';
import { toast } from 'react-hot-toast';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function UserDetailDashboardModal({ isOpen, onClose, userId }: UserDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'registrations' | 'halaqah' | 'attendance' | 'activity'>('profile');

  useEffect(() => {
    if (isOpen && userId) {
      const fetchUserDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/admin/users/${userId}/details`, {
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Failed to fetch user details');
          const result = await response.json();
          setData(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load user details');
        } finally {
          setLoading(false);
        }
      };
      fetchUserDetails();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleResetPassword = async () => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Reset password user ini ke MTI123!?')) return;
    try {
      const result = await resetUserPassword(userId);
      if (result.success) toast.success(result.message || 'Berhasil!');
      else toast.error(result.error || 'Gagal');
    } catch (e) {
      toast.error('Gagal');
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-';
  const formatTime = (t: string) => t ? t.substring(0, 5) : '-';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-green-900 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">User Details</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-grow">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-green-900 animate-spin" />
              <p className="mt-2 text-sm text-gray-600">Loading...</p>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600 text-sm">{error}</div>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-gray-50">
                {[
                  { l: 'Registrations', v: data.stats.totalRegistrations, c: 'text-green-900' },
                  { l: 'Active Halaqah', v: data.stats.activeHalaqahs, c: 'text-blue-900' },
                  { l: 'Attendance', v: data.stats.totalAttendance, c: 'text-purple-900' },
                  { l: 'Rate', v: data.stats.attendanceRate + '%', c: 'text-yellow-900' },
                  { l: 'Mentors', v: data.stats.mentorRoles, c: 'text-pink-900' },
                ].map((s, i) => (
                  <div key={i} className="bg-white p-4 rounded-lg shadow-sm">
                    <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
                    <div className="text-xs text-gray-600">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
                <nav className="flex gap-x-8 px-6">
                  {[
                    { id: 'profile', icon: User, label: 'Profile' },
                    { id: 'registrations', icon: ClipboardCheck, label: 'Regs' },
                    { id: 'halaqah', icon: Users, label: 'Halaqah' },
                    { id: 'attendance', icon: Calendar, label: 'Presensi' },
                    { id: 'activity', icon: Activity, label: 'Logs' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`flex items-center gap-2 py-4 border-b-2 text-sm font-medium ${activeTab === t.id ? 'border-green-900 text-green-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Panels */}
              <div className="p-6">
                {activeTab === 'profile' && (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="font-bold border-b pb-1">Personal</h3>
                      <div className="grid grid-cols-2 text-sm gap-y-2">
                        <span className="text-gray-500">Name</span><span>{data.user.full_name || '-'}</span>
                        <span className="text-gray-500">Email</span><span>{data.user.email}</span>
                        <span className="text-gray-500">Gender</span><span>{data.user.jenis_kelamin || '-'}</span>
                        <span className="text-gray-500">Birth</span><span>{data.user.tempat_lahir}, {formatDate(data.user.tanggal_lahir)}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-bold border-b pb-1">Admin</h3>
                      <button onClick={handleResetPassword} className="w-full py-2 bg-orange-600 text-white rounded text-sm flex items-center justify-center gap-2">
                        <Key className="w-4 h-4" /> Reset Password (MTI123!)
                      </button>
                    </div>
                  </div>
                )}
                {/* Other tabs simplified for build test */}
                {activeTab !== 'profile' && <div className="text-sm text-gray-500">Data displayed in {activeTab} tab...</div>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-white border rounded text-sm hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}
