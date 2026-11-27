'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, AlertCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from 'react-hot-toast';

export default function LupaPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNotRegistered, setIsNotRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setIsNotRegistered(false);

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 404 || data.code === 'EMAIL_NOT_REGISTERED') {
          setIsNotRegistered(true);
        }
        throw new Error(data.error || 'Gagal mengirim kode reset');
      }

      setSuccess(true);
      toast.success('Kode reset password telah dikirim ke email');

      // Redirect ke halaman verifikasi OTP setelah 2 detik
      setTimeout(() => {
        router.push(`/verifikasi-otp?email=${encodeURIComponent(email.toLowerCase().trim())}`);
      }, 2000);

    } catch (error: any) {
      console.error('Error:', error);
      setErrorMessage(error.message || 'Gagal mengirim kode reset password');
      toast.error(error.message || 'Gagal mengirim kode reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Terkirim!
              </h2>
              <p className="text-gray-600 mb-6">
                Kode reset password telah dikirim ke <strong>{email}</strong>.
                Cek inbox atau folder spam.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Ukhti akan dialihkan ke halaman verifikasi...
              </p>
              <Button
                onClick={() => router.push(`/verifikasi-otp?email=${encodeURIComponent(email)}`)}
                className="w-full bg-green-900 hover:bg-green-800"
              >
                Lanjut Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Login
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Lupa Password
            </h1>
            <p className="text-gray-600">
              Masukkan email untuk menerima kode reset password
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{errorMessage}</p>
                </div>
              </div>
              {isNotRegistered && (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-lg bg-green-900 hover:bg-green-800 text-white font-semibold text-sm transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Daftar sebagai Anggota Baru
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) {
                    setErrorMessage(null);
                    setIsNotRegistered(false);
                  }
                }}
                required
                disabled={isLoading}
                className="mt-1.5"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-green-900 hover:bg-green-800"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Kirim Kode Reset'
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-500 mt-6 space-y-2">
            <p>
              Ingat password?{' '}
              <Link href="/login" className="text-green-900 hover:underline font-medium">
                Login
              </Link>
            </p>
            <p>
              Belum punya akun?{' '}
              <Link href="/register" className="text-green-900 hover:underline font-medium">
                Daftar Akun Baru
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
