'use client';

import React from 'react';
import { ArrowLeft, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { ExamSimulationTab } from '@/components/admin/exam-simulation/ExamSimulationTab';

export default function AdminExamSimulationPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans">
      <Toaster position="top-right" richColors />

      {/* Header Bar */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/exams"
                className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
                title="Kembali ke Manajemen Ujian"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 uppercase tracking-[0.2em] mb-1">
                  <Shield className="h-3 w-3" />
                  <span>Authority Exam Sandbox</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  Simulasi Ujian Semua Juz
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                    Admin Preview
                  </span>
                </h1>
              </div>
            </div>

            <Link
              href="/admin/exams"
              className="text-xs font-bold text-gray-500 hover:text-emerald-800 transition-colors"
            >
              Ke Bank Soal & Jadwal &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <ExamSimulationTab />
      </div>
    </div>
  );
}
