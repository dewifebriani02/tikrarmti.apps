'use client';

async function callHalaqahApi<T = any>(action: string, ...args: any[]): Promise<T> {
  try {
    const res = await fetch('/api/admin/halaqah/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, args }),
    });
    const json = await res.json().catch(() => null);
    if (!json || typeof json !== 'object') {
      return { success: false, error: `Respons server tidak valid (HTTP ${res.status})` } as T;
    }
    return json as T;
  } catch (error: any) {
    return { success: false, error: error?.message || 'Gagal menghubungi server halaqah' } as T;
  }
}

export const getHalaqahs = (filters?: any) => callHalaqahApi('getHalaqahs', filters);
export const updateHalaqah = (data: any) => callHalaqahApi('updateHalaqah', data);
export const deleteHalaqah = (halaqahId: string) => callHalaqahApi('deleteHalaqah', halaqahId);
export const assignThalibahToHalaqah = (params: any) =>
  callHalaqahApi('assignThalibahToHalaqah', params);
export const autoCreateSimpleHalaqah = (params: any) =>
  callHalaqahApi('autoCreateSimpleHalaqah', params);
export const addThalibahToHalaqah = (params: any) =>
  callHalaqahApi('addThalibahToHalaqah', params);
export const getEligibleThalibahForHalaqah = (batchId?: string) =>
  callHalaqahApi('getEligibleThalibahForHalaqah', batchId);
export const searchUsersForAsisten = (searchQuery: string) =>
  callHalaqahApi('searchUsersForAsisten', searchQuery);
export const assignAsisten = (
  halaqahId: string,
  userId: string,
  asistenRole: 'roisah' | 'musyrifah'
) => callHalaqahApi('assignAsisten', halaqahId, userId, asistenRole);
export const removeAsisten = (halaqahId: string, userId: string) =>
  callHalaqahApi('removeAsisten', halaqahId, userId);
