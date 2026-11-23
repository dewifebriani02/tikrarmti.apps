import { query } from '@/lib/db';
import { formatWatZapDisplayPhone } from '@/lib/services/watzap-config';

export type OutboxRecipientType = 'individual' | 'group';
export type OutboxMessageType = 'text' | 'image' | 'file' | 'group';
export type OutboxStatus = 'sent' | 'failed';

export interface OutboxSourceMeta {
  tag: string;
  label: string;
  badgeColor: string;
}

export const OUTBOX_SOURCE_META: Record<string, OutboxSourceMeta> = {
  cron_murojaah: {
    tag: 'cron_murojaah',
    label: 'Pengingat Murojaah 40x',
    badgeColor: 'amber',
  },
  cron_ujian_lisan: {
    tag: 'cron_ujian_lisan',
    label: 'Pengingat Ujian Lisan',
    badgeColor: 'indigo',
  },
  cron_kelas_berbayar: {
    tag: 'cron_kelas_berbayar',
    label: 'Pengingat Kelas Berbayar',
    badgeColor: 'violet',
  },
  broadcast: {
    tag: 'broadcast',
    label: 'Broadcast Thalibah',
    badgeColor: 'emerald',
  },
  individual: {
    tag: 'individual',
    label: 'Kirim Perorangan',
    badgeColor: 'sky',
  },
  individual_cc: {
    tag: 'individual_cc',
    label: 'Tembusan (CC)',
    badgeColor: 'slate',
  },
  group_manual: {
    tag: 'group_manual',
    label: 'Kirim ke Grup',
    badgeColor: 'blue',
  },
  live_chat: {
    tag: 'live_chat',
    label: 'Balasan Live Chat',
    badgeColor: 'teal',
  },
  ai_bot: {
    tag: 'ai_bot',
    label: 'Asisten AI MTI',
    badgeColor: 'purple',
  },
  ai_escalation: {
    tag: 'ai_escalation',
    label: 'Eskalasi Admin AI',
    badgeColor: 'rose',
  },
  opt_out_reply: {
    tag: 'opt_out_reply',
    label: 'Auto-Reply STOP',
    badgeColor: 'gray',
  },
  pendaftaran_notif: {
    tag: 'pendaftaran_notif',
    label: 'Notifikasi Pendaftaran',
    badgeColor: 'cyan',
  },
  system: {
    tag: 'system',
    label: 'Sistem MTI',
    badgeColor: 'gray',
  },
};

export interface WhatsAppOutboxRecord {
  id: string;
  recipientPhone: string;
  recipientName: string | null;
  recipientType: OutboxRecipientType;
  messageType: OutboxMessageType;
  messageBody: string;
  mediaUrl: string | null;
  status: OutboxStatus;
  errorMessage: string | null;
  senderNumber: string | null;
  senderDisplayPhone: string | null;
  senderKeyMasked: string | null;
  senderSource: string | null;
  usedFallback: boolean;
  sourceTag: string;
  sourceLabel: string;
  watzapMessageId: string | null;
  provider: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  origin: 'outbox_log' | 'chat_history';
}

export interface LogWhatsAppOutboxInput {
  recipientPhone: string;
  recipientName?: string | null;
  recipientType?: OutboxRecipientType;
  messageType?: OutboxMessageType;
  messageBody: string;
  mediaUrl?: string | null;
  status: OutboxStatus;
  errorMessage?: string | null;
  senderNumber?: string | null;
  senderKeyMasked?: string | null;
  senderSource?: string | null;
  usedFallback?: boolean;
  sourceTag?: string;
  watzapMessageId?: string | null;
  provider?: string;
  metadata?: Record<string, unknown>;
}

let ensureTablePromise: Promise<void> | null = null;

export async function ensureWhatsAppOutboxTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS whatsapp_outbox_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipient_phone VARCHAR(100) NOT NULL,
          recipient_name VARCHAR(200),
          recipient_type VARCHAR(20) NOT NULL DEFAULT 'individual',
          message_type VARCHAR(20) NOT NULL DEFAULT 'text',
          message_body TEXT NOT NULL,
          media_url TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'sent',
          error_message TEXT,
          sender_number VARCHAR(40),
          sender_key_masked VARCHAR(40),
          sender_source VARCHAR(30),
          used_fallback BOOLEAN NOT NULL DEFAULT FALSE,
          source_tag VARCHAR(60) NOT NULL DEFAULT 'system',
          watzap_message_id VARCHAR(120),
          provider VARCHAR(20) NOT NULL DEFAULT 'watzap',
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_wa_outbox_created_at ON whatsapp_outbox_logs (created_at DESC);`);
      await query(`CREATE INDEX IF NOT EXISTS idx_wa_outbox_recipient_phone ON whatsapp_outbox_logs (recipient_phone);`);
      await query(`CREATE INDEX IF NOT EXISTS idx_wa_outbox_status ON whatsapp_outbox_logs (status);`);
      await query(`CREATE INDEX IF NOT EXISTS idx_wa_outbox_source_tag ON whatsapp_outbox_logs (source_tag);`);
      await query(`CREATE INDEX IF NOT EXISTS idx_wa_outbox_sender_number ON whatsapp_outbox_logs (sender_number);`);
    })().catch((err) => {
      ensureTablePromise = null;
      throw err;
    });
  }
  return ensureTablePromise;
}

export function inferOutboxSourceTag(
  messageBody: string,
  recipientType: OutboxRecipientType = 'individual'
): string {
  const lower = (messageBody || '').toLowerCase();
  if (lower.includes('pengingat sore murojaah 40x')) return 'cron_murojaah';
  if (lower.includes('pengingat ujian lisan') || lower.includes('jadwal ujian lisan')) return 'cron_ujian_lisan';
  if (lower.includes('kelas berbayar') || lower.includes('tagihan kelas')) return 'cron_kelas_berbayar';
  if (lower.includes('[tembusan')) return 'individual_cc';
  if (lower.includes('eskalasi') || lower.includes('butuh admin')) return 'ai_escalation';
  if (lower.includes('pengingat murojaah 40x telah dinonaktifkan')) return 'opt_out_reply';
  if (recipientType === 'group') return 'group_manual';
  return 'system';
}

export function getOutboxSourceLabel(tag: string): string {
  return OUTBOX_SOURCE_META[tag]?.label || tag || 'Sistem MTI';
}

/**
 * Best-effort audit logger for every outbound WhatsApp send attempt.
 * Never throws so message delivery is never impacted by DB issues.
 */
export async function logWhatsAppOutbox(input: LogWhatsAppOutboxInput): Promise<void> {
  try {
    await ensureWhatsAppOutboxTable();
    const recipientType: OutboxRecipientType = input.recipientType || 'individual';
    const sourceTag = input.sourceTag || inferOutboxSourceTag(input.messageBody, recipientType);
    const cleanSender = input.senderNumber ? input.senderNumber.replace(/[^0-9]/g, '') : null;

    await query(
      `INSERT INTO whatsapp_outbox_logs (
         recipient_phone,
         recipient_name,
         recipient_type,
         message_type,
         message_body,
         media_url,
         status,
         error_message,
         sender_number,
         sender_key_masked,
         sender_source,
         used_fallback,
         source_tag,
         watzap_message_id,
         provider,
         metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)`,
      [
        input.recipientPhone.slice(0, 100),
        input.recipientName ? input.recipientName.slice(0, 200) : null,
        recipientType,
        input.messageType || 'text',
        input.messageBody || '',
        input.mediaUrl || null,
        input.status,
        input.errorMessage || null,
        cleanSender ? cleanSender.slice(0, 40) : null,
        input.senderKeyMasked ? input.senderKeyMasked.slice(0, 40) : null,
        input.senderSource ? input.senderSource.slice(0, 30) : null,
        Boolean(input.usedFallback),
        sourceTag.slice(0, 60),
        input.watzapMessageId ? String(input.watzapMessageId).slice(0, 120) : null,
        (input.provider || 'watzap').slice(0, 20),
        JSON.stringify(input.metadata || {}),
      ]
    );
  } catch (err) {
    console.warn('[WhatsAppOutbox] Failed to persist outbox audit log:', err);
  }
}

export interface GetOutboxParams {
  search?: string;
  status?: 'all' | 'sent' | 'failed';
  sourceTag?: string;
  senderNumber?: string;
  onlyFallback?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetOutboxResult {
  items: WhatsAppOutboxRecord[];
  total: number;
  summary: {
    totalAll: number;
    sentToday: number;
    failedAll: number;
    fallbackAll: number;
  };
  distinctSenders: Array<{ senderNumber: string; displayPhone: string; count: number }>;
  distinctSources: Array<{ sourceTag: string; label: string; count: number }>;
}

/**
 * Unified Outbox query combining `whatsapp_outbox_logs` (all outbound sends across cron,
 * broadcast, individual, live chat, AI bot, etc.) plus historical outbound rows from
 * `whatsapp_messages` that predate `whatsapp_outbox_logs` (deduplicated).
 */
export async function getWhatsAppOutboxLogs(params: GetOutboxParams = {}): Promise<GetOutboxResult> {
  await ensureWhatsAppOutboxTable();

  const limit = Math.min(Math.max(Number(params.limit) || 30, 1), 100);
  const offset = Math.max(Number(params.offset) || 0, 0);

  const unifiedCte = `
    WITH unified_outbox AS (
      SELECT
        o.id::text AS id,
        o.recipient_phone,
        COALESCE(
          NULLIF(TRIM(o.recipient_name), ''),
          (
            SELECT u.full_name
            FROM users u
            WHERE o.recipient_type = 'individual'
              AND regexp_replace(COALESCE(u.whatsapp, ''), '[^0-9]', '', 'g') IN (
                o.recipient_phone,
                CASE WHEN o.recipient_phone LIKE '62%' THEN '0' || substring(o.recipient_phone from 3) ELSE o.recipient_phone END
              )
            LIMIT 1
          )
        ) AS recipient_name,
        o.recipient_type,
        o.message_type,
        o.message_body,
        o.media_url,
        o.status,
        o.error_message,
        o.sender_number,
        o.sender_key_masked,
        o.sender_source,
        o.used_fallback,
        o.source_tag,
        o.watzap_message_id,
        o.provider,
        o.metadata,
        o.created_at,
        'outbox_log'::text AS origin
      FROM whatsapp_outbox_logs o

      UNION ALL

      SELECT
        m.id::text AS id,
        m.phone_number AS recipient_phone,
        COALESCE(NULLIF(TRIM(c.display_name), ''), NULL) AS recipient_name,
        'individual'::text AS recipient_type,
        CASE
          WHEN COALESCE(m.metadata->>'media_url', '') != '' THEN 'image'::text
          ELSE 'text'::text
        END AS message_type,
        m.message_body,
        NULLIF(m.metadata->>'media_url', '') AS media_url,
        CASE
          WHEN m.status = 'failed' THEN 'failed'::text
          ELSE 'sent'::text
        END AS status,
        NULLIF(m.metadata->>'error', '') AS error_message,
        NULLIF(regexp_replace(COALESCE(m.metadata->>'sender_number', ''), '[^0-9]', '', 'g'), '') AS sender_number,
        NULL::text AS sender_key_masked,
        NULL::text AS sender_source,
        FALSE AS used_fallback,
        CASE
          WHEN COALESCE(m.metadata->>'is_ai_bot', 'false') = 'true' OR COALESCE(m.sender_name, '') ILIKE '%Asisten AI%' THEN 'ai_bot'::text
          WHEN COALESCE(m.metadata->>'auto_opt_out', 'false') = 'true' THEN 'opt_out_reply'::text
          ELSE 'live_chat'::text
        END AS source_tag,
        m.watzap_message_id,
        'watzap'::text AS provider,
        COALESCE(m.metadata, '{}'::jsonb) AS metadata,
        m.created_at,
        'chat_history'::text AS origin
      FROM whatsapp_messages m
      LEFT JOIN whatsapp_conversations c ON c.id = m.conversation_id
      WHERE m.direction = 'outbound'
        AND NOT EXISTS (
          SELECT 1
          FROM whatsapp_outbox_logs o2
          WHERE (
            m.watzap_message_id IS NOT NULL
            AND o2.watzap_message_id IS NOT NULL
            AND o2.watzap_message_id = m.watzap_message_id
          )
          OR (
            o2.recipient_phone = m.phone_number
            AND ABS(EXTRACT(EPOCH FROM (o2.created_at - m.created_at))) <= 5
            AND LEFT(o2.message_body, 80) = LEFT(m.message_body, 80)
          )
        )
    )
  `;

  const whereClauses: string[] = [];
  const filterValues: unknown[] = [];

  if (params.status === 'sent' || params.status === 'failed') {
    filterValues.push(params.status);
    whereClauses.push(`u.status = $${filterValues.length}`);
  }

  if (params.sourceTag && params.sourceTag !== 'all') {
    filterValues.push(params.sourceTag);
    whereClauses.push(`u.source_tag = $${filterValues.length}`);
  }

  if (params.senderNumber && params.senderNumber !== 'all') {
    if (params.senderNumber === 'unknown') {
      whereClauses.push(`(u.sender_number IS NULL OR u.sender_number = '')`);
    } else {
      filterValues.push(params.senderNumber.replace(/[^0-9]/g, ''));
      whereClauses.push(`u.sender_number = $${filterValues.length}`);
    }
  }

  if (params.onlyFallback) {
    whereClauses.push(`u.used_fallback = TRUE`);
  }

  if (params.search && params.search.trim()) {
    const pattern = `%${params.search.trim()}%`;
    filterValues.push(pattern);
    const idx = filterValues.length;
    whereClauses.push(
      `(u.recipient_phone ILIKE $${idx} OR COALESCE(u.recipient_name, '') ILIKE $${idx} OR u.message_body ILIKE $${idx} OR COALESCE(u.error_message, '') ILIKE $${idx})`
    );
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [itemsRes, countRes, summaryRes, sendersRes, sourcesRes] = await Promise.all([
    query(
      `${unifiedCte}
       SELECT u.*
       FROM unified_outbox u
       ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT $${filterValues.length + 1} OFFSET $${filterValues.length + 2}`,
      [...filterValues, limit, offset]
    ),
    query(
      `${unifiedCte}
       SELECT COUNT(*)::int AS total
       FROM unified_outbox u
       ${whereSql}`,
      filterValues
    ),
    query(
      `${unifiedCte}
       SELECT
         COUNT(*)::int AS total_all,
         COUNT(*) FILTER (
           WHERE u.status = 'sent'
             AND (u.created_at AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
         )::int AS sent_today,
         COUNT(*) FILTER (WHERE u.status = 'failed')::int AS failed_all,
         COUNT(*) FILTER (WHERE u.used_fallback = TRUE)::int AS fallback_all
       FROM unified_outbox u`
    ),
    query(
      `${unifiedCte}
       SELECT
         COALESCE(NULLIF(u.sender_number, ''), 'unknown') AS sender_number,
         COUNT(*)::int AS cnt
       FROM unified_outbox u
       GROUP BY 1
       ORDER BY cnt DESC`
    ),
    query(
      `${unifiedCte}
       SELECT
         u.source_tag,
         COUNT(*)::int AS cnt
       FROM unified_outbox u
       GROUP BY 1
       ORDER BY cnt DESC`
    ),
  ]);

  const items: WhatsAppOutboxRecord[] = itemsRes.rows.map((r: any) => ({
    id: r.id,
    recipientPhone: r.recipient_phone,
    recipientName: r.recipient_name || null,
    recipientType: (r.recipient_type || 'individual') as OutboxRecipientType,
    messageType: (r.message_type || 'text') as OutboxMessageType,
    messageBody: r.message_body || '',
    mediaUrl: r.media_url || null,
    status: (r.status === 'failed' ? 'failed' : 'sent') as OutboxStatus,
    errorMessage: r.error_message || null,
    senderNumber: r.sender_number || null,
    senderDisplayPhone: r.sender_number ? formatWatZapDisplayPhone(r.sender_number) : null,
    senderKeyMasked: r.sender_key_masked || null,
    senderSource: r.sender_source || null,
    usedFallback: Boolean(r.used_fallback),
    sourceTag: r.source_tag || 'system',
    sourceLabel: getOutboxSourceLabel(r.source_tag || 'system'),
    watzapMessageId: r.watzap_message_id || null,
    provider: r.provider || 'watzap',
    metadata: r.metadata || {},
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    origin: r.origin === 'chat_history' ? 'chat_history' : 'outbox_log',
  }));

  const sRow = summaryRes.rows[0] || {};
  const distinctSenders = sendersRes.rows.map((r: any) => ({
    senderNumber: r.sender_number,
    displayPhone:
      r.sender_number === 'unknown'
        ? 'Riwayat Chat Lama (Nomor tidak tercatat)'
        : formatWatZapDisplayPhone(r.sender_number),
    count: Number(r.cnt || 0),
  }));

  const distinctSources = sourcesRes.rows.map((r: any) => ({
    sourceTag: r.source_tag,
    label: getOutboxSourceLabel(r.source_tag),
    count: Number(r.cnt || 0),
  }));

  return {
    items,
    total: Number(countRes.rows[0]?.total || 0),
    summary: {
      totalAll: Number(sRow.total_all || 0),
      sentToday: Number(sRow.sent_today || 0),
      failedAll: Number(sRow.failed_all || 0),
      fallbackAll: Number(sRow.fallback_all || 0),
    },
    distinctSenders,
    distinctSources,
  };
}
