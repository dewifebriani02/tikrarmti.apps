'use client';

export interface SystemLogFilter {
  limit?: number;
  offset?: number;
  severity?: ('DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL')[];
  errorType?: ('runtime' | 'auth' | 'database' | 'validation' | 'network' | 'unknown')[];
  isAuthError?: boolean;
  isSupabaseGetUserError?: boolean;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface SystemLogEntry {
  id: string;
  created_at: string;
  error_message: string;
  error_name?: string;
  error_stack?: string;
  context: Record<string, any>;
  user_id?: string;
  user_email?: string;
  user_role?: string[];
  request_path?: string;
  request_method?: string;
  ip_address?: string;
  user_agent?: string;
  severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  error_type: 'runtime' | 'auth' | 'database' | 'validation' | 'network' | 'unknown';
  is_auth_error: boolean;
  is_supabase_getuser_error: boolean;
  sentry_event_id?: string;
  sentry_sent: boolean;
}

export interface SystemLogsResponse {
  success: boolean;
  data?: SystemLogEntry[];
  count?: number;
  error?: string;
}

async function callAdminApi<T = any>(action: string, ...args: any[]): Promise<T> {
  try {
    const res = await fetch('/api/admin/actions', {
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
    return { success: false, error: error?.message || 'Gagal menghubungi server admin' } as T;
  }
}

export const createUser = (data: any) => callAdminApi('createUser', data);
export const updateUser = (data: any) => callAdminApi('updateUser', data);
export const deleteUser = (userId: string) => callAdminApi('deleteUser', userId);
export const bulkUpdateUsers = (updates: any[]) => callAdminApi('bulkUpdateUsers', updates);
export const getSystemLogs = (filter: SystemLogFilter = {}) =>
  callAdminApi<SystemLogsResponse>('getSystemLogs', filter);
export const getSystemLogsStats = (filter: Omit<SystemLogFilter, 'limit' | 'offset'> = {}) =>
  callAdminApi('getSystemLogsStats', filter);
export const resetUserPassword = (userId: string) => callAdminApi('resetUserPassword', userId);
export const toggleJuzOptionActive = (code: string, isActive: boolean) =>
  callAdminApi('toggleJuzOptionActive', code, isActive);
export const createJuzOption = (data: any) => callAdminApi('createJuzOption', data);
export const updateJuzOption = (id: string, data: any) => callAdminApi('updateJuzOption', id, data);
export const getJuzOptionsAdmin = () => callAdminApi('getJuzOptionsAdmin');
export const getRegistrationQuestionsAdmin = () => callAdminApi('getRegistrationQuestionsAdmin');
export const updateRegistrationQuestion = (id: string, data: any) =>
  callAdminApi('updateRegistrationQuestion', id, data);
export const getReregistrationQuestionsAdmin = () => callAdminApi('getReregistrationQuestionsAdmin');
export const updateReregistrationQuestion = (id: string, data: any) =>
  callAdminApi('updateReregistrationQuestion', id, data);
export const getMuallimahRegistrationQuestionsAdmin = () =>
  callAdminApi('getMuallimahRegistrationQuestionsAdmin');
export const updateMuallimahRegistrationQuestion = (id: string, data: any) =>
  callAdminApi('updateMuallimahRegistrationQuestion', id, data);
export const getPraTikrarRegistrationQuestionsAdmin = () =>
  callAdminApi('getPraTikrarRegistrationQuestionsAdmin');
export const updatePraTikrarRegistrationQuestion = (id: string, data: any) =>
  callAdminApi('updatePraTikrarRegistrationQuestion', id, data);
export const getMusyrifahRegistrationQuestionsAdmin = () =>
  callAdminApi('getMusyrifahRegistrationQuestionsAdmin');
export const updateMusyrifahRegistrationQuestion = (id: string, data: any) =>
  callAdminApi('updateMusyrifahRegistrationQuestion', id, data);
