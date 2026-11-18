/**
 * WhatsApp Notification Service for Markaz Tikrar Indonesia (MTI)
 *
 * Provider: WatZap Gateway (WhatsApp Unofficial / Direct Local Number)
 */

export interface WhatsAppSendResult {
  success: boolean;
  provider: 'watzap' | 'none';
  messageId?: string;
  error?: string;
  rateLimited?: boolean;
  fatalInstanceError?: boolean;
  details?: Record<string, unknown>;
}

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

  private constructor() {
    this.watzapApiKey = process.env.WATZAP_API_KEY?.trim() || '';
    this.watzapNumberKey = process.env.WATZAP_NUMBER_KEY?.trim() || '';
  }

  private get apiKey(): string {
    return (process.env.WATZAP_API_KEY || this.watzapApiKey || '').trim();
  }

  private get numberKey(): string {
    return (process.env.WATZAP_NUMBER_KEY || this.watzapNumberKey || '').trim();
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
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
   * When the configured primary WATZAP_NUMBER_KEY is disconnected/offline or returns
   * "License Not Found" / "WhatsApp Instance Not Started", check WatZap checking_key
   * for another connected unofficial license key on the same account.
   */
  private async resolveWorkingFallbackNumberKey(
    failedNumKey: string
  ): Promise<{ key: string; waNumber?: string } | null> {
    const key = this.apiKey;
    if (!key) return null;

    const now = Date.now();
    if (
      this.cachedFallbackKey &&
      this.cachedFallbackKey.key !== failedNumKey &&
      this.cachedFallbackKey.expiresAt > now
    ) {
      return { key: this.cachedFallbackKey.key, waNumber: this.cachedFallbackKey.waNumber };
    }

    try {
      const resp = await fetch('https://api.watzap.id/v1/checking_key', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({ api_key: key }),
        signal: AbortSignal.timeout(7000),
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      const licenses = Array.isArray(json?.data?.licenses_key) ? json.data.licenses_key : [];

      const candidates = licenses.filter(
        (lic: { key?: string; type?: string; is_connected?: boolean; connection_status?: string }) =>
          lic?.key &&
          lic.key !== failedNumKey &&
          (lic.type === 'unofficial' || !lic.type) &&
          (lic.is_connected || lic.connection_status === 'connected')
      );

      for (const lic of candidates) {
        const online = await this.validateLicenseOnline(key, lic.key);
        if (online) {
          this.cachedFallbackKey = {
            key: lic.key,
            waNumber: lic.wa_number,
            expiresAt: now + 5 * 60 * 1000,
          };
          console.warn(
            `[WhatsAppService] Primary key ${failedNumKey} offline; using connected fallback license ${lic.key} (${lic.wa_number || 'unknown'})`
          );
          return { key: lic.key, waNumber: lic.wa_number };
        }
      }
    } catch (err) {
      console.warn('[WhatsAppService] Failed resolving fallback license:', err);
    }

    return null;
  }

  /**
   * Check connection and integration status via WatZap checking_key + live validate_number
   */
  public async getStatus(): Promise<WhatsAppStatusResult> {
    const key = this.apiKey;
    const numKey = this.numberKey;
    const isConfigured = Boolean(key && numKey);

    const result: WhatsAppStatusResult = {
      configured: isConfigured,
      provider: 'watzap',
      watzap: {
        configured: isConfigured,
        apiKeyConfigured: Boolean(key),
        numberKeyConfigured: Boolean(numKey),
        accountName: process.env.WATZAP_SENDER_NAME || "Markaz Tikrar Indonesia",
      },
    };

    if (!isConfigured) {
      return result;
    }

    try {
      const [resp, primaryLiveOnline] = await Promise.all([
        fetch('https://api.watzap.id/v1/checking_key', {
          method: 'POST',
          headers: COMMON_HEADERS,
          body: JSON.stringify({
            api_key: key,
            number_key: numKey,
          }),
          signal: AbortSignal.timeout(7000),
        }),
        this.validateLicenseOnline(key, numKey),
      ]);

      if (resp.ok) {
        const json = await resp.json();
        if (json.data) {
          result.watzap.accountName = process.env.WATZAP_SENDER_NAME || "Markaz Tikrar Indonesia";
          result.watzap.plan = json.data.plan;
          result.watzap.expiresOn = json.data.expires_on;

          const licenses = json.data.licenses_key || [];
          const matchedLicense = licenses.find(
            (lic: { key?: string }) => lic.key === numKey
          ) || licenses[0];

          if (matchedLicense) {
            result.watzap.senderNumber = matchedLicense.wa_number;
            result.watzap.displayPhoneNumber = matchedLicense.wa_number
              ? `+${matchedLicense.wa_number.replace(/^(\d{2})(\d{3})(\d{4})(\d+)/, '$1 $2-$3-$4')}`
              : undefined;
            result.watzap.isConnected = primaryLiveOnline;
            result.watzap.type = matchedLicense.type || 'unofficial';
          }
        }
      }

      if (!primaryLiveOnline) {
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
   * Send WhatsApp message via WatZap API (with automatic connected-license fallback)
   */
  public async sendTextMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(to);
    if (!formattedPhone) {
      return {
        success: false,
        provider: 'none',
        error: 'Nomor WhatsApp tujuan tidak valid',
      };
    }

    const key = this.apiKey;
    const numKey = this.numberKey;

    if (!key || !numKey) {
      return {
        success: false,
        provider: 'none',
        fatalInstanceError: true,
        error: 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum dikonfigurasi di server',
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

    try {
      let data = await postSend(numKey);

      if (!this.isWatZapSuccess(data) && this.isInstanceOrLicenseError(data)) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          data = await postSend(fallback.key);
        }
      }

      if (this.isWatZapSuccess(data)) {
        return {
          success: true,
          provider: 'watzap',
          messageId: data.message_id || data.id || `watzap_${Date.now()}`,
          details: data,
        };
      }

      const errorMessage = data.message || 'WatZap gagal mengirim pesan';
      console.warn('[WhatsAppService] WatZap send error:', errorMessage, data);

      return {
        success: false,
        provider: 'watzap',
        error: errorMessage,
        rateLimited: this.isRateLimitError(data),
        fatalInstanceError: this.isInstanceOrLicenseError(data),
        details: data,
      };
    } catch (err) {
      console.error('[WhatsAppService] WatZap network error:', err);
      return {
        success: false,
        provider: 'watzap',
        error: (err as Error).message,
      };
    }
  }

  /**
   * Send WhatsApp Image via WatZap API (with automatic connected-license fallback)
   */
  public async sendImageUrl(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(to);
    if (!formattedPhone) {
      return {
        success: false,
        provider: 'none',
        error: 'Nomor WhatsApp tujuan tidak valid',
      };
    }

    const key = this.apiKey;
    const numKey = this.numberKey;

    if (!key || !numKey) {
      return {
        success: false,
        provider: 'none',
        fatalInstanceError: true,
        error: 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum dikonfigurasi di server',
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

    try {
      let data = await postImage(numKey);

      if (!this.isWatZapSuccess(data) && this.isInstanceOrLicenseError(data)) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          data = await postImage(fallback.key);
        }
      }

      if (this.isWatZapSuccess(data)) {
        return {
          success: true,
          provider: 'watzap',
          messageId: data.message_id || data.id || `watzap_${Date.now()}`,
          details: data,
        };
      }

      const errorMessage = data.message || 'WatZap gagal mengirim gambar';
      console.warn('[WhatsAppService] WatZap send image error:', errorMessage, data);

      return {
        success: false,
        provider: 'watzap',
        error: errorMessage,
        rateLimited: this.isRateLimitError(data),
        fatalInstanceError: this.isInstanceOrLicenseError(data),
        details: data,
      };
    } catch (err) {
      console.error('[WhatsAppService] WatZap image network error:', err);
      return {
        success: false,
        provider: 'watzap',
        error: (err as Error).message,
      };
    }
  }

  /**
   * Send WhatsApp File / Document via WatZap API (with automatic connected-license fallback)
   */
  public async sendFileUrl(to: string, fileUrl: string): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(to);
    if (!formattedPhone) {
      return {
        success: false,
        provider: 'none',
        error: 'Nomor WhatsApp tujuan tidak valid',
      };
    }

    const key = this.apiKey;
    const numKey = this.numberKey;

    if (!key || !numKey) {
      return {
        success: false,
        provider: 'none',
        fatalInstanceError: true,
        error: 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum dikonfigurasi di server',
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

    try {
      let data = await postFile(numKey);

      if (!this.isWatZapSuccess(data) && this.isInstanceOrLicenseError(data)) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          data = await postFile(fallback.key);
        }
      }

      if (this.isWatZapSuccess(data)) {
        return {
          success: true,
          provider: 'watzap',
          messageId: data.message_id || data.id || `watzap_${Date.now()}`,
          details: data,
        };
      }

      const errorMessage = data.message || 'WatZap gagal mengirim file';
      return {
        success: false,
        provider: 'watzap',
        error: errorMessage,
        rateLimited: this.isRateLimitError(data),
        fatalInstanceError: this.isInstanceOrLicenseError(data),
        details: data,
      };
    } catch (err) {
      return {
        success: false,
        provider: 'watzap',
        error: (err as Error).message,
      };
    }
  }

  public async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = 'id',
    components?: Record<string, unknown>[]
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

    return this.sendTextMessage(to, composedMessage);
  }

  /**
   * Send WhatsApp message to a group via WatZap API (with automatic connected-license fallback)
   */
  public async sendGroupMessage(groupId: string, message: string): Promise<WhatsAppSendResult> {
    const cleanGroupId = groupId.trim();
    if (!cleanGroupId) {
      return {
        success: false,
        provider: 'none',
        error: 'ID Grup WhatsApp tujuan tidak valid',
      };
    }

    const key = this.apiKey;
    const numKey = this.numberKey;

    if (!key || !numKey) {
      return {
        success: false,
        provider: 'none',
        fatalInstanceError: true,
        error: 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum dikonfigurasi di server',
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

    try {
      let data = await postGroup(numKey);

      if (!this.isWatZapSuccess(data) && this.isInstanceOrLicenseError(data)) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          data = await postGroup(fallback.key);
        }
      }

      if (this.isWatZapSuccess(data)) {
        return {
          success: true,
          provider: 'watzap',
          messageId: data.message_id || data.id || `watzap_grp_${Date.now()}`,
          details: data,
        };
      }

      const errorMessage = data.message || 'WatZap gagal mengirim pesan ke grup';
      console.warn('[WhatsAppService] WatZap send group error:', errorMessage, data);

      return {
        success: false,
        provider: 'watzap',
        error: errorMessage,
        rateLimited: this.isRateLimitError(data),
        fatalInstanceError: this.isInstanceOrLicenseError(data),
        details: data,
      };
    } catch (err) {
      console.error('[WhatsAppService] WatZap group send network error:', err);
      return {
        success: false,
        provider: 'watzap',
        error: (err as Error).message,
      };
    }
  }

  /**
   * Fetch WhatsApp Groups from WatZap API
   */
  public async getGroups(): Promise<{ success: boolean; groups: WhatsAppGroupInfo[]; error?: string }> {
    const key = this.apiKey;
    const numKey = this.numberKey;

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

      if (this.isInstanceOrLicenseError(data)) {
        const fallback = await this.resolveWorkingFallbackNumberKey(numKey);
        if (fallback) {
          data = await fetchGroups(fallback.key);
        }
      }

      const rawGroups = data.groups || {};
      const groups: WhatsAppGroupInfo[] = Object.keys(rawGroups).map(gid => {
        const item = rawGroups[gid] || {};
        return {
          groupId: gid,
          name: item.name || item.groupname || 'Grup WhatsApp',
          participantCount: Array.isArray(item.participants) ? item.participants.length : 0,
        };
      }).sort((a, b) => a.name.localeCompare(b.name, 'id'));

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
