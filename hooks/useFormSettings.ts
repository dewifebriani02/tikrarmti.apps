'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import {
  DEFAULT_FORM_PUBLICATION_SETTINGS,
  FormPublicationSettings,
} from '@/lib/form-settings';
import { toast } from 'sonner';

interface FormSettingsResponse {
  success: boolean;
  settings?: FormPublicationSettings;
  error?: string;
  message?: string;
}

const fetcher = async (url: string): Promise<FormPublicationSettings> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Gagal memuat pengaturan formulir');
  }
  const json: FormSettingsResponse = await res.json();
  return {
    ...DEFAULT_FORM_PUBLICATION_SETTINGS,
    ...(json.settings || {}),
  };
};

export function useFormSettings() {
  const { data, error, isLoading, mutate } = useSWR<FormPublicationSettings>(
    '/api/form-settings',
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      fallbackData: DEFAULT_FORM_PUBLICATION_SETTINGS,
    }
  );

  const updateSettings = useCallback(
    async (partialSettings: Partial<FormPublicationSettings>) => {
      const current = data || DEFAULT_FORM_PUBLICATION_SETTINGS;
      const optimistic: FormPublicationSettings = {
        ...current,
        ...partialSettings,
      };

      try {
        await mutate(
          async () => {
            const res = await fetch('/api/form-settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ settings: partialSettings }),
            });
            const result: FormSettingsResponse = await res.json();
            if (!res.ok || !result.success) {
              throw new Error(result.error || 'Gagal menyimpan pengaturan formulir');
            }
            return {
              ...DEFAULT_FORM_PUBLICATION_SETTINGS,
              ...(result.settings || {}),
            };
          },
          {
            optimisticData: optimistic,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false,
          }
        );
        return { success: true };
      } catch (err: any) {
        console.error('[useFormSettings] update error:', err);
        toast.error(err.message || 'Gagal menyimpan perubahan');
        return { success: false, error: err.message };
      }
    },
    [data, mutate]
  );

  return {
    settings: data || DEFAULT_FORM_PUBLICATION_SETTINGS,
    isLoading,
    isError: !!error,
    updateSettings,
    mutate,
  };
}
