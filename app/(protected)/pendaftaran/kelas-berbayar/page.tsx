'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Crown,
  BookOpen,
  DollarSign,
  HelpCircle,
  RefreshCw,
  X,
  Send,
  MessageCircle,
  Check,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast, Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface PaidClass {
  id: string;
  muallimah_id: string;
  batch_id: string | null;
  class_name: string;
  scheme: string;
  subject_material: string;
  description: string | null;
  schedule_day: string;
  time_start: string;
  time_end: string;
  timezone: string;
  max_students: number;
  fee_amount: number;
  facilities: string | null;
  whatsapp_group_link: string | null;
  zoom_link: string | null;
  status: string;
  muallimah?: {
    id: string;
    full_name: string;
    email: string;
    whatsapp?: string;
  };
  batch?: {
    id: string;
    name: string;
    status?: string;
  };
  enrolled_count?: number;
  remaining_slots?: number;
  is_full?: boolean;
  is_user_registered?: boolean;
}

export default function PendaftaranKelasBerbayarPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<PaidClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('all');

  // Registration modal
  const [registeringClass, setRegisteringClass] = useState<PaidClass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<{
    classItem: PaidClass;
    groupLink: string | null;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    whatsapp: '',
    city_domicile: '',
    motivation: '',
    payment_confirmed: false,
    payment_proof_url: '',
  });

  // Pre-fill user data when user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        full_name: prev.full_name || user.full_name || (user as any)?.name || '',
        email: prev.email || user.email || '',
        whatsapp: prev.whatsapp || (user as any)?.whatsapp || '',
      }));
    }
  }, [user]);

  const fetchApprovedClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/muallimah/paid-classes?scope=public');
      const data = await res.json();
      if (res.ok) {
        setClasses(data.classes || []);
      } else {
        toast.error(data.message || 'Gagal memuat daftar kelas berbayar');
      }
    } catch (err: any) {
      console.error('Error fetching paid classes:', err);
      toast.error('Terjadi kesalahan saat memuat data kelas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedClasses();
  }, []);

  const openRegisterModal = (item: PaidClass) => {
    setRegisteringClass(item);
    setFormData(prev => ({
      ...prev,
      full_name: prev.full_name || user?.full_name || '',
      email: prev.email || user?.email || '',
      whatsapp: prev.whatsapp || (user as any)?.whatsapp || '',
      payment_confirmed: false,
      payment_proof_url: '',
    }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringClass) return;

    if (!formData.full_name.trim() || !formData.email.trim() || !formData.whatsapp.trim()) {
      toast.error('Mohon lengkapi Nama, Email, dan Nomor WhatsApp');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/paid-classes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid_class_id: registeringClass.id,
          full_name: formData.full_name,
          email: formData.email,
          whatsapp: formData.whatsapp,
          city_domicile: formData.city_domicile,
          motivation: formData.motivation,
          payment_proof_url: formData.payment_proof_url,
          infaq_amount: registeringClass.fee_amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Pendaftaran gagal');
      }

      toast.success('Alhamdulillah, pendaftaran berhasil dikirim!');
      const targetClass = registeringClass;
      setRegisteringClass(null);
      setRegistrationSuccess({
        classItem: targetClass,
        groupLink: targetClass.whatsapp_group_link || null,
      });

      // Refresh list to update counter and registered status
      fetchApprovedClasses();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unique list of schedule days
  const availableDays = useMemo(() => {
    const days = new Set<string>();
    classes.forEach(c => {
      if (c.schedule_day) days.add(c.schedule_day.trim());
    });
    return Array.from(days);
  }, [classes]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        c.class_name.toLowerCase().includes(query) ||
        c.subject_material.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query)) ||
        (c.muallimah?.full_name && c.muallimah.full_name.toLowerCase().includes(query));

      const matchDay = selectedDay === 'all' || c.schedule_day.trim() === selectedDay;

      return matchSearch && matchDay;
    });
  }, [classes, searchQuery, selectedDay]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-indigo-50/20 to-white pb-24">
      <Toaster position="top-right" richColors />

      {/* Header Sticky Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-20 shadow-xs">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/pendaftaran"
                className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                title="Kembali ke Portal Pendaftaran"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                  <Crown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Program Bimbingan Khusus</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Pendaftaran Kelas Berbayar Resmi Mu'allimah MTI
                </h1>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchApprovedClasses}
              disabled={loading}
              className="rounded-xl border-gray-200 text-xs font-bold gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              <span className="hidden sm:inline">Segarkan Data</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8">
        {/* Banner Hero */}
        <div className="rounded-3xl p-6 sm:p-8 md:p-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white relative overflow-hidden shadow-xl shadow-indigo-950/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 font-black text-xs uppercase tracking-wider px-3 py-1 shadow-sm border-none">
                <Crown className="w-3.5 h-3.5 mr-1" />
                Resmi Terverifikasi MTI
              </Badge>
              <span className="text-xs font-bold text-indigo-200 bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-xs">
                Kelompok Kecil 5–15 Thalibah
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              Talaqqi Intensif &amp; Bimbingan Khusus Bersama <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-indigo-200">Mu'allimah MTI</span>
            </h2>

            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-normal">
              Kelas berbayar merupakan program bimbingan privat dan halaqah tematik terstruktur yang diajukan langsung oleh para Mu'allimah senior MTI dan telah disetujui kurikulumnya oleh Manajemen Pusat Markaz Tikrar Indonesia.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-indigo-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ruang Zoom Cloud MTI Resmi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Simakan Personal Makhraj &amp; Tajwid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>E-Sertifikat Kelulusan Resmi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kelas, nama ustadzah, atau materi pembelajaran..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value="all">Semua Hari Jadwal</option>
                {availableDays.map(day => (
                  <option key={day} value={day}>
                    Hari {day}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-gray-500 px-3 py-2 bg-gray-100 rounded-xl">
              {filteredClasses.length} Kelas Tersedia
            </div>
          </div>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-bold text-gray-500">Memuat daftar kelas berbayar resmi dari Mu'allimah...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-gray-900">Belum Ada Kelas yang Sesuai</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tidak ditemukan kelas berbayar yang cocok dengan pencarian atau filter hari yang Ukhti pilih. Silakan atur ulang kata kunci pencarian.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedDay('all');
              }}
              className="rounded-xl text-xs font-bold"
            >
              Reset Filter
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map(c => {
              const enrolled = c.enrolled_count || 0;
              const max = c.max_students || 10;
              const remaining = Math.max(0, max - enrolled);
              const isFull = enrolled >= max;
              const isUserRegistered = Boolean(c.is_user_registered);
              const percentage = Math.min(100, Math.round((enrolled / max) * 100));

              return (
                <Card
                  key={c.id}
                  className="rounded-3xl border-2 border-indigo-100/80 hover:border-indigo-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group bg-white"
                >
                  <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {c.schedule_day}
                        </span>

                        {isUserRegistered ? (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Terdaftar
                          </span>
                        ) : isFull ? (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            Penuh
                          </span>
                        ) : remaining <= 3 ? (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                            Sisa {remaining} Kuota!
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Tersedia
                          </span>
                        )}
                      </div>

                      {/* Class Title & Material */}
                      <div>
                        <h3 className="text-lg font-black text-gray-900 group-hover:text-indigo-900 transition-colors leading-snug">
                          {c.class_name}
                        </h3>
                        <p className="text-xs font-semibold text-indigo-700 mt-1 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{c.subject_material}</span>
                        </p>
                      </div>

                      {/* Mu'allimah Info */}
                      <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 font-bold">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                            Pengampu Resmi
                          </p>
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {c.muallimah?.full_name || 'Muallimah Terverifikasi'}
                          </p>
                        </div>
                      </div>

                      {/* Description if present */}
                      {c.description && (
                        <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                          {c.description}
                        </p>
                      )}

                      {/* Schedule & Time */}
                      <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>Hari: <strong className="text-gray-900">{c.schedule_day}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>Waktu: <strong className="text-gray-900">{c.time_start} - {c.time_end} {c.timezone || 'WIB'}</strong></span>
                        </div>
                      </div>

                      {/* Quota Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-medium text-gray-500">
                          <span>Kapasitas Peserta:</span>
                          <span className="font-bold text-gray-800">
                            {enrolled} / {max} Thalibah
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all duration-500',
                              isFull ? 'bg-rose-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Fee & Action Button */}
                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-gray-500">Infaq / Biaya:</span>
                        <span className="text-base sm:text-lg font-black text-indigo-900">
                          {c.fee_amount > 0 ? formatRupiah(c.fee_amount) : 'Gratis'}
                          <span className="text-[11px] font-semibold text-gray-500 ml-1">/ bulan</span>
                        </span>
                      </div>

                      {isUserRegistered ? (
                        <div className="space-y-2">
                          <Button
                            disabled
                            className="w-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold py-2.5 rounded-xl cursor-default"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                            Ukhti Sudah Terdaftar
                          </Button>
                          {c.whatsapp_group_link && (
                            <a
                              href={c.whatsapp_group_link}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Masuk Grup WhatsApp Bimbingan
                            </a>
                          )}
                        </div>
                      ) : isFull ? (
                        <Button
                          disabled
                          className="w-full bg-gray-100 text-gray-400 font-bold py-2.5 rounded-xl cursor-not-allowed"
                        >
                          Kuota Kelas Penuh
                        </Button>
                      ) : (
                        <Button
                          onClick={() => openRegisterModal(c)}
                          className="w-full bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 hover:from-indigo-800 hover:to-purple-900 text-white font-bold py-2.5 rounded-xl shadow-md shadow-indigo-950/15 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span>Daftar Kelas Ini</span>
                          <Crown className="w-4 h-4 text-amber-300" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL REGISTRASI THALIBAH */}
      {registeringClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                  Formulir Pendaftaran Thalibah
                </span>
                <h3 className="font-bold text-gray-900 text-base">
                  {registeringClass.class_name}
                </h3>
              </div>
              <button
                onClick={() => setRegisteringClass(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Pengampu:</span>
                  <span className="font-semibold text-indigo-900">
                    {registeringClass.muallimah?.full_name || 'Muallimah MTI'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Jadwal Sesi:</span>
                  <span className="font-semibold">
                    {registeringClass.schedule_day}, {registeringClass.time_start} - {registeringClass.time_end} {registeringClass.timezone}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-indigo-200/60">
                  <span className="font-bold">Infaq Bulanan:</span>
                  <span className="font-black text-indigo-950 text-sm">
                    {formatRupiah(registeringClass.fee_amount)}
                  </span>
                </div>
              </div>

              {/* Data Diri Pendaftar */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Nama lengkap Ukhti..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Email Aktif <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="email@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Nomor WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.whatsapp}
                    onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="0812xxxxxxxx"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Kota / Domisili
                </label>
                <input
                  type="text"
                  value={formData.city_domicile}
                  onChange={e => setFormData(prev => ({ ...prev, city_domicile: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Contoh: Jakarta Selatan"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Motivasi / Target Belajar di Kelas Ini
                </label>
                <textarea
                  rows={2}
                  value={formData.motivation}
                  onChange={e => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Ceritakan tujuan atau hafalan yang ingin diperbaiki..."
                />
              </div>

              {/* Info Rekening Infaq */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-1.5 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Rekening Infaq Resmi Markaz Tikrar:
                </p>
                <p className="font-mono font-black text-sm text-gray-900">
                  Bank Syariah Indonesia (BSI) 726-281-9988
                </p>
                <p className="text-[11px] text-gray-600">
                  a.n. <strong>Yayasan Markaz Tikrar Indonesia</strong> (Konfirmasi otomatis via sistem)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Link / URL Bukti Transfer Infaq (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.payment_proof_url}
                  onChange={e => setFormData(prev => ({ ...prev, payment_proof_url: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="https://drive.google.com/... atau konfirmasi via WhatsApp"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRegisteringClass(null)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs font-bold bg-gradient-to-r from-indigo-700 to-purple-800 hover:from-indigo-800 hover:to-purple-900 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Kirim Pendaftaran
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUKSES REGISTRASI */}
      {registrationSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-center p-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900">Alhamdulillah!</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Pendaftaran Ukhti untuk kelas <strong>{registrationSuccess.classItem.class_name}</strong> telah berhasil kami catat di sistem.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 text-left space-y-1.5">
              <p className="font-bold">Langkah Selanjutnya:</p>
              <p className="leading-relaxed">
                Silakan bergabung ke grup WhatsApp kelas bimbingan untuk mendapatkan tautan Zoom resmi dan jadwal temu perdana bersama Mu'allimah.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              {registrationSuccess.groupLink ? (
                <a
                  href={registrationSuccess.groupLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Gabung Grup WhatsApp Kelas
                </a>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Link grup WhatsApp akan dikirimkan oleh Mu'allimah / Admin via pesan WhatsApp resmi.
                </p>
              )}

              <Button
                variant="outline"
                onClick={() => setRegistrationSuccess(null)}
                className="w-full rounded-xl text-xs font-bold"
              >
                Tutup &amp; Lihat Kelas Lainnya
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
