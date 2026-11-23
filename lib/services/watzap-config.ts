import crypto from 'crypto';
import { queryOne } from '@/lib/db';

export const WATZAP_ACTIVE_NUMBER_SETTINGS_KEY = 'watzap_active_number_config';
export const PREFERRED_DEFAULT_WA_SUFFIX = '4240';

export interface WatZapActiveNumberConfig {
  preferred_number_key: string;
  preferred_wa_number?: string;
  allow_auto_fallback: boolean;
  updated_by?: string | null;
  updated_at?: string | null;
}

interface CachedConfigEntry {
  config: WatZapActiveNumberConfig | null;
  expiresAt: number;
}

const CACHE_TTL_MS = 30 * 1000;
let cachedEntry: CachedConfigEntry | null = null;

export function invalidateWatZapConfigCache(): void {
  cachedEntry = null;
}

export function hashWatZapKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex').slice(0, 16);
}

export function maskWatZapKey(key?: string | null): string {
  const clean = (key || '').trim();
  if (!clean) return '';
  if (clean.length <= 6) return '***';
  return `${clean.slice(0, 3)}***${clean.slice(-3)}`;
}

export function formatWatZapDisplayPhone(waNumber?: string | null): string | undefined {
  const clean = (waNumber || '').replace(/[^0-9]/g, '');
  if (!clean) return undefined;
  return `+${clean.replace(/^(\d{2})(\d{3})(\d{4})(\d+)$/, '$1 $2-$3-$4')}`;
}

export async function getWatZapActiveNumberConfig(): Promise<WatZapActiveNumberConfig | null> {
  const now = Date.now();
  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.config;
  }

  try {
    const row = await queryOne<{ value: any; updated_at: string | null }>(
      `SELECT value, updated_at::text
       FROM system_settings
       WHERE key = $1
       LIMIT 1`,
      [WATZAP_ACTIVE_NUMBER_SETTINGS_KEY]
    );

    if (!row || !row.value || !row.value.preferred_number_key) {
      cachedEntry = { config: null, expiresAt: now + CACHE_TTL_MS };
      return null;
    }

    const v = row.value;
    const parsed: WatZapActiveNumberConfig = {
      preferred_number_key: String(v.preferred_number_key).trim(),
      preferred_wa_number: v.preferred_wa_number ? String(v.preferred_wa_number).trim() : undefined,
      // Strict safe default: NEVER auto-fallback to another license (e.g. personal phone) unless explicitly enabled
      allow_auto_fallback: v.allow_auto_fallback === true,
      updated_by: v.updated_by || null,
      updated_at: row.updated_at || v.updated_at || null,
    };

    cachedEntry = { config: parsed, expiresAt: now + CACHE_TTL_MS };
    return parsed;
  } catch (err) {
    console.warn('[WatZapConfig] Failed reading system_settings:', err);
    return null;
  }
}

export async function setWatZapActiveNumberConfig(
  input: Omit<WatZapActiveNumberConfig, 'updated_at'>
): Promise<WatZapActiveNumberConfig> {
  const payload = {
    preferred_number_key: input.preferred_number_key.trim(),
    preferred_wa_number: input.preferred_wa_number?.trim() || undefined,
    allow_auto_fallback: input.allow_auto_fallback === true,
    updated_by: input.updated_by || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await queryOne<{ updated_at: string | null }>(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = NOW()
       RETURNING updated_at::text`,
      [WATZAP_ACTIVE_NUMBER_SETTINGS_KEY, JSON.stringify(payload)]
    );

    const saved: WatZapActiveNumberConfig = {
      ...payload,
      updated_at: res?.updated_at || payload.updated_at,
    };
    cachedEntry = { config: saved, expiresAt: Date.now() + CACHE_TTL_MS };
    return saved;
  } catch (err) {
    console.warn('[WatZapConfig] Failed persisting system_settings:', err);
    cachedEntry = { config: payload, expiresAt: Date.now() + CACHE_TTL_MS };
    return payload;
  }
}
