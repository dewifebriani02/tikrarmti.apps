/**
 * WhatsApp Notification Service for Markaz Tikrar Indonesia (MTI)
 *
 * Provider: WatZap Gateway (WhatsApp Unofficial / Direct Local Number)
 */

import {
  formatWatZapDisplayPhone,
  getWatZapActiveNumberConfig,
  hashWatZapKey,
  invalidateWatZapConfigCache,
  isLicenseExcludedFromMTI,
  maskWatZapKey,
  normalizeWatZapWaDigits,
  PREFERRED_DEFAULT_WA_SUFFIX,
  setWatZapActiveNumberConfig,
} from '@/lib/services/watzap-config';
import { logWhatsAppOutbox } from '@/lib/services/whatsapp-outbox';

export interface WhatsAppSendMeta {
  sourceTag?: string;
  recipientName?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppSendResult {
  success: boolean;
  provider: 'watzap' | 'none';
  messageId?: string;
  senderNumber?: string;
  usedFallback?: boolean;
  error?: string;
  rateLimited?: boolean;
  fatalInstanceError?: boolean;
  details?: Record<string, unknown>;
}

export type WatZapActiveSource = 'db_override' | 'default_4240' | 'env';

export interface WatZapStatusInfo {
  configured: boolean;
  apiKeyConfigured: boolean;
  numberKeyConfigured: boolean;
  senderNumber?: string;
  displayPhoneNumber?: string;
  accountName?: string;
  plan?: string;
  isConnected?: boolean;
  expiresOn?: string;
  type?: string;
  fallbackActive?: boolean;
  fallbackSenderNumber?: string;
  activeNumberKeyMasked?: string;
  activeKeyHash?: string;
  activeSource?: WatZapActiveSource;
  allowAutoFallback?: boolean;
  updatedAt?: string | null;
}

export interface WatZapLicenseItem {
  keyHash: string;
  maskedKey: string;
  waNumber: string;
  displayPhoneNumber?: string;
  type: string;
  statusFlag?: string;
  connectionStatus?: string;
  isConnectedReported: boolean;
  isOnlineLive: boolean;
  isActivePrimary: boolean;
  isEnvDefault: boolean;
  isExcludedFromMTI: boolean;
}

export interface WhatsAppGroupInfo {
  groupId: string;
  name: string;
  participantCount: number;
}

export interface WhatsAppStatusResult {
  configured: boolean;
  provider: 'watzap';
  watzap: WatZapStatusInfo;
}

export interface ActiveThalibahRecipient {
  userId: string;
  fullName: string;
  namaKunyah?: string | null;
  whatsapp: string;
  email?: string | null;
  studentIdNumber?: string | null;
  submissionId: string;
  batchId: string;
  confirmedChosenJuz?: string | null;
  submissionStatus: string;
  halaqahId?: string | null;
  halaqahName?: string | null;
  halaqahStatus?: string | null;
}

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; MTI-System/1.0)',
  'Connection': 'close',
};

