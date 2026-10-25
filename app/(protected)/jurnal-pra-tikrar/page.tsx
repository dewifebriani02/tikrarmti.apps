'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Halaman Jurnal Pra-Tikrar kini telah disatukan ke dalam Jurnal Harian Tunggal (/jurnal-harian)
 * dengan form adaptif dinamis per program.
 * Route ini secara otomatis mengalihkan pengguna ke /jurnal-harian.
 */
export default function JurnalPraTikrarRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/jurnal-harian');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <p className="text-sm font-medium text-gray-500">
        Mengalihkan ke Jurnal Harian Terpadu...
      </p>
    </div>
  );
}
