'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeRedirectPath } from '@/lib/utils/safe-redirect';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function ConfirmEmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Mengkonfirmasi email <em>Ukhti</em>...');
  const [email, setEmail] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Extract email from URL if available
    const urlParams = new URL(window.location.href);
    const emailParam = urlParams.searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    const confirmEmail = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      const next = searchParams.get('next');

      console.log('Confirm page params:', { token: !!token, type, next });

      if (!token) {
        setStatus('error');
        setMessage('Token konfirmasi tidak valid atau sudah kadaluarsa.');
        return;
      }

      // Handle password recovery
      if (type === 'recovery') {
        console.log('Password recovery detected, redirecting to reset password...');
        setMessage('Memvalidasi link reset password...');

        try {
          // Verify token via API
          const response = await fetch(`/api/auth/confirm?token=${token}&type=recovery`);
          const data = await response.json();

          if (response.ok) {
            // Redirect to reset password page
            const redirectUrl = safeRedirectPath(next, '/reset-password');
            console.log('Redirecting to:', redirectUrl);
            router.push(redirectUrl);
          } else {
            setStatus('error');
            setMessage(data.error || 'Link reset password tidak valid atau sudah kadaluarsa.');
          }
        } catch (error) {
          console.error('Error verifying recovery token:', error);
          setStatus('error');
          setMessage('Terjadi kesalahan saat memvalidasi link. Silakan coba lagi.');
        }
        return;
      }

      // Handle email confirmation
      try {
        const response = await fetch(`/api/auth/confirm?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('🎉 Email berhasil dikonfirmasi! Akun <em>Ukhti</em> sekarang aktif.');
          setIsRedirecting(true);

          // Auto-redirect to login after 2 seconds
          setTimeout(() => {
            router.push('/login?message=email_confirmed');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Gagal mengkonfirmasi email. Token mungkin sudah kadaluarsa.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Terjadi kesalahan saat mengkonfirmasi email. Silakan coba lagi atau hubungi admin.');
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          {status === 'loading' && (
            <Loader2 className="mx-auto h-16 w-16 text-green-600 animate-spin mb-4" />
          )}

          {status === 'success' && (
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          )}

          {status === 'error' && (
            <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'success' ? 'Email Dikonfirmasi!' :
             status === 'error' ? 'Konfirmasi Gagal' :
             'Mengkonfirmasi...'}
          </h1>

          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {status === 'success' && (
            <Button
              onClick={handleLogin}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Login Sekarang
            </Button>
          )}

          {status === 'error' && (
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Coba Lagi
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
      </div>
    }>
      <ConfirmEmailPageContent />
    </Suspense>
  );
}