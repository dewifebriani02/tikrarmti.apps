/**
 * WhatsApp Notification Service for Markaz Tikrar Indonesia (MTI)
 *
 * Supports:
 * 1. Meta WhatsApp Cloud API (Official Direct Graph API)
 * 2. WatZap Gateway (Fallback / Secondary Transport)
 */

export interface WhatsAppSendResult {
  success: boolean;
  provider: 'meta_cloud_api' | 'watzap' | 'none';
  messageId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface WhatsAppStatusResult {
  configured: boolean;
  metaCloudApi: {
    configured: boolean;
    phoneNumberId?: string;
    wabaId?: string;
    verifiedName?: string;
    displayPhoneNumber?: string;
    status?: string;
  };
  watzap: {
    configured: boolean;
    apiKeyConfigured: boolean;
    numberKeyConfigured: boolean;
  };
}

/**
 * Normalizes Indonesian and international phone numbers into E.164-like digits without plus
 * e.g.:
 *  '08123456789'   -> '628123456789'
 *  '+62 812-3456'  -> '628123456789'
 *  '+1 (711) 990'  -> '1711990...'
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

  private metaToken: string;
  private phoneNumberId: string;
  private wabaId: string;
  private watzapApiKey: string;
  private watzapNumberKey: string;

  private constructor() {
    this.metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN?.trim() || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || '';
    this.wabaId = process.env.WHATSAPP_WABA_ID?.trim() || '';
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
   * Check connection and integration status
   */
  public async getStatus(): Promise<WhatsAppStatusResult> {
    const status: WhatsAppStatusResult = {
      configured: Boolean(this.metaToken || this.watzapApiKey),
      metaCloudApi: {
        configured: Boolean(this.metaToken && this.phoneNumberId),
        phoneNumberId: this.phoneNumberId || undefined,
        wabaId: this.wabaId || undefined,
      },
      watzap: {
        configured: Boolean(this.watzapApiKey && this.watzapNumberKey),
        apiKeyConfigured: Boolean(this.watzapApiKey),
        numberKeyConfigured: Boolean(this.watzapNumberKey),
      },
    };

    if (this.metaToken && this.phoneNumberId) {
      try {
        const resp = await fetch(
          `https://graph.facebook.com/v21.0/${this.phoneNumberId}`,
          {
            headers: {
              Authorization: `Bearer ${this.metaToken}`,
            },
          }
        );
        if (resp.ok) {
          const data = await resp.json();
          status.metaCloudApi.verifiedName = data.verified_name;
          status.metaCloudApi.displayPhoneNumber = data.display_phone_number;
          status.metaCloudApi.status = data.code_verification_status;
        }
      } catch (err) {
        console.warn('Failed to fetch Meta Phone status:', err);
      }
    }

    return status;
  }

  /**
   * Send free-form text message via Meta WhatsApp Cloud API
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

    // Try Meta Cloud API first
    if (this.metaToken && this.phoneNumberId) {
      try {
        const payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        };

        const res = await fetch(
          `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.metaToken}`,
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();

        if (res.ok && data.messages?.[0]?.id) {
          return {
            success: true,
            provider: 'meta_cloud_api',
            messageId: data.messages[0].id,
            details: data,
          };
        }

        // If Meta Cloud API failed (e.g., outside 24h customer service window)
        const errorMessage = data.error?.message || 'Meta Cloud API Error';
        console.warn('[WhatsAppService] Meta API error:', errorMessage, data);

        // Fallback to WatZap if available
        if (this.watzapApiKey && this.watzapNumberKey) {
          return await this.sendViaWatZap(formattedPhone, message);
        }

        return {
          success: false,
          provider: 'meta_cloud_api',
          error: errorMessage,
          details: data,
        };
      } catch (err) {
        console.error('[WhatsAppService] Meta network error:', err);
        if (this.watzapApiKey && this.watzapNumberKey) {
          return await this.sendViaWatZap(formattedPhone, message);
        }
        return {
          success: false,
          provider: 'meta_cloud_api',
          error: (err as Error).message,
        };
      }
    }

    // WatZap direct if Meta not configured
    if (this.watzapApiKey && this.watzapNumberKey) {
      return await this.sendViaWatZap(formattedPhone, message);
    }

    return {
      success: false,
      provider: 'none',
      error: 'Layanan WhatsApp belum dikonfigurasi di server',
    };
  }

  /**
   * Send official pre-approved template message via Meta Cloud API
   */
  public async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = 'id',
    components?: Record<string, unknown>[]
  ): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(to);
    if (!formattedPhone) {
      return {
        success: false,
        provider: 'none',
        error: 'Nomor WhatsApp tujuan tidak valid',
      };
    }

    if (!this.metaToken || !this.phoneNumberId) {
      return {
        success: false,
        provider: 'none',
        error: 'Meta Cloud API token atau Phone Number ID belum dikonfigurasi',
      };
    }

    try {
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      };

      if (components && components.length > 0) {
        (payload.template as Record<string, unknown>).components = components;
      }

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.metaToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (res.ok && data.messages?.[0]?.id) {
        return {
          success: true,
          provider: 'meta_cloud_api',
          messageId: data.messages[0].id,
          details: data,
        };
      }

      return {
        success: false,
        provider: 'meta_cloud_api',
        error: data.error?.message || 'Gagal mengirim template WhatsApp',
        details: data,
      };
    } catch (err) {
      return {
        success: false,
        provider: 'meta_cloud_api',
        error: (err as Error).message,
      };
    }
  }

  /**
   * Transport fallback via WatZap API
   */
  private async sendViaWatZap(formattedPhone: string, message: string): Promise<WhatsAppSendResult> {
    try {
      const res = await fetch('https://api.watzap.id/v1/send_message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.watzapApiKey,
          number_key: this.watzapNumberKey,
          phone_no: formattedPhone,
          message: message,
        }),
      });

      const data = await res.json();

      if (data.status === '200' || data.status === true || data.status === 200) {
        return {
          success: true,
          provider: 'watzap',
          messageId: data.message_id || data.id,
          details: data,
        };
      }

      return {
        success: false,
        provider: 'watzap',
        error: data.message || 'WatZap gagal mengirim pesan',
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
}

/**
 * Convenient singleton export
 */
export const whatsappService = WhatsAppService.getInstance();
