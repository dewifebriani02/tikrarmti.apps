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
 *  '0813-3000-0784'-> '6281330000784'
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

  private watzapApiKey: string;
  private watzapNumberKey: string;

  private constructor() {
    this.watzapApiKey = process.env.WATZAP_API_KEY?.trim() || '';
    this.watzapNumberKey = process.env.WATZAP_NUMBER_KEY?.trim() || '';
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  /**
   * Check connection and integration status via WatZap checking_key
   */
  public async getStatus(): Promise<WhatsAppStatusResult> {
    const isConfigured = Boolean(this.watzapApiKey && this.watzapNumberKey);

    const result: WhatsAppStatusResult = {
      configured: isConfigured,
      provider: 'watzap',
      watzap: {
        configured: isConfigured,
        apiKeyConfigured: Boolean(this.watzapApiKey),
        numberKeyConfigured: Boolean(this.watzapNumberKey),
      },
    };

    if (!isConfigured) {
      return result;
    }

    try {
      const resp = await fetch('https://api.watzap.id/v1/checking_key', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          api_key: this.watzapApiKey,
          number_key: this.watzapNumberKey,
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json.data) {
          result.watzap.accountName = json.data.name;
          result.watzap.plan = json.data.plan;
          result.watzap.expiresOn = json.data.expires_on;

          // Find license matching our number_key or pick first connected
          const licenses = json.data.licenses_key || [];
          const matchedLicense = licenses.find(
            (lic: { key?: string }) => lic.key === this.watzapNumberKey
          ) || licenses[0];

          if (matchedLicense) {
            result.watzap.senderNumber = matchedLicense.wa_number;
            result.watzap.displayPhoneNumber = matchedLicense.wa_number
              ? `+${matchedLicense.wa_number.replace(/^(\d{2})(\d{3})(\d{4})(\d+)/, '$1 $2-$3-$4')}`
              : undefined;
            result.watzap.isConnected = Boolean(
              matchedLicense.is_connected || matchedLicense.connection_status === 'connected'
            );
            result.watzap.type = matchedLicense.type || 'unofficial';
          }
        }
      }
    } catch (err) {
      console.warn('[WhatsAppService] Failed to check WatZap key status:', err);
    }

    return result;
  }

  /**
   * Send WhatsApp message via WatZap API
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

    if (!this.watzapApiKey || !this.watzapNumberKey) {
      return {
        success: false,
        provider: 'none',
        error: 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum dikonfigurasi di server',
      };
    }

    try {
      const res = await fetch('https://api.watzap.id/v1/send_message', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          api_key: this.watzapApiKey,
          number_key: this.watzapNumberKey,
          phone_no: formattedPhone,
          message: message,
        }),
      });

      const data = await res.json();

      // WatZap success response: status 200 / true, or ack: successfully
      if (
        data.status === '200' ||
        data.status === 200 ||
        data.status === true ||
        data.ack === 'successfully'
      ) {
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
   * Send message (Template alias for backward compatibility)
   */
  public async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = 'id',
    components?: Record<string, unknown>[]
  ): Promise<WhatsAppSendResult> {
    // WatZap Unofficial does not require Meta pre-approved templates.
    // If text message is provided inside components, use it, otherwise compose standard message.
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