/**
 * Normalizes Indonesian and international phone numbers into E.164-like digits without plus
 * e.g.:
 *  '08123456789'   -> '628123456789'
 *  '+62 812-3456'  -> '628123456789'
 *  '0813-8884-240'-> '628138884240'
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^0-9]/g, '');

  // Indonesian local leading '0' (e.g. 0812 -> 62812)
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8') && cleaned.length >= 9 && cleaned.length <= 13) {
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

export class WhatsAppService {
  private static instance: WhatsAppService;

  private watzapApiKey = '';
  private watzapNumberKey = '';
  private cachedFallbackKey: { key: string; waNumber?: string; expiresAt: number } | null = null;
  private cachedDefault4240Key: { key: string; waNumber?: string; expiresAt: number } | null = null;
  private licensePhoneCache = new Map<string, string>();

  private constructor() {
    this.watzapApiKey = process.env.WATZAP_API_KEY?.trim() || '';
    this.watzapNumberKey = process.env.WATZAP_NUMBER_KEY?.trim() || '';
  }

  private get apiKey(): string {
    return (process.env.WATZAP_API_KEY || this.watzapApiKey || '').trim();
  }

  private get envNumberKey(): string {
    return (process.env.WATZAP_NUMBER_KEY || this.watzapNumberKey || '').trim();
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  public invalidateNumberCaches(): void {
    this.cachedFallbackKey = null;
    this.cachedDefault4240Key = null;
    invalidateWatZapConfigCache();
  }

  private isWatZapSuccess(data: Record<string, unknown> | null | undefined): boolean {
    if (!data) return false;
    return (
      data.status === '200' ||
      data.status === 200 ||
      data.status === true ||
      data.ack === 'successfully'
    );
  }

  private isInstanceOrLicenseError(data: Record<string, unknown> | null | undefined): boolean {
    if (!data) return false;
    const statusStr = String(data.status || '');
    const msg = String(data.message || '').toLowerCase();
    return (
      statusStr === '1005' ||
      msg.includes('instance not started') ||
      msg.includes('license not found') ||
      msg.includes('not started') ||
      msg.includes('disconnected')
    );
  }

  private isRateLimitError(data: Record<string, unknown> | null | undefined): boolean {
    if (!data) return false;
    const statusStr = String(data.status || '');
    const msg = String(data.message || '').toLowerCase();
    return (
      statusStr === '1004' ||
      msg.includes('limit exceeded') ||
      msg.includes('too many request') ||
      msg.includes('rate limit') ||
      msg.includes('try again')
    );
  }

  private async fetchCheckingKey(apiKey: string, numKey?: string): Promise<any | null> {
    try {
      const payload: Record<string, string> = { api_key: apiKey };
      if (numKey) payload.number_key = numKey;
      const resp = await fetch('https://api.watzap.id/v1/checking_key', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(7000),
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      const licenses = Array.isArray(json?.data?.licenses_key) ? json.data.licenses_key : [];
      for (const lic of licenses) {
        const k = String(lic?.key || '').trim();
        const phone = String(lic?.wa_number || '').replace(/[^0-9]/g, '');
        if (k && phone) {
          this.licensePhoneCache.set(k, phone);
        }
      }
      return json;
    } catch {
      return null;
    }
  }

  private async validateLicenseOnline(apiKey: string, numKey: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.watzap.id/v1/validate_number', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          api_key: apiKey,
          number_key: numKey,
          phone_no: '628138884240',
        }),
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      return this.isWatZapSuccess(json);
    } catch {
      return false;
    }
  }

  /**
   * Resolves the active WatZap number_key with priority:
   * 1. DB override in system_settings (`watzap_active_number_config`)
   * 2. License ending in `4240` from WatZap checking_key (auto-persisted as default)
   * 3. Environment variable `WATZAP_NUMBER_KEY`
   */
  public async resolveActiveNumberContext(): Promise<{
    numberKey: string;
    waNumber?: string;
    allowAutoFallback: boolean;
    source: WatZapActiveSource;
    updatedAt?: string | null;
    isExcluded?: boolean;
  }> {
    const dbConfig = await getWatZapActiveNumberConfig();
    if (dbConfig?.preferred_number_key) {
      const waNum =
        (dbConfig.preferred_wa_number || '').replace(/[^0-9]/g, '') ||
        this.licensePhoneCache.get(dbConfig.preferred_number_key) ||
        undefined;
      return {
        numberKey: dbConfig.preferred_number_key,
        waNumber: waNum,
        allowAutoFallback: dbConfig.allow_auto_fallback === true,
        source: 'db_override',
        updatedAt: dbConfig.updated_at || null,
        isExcluded: isLicenseExcludedFromMTI(dbConfig, dbConfig.preferred_number_key, waNum),
      };
    }

    const apiKey = this.apiKey;
    const now = Date.now();
    if (apiKey) {
      if (this.cachedDefault4240Key && this.cachedDefault4240Key.expiresAt > now) {
        return {
          numberKey: this.cachedDefault4240Key.key,
          waNumber: this.cachedDefault4240Key.waNumber,
          allowAutoFallback: false,
          source: 'default_4240',
        };
      }

      const checking = await this.fetchCheckingKey(apiKey);
      const licenses = Array.isArray(checking?.data?.licenses_key) ? checking.data.licenses_key : [];
      const lic4240 = licenses.find((lic: { key?: string; wa_number?: string }) =>
        lic?.key &&
        String(lic.wa_number || '').replace(/[^0-9]/g, '').endsWith(PREFERRED_DEFAULT_WA_SUFFIX) &&
        !isLicenseExcludedFromMTI(dbConfig, lic.key, lic.wa_number)
      );

      if (lic4240?.key) {
        const cleanWa = String(lic4240.wa_number || '').replace(/[^0-9]/g, '') || undefined;
        this.cachedDefault4240Key = {
          key: lic4240.key,
          waNumber: cleanWa,
          expiresAt: now + 5 * 60 * 1000,
        };
        // Best-effort persist so future calls & admin UI immediately reflect ...4240
        setWatZapActiveNumberConfig({
          preferred_number_key: lic4240.key,
          preferred_wa_number: cleanWa,
          allow_auto_fallback: false,
          updated_by: 'system_default_4240',
        }).catch(() => {});

        return {
          numberKey: lic4240.key,
          waNumber: cleanWa,
          allowAutoFallback: false,
          source: 'default_4240',
        };
      }
    }

    const envKey = this.envNumberKey;
    const envWa = this.licensePhoneCache.get(envKey) || undefined;
    return {
      numberKey: envKey,
      waNumber: envWa,
      allowAutoFallback: false,
      source: 'env',
      isExcluded: isLicenseExcludedFromMTI(dbConfig, envKey, envWa),
    };
  }

  /**
   * Checks whether an incoming or outgoing WatZap license number_key / WA number
   * has been disconnected/excluded from MTI (e.g. a shared WatZap license used by AQLI).
   */
  public async isNumberKeyExcludedFromMTI(
    numberKey?: string | null,
    waNumber?: string | null
  ): Promise<boolean> {
    const cleanKey = (numberKey || '').trim();
    const dbConfig = await getWatZapActiveNumberConfig();

    let resolvedWa = waNumber || (cleanKey ? this.licensePhoneCache.get(cleanKey) : undefined);
    if (
      !resolvedWa &&
      cleanKey &&
      this.apiKey &&
      (dbConfig === null || dbConfig.excluded_wa_numbers.length > 0)
    ) {
      await this.fetchCheckingKey(this.apiKey);
      resolvedWa = this.licensePhoneCache.get(cleanKey);
    }

    return isLicenseExcludedFromMTI(dbConfig, cleanKey, resolvedWa);
  }

  public async getActiveNumberKey(): Promise<string> {
    const ctx = await this.resolveActiveNumberContext();
    return ctx.numberKey;
  }

  /**
   * When the configured primary number_key is disconnected/offline or returns
   * "License Not Found" / "WhatsApp Instance Not Started", check WatZap checking_key
   * for another connected unofficial license key on the same account.
   */
  private async resolveWorkingFallbackNumberKey(
    failedNumKey: string
  ): Promise<{ key: string; waNumber?: string } | null> {
    const key = this.apiKey;
    if (!key) return null;

    const dbConfig = await getWatZapActiveNumberConfig();
    const now = Date.now();
    if (
      this.cachedFallbackKey &&
      this.cachedFallbackKey.key !== failedNumKey &&
      this.cachedFallbackKey.expiresAt > now &&
      !isLicenseExcludedFromMTI(dbConfig, this.cachedFallbackKey.key, this.cachedFallbackKey.waNumber)
    ) {
      return { key: this.cachedFallbackKey.key, waNumber: this.cachedFallbackKey.waNumber };
    }

    try {
      const json = await this.fetchCheckingKey(key);
      const licenses = Array.isArray(json?.data?.licenses_key) ? json.data.licenses_key : [];

      const candidates = licenses.filter(
        (lic: { key?: string; wa_number?: string; type?: string; is_connected?: boolean; connection_status?: string }) =>
          lic?.key &&
          lic.key !== failedNumKey &&
          !isLicenseExcludedFromMTI(dbConfig, lic.key, lic.wa_number) &&
          (lic.type === 'unofficial' || !lic.type) &&
          (lic.is_connected || lic.connection_status === 'connected')
      );

      for (const lic of candidates) {
        const online = await this.validateLicenseOnline(key, lic.key);
        if (online) {
          const cleanWa = String(lic.wa_number || '').replace(/[^0-9]/g, '') || undefined;
          this.cachedFallbackKey = {
            key: lic.key,
            waNumber: cleanWa,
            expiresAt: now + 5 * 60 * 1000,
          };
          console.warn(
            `[WhatsAppService] Primary key ${maskWatZapKey(failedNumKey)} offline; using connected fallback license ${maskWatZapKey(lic.key)} (${cleanWa || 'unknown'})`
          );
          return { key: lic.key, waNumber: cleanWa };
        }
      }
    } catch (err) {
      console.warn('[WhatsAppService] Failed resolving fallback license:', err);
    }

    return null;
  }

  /**
   * List all WatZap licenses on this account along with live connection checks.
   * Raw license keys are masked and hashed so secret keys are never leaked to clients.
   */
  public async getLicenses(): Promise<{
    configured: boolean;
    plan?: string;
    expiresOn?: string;
    activeKeyHash?: string;
    activeSource?: WatZapActiveSource;
    allowAutoFallback: boolean;
    licenses: WatZapLicenseItem[];
  }> {
    const apiKey = this.apiKey;
    const ctx = await this.resolveActiveNumberContext();
    if (!apiKey) {
      return {
        configured: false,
        allowAutoFallback: ctx.allowAutoFallback,
        licenses: [],
      };
    }

    const dbConfig = await getWatZapActiveNumberConfig();
    const checking = await this.fetchCheckingKey(apiKey);
    const rawLicenses = Array.isArray(checking?.data?.licenses_key)
      ? checking.data.licenses_key
      : [];

    const validated = await Promise.all(
      rawLicenses.map(async (lic: any): Promise<WatZapLicenseItem> => {
        const rawKey = String(lic?.key || '').trim();
        const waNumber = String(lic?.wa_number || '').replace(/[^0-9]/g, '');
        const isOnlineLive = rawKey ? await this.validateLicenseOnline(apiKey, rawKey) : false;

        return {
          keyHash: rawKey ? hashWatZapKey(rawKey) : '',
          maskedKey: maskWatZapKey(rawKey),
          waNumber,
          displayPhoneNumber: formatWatZapDisplayPhone(waNumber),
          type: String(lic?.type || 'unofficial'),
          statusFlag: lic?.status ? String(lic.status) : undefined,
          connectionStatus: lic?.connection_status ? String(lic.connection_status) : undefined,
          isConnectedReported: Boolean(lic?.is_connected || lic?.connection_status === 'connected'),
          isOnlineLive,
          isActivePrimary: Boolean(rawKey && rawKey === ctx.numberKey),
          isEnvDefault: Boolean(rawKey && rawKey === this.envNumberKey),
          isExcludedFromMTI: isLicenseExcludedFromMTI(dbConfig, rawKey, waNumber),
        };
      })
    );

    validated.sort((a, b) => {
      if (a.isActivePrimary !== b.isActivePrimary) return a.isActivePrimary ? -1 : 1;
      if (a.isExcludedFromMTI !== b.isExcludedFromMTI) return a.isExcludedFromMTI ? 1 : -1;
      return 0;
    });

    return {
      configured: true,
      plan: checking?.data?.plan,
      expiresOn: checking?.data?.expires_on,
      activeKeyHash: ctx.numberKey ? hashWatZapKey(ctx.numberKey) : undefined,
      activeSource: ctx.source,
      allowAutoFallback: ctx.allowAutoFallback,
      licenses: validated,
    };
  }

  /**
   * Switch the active WatZap license stored in system_settings (and/or update fallback preference).
   */
  public async switchActiveLicense(params: {
    keyHash?: string;
    waNumber?: string;
    allowAutoFallback?: boolean;
    updatedBy?: string | null;
  }): Promise<{
    success: boolean;
    error?: string;
    status?: WhatsAppStatusResult;
  }> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      return { success: false, error: 'WATZAP_API_KEY belum dikonfigurasi di server' };
    }

    const checking = await this.fetchCheckingKey(apiKey);
    const rawLicenses: any[] = Array.isArray(checking?.data?.licenses_key)
      ? checking.data.licenses_key
      : [];

    const currentCtx = await this.resolveActiveNumberContext();
    let targetLic: any = null;

    if (params.keyHash) {
      targetLic = rawLicenses.find(
        (lic) => lic?.key && hashWatZapKey(String(lic.key)) === params.keyHash
      );
    } else if (params.waNumber) {
      const targetDigits = normalizePhoneNumber(params.waNumber);
      targetLic = rawLicenses.find((lic) => {
        const waDigits = String(lic?.wa_number || '').replace(/[^0-9]/g, '');
        return waDigits === targetDigits || waDigits.endsWith(targetDigits);
      });
    } else {
      targetLic = rawLicenses.find(
        (lic) => lic?.key && String(lic.key).trim() === currentCtx.numberKey
      );
    }

    if (!targetLic?.key) {
      return {
        success: false,
        error: 'Lisensi nomor WhatsApp tidak ditemukan di akun WatZap',
      };
    }

    const targetKey = String(targetLic.key).trim();
    const targetWaNumber = String(targetLic.wa_number || '').replace(/[^0-9]/g, '');
    const dbConfig = await getWatZapActiveNumberConfig();

    if (
      (params.keyHash || params.waNumber) &&
      isLicenseExcludedFromMTI(dbConfig, targetKey, targetWaNumber)
    ) {
      return {
        success: false,
        error:
          'Nomor ini sedang diputuskan dari MTI. Hubungkan kembali ke MTI terlebih dahulu jika ingin memakainya.',
      };
    }

    await setWatZapActiveNumberConfig({
      preferred_number_key: targetKey,
      preferred_wa_number: targetWaNumber || undefined,
      allow_auto_fallback:
        params.allowAutoFallback !== undefined
          ? params.allowAutoFallback
          : currentCtx.allowAutoFallback,
      updated_by: params.updatedBy || null,
    });

    this.invalidateNumberCaches();
    const status = await this.getStatus();
    return { success: true, status };
  }

  /**
   * Disconnect or reconnect a WatZap license from MTI only (without logging out
   * on WatZap, so shared licenses used by other apps like AQLI remain active there).
   */
  public async setLicenseExclusion(params: {
    keyHash?: string;
    waNumber?: string;
    excluded: boolean;
    updatedBy?: string | null;
  }): Promise<{
    success: boolean;
    error?: string;
    status?: WhatsAppStatusResult;
  }> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      return { success: false, error: 'WATZAP_API_KEY belum dikonfigurasi di server' };
    }

    const checking = await this.fetchCheckingKey(apiKey);
    const rawLicenses: any[] = Array.isArray(checking?.data?.licenses_key)
      ? checking.data.licenses_key
      : [];

    let targetLic: any = null;
    if (params.keyHash) {
      targetLic = rawLicenses.find(
        (lic) => lic?.key && hashWatZapKey(String(lic.key)) === params.keyHash
      );
    } else if (params.waNumber) {
      const targetDigits = normalizePhoneNumber(params.waNumber);
      targetLic = rawLicenses.find((lic) => {
        const waDigits = String(lic?.wa_number || '').replace(/[^0-9]/g, '');
        return waDigits === targetDigits || waDigits.endsWith(targetDigits);
      });
    }

    if (!targetLic?.key) {
      return {
        success: false,
        error: 'Lisensi nomor WhatsApp tidak ditemukan di akun WatZap',
      };
    }

    const targetKey = String(targetLic.key).trim();
    const targetHash = hashWatZapKey(targetKey);
    const targetWa = normalizeWatZapWaDigits(String(targetLic.wa_number || ''));
    const currentCtx = await this.resolveActiveNumberContext();

    if (params.excluded && targetKey === currentCtx.numberKey) {
      return {
        success: false,
        error:
          'Tidak dapat memutuskan nomor yang sedang aktif dipakai MTI. Pindahkan nomor aktif terlebih dahulu.',
      };
    }

    const dbConfig = await getWatZapActiveNumberConfig();
    const hashSet = new Set<string>(dbConfig?.excluded_key_hashes || []);
    const waSet = new Set<string>(
      dbConfig ? dbConfig.excluded_wa_numbers : ['628567712914']
    );

    if (params.excluded) {
      hashSet.add(targetHash);
      if (targetWa) waSet.add(targetWa);
    } else {
      hashSet.delete(targetHash);
      if (targetWa) {
        for (const existingWa of Array.from(waSet)) {
          const cleanExisting = normalizeWatZapWaDigits(existingWa);
          if (
            cleanExisting === targetWa ||
            (cleanExisting.length >= 9 && targetWa.endsWith(cleanExisting))
          ) {
            waSet.delete(existingWa);
          }
        }
      }
    }

    await setWatZapActiveNumberConfig({
      preferred_number_key: currentCtx.numberKey,
      preferred_wa_number: currentCtx.waNumber || undefined,
      allow_auto_fallback: currentCtx.allowAutoFallback,
      excluded_key_hashes: Array.from(hashSet),
      excluded_wa_numbers: Array.from(waSet),
      updated_by: params.updatedBy || null,
    });

    this.invalidateNumberCaches();
    const status = await this.getStatus();
    return { success: true, status };
  }

  /**
   * Check connection and integration status via WatZap checking_key + live validate_number
   */
  public async getStatus(): Promise<WhatsAppStatusResult> {
    const key = this.apiKey;
    const ctx = await this.resolveActiveNumberContext();
    const numKey = ctx.numberKey;
    const isConfigured = Boolean(key && numKey);

    const result: WhatsAppStatusResult = {
      configured: isConfigured,
      provider: 'watzap',
      watzap: {
        configured: isConfigured,
        apiKeyConfigured: Boolean(key),
        numberKeyConfigured: Boolean(numKey),
        accountName: process.env.WATZAP_SENDER_NAME || 'Markaz Tikrar Indonesia',
        activeNumberKeyMasked: maskWatZapKey(numKey),
        activeKeyHash: numKey ? hashWatZapKey(numKey) : undefined,
        activeSource: ctx.source,
        allowAutoFallback: ctx.allowAutoFallback,
        updatedAt: ctx.updatedAt || null,
      },
    };

    if (!isConfigured) {
      return result;
    }

    try {
      const [json, primaryLiveOnline] = await Promise.all([
        this.fetchCheckingKey(key, numKey),
        this.validateLicenseOnline(key, numKey),
      ]);

      if (json?.data) {
        result.watzap.accountName = process.env.WATZAP_SENDER_NAME || 'Markaz Tikrar Indonesia';
        result.watzap.plan = json.data.plan;
        result.watzap.expiresOn = json.data.expires_on;

        const licenses = json.data.licenses_key || [];
        const matchedLicense = licenses.find((lic: { key?: string }) => lic.key === numKey);

        if (matchedLicense) {
          result.watzap.senderNumber = matchedLicense.wa_number;
          result.watzap.displayPhoneNumber = formatWatZapDisplayPhone(matchedLicense.wa_number);
          result.watzap.isConnected = primaryLiveOnline;
          result.watzap.type = matchedLicense.type || 'unofficial';
        }
      }

      if (!primaryLiveOnline && ctx.allowAutoFallback) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          result.watzap.fallbackActive = true;
          result.watzap.fallbackSenderNumber = fallback.waNumber;
          result.watzap.isConnected = true;
        }
      }
    } catch (err) {
      console.warn('[WhatsAppService] Failed to check WatZap key status:', err);
    }

    return result;
  }

  /**
   * Send WhatsApp message via WatZap API (with optional automatic connected-license fallback)
   */
  public async sendTextMessage(
    to: string,
    message: string,
    meta?: WhatsAppSendMeta
  ): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(to);
    if (!formattedPhone) {
      return {
        success: false,
        provider: 'none',
        error: 'Nomor WhatsApp tujuan tidak valid',
      };
    }

    const key = this.apiKey;
    const ctx = await this.resolveActiveNumberContext();
    const numKey = ctx.numberKey;

    if (!key || !numKey || ctx.isExcluded) {
      const error = ctx.isExcluded
        ? 'Nomor pengirim sedang diputuskan dari MTI'
        : 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum dikonfigurasi di server';
      await logWhatsAppOutbox({
        recipientPhone: formattedPhone,
        recipientName: meta?.recipientName,
        recipientType: 'individual',
        messageType: 'text',
        messageBody: message,
        status: 'failed',
        errorMessage: error,
        senderSource: ctx.source,
        sourceTag: meta?.sourceTag,
        provider: 'none',
        metadata: meta?.metadata,
      });
      return {
        success: false,
        provider: 'none',
        fatalInstanceError: true,
        error,
      };
    }

    const postSend = async (useNumberKey: string) => {
      const res = await fetch('https://api.watzap.id/v1/send_message', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          api_key: key,
          number_key: useNumberKey,
          phone_no: formattedPhone,
          message: message,
        }),
      });
      return res.json();
    };

    let usedNumberKey = numKey;
    let usedSenderNumber = ctx.waNumber || this.licensePhoneCache.get(numKey);
    let usedFallback = false;

    try {
      let data = await postSend(numKey);

      if (!this.isWatZapSuccess(data) && this.isInstanceOrLicenseError(data) && ctx.allowAutoFallback) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          usedNumberKey = fallback.key;
          usedSenderNumber = fallback.waNumber || this.licensePhoneCache.get(fallback.key);
          usedFallback = true;
          data = await postSend(fallback.key);
        }
      }

      if (this.isWatZapSuccess(data)) {
        const messageId = data.message_id || data.id || `watzap_${Date.now()}`;
        await logWhatsAppOutbox({
          recipientPhone: formattedPhone,
          recipientName: meta?.recipientName,
          recipientType: 'individual',
          messageType: 'text',
          messageBody: message,
          status: 'sent',
          senderNumber: usedSenderNumber,
          senderKeyMasked: maskWatZapKey(usedNumberKey),
          senderSource: usedFallback ? 'fallback' : ctx.source,
          usedFallback,
          sourceTag: meta?.sourceTag,
          watzapMessageId: String(messageId),
          provider: 'watzap',
          metadata: meta?.metadata,
        });
        return {
          success: true,
          provider: 'watzap',
          messageId,
          senderNumber: usedSenderNumber,
          usedFallback,
          details: data,
        };
      }

      const errorMessage = data.message || 'WatZap gagal mengirim pesan';
      console.warn('[WhatsAppService] WatZap send error:', errorMessage, data);

      await logWhatsAppOutbox({
        recipientPhone: formattedPhone,
        recipientName: meta?.recipientName,
        recipientType: 'individual',
        messageType: 'text',
        messageBody: message,
        status: 'failed',
        errorMessage,
        senderNumber: usedSenderNumber,
        senderKeyMasked: maskWatZapKey(usedNumberKey),
        senderSource: usedFallback ? 'fallback' : ctx.source,
        usedFallback,
        sourceTag: meta?.sourceTag,
        provider: 'watzap',
        metadata: { ...(meta?.metadata || {}), watzapStatus: data?.status },
      });

      return {
        success: false,
        provider: 'watzap',
        senderNumber: usedSenderNumber,
        usedFallback,
        error: errorMessage,
        rateLimited: this.isRateLimitError(data),
        fatalInstanceError: this.isInstanceOrLicenseError(data),
        details: data,
      };
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error('[WhatsAppService] WatZap network error:', err);
      await logWhatsAppOutbox({
        recipientPhone: formattedPhone,
        recipientName: meta?.recipientName,
        recipientType: 'individual',
        messageType: 'text',
        messageBody: message,
        status: 'failed',
        errorMessage: errMsg,
        senderNumber: usedSenderNumber,
        senderKeyMasked: maskWatZapKey(usedNumberKey),
        senderSource: usedFallback ? 'fallback' : ctx.source,
        usedFallback,
        sourceTag: meta?.sourceTag,
        provider: 'watzap',
        metadata: meta?.metadata,
      });
      return {
        success: false,
        provider: 'watzap',
        senderNumber: usedSenderNumber,
        usedFallback,
        error: errMsg,
      };
    }
  }

  /**
   * Send WhatsApp Image via WatZap API (with optional automatic connected-license fallback)
   */
  public async sendImageUrl(
    to: string,
    imageUrl: string,
    caption?: string,
    meta?: WhatsAppSendMeta
  ): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(to);
    if (!formattedPhone) {
      return {
        success: false,
        provider: 'none',
        error: 'Nomor WhatsApp tujuan tidak valid',
      };
    }

    const key = this.apiKey;
    const ctx = await this.resolveActiveNumberContext();
    const numKey = ctx.numberKey;

    if (!key || !numKey || ctx.isExcluded) {
      const error = ctx.isExcluded
        ? 'Nomor pengirim sedang diputuskan dari MTI'
        : 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum dikonfigurasi di server';
      await logWhatsAppOutbox({
        recipientPhone: formattedPhone,
        recipientName: meta?.recipientName,
        recipientType: 'individual',
        messageType: 'image',
        messageBody: caption?.trim() || '[Gambar]',
        mediaUrl: imageUrl,
        status: 'failed',
        errorMessage: error,
        senderSource: ctx.source,
        sourceTag: meta?.sourceTag,
        provider: 'none',
        metadata: meta?.metadata,
      });
      return {
        success: false,
        provider: 'none',
        fatalInstanceError: true,
        error,
      };
    }

    const postImage = async (useNumberKey: string) => {
      const payload: Record<string, string> = {
        api_key: key,
        number_key: useNumberKey,
        phone_no: formattedPhone,
        url: imageUrl,
      };
      if (caption && caption.trim()) {
        payload.message = caption.trim();
      }

      const res = await fetch('https://api.watzap.id/v1/send_image_url', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify(payload),
      });
      return res.json();
    };

    let usedNumberKey = numKey;
    let usedSenderNumber = ctx.waNumber || this.licensePhoneCache.get(numKey);
    let usedFallback = false;

    try {
      let data = await postImage(numKey);

      if (!this.isWatZapSuccess(data) && this.isInstanceOrLicenseError(data) && ctx.allowAutoFallback) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          usedNumberKey = fallback.key;
          usedSenderNumber = fallback.waNumber || this.licensePhoneCache.get(fallback.key);
          usedFallback = true;
          data = await postImage(fallback.key);
        }
      }

      if (this.isWatZapSuccess(data)) {
        const messageId = data.message_id || data.id || `watzap_${Date.now()}`;
        await logWhatsAppOutbox({
          recipientPhone: formattedPhone,
          recipientName: meta?.recipientName,
          recipientType: 'individual',
          messageType: 'image',
          messageBody: caption?.trim() || '[Gambar]',
          mediaUrl: imageUrl,
          status: 'sent',
          senderNumber: usedSenderNumber,
          senderKeyMasked: maskWatZapKey(usedNumberKey),
          senderSource: usedFallback ? 'fallback' : ctx.source,
          usedFallback,
          sourceTag: meta?.sourceTag,
          watzapMessageId: String(messageId),
          provider: 'watzap',
          metadata: meta?.metadata,
        });
        return {
          success: true,
          provider: 'watzap',
          messageId,
          senderNumber: usedSenderNumber,
          usedFallback,
          details: data,
        };
      }

      const errorMessage = data.message || 'WatZap gagal mengirim gambar';
      console.warn('[WhatsAppService] WatZap send image error:', errorMessage, data);

      await logWhatsAppOutbox({
        recipientPhone: formattedPhone,
        recipientName: meta?.recipientName,
        recipientType: 'individual',
        messageType: 'image',
        messageBody: caption?.trim() || '[Gambar]',
        mediaUrl: imageUrl,
        status: 'failed',
        errorMessage,
        senderNumber: usedSenderNumber,
        senderKeyMasked: maskWatZapKey(usedNumberKey),
        senderSource: usedFallback ? 'fallback' : ctx.source,
        usedFallback,
        sourceTag: meta?.sourceTag,
        provider: 'watzap',
        metadata: { ...(meta?.metadata || {}), watzapStatus: data?.status },
      });

      return {
        success: false,
        provider: 'watzap',
        senderNumber: usedSenderNumber,
        usedFallback,
        error: errorMessage,
        rateLimited: this.isRateLimitError(data),
        fatalInstanceError: this.isInstanceOrLicenseError(data),
        details: data,
      };
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error('[WhatsAppService] WatZap image network error:', err);
      await logWhatsAppOutbox({
        recipientPhone: formattedPhone,
        recipientName: meta?.recipientName,
        recipientType: 'individual',
        messageType: 'image',
        messageBody: caption?.trim() || '[Gambar]',
        mediaUrl: imageUrl,
        status: 'failed',
        errorMessage: errMsg,
        senderNumber: usedSenderNumber,
        senderKeyMasked: maskWatZapKey(usedNumberKey),
        senderSource: usedFallback ? 'fallback' : ctx.source,
        usedFallback,
        sourceTag: meta?.sourceTag,
        provider: 'watzap',
        metadata: meta?.metadata,
      });
      return {
        success: false,
        provider: 'watzap',
        senderNumber: usedSenderNumber,
        usedFallback,
        error: errMsg,
      };
    }
  }

  /**
   * Send WhatsApp File / Document via WatZap API (with optional automatic connected-license fallback)
   */
  public async sendFileUrl(
    to: string,
    fileUrl: string,
    meta?: WhatsAppSendMeta
  ): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(to);
    if (!formattedPhone) {
      return {
        success: false,
        provider: 'none',
        error: 'Nomor WhatsApp tujuan tidak valid',
      };
    }

    const key = this.apiKey;
    const ctx = await this.resolveActiveNumberContext();
    const numKey = ctx.numberKey;

    if (!key || !numKey || ctx.isExcluded) {
      const error = ctx.isExcluded
        ? 'Nomor pengirim sedang diputuskan dari MTI'
        : 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum dikonfigurasi di server';
      await logWhatsAppOutbox({
        recipientPhone: formattedPhone,
        recipientName: meta?.recipientName,
        recipientType: 'individual',
        messageType: 'file',
        messageBody: `[Dokumen] ${fileUrl}`,
        mediaUrl: fileUrl,
        status: 'failed',
        errorMessage: error,
        senderSource: ctx.source,
        sourceTag: meta?.sourceTag,
        provider: 'none',
        metadata: meta?.metadata,
      });
      return {
        success: false,
        provider: 'none',
        fatalInstanceError: true,
        error,
      };
    }

    const postFile = async (useNumberKey: string) => {
      const res = await fetch('https://api.watzap.id/v1/send_file_url', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          api_key: key,
          number_key: useNumberKey,
          phone_no: formattedPhone,
          url: fileUrl,
        }),
      });
      return res.json();
    };

    let usedNumberKey = numKey;
    let usedSenderNumber = ctx.waNumber || this.licensePhoneCache.get(numKey);
    let usedFallback = false;

    try {
      let data = await postFile(numKey);

      if (!this.isWatZapSuccess(data) && this.isInstanceOrLicenseError(data) && ctx.allowAutoFallback) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          usedNumberKey = fallback.key;
          usedSenderNumber = fallback.waNumber || this.licensePhoneCache.get(fallback.key);
          usedFallback = true;
          data = await postFile(fallback.key);
        }
      }

      if (this.isWatZapSuccess(data)) {
        const messageId = data.message_id || data.id || `watzap_${Date.now()}`;
        await logWhatsAppOutbox({
          recipientPhone: formattedPhone,
          recipientName: meta?.recipientName,
          recipientType: 'individual',
          messageType: 'file',
          messageBody: `[Dokumen] ${fileUrl}`,
          mediaUrl: fileUrl,
          status: 'sent',
          senderNumber: usedSenderNumber,
          senderKeyMasked: maskWatZapKey(usedNumberKey),
          senderSource: usedFallback ? 'fallback' : ctx.source,
          usedFallback,
          sourceTag: meta?.sourceTag,
          watzapMessageId: String(messageId),
          provider: 'watzap',
          metadata: meta?.metadata,
        });
        return {
          success: true,
          provider: 'watzap',
          messageId,
          senderNumber: usedSenderNumber,
          usedFallback,
          details: data,
        };
      }

      const errorMessage = data.message || 'WatZap gagal mengirim file';
      await logWhatsAppOutbox({
        recipientPhone: formattedPhone,
        recipientName: meta?.recipientName,
        recipientType: 'individual',
        messageType: 'file',
        messageBody: `[Dokumen] ${fileUrl}`,
        mediaUrl: fileUrl,
        status: 'failed',
        errorMessage,
        senderNumber: usedSenderNumber,
        senderKeyMasked: maskWatZapKey(usedNumberKey),
        senderSource: usedFallback ? 'fallback' : ctx.source,
        usedFallback,
        sourceTag: meta?.sourceTag,
        provider: 'watzap',
        metadata: { ...(meta?.metadata || {}), watzapStatus: data?.status },
      });
      return {
        success: false,
        provider: 'watzap',
        senderNumber: usedSenderNumber,
        usedFallback,
        error: errorMessage,
        rateLimited: this.isRateLimitError(data),
        fatalInstanceError: this.isInstanceOrLicenseError(data),
        details: data,
      };
    } catch (err) {
      const errMsg = (err as Error).message;
      await logWhatsAppOutbox({
        recipientPhone: formattedPhone,
        recipientName: meta?.recipientName,
        recipientType: 'individual',
        messageType: 'file',
        messageBody: `[Dokumen] ${fileUrl}`,
        mediaUrl: fileUrl,
        status: 'failed',
        errorMessage: errMsg,
        senderNumber: usedSenderNumber,
        senderKeyMasked: maskWatZapKey(usedNumberKey),
        senderSource: usedFallback ? 'fallback' : ctx.source,
        usedFallback,
        sourceTag: meta?.sourceTag,
        provider: 'watzap',
        metadata: meta?.metadata,
      });
      return {
        success: false,
        provider: 'watzap',
        senderNumber: usedSenderNumber,
        usedFallback,
        error: errMsg,
      };
    }
  }

  public async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = 'id',
    components?: Record<string, unknown>[],
    meta?: WhatsAppSendMeta
  ): Promise<WhatsAppSendResult> {
    let composedMessage = `Pemberitahuan dari Markaz Tikrar Indonesia (MTI) [${templateName}]`;

    if (components && Array.isArray(components)) {
      const bodyComponent = components.find((c) => c.type === 'body' || c.type === 'BODY');
      if (bodyComponent && Array.isArray(bodyComponent.parameters)) {
        const textParts = bodyComponent.parameters
          .map((p: Record<string, unknown>) => p.text || '')
          .filter(Boolean);
        if (textParts.length > 0) {
          composedMessage = textParts.join('\n\n');
        }
      }
    }

    return this.sendTextMessage(to, composedMessage, {
      ...meta,
      metadata: { ...(meta?.metadata || {}), templateName, languageCode },
    });
  }

  /**
   * Send WhatsApp message to a group via WatZap API (with optional automatic connected-license fallback)
   */
  public async sendGroupMessage(
    groupId: string,
    message: string,
    meta?: WhatsAppSendMeta
  ): Promise<WhatsAppSendResult> {
    const cleanGroupId = groupId.trim();
    if (!cleanGroupId) {
      return {
        success: false,
        provider: 'none',
        error: 'ID Grup WhatsApp tujuan tidak valid',
      };
    }

    const key = this.apiKey;
    const ctx = await this.resolveActiveNumberContext();
    const numKey = ctx.numberKey;

    if (!key || !numKey || ctx.isExcluded) {
      const error = ctx.isExcluded
        ? 'Nomor pengirim sedang diputuskan dari MTI'
        : 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum dikonfigurasi di server';
      await logWhatsAppOutbox({
        recipientPhone: cleanGroupId,
        recipientName: meta?.recipientName || 'Grup WhatsApp',
        recipientType: 'group',
        messageType: 'group',
        messageBody: message,
        status: 'failed',
        errorMessage: error,
        senderSource: ctx.source,
        sourceTag: meta?.sourceTag || 'group_manual',
        provider: 'none',
        metadata: meta?.metadata,
      });
      return {
        success: false,
        provider: 'none',
        fatalInstanceError: true,
        error,
      };
    }

    const postGroup = async (useNumberKey: string) => {
      const res = await fetch('https://api.watzap.id/v1/send_message_group', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          api_key: key,
          number_key: useNumberKey,
          group_id: cleanGroupId,
          message: message,
        }),
      });
      return res.json();
    };

    let usedNumberKey = numKey;
    let usedSenderNumber = ctx.waNumber || this.licensePhoneCache.get(numKey);
    let usedFallback = false;

    try {
      let data = await postGroup(numKey);

      if (!this.isWatZapSuccess(data) && this.isInstanceOrLicenseError(data) && ctx.allowAutoFallback) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          usedNumberKey = fallback.key;
          usedSenderNumber = fallback.waNumber || this.licensePhoneCache.get(fallback.key);
          usedFallback = true;
          data = await postGroup(fallback.key);
        }
      }

      if (this.isWatZapSuccess(data)) {
        const messageId = data.message_id || data.id || `watzap_grp_${Date.now()}`;
        await logWhatsAppOutbox({
          recipientPhone: cleanGroupId,
          recipientName: meta?.recipientName || 'Grup WhatsApp',
          recipientType: 'group',
          messageType: 'group',
          messageBody: message,
          status: 'sent',
          senderNumber: usedSenderNumber,
          senderKeyMasked: maskWatZapKey(usedNumberKey),
          senderSource: usedFallback ? 'fallback' : ctx.source,
          usedFallback,
          sourceTag: meta?.sourceTag || 'group_manual',
          watzapMessageId: String(messageId),
          provider: 'watzap',
          metadata: meta?.metadata,
        });
        return {
          success: true,
          provider: 'watzap',
          messageId,
          senderNumber: usedSenderNumber,
          usedFallback,
          details: data,
        };
      }

      const errorMessage = data.message || 'WatZap gagal mengirim pesan ke grup';
      console.warn('[WhatsAppService] WatZap send group error:', errorMessage, data);

      await logWhatsAppOutbox({
        recipientPhone: cleanGroupId,
        recipientName: meta?.recipientName || 'Grup WhatsApp',
        recipientType: 'group',
        messageType: 'group',
        messageBody: message,
        status: 'failed',
        errorMessage,
        senderNumber: usedSenderNumber,
        senderKeyMasked: maskWatZapKey(usedNumberKey),
        senderSource: usedFallback ? 'fallback' : ctx.source,
        usedFallback,
        sourceTag: meta?.sourceTag || 'group_manual',
        provider: 'watzap',
        metadata: { ...(meta?.metadata || {}), watzapStatus: data?.status },
      });

      return {
        success: false,
        provider: 'watzap',
        senderNumber: usedSenderNumber,
        usedFallback,
        error: errorMessage,
        rateLimited: this.isRateLimitError(data),
        fatalInstanceError: this.isInstanceOrLicenseError(data),
        details: data,
      };
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error('[WhatsAppService] WatZap group send network error:', err);
      await logWhatsAppOutbox({
        recipientPhone: cleanGroupId,
        recipientName: meta?.recipientName || 'Grup WhatsApp',
        recipientType: 'group',
        messageType: 'group',
        messageBody: message,
        status: 'failed',
        errorMessage: errMsg,
        senderNumber: usedSenderNumber,
        senderKeyMasked: maskWatZapKey(usedNumberKey),
        senderSource: usedFallback ? 'fallback' : ctx.source,
        usedFallback,
        sourceTag: meta?.sourceTag || 'group_manual',
        provider: 'watzap',
        metadata: meta?.metadata,
      });
      return {
        success: false,
        provider: 'watzap',
        senderNumber: usedSenderNumber,
        usedFallback,
        error: errMsg,
      };
    }
  }

  /**
   * Fetch WhatsApp Groups from WatZap API
   */
  public async getGroups(): Promise<{ success: boolean; groups: WhatsAppGroupInfo[]; error?: string }> {
    const key = this.apiKey;
    const ctx = await this.resolveActiveNumberContext();
    const numKey = ctx.numberKey;

    if (!key || !numKey) {
      return {
        success: false,
        groups: [],
        error: 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum dikonfigurasi di server',
      };
    }

    const fetchGroups = async (useNumberKey: string) => {
      const res = await fetch('https://api.watzap.id/v1/groups', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          api_key: key,
          number_key: useNumberKey,
        }),
      });
      return res.json();
    };

    try {
      let data = await fetchGroups(numKey);

      if (this.isInstanceOrLicenseError(data) && ctx.allowAutoFallback) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          data = await fetchGroups(fallback.key);
        }
      }

      const rawGroups = data.groups || {};
      const groups: WhatsAppGroupInfo[] = Object.keys(rawGroups)
        .map((gid) => {
          const item = rawGroups[gid] || {};
          return {
            groupId: gid,
            name: item.name || item.groupname || 'Grup WhatsApp',
            participantCount: Array.isArray(item.participants) ? item.participants.length : 0,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'id'));

      return {
        success: true,
        groups,
      };
    } catch (err) {
      console.error('[WhatsAppService] WatZap getGroups error:', err);
      return {
        success: false,
        groups: [],
        error: (err as Error).message,
      };
    }
  }

  /**
   * Mengambil daftar thalibah aktif langsung dari view v_active_thalibah
   * (Telah terjamin 100% non-blacklist, is_active = true, dan status daftar ulang = approved)
   */
  public async getActiveThalibahRecipients(batchId?: string): Promise<ActiveThalibahRecipient[]> {
    const { query } = await import('@/lib/db');
    const sql = batchId
      ? `SELECT 
           user_id, full_name, nama_kunyah, whatsapp, email, student_id_number, 
           submission_id, batch_id, confirmed_chosen_juz, submission_status, 
           halaqah_id, halaqah_name, halaqah_status
         FROM v_active_thalibah
         WHERE batch_id = $1 AND whatsapp IS NOT NULL AND TRIM(whatsapp) != ''
         ORDER BY full_name ASC`
      : `SELECT 
           user_id, full_name, nama_kunyah, whatsapp, email, student_id_number, 
           submission_id, batch_id, confirmed_chosen_juz, submission_status, 
           halaqah_id, halaqah_name, halaqah_status
         FROM v_active_thalibah
         WHERE whatsapp IS NOT NULL AND TRIM(whatsapp) != ''
         ORDER BY full_name ASC`;

    const params = batchId ? [batchId] : [];
    const { rows } = await query(sql, params);

    return rows.map((r: any) => ({
      userId: r.user_id,
      fullName: r.full_name,
      namaKunyah: r.nama_kunyah,
      whatsapp: r.whatsapp,
      email: r.email,
      studentIdNumber: r.student_id_number,
      submissionId: r.submission_id,
      batchId: r.batch_id,
      confirmedChosenJuz: r.confirmed_chosen_juz,
      submissionStatus: r.submission_status,
      halaqahId: r.halaqah_id,
      halaqahName: r.halaqah_name,
      halaqahStatus: r.halaqah_status,
    }));
  }
}

/**
 * Convenient singleton export
 */
export const whatsappService = WhatsAppService.getInstance();
