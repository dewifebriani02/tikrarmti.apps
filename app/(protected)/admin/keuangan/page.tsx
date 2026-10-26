'use client';

import React from 'react';
import Link from 'next/link';
import { Landmark, ArrowLeft, Shield, Eye } from 'lucide-react';
import AdminFinancePanel from '@/components/admin/finance/AdminFinancePanel';

export default function AdminKeuanganPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs font-semibold text-gray-500 hover:text-emerald-800 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Dashboard Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Pembukuan &amp; Rekening Koran BSI
              </h1>
              <p className="text-xs text-gray-500">
                Pencatatan kas multi-rekening program, impor e-statement BSI otomatis, dan laporan transparansi publik.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Keuangan MTI</span>
          </span>
          <a
            href="/transparansi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold text-emerald-900 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-50 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-700" />
            <span>Lihat Tampilan Publik</span>
          </a>
        </div>
      </div>

      {/* Main Finance Panel Component */}
      <AdminFinancePanel />
    </div>
  );
}
