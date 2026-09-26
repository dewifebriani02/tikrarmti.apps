'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from 'react-hot-toast';

function VerifikasiOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [resetToken, setResetToken] = useState('');

  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (!email) {
      router.push('/lupa-password');
    }
  }, [email, router]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.every((char) => /^\d$/.test(char))) {
      setCode([...pastedData, ...Array(6 - pastedData.length).fill('')]);
    }
  };

  const verifyCode = async () => {
    const otpCode = code.join('');
    if (otpCode.length !== 6) {
      toast.error('Masukkan 6 digit kode');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: otpCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kode tidak valid');
      }

      setResetToken(data.reset_token);
      setStep('reset');
      toast.success('Kode berhasil diverifikasi!');
    } catch (error: any) {
      toast.error(error.message || 'Kode tidak valid atau kadaluarsa');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Password tidak cocok');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-with-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal reset password');
      }

      toast.success('Password berhasil direset!');
      setTimeout(() => router.push('/login'), 2000);
    } catch (error: any) {
      toast.error(error.message || 'Gagal reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <Link
              href="/lupa-password"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Link>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Verifikasi Kode
              </h1>
              <p className="text-gray-600">
                Masukkan 6 digit kode yang dikirim ke{' '}
                <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-2xl font-bold"
                  />
                ))}
              </div>

              <Button
                onClick={verifyCode}
                disabled={isLoading || code.join('').length !== 6}
                className="w-full bg-green-900 hover:bg-green-800"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  'Verifikasi'
                )}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Tidak menerima kode?{' '}
                <button
                  onClick={() => router.push('/lupa-password')}
                  className="text-green-900 hover:underline font-medium"
                >
                  Kirim Ulang
                </button>
              </p>
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
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Password Baru
            </h1>
            <p className="text-gray-600">
              Buat password baru untuk akun Ukhti
            </p>
          </div>

          <form onSubmit={resetPassword} className="space-y-4">
            <div>
              <Label htmlFor="password">Password Baru</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="mt-1.5"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !password}
              className="w-full bg-green-900 hover:bg-green-800"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Kode sudah kadaluarsa?{' '}
            <button
              onClick={() => router.push('/lupa-password')}
              className="text-green-900 hover:underline font-medium"
            >
              Minta Kode Baru
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifikasiOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-900 animate-spin" />
      </div>
    }>
      <VerifikasiOTPContent />
    </Suspense>
  );
}
