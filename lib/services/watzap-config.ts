import crypto from 'crypto';
import { queryOne } from '@/lib/db';

export const WATZAP_ACTIVE_NUMBER_SETTINGS_KEY = 'watzap_active_number_config';
export const PREFERRED_DEFAULT_WA_SUFFIX = '4240';
/**
 * Default WhatsApp numbers on the shared WatZap account that belong to another
 * organization (e.g. AQLI: 628567712914) and must remain disconnected from MTI
 * unless an admin explicitly reconnects them from /admin/whatsapp.
 */
export const DEFAULT_EXCLUDED_WA_NUMBERS = ['628567712914'];

export interface WatZapActiveNumberConfig {
  preferred_number_key: string;
  preferred_wa_number?: string;
  allow_auto_fallback: boolean;
  excluded_key_hashes: string[];
  excluded_wa_numbers: string[];
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

export function normalizeWatZapWaDigits(waNumber?: string | null): string {
  let clean = String(waNumber || '').replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('08')) {
    clean = `62${clean.slice(1)}`;
  } else if (clean.startsWith('8') && clean.length >= 9 && clean.length <= 13) {
    clean = `62${clean}`;
  }
  return clean;
}

export function formatWatZapDisplayPhone(waNumber?: string | null): string | undefined {
  const clean = (waNumber || '').replace(/[^0-9]/g, '');
  if (!clean) return undefined;
  return `+${clean.replace(/^(\d{2})(\d{3})(\d{4})(\d+)$/, '$1 $2-$3-$4')}`;
}

export function isLicenseExcludedFromMTI(
  config: Pick<WatZapActiveNumberConfig, 'excluded_key_hashes' | 'excluded_wa_numbers'> | null | undefined,
  rawKey?: string | null,
  waNumber?: string | null
): boolean {
  const excludedHashes = config ? config.excluded_key_hashes : [];
  const excludedNumbers = config ? config.excluded_wa_numbers : DEFAULT_EXCLUDED_WA_NUMBERS;

  const cleanKey = (rawKey || '').trim();
  if (cleanKey && excludedHashes.length > 0) {
    const keyHash = hashWatZapKey(cleanKey);
    if (excludedHashes.includes(keyHash)) {
      return true;
    }
  }

  const cleanWa = normalizeWatZapWaDigits(waNumber);
  if (cleanWa && excludedNumbers.length > 0) {
    for (const ex of excludedNumbers) {
      const cleanEx = normalizeWatZapWaDigits(ex);
      if (!cleanEx) continue;
      if (cleanWa === cleanEx || (cleanEx.length >= 9 && cleanWa.endsWith(cleanEx))) {
        return true;
      }
    }
  }

  return false;
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
    const excludedKeyHashes = Array.isArray(v.excluded_key_hashes)
      ? Array.from(
          new Set<string>(
            v.excluded_key_hashes.map((item: unknown) => String(item || '').trim()).filter(Boolean)
          )
        )
      : [];
    const excludedWaNumbers = Array.isArray(v.excluded_wa_numbers)
      ? Array.from(
          new Set<string>(
            v.excluded_wa_numbers
              .map((item: unknown) => normalizeWatZapWaDigits(String(item || '')))
              .filter(Boolean)
          )
        )
      : [...DEFAULT_EXCLUDED_WA_NUMBERS];

    const parsed: WatZapActiveNumberConfig = {
      preferred_number_key: String(v.preferred_number_key).trim(),
      preferred_wa_number: v.preferred_wa_number ? String(v.preferred_wa_number).trim() : undefined,
      // Strict safe default: NEVER auto-fallback to another license (e.g. personal/AQLI phone) unless explicitly enabled
      allow_auto_fallback: v.allow_auto_fallback === true,
      excluded_key_hashes: excludedKeyHashes,
      excluded_wa_numbers: excludedWaNumbers,
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
  input: Omit<WatZapActiveNumberConfig, 'updated_at' | 'excluded_key_hashes' | 'excluded_wa_numbers'> & {
    excluded_key_hashes?: string[];
    excluded_wa_numbers?: string[];
  }
): Promise<WatZapActiveNumberConfig> {
  const existing =
    input.excluded_key_hashes === undefined || input.excluded_wa_numbers === undefined
      ? await getWatZapActiveNumberConfig()
      : null;

  const excludedKeyHashes = Array.from(
    new Set(
      (input.excluded_key_hashes ?? existing?.excluded_key_hashes ?? [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );

  const excludedWaNumbers = Array.from(
    new Set(
      (input.excluded_wa_numbers ?? existing?.excluded_wa_numbers ?? DEFAULT_EXCLUDED_WA_NUMBERS)
        .map((item) => normalizeWatZapWaDigits(item))
        .filter(Boolean)
    )
  );

  const payload = {
    preferred_number_key: input.preferred_number_key.trim(),
    preferred_wa_number: input.preferred_wa_number?.trim() || undefined,
    allow_auto_fallback: input.allow_auto_fallback === true,
    excluded_key_hashes: excludedKeyHashes,
    excluded_wa_numbers: excludedWaNumbers,
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
