import { Metadata } from 'next';
import { AdminBackupCard } from '@/components/AdminBackupCard';
import { Database, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Backup & Keamanan Database | Authority Console',
  description: 'Manajemen pencadangan otomatis harian database dan sistem MTI ke email.',
};

export default function AdminBackupPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>AUTHORITY CONSOLE • PEMELIHARAAN SISTEM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Backup Database & Sistem
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Pencadangan berkas PostgreSQL (.sql.gz) secara otomatis ke email dan penyimpanan lokal server VPS.
          </p>
        </div>

        <Link
          href="/admin/donations"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-emerald-950 bg-gray-50 hover:bg-gray-100 px-4 py-2.5 rounded-xl border border-gray-200 shrink-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dasbor Admin</span>
        </Link>
      </div>

      {/* Backup Card */}
      <AdminBackupCard />
    </div>
  );
}
