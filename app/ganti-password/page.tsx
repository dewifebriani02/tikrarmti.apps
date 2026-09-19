'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, ShieldCheck, AlertCircle, CheckCircle2, Loader2, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function GantiPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validation rules
  const isLengthValid = newPassword.length >= 6;
  const isNotDefault = newPassword.trim() !== 'MTI123!';
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = isLengthValid && isNotDefault && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLengthValid) {
      setError('Password baru minimal 6 karakter.');
      return;
    }

    if (!isNotDefault) {
      setError('Password tidak boleh menggunakan password default (MTI123!). Silakan buat password baru pribadi Ukhti.');
      return;
    }

    if (!isMatch) {
      setError('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memperbarui password');
      }

      setSuccess(true);
      toast.success('Alhamdulillah, password berhasil diperbarui!');

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.replace('/dashboard');
      }, 1200);

    } catch (err: any) {
      console.error('[GantiPassword] Submit error:', err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan password. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.replace('/login');
    } catch {
      window.location.replace('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50/40 to-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 mb-3 shadow-sm border border-emerald-200">
            <Lock className="w-8 h-8 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Pembaruan Password Wajib
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
            Password akun Ukhti baru saja di-reset oleh sistem. Demi keamanan akun, silakan buat password baru sebelum melanjutkan ke dashboard.
          </p>
        </div>

        {/* Card */}
        <Card className="shadow-xl border-emerald-100/80 rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm">
          <div className="h-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700" />
          <CardContent className="p-6 sm:p-8">
            {error && (
              <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {success && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">
                  Password berhasil diperbarui! Sedang mengalihkan ke dashboard...
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password Baru */}
              <div>
                <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-700">
                  Password Baru
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    disabled={isLoading || success}
                    className="pr-10 h-11 rounded-xl border-gray-300 focus:border-emerald-600 focus:ring-emerald-600"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password Baru */}
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                  Konfirmasi Password Baru
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    disabled={isLoading || success}
                    className="pr-10 h-11 rounded-xl border-gray-300 focus:border-emerald-600 focus:ring-emerald-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Checklist Validasi */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="font-semibold text-gray-700">Ketentuan Password Baru:</p>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isLengthValid ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    ✓
                  </div>
                  <span className={isLengthValid ? 'text-emerald-700 font-medium' : 'text-gray-600'}>
                    Minimal 6 karakter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isNotDefault && newPassword.length > 0 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    ✓
                  </div>
                  <span className={isNotDefault && newPassword.length > 0 ? 'text-emerald-700 font-medium' : 'text-gray-600'}>
                    Bukan password bawaan (MTI123!)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isMatch ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    ✓
                  </div>
                  <span className={isMatch ? 'text-emerald-700 font-medium' : 'text-gray-600'}>
                    Konfirmasi password sesuai
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isFormValid || isLoading || success}
                className="w-full h-12 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-xl transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menyimpan Password...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Simpan Password & Masuk
                  </>
                )}
              </Button>
            </form>

            {/* Logout link */}
            <div className="mt-6 text-center pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs font-medium text-gray-500 hover:text-red-600 transition flex items-center justify-center gap-1.5 mx-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                Bukan akun Ukhti? Klik untuk Logout
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
