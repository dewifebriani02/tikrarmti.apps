'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { loginAction } from '@/app/login/actions';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<React.ReactNode>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');

  // Set isClient flag after mount to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const message = searchParams.get('message');
    const email = searchParams.get('email');
    const errorParam = searchParams.get('error');
    const reasonParam = searchParams.get('reason');

    if (errorParam) {
      setErrors({
        general: `${decodeURIComponent(errorParam)}${reasonParam ? `: ${decodeURIComponent(reasonParam)}` : ''}`
      });
    } else if (message === 'registration_success') {
      setSuccessMessage(
        <div className="space-y-2">
          <p className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Registrasi Berhasil!
          </p>
          <p className="text-base">
            ✅ Akun <em>Ukhti</em> telah aktif. <strong>Silakan login</strong> untuk masuk ke dashboard.
          </p>
        </div>
      );
    } else if (message === 'password_reset_success') {
      setSuccessMessage(
        <div className="space-y-2">
          <p className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Password Berhasil Direset!
          </p>
          <p className="text-base">
            ✅ Password <em>Ukhti</em> telah diperbarui. <strong>Silakan login</strong> dengan password baru <em>Ukhti</em>.
          </p>
        </div>
      );
    } else if (message === 'not_registered') {
      const emailText = email ? ` (${email})` : '';
      setErrors({
        general: `Email${emailText} belum terdaftar di sistem MTI. Silakan daftar terlebih dahulu sebagai anggota baru.`
      });
    } else if (message === 'profile_incomplete') {
      setErrors({
        general: 'Profil Ukhti belum lengkap. Silakan lengkapi data profil terlebih dahulu. Pastikan nama lengkap dan nomor telepon sudah diisi.'
      });
    } else if (message === 'profile_creation_failed') {
      const emailText = email ? ` (${email})` : '';
      setErrors({
        general: `Gagal membuat profil untuk${emailText}. Silakan hubungi admin.`
      });
    } else if (message === 'profile_creation_error') {
      setErrors({
        general: 'Terjadi kesalahan saat membuat profil. Silakan coba login kembali atau hubungi admin.'
      });
    }
  }, [searchParams, isClient]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setErrors({});
    const redirectUrl = searchParams.get('redirect') || '/dashboard';
    window.location.href = `/api/auth/google?next=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setShowNotification(false);

    if (!formData.email || !formData.password) {
      const errorMsg = 'Email dan password harus diisi';
      setErrors({ general: errorMsg });
      setNotificationMessage(errorMsg);
      setNotificationType('error');
      setShowNotification(true);
      setIsLoading(false);
      return;
    }

    try {
      const result = await loginAction({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        rememberMe,
      });

      if (!result.success) {
        throw new Error(result.error || 'Login gagal');
      }

      // Show success notification
      setNotificationMessage('Login berhasil! Mengarahkan ke dashboard...');
      setNotificationType('success');
      setShowNotification(true);

      // Cleanse client-side storage from any previous session
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('mti_selected_batch_id');
          localStorage.removeItem('user');
          sessionStorage.clear();
        } catch (e) {}
      }

      // Check if there's a redirect URL from middleware
      const redirectUrl = searchParams.get('redirect');
      const targetUrl = redirectUrl && redirectUrl !== '/login' ? redirectUrl : '/dashboard';

      console.log('[Login] Redirecting to:', targetUrl);

      setTimeout(() => {
        window.location.replace(targetUrl);
      }, 300);

      return;
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMsg = error.message || 'Login gagal. Silakan periksa email dan password.';
      setErrors({ general: errorMsg });
      setNotificationMessage(errorMsg);
      setNotificationType('error');
      setShowNotification(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Mobile Notification Toast */}
      {showNotification && (
        <div className={`fixed top-4 right-4 left-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 ${notificationType === 'success'
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
          }`}>
          <div className="flex items-center">
            {notificationType === 'success' ? (
              <CheckCircle2 className="w-6 h-6 mr-3" />
            ) : (
              <AlertCircle className="w-6 h-6 mr-3" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-base">
                {notificationType === 'success' ? 'Berhasil!' : 'Error!'}
              </p>
              <p className="text-sm opacity-90">{notificationMessage}</p>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="ml-4 text-white hover:opacity-80"
            >
              ×
            </button>
          </div>
        </div>
      )}


      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8 sm:py-12">
        {/* Minimal Background Elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-5 sm:top-20 sm:left-10 w-24 h-24 sm:w-32 sm:h-32 bg-green-900/5 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-10 right-5 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-40 sm:h-40 bg-yellow-500/5 rounded-full opacity-20 blur-3xl"></div>
        </div>

        <div className="w-full max-w-md sm:max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img
                  src="/mti-logo.jpg"
                  alt="Tikrar MTI Apps"
                  className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                />
                <div className="absolute inset-0 -z-10 bg-green-500/20 blur-2xl rounded-full scale-150"></div>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-green-900 mb-2">Tikrar MTI Apps</h1>
            <p className="text-gray-600">Portal Thalibah Markaz Tikrar Indonesia</p>
          </div>

          {/* Login Form */}
          <Card className="shadow-xl border-0">
            <CardContent className="p-6 sm:p-8">
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                  {successMessage}
                </div>
              )}

              {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  {errors.general}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email/Username</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-1"
                    placeholder="email@example.com"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="mt-1 pr-12 text-base"
                      placeholder="Masukkan password"
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-1 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center h-5">
                    <input
                      id="remember_me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600 focus:ring-2 transition duration-150 ease-in-out cursor-pointer"
                    />
                  </div>
                  <Label
                    htmlFor="remember_me"
                    className="text-sm text-gray-700 cursor-pointer select-none font-medium"
                  >
                    Ingatkan Saya
                  </Label>
                </div>

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-green-900 hover:text-green-700 hover:underline transition-colors"
                  >
                    Lupa password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  size="lg"
                  className="w-full bg-green-900 hover:bg-green-800 text-white transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl py-4 sm:py-6 text-base sm:text-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Memproses...</span>
                    </div>
                  ) : (
                    <span className="font-semibold text-white">Bismillah, Masuk</span>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">atau</span>
                </div>
              </div>

              {/* Google Login Button */}
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                variant="outline"
                size="lg"
                className="w-full border-gray-300 hover:bg-gray-50 text-gray-700 transition-all duration-300 py-4 sm:py-6 text-base sm:text-lg"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="font-semibold">Masuk dengan Google</span>
              </Button>

              {/* Register Link */}
              <div className="text-center mt-6">
                <p className="text-gray-600 mb-2 text-sm sm:text-base">
                  Belum terdaftar di sistem MTI?
                </p>
                <Link
                  href="/register"
                  className="inline-block text-green-900 hover:text-green-800 font-semibold hover:underline transition-colors text-base sm:text-lg"
                >
                  Daftar sebagai anggota baru
                </Link>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}