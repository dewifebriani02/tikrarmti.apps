'use client';

import useSWR from 'swr';
import { InfaqStatusData } from '@/components/InfaqReminderBanner';

const fetcher = async (url: string): Promise<InfaqStatusData | null> => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) return null;
    throw new Error('Gagal memuat status infaq');
  }
  const json = await res.json();
  if (json.success) {
    return json.data;
  }
  return null;
};

export function useInfaqStatus() {
  const { data, error, isLoading, mutate } = useSWR<InfaqStatusData | null>(
    '/api/user/infaq-status',
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 15000,
    }
  );

  return {
    status: data || null,
    loading: isLoading,
    error,
    refreshStatus: mutate
  };
}
