'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_RANKS, hasRequiredRank } from '@/lib/roles';
import { AdminBackupCard } from '@/components/AdminBackupCard';

export default function PengaturanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userRoles = (user as any)?.primaryRole ? [(user as any).primaryRole] : (user?.roles || []);
  const isAdmin = hasRequiredRank(userRoles, ROLE_RANKS.admin);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        {isAdmin && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-gray-900">Pemeliharaan & Keamanan Data (Admin)</h2>
            </div>
            <AdminBackupCard />
          </div>
        )}

        <div className="bg-white shadow rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-emerald-900" />
            <h1 className="text-2xl font-bold text-gray-900">Pengaturan Akun</h1>
          </div>

          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Akun</h2>
              <p className="text-sm text-gray-600">
                Kelola informasi akun dan preferensi <em>Ukhti</em>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Info:</strong> Halaman pengaturan sedang dalam pengembangan.
                Untuk saat ini, Ukhti dapat mengubah informasi profil di halaman Profil.
              </p>
              <button
                onClick={() => router.push('/profile')}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Pergi ke Halaman Profil
              </button>
            </div>

            {/* Placeholder sections */}
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Notifikasi</h3>
                <p className="text-sm text-gray-500">Atur preferensi notifikasi <em>Ukhti</em></p>
                <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  Segera hadir
                </span>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Privasi & Keamanan</h3>
                <p className="text-sm text-gray-500">Kelola pengaturan privasi dan keamanan akun</p>
                <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  Segera hadir
                </span>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Bahasa & Wilayah</h3>
                <p className="text-sm text-gray-500">Ubah bahasa dan zona waktu</p>
                <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  Segera hadir
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
