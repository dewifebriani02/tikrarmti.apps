import { queryOne } from '@/lib/db';

export const WHATSAPP_AUTO_MESSAGES_SETTINGS_KEY = 'whatsapp_auto_messages_config';

export interface WhatsAppAutoMessagesConfig {
  reminder_sore_murojaah: boolean;
  reminder_ujian_lisan_thalibah: boolean;
  reminder_ujian_lisan_examiner: boolean;
  reminder_kelas_berbayar_h1: boolean;
  auto_reply_stop_opt_out: boolean;
  ai_escalation_admin_alert: boolean;
}

export type WhatsAppAutoMessageKey =
  | keyof WhatsAppAutoMessagesConfig
  | 'ai_auto_reply';

export const DEFAULT_WHATSAPP_AUTO_MESSAGES_CONFIG: WhatsAppAutoMessagesConfig = {
  reminder_sore_murojaah: false,
  reminder_ujian_lisan_thalibah: true,
  reminder_ujian_lisan_examiner: true,
  reminder_kelas_berbayar_h1: true,
  auto_reply_stop_opt_out: true,
  ai_escalation_admin_alert: true,
};

/**
 * Fail-closed config returned on DB read errors so transient database glitches
 * never trigger automated WhatsApp messages that an admin turned OFF.
 */
export const FAIL_CLOSED_WHATSAPP_AUTO_MESSAGES_CONFIG: WhatsAppAutoMessagesConfig = {
  reminder_sore_murojaah: false,
  reminder_ujian_lisan_thalibah: false,
  reminder_ujian_lisan_examiner: false,
  reminder_kelas_berbayar_h1: false,
  auto_reply_stop_opt_out: false,
  ai_escalation_admin_alert: false,
};

async function loadWhatsAppAutoMessagesRow(): Promise<{
  config: WhatsAppAutoMessagesConfig;
  updatedAt: string | null;
}> {
  const row = await queryOne<{ value: any; updated_at: string | null }>(
    `SELECT value, updated_at::text
     FROM system_settings
     WHERE key = $1
     LIMIT 1`,
    [WHATSAPP_AUTO_MESSAGES_SETTINGS_KEY]
  );

  if (!row || !row.value) {
    return {
      config: { ...DEFAULT_WHATSAPP_AUTO_MESSAGES_CONFIG },
      updatedAt: null,
    };
  }

  const v = row.value;
  return {
    config: {
      reminder_sore_murojaah: v.reminder_sore_murojaah === true,
      reminder_ujian_lisan_thalibah: v.reminder_ujian_lisan_thalibah !== false,
      reminder_ujian_lisan_examiner: v.reminder_ujian_lisan_examiner !== false,
      reminder_kelas_berbayar_h1: v.reminder_kelas_berbayar_h1 !== false,
      auto_reply_stop_opt_out: v.auto_reply_stop_opt_out !== false,
      ai_escalation_admin_alert: v.ai_escalation_admin_alert !== false,
    },
    updatedAt: row.updated_at || null,
  };
}

export async function getWhatsAppAutoMessagesConfig(): Promise<{
  config: WhatsAppAutoMessagesConfig;
  updatedAt: string | null;
  loadFailed?: boolean;
}> {
  try {
    return await loadWhatsAppAutoMessagesRow();
  } catch (err) {
    console.error('[WhatsAppAutoSettings] Failed loading config, failing closed (all OFF):', err);
    return {
      config: { ...FAIL_CLOSED_WHATSAPP_AUTO_MESSAGES_CONFIG },
      updatedAt: null,
      loadFailed: true,
    };
  }
}

export async function updateWhatsAppAutoMessagesConfig(
  patch: Partial<WhatsAppAutoMessagesConfig>
): Promise<{
  config: WhatsAppAutoMessagesConfig;
  updatedAt: string | null;
}> {
  const { config: current } = await loadWhatsAppAutoMessagesRow();
  const next: WhatsAppAutoMessagesConfig = {
    reminder_sore_murojaah:
      patch.reminder_sore_murojaah !== undefined
        ? Boolean(patch.reminder_sore_murojaah)
        : current.reminder_sore_murojaah,
    reminder_ujian_lisan_thalibah:
      patch.reminder_ujian_lisan_thalibah !== undefined
        ? Boolean(patch.reminder_ujian_lisan_thalibah)
        : current.reminder_ujian_lisan_thalibah,
    reminder_ujian_lisan_examiner:
      patch.reminder_ujian_lisan_examiner !== undefined
        ? Boolean(patch.reminder_ujian_lisan_examiner)
        : current.reminder_ujian_lisan_examiner,
    reminder_kelas_berbayar_h1:
      patch.reminder_kelas_berbayar_h1 !== undefined
        ? Boolean(patch.reminder_kelas_berbayar_h1)
        : current.reminder_kelas_berbayar_h1,
    auto_reply_stop_opt_out:
      patch.auto_reply_stop_opt_out !== undefined
        ? Boolean(patch.auto_reply_stop_opt_out)
        : current.auto_reply_stop_opt_out,
    ai_escalation_admin_alert:
      patch.ai_escalation_admin_alert !== undefined
        ? Boolean(patch.ai_escalation_admin_alert)
        : current.ai_escalation_admin_alert,
  };

  const res = await queryOne<{ updated_at: string | null }>(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = NOW()
     RETURNING updated_at::text`,
    [WHATSAPP_AUTO_MESSAGES_SETTINGS_KEY, JSON.stringify(next)]
  );

  return {
    config: next,
    updatedAt: res?.updated_at || new Date().toISOString(),
  };
}
