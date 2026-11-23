import { query, queryOne, transaction } from '@/lib/db';
import { normalizePhoneNumber, whatsappService } from './whatsapp';
import { getWhatsAppAutoMessagesConfig } from './whatsapp-auto-settings';

export interface WhatsAppConversation {
  id: string;
  phone_number: string;
  display_name: string;
  user_id?: string | null;
  batch_name?: string | null;
  student_id_number?: string | null;
  last_message?: string | null;
  last_message_at: string;
  last_message_direction: 'inbound' | 'outbound';
  unread_count: number;
  status: 'open' | 'resolved' | 'archived';
  profile_pic_url?: string | null;
  bot_enabled?: boolean;
  needs_admin?: boolean;
  escalation_reason?: string | null;
  escalated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  message_body: string;
  status: 'received' | 'sent' | 'delivered' | 'failed';
  sender_name?: string | null;
  sender_id?: string | null;
  watzap_message_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface UserMatch {
  id: string;
  full_name: string;
  nama_kunyah?: string | null;
  whatsapp?: string | null;
  student_id_number?: string | null;
  batch_name?: string | null;
}

/**
 * Normalizes any phone string and generates both 62... and 08... variations for matching
 */
export function getPhoneVariants(rawPhone: string): { canonical: string; local: string; withPlus: string } {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized) return { canonical: '', local: '', withPlus: '' };

  const canonical = normalized.startsWith('62') ? normalized : `62${normalized.replace(/^0+/, '')}`;
  const local = canonical.startsWith('62') ? `0${canonical.slice(2)}` : canonical;
  const withPlus = `+${canonical}`;

  return { canonical, local, withPlus };
}

/**
 * Lookup user details from users table or pendaftaran_tikrar_tahfidz
 */
export async function findUserByPhone(phone: string): Promise<UserMatch | null> {
  const { canonical, local } = getPhoneVariants(phone);
  if (!canonical) return null;

  try {
    // 1. Check in users table
    const userRow = await queryOne<UserMatch>(
      `SELECT 
         u.id, 
         u.full_name, 
         u.nama_kunyah, 
         u.whatsapp, 
         u.student_id_number, 
         b.name AS batch_name
       FROM users u
       LEFT JOIN batches b ON b.id = u.current_tikrar_batch_id
       WHERE regexp_replace(u.whatsapp, '[^0-9]', '', 'g') IN ($1, $2)
       ORDER BY u.created_at DESC
       LIMIT 1`,
      [canonical, local]
    );

    if (userRow) return userRow;

    // 2. Fallback to pendaftaran_tikrar_tahfidz if user not directly in users
    const pendaftaranRow = await queryOne<any>(
      `SELECT 
         p.user_id, 
         p.full_name, 
         p.wa_phone AS whatsapp,
         b.name AS batch_name
       FROM pendaftaran_tikrar_tahfidz p
       LEFT JOIN batches b ON b.id = p.batch_id
       WHERE regexp_replace(p.wa_phone, '[^0-9]', '', 'g') IN ($1, $2)
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [canonical, local]
    );

    if (pendaftaranRow) {
      return {
        id: pendaftaranRow.user_id,
        full_name: pendaftaranRow.full_name,
        whatsapp: pendaftaranRow.whatsapp,
        batch_name: pendaftaranRow.batch_name,
      };
    }

    return null;
  } catch (error) {
    console.error('[WhatsAppChat] Error looking up user by phone:', error);
    return null;
  }
}

/**
 * Process incoming WatZap Webhook payload (Unofficial & WABA)
 */
export interface WebhookProcessResult {
  handled: boolean;
  reason?: string;
  messageId?: string;
  conversationId?: string;
  phoneNumber?: string;
  messageBody?: string;
  direction?: 'inbound' | 'outbound';
  botEnabled?: boolean;
  hasMedia?: boolean;
}

export async function processIncomingWebhook(payload: any): Promise<WebhookProcessResult> {
  if (!payload) {
    return { handled: false, reason: 'Empty payload' };
  }

  // Extract fields from possible payload schemas
  const isUnofficial = Boolean(payload.data && (payload.data.number_key || payload.data.chat_id));
  const isWaba = payload.source === 'official' || Boolean(payload.phone_number_id);

  let rawPhone = '';
  let messageBody = '';
  let isFromMe = false;
  let watzapMsgId = '';
  let profilePic = '';
  let senderPushName = '';
  let timestamp = new Date();

  if (isUnofficial) {
    const d = payload.data || {};
    const incomingNumberKey = typeof d.number_key === 'string' ? d.number_key.trim() : '';
    if (incomingNumberKey) {
      const isExcluded = await whatsappService.isNumberKeyExcludedFromMTI(incomingNumberKey);
      if (isExcluded) {
        return { handled: false, reason: 'License disconnected from MTI' };
      }
    }
    // Skip if chat_id indicates a WhatsApp Group (@g.us)
    if (typeof d.chat_id === 'string' && d.chat_id.includes('@g.us')) {
      return { handled: false, reason: 'Group messages skipped' };
    }

    rawPhone = d.chat_id ? d.chat_id.split('@')[0] : (d.phone_no || d.phone || '');
    const hasMedia = Boolean(d.has_media);
    const mediaMime = d.media_mime || '';
    const mediaName = d.media_name || '';
    const caption = (d.message_body || '').trim();

    if (hasMedia) {
      let mediaLabel = '📷 [Foto / Gambar]';
      if (mediaMime.startsWith('audio/')) {
        mediaLabel = '🎙️ [Pesan Suara / Voice Note]';
      } else if (mediaMime.startsWith('video/')) {
        mediaLabel = '🎥 [Video]';
      } else if (mediaMime.startsWith('application/') || mediaName) {
        mediaLabel = `📄 [Dokumen: ${mediaName || 'Berkas'}]`;
      }
      messageBody = caption ? `${mediaLabel}\n${caption}` : mediaLabel;
    } else {
      messageBody = caption;
    }
    isFromMe = Boolean(d.is_from_me);
    watzapMsgId = d.message_id || '';
    profilePic = d.profile_picture || '';
    senderPushName = d.name || '';
    if (d.timestamp) {
      timestamp = new Date(d.timestamp * 1000);
    }
  } else if (isWaba) {
    const d = payload.data || {};
    rawPhone = d.phone || '';
    const hasMedia = Boolean(d.has_media);
    const caption = (d.message_text || '').trim();
    if (hasMedia) {
      messageBody = caption ? `📎 [Media]\n${caption}` : '📎 [Media / Berkas]';
    } else {
      messageBody = caption;
    }
    isFromMe = false;
    watzapMsgId = d.message_raw?.id || `waba_${Date.now()}`;
    if (d.received_at) {
      timestamp = new Date(d.received_at);
    }
  } else {
    // Generic fallback
    rawPhone = payload.phone || payload.from || payload.data?.phone || '';
    messageBody = payload.message || payload.body || payload.data?.message_body || '';
    isFromMe = Boolean(payload.is_from_me || payload.data?.is_from_me);
  }

  const { canonical } = getPhoneVariants(rawPhone);
  if (!canonical) {
    return { handled: false, reason: 'Missing or invalid phone number in payload' };
  }

  if (!messageBody && !payload.has_media) {
    return { handled: false, reason: 'Empty message body' };
  }

  const direction: 'inbound' | 'outbound' = isFromMe ? 'outbound' : 'inbound';

  // Find user match in MTI database
  const userMatch = await findUserByPhone(canonical);

  const displayName = userMatch?.nama_kunyah 
    ? `${userMatch.full_name} (${userMatch.nama_kunyah})`
    : userMatch?.full_name || senderPushName || `+${canonical}`;

  const studentIdNumber = userMatch?.student_id_number || null;
  const batchName = userMatch?.batch_name || null;
  const userId = userMatch?.id || null;

  // Deduplicate by watzap_message_id so webhook retries do not trigger duplicate AI replies
  if (watzapMsgId) {
    const existingMsg = await queryOne<{ id: string }>(
      `SELECT id FROM whatsapp_messages WHERE watzap_message_id = $1 LIMIT 1`,
      [watzapMsgId]
    );
    if (existingMsg) {
      return { handled: false, reason: 'Duplicate message ignored', messageId: existingMsg.id };
    }
  }

  return await transaction(async (client) => {
    // 1. Upsert conversation
    const upsertConvQuery = `
      INSERT INTO whatsapp_conversations (
        phone_number,
        display_name,
        user_id,
        batch_name,
        student_id_number,
        last_message,
        last_message_at,
        last_message_direction,
        unread_count,
        status,
        profile_pic_url,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10, NOW())
      ON CONFLICT (phone_number) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, whatsapp_conversations.display_name),
        user_id = COALESCE(EXCLUDED.user_id, whatsapp_conversations.user_id),
        batch_name = COALESCE(EXCLUDED.batch_name, whatsapp_conversations.batch_name),
        student_id_number = COALESCE(EXCLUDED.student_id_number, whatsapp_conversations.student_id_number),
        last_message = EXCLUDED.last_message,
        last_message_at = EXCLUDED.last_message_at,
        last_message_direction = EXCLUDED.last_message_direction,
        unread_count = CASE 
          WHEN EXCLUDED.last_message_direction = 'inbound' 
          THEN whatsapp_conversations.unread_count + 1 
          ELSE whatsapp_conversations.unread_count 
        END,
        profile_pic_url = COALESCE(EXCLUDED.profile_pic_url, whatsapp_conversations.profile_pic_url),
        status = CASE WHEN whatsapp_conversations.status = 'resolved' THEN 'open' ELSE whatsapp_conversations.status END,
        updated_at = NOW()
      RETURNING id, bot_enabled;
    `;

    const convResult = await client.query(upsertConvQuery, [
      canonical,
      displayName,
      userId,
      batchName,
      studentIdNumber,
      messageBody,
      timestamp,
      direction,
      direction === 'inbound' ? 1 : 0,
      profilePic || null,
    ]);

    const conversationId = convResult.rows[0].id;
    const botEnabled = convResult.rows[0].bot_enabled !== false;

    // 2. Insert message into whatsapp_messages
    const insertMsgQuery = `
      INSERT INTO whatsapp_messages (
        conversation_id,
        phone_number,
        direction,
        message_body,
        status,
        sender_name,
        watzap_message_id,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `;

    const msgResult = await client.query(insertMsgQuery, [
      conversationId,
      canonical,
      direction,
      messageBody,
      'received',
      direction === 'outbound' ? 'Admin MTI' : displayName,
      watzapMsgId || null,
      JSON.stringify(payload),
      timestamp,
    ]);

    return {
      handled: true,
      messageId: msgResult.rows[0].id,
      conversationId,
      phoneNumber: canonical,
      messageBody,
      direction,
      botEnabled,
      hasMedia: Boolean(payload?.data?.has_media || payload?.has_media),
    };
  });
}

/**
 * List conversations with pagination, search, and status filter
 */
export async function getConversations(params: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ conversations: WhatsAppConversation[]; total: number; totalUnread: number; totalNeedsAdmin: number }> {
  const limit = Math.min(Math.max(params.limit || 50, 1), 100);
  const offset = Math.max(params.offset || 0, 0);

  const whereClauses: string[] = [];
  const queryParams: any[] = [];
  let paramIdx = 1;

  if (params.search && params.search.trim()) {
    const q = `%${params.search.trim().toLowerCase()}%`;
    whereClauses.push(
      `(LOWER(display_name) LIKE $${paramIdx} OR phone_number LIKE $${paramIdx} OR LOWER(student_id_number) LIKE $${paramIdx})`
    );
    queryParams.push(q);
    paramIdx++;
  }

  if (params.status && params.status !== 'all') {
    if (params.status === 'unread') {
      whereClauses.push(`unread_count > 0`);
    } else if (params.status === 'needs_admin') {
      whereClauses.push(`needs_admin = true`);
    } else {
      whereClauses.push(`status = $${paramIdx}`);
      queryParams.push(params.status);
      paramIdx++;
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const listSql = `
    SELECT *
    FROM whatsapp_conversations
    ${whereSql}
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;

  const countSql = `
    SELECT 
      COUNT(*)::int AS total,
      COALESCE(SUM(CASE WHEN unread_count > 0 THEN 1 ELSE 0 END), 0)::int AS total_unread
    FROM whatsapp_conversations
    ${whereSql};
  `;

  const needsAdminCountSql = `
    SELECT COUNT(*)::int AS total_needs_admin
    FROM whatsapp_conversations
    WHERE needs_admin = true;
  `;

  const [listRes, countRes, needsAdminRes] = await Promise.all([
    query<WhatsAppConversation>(listSql, [...queryParams, limit, offset]),
    query<{ total: number; total_unread: number }>(countSql, queryParams),
    query<{ total_needs_admin: number }>(needsAdminCountSql),
  ]);

  return {
    conversations: listRes.rows,
    total: countRes.rows[0]?.total || 0,
    totalUnread: countRes.rows[0]?.total_unread || 0,
    totalNeedsAdmin: needsAdminRes.rows[0]?.total_needs_admin || 0,
  };
}

/**
 * Get messages of a specific conversation
 */
export async function getConversationMessages(conversationId: string): Promise<WhatsAppMessage[]> {
  const res = await query<WhatsAppMessage>(
    `SELECT *
     FROM whatsapp_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC
     LIMIT 500`,
    [conversationId]
  );
  return res.rows;
}

/**
 * Get single conversation by ID
 */
export async function getConversationById(id: string): Promise<WhatsAppConversation | null> {
  return await queryOne<WhatsAppConversation>(
    `SELECT * FROM whatsapp_conversations WHERE id = $1`,
    [id]
  );
}

/**
 * Send outbound reply to thalibah
 */
export async function sendReplyMessage(params: {
  conversationId: string;
  messageText: string;
  mediaUrl?: string;
  adminName: string;
  adminId?: string;
}): Promise<{ success: boolean; message?: WhatsAppMessage; error?: string }> {
  const conv = await getConversationById(params.conversationId);
  if (!conv) {
    return { success: false, error: 'Percakapan tidak ditemukan' };
  }

  const text = (params.messageText || '').trim();
  const mediaUrl = (params.mediaUrl || '').trim();
  if (!text && !mediaUrl) {
    return { success: false, error: 'Pesan balasan atau media tidak boleh kosong' };
  }

  // 1. Send via WatZap Gateway
  let sendRes;
  let savedMessageText = text;

  if (mediaUrl) {
    sendRes = await whatsappService.sendImageUrl(conv.phone_number, mediaUrl, text || undefined, { sourceTag: 'live_chat', recipientName: conv.display_name });
    savedMessageText = text ? `📷 [Foto]: ${text}` : `📷 [Foto]`;
  } else {
    sendRes = await whatsappService.sendTextMessage(conv.phone_number, text, { sourceTag: 'live_chat', recipientName: conv.display_name });
  }
  if (!sendRes.success) {
    return {
      success: false,
      error: sendRes.error || 'Gagal mengirim pesan melalui WatZap',
    };
  }

  // 2. Persist to DB and update conversation state
  const inserted = await transaction(async (client) => {
    const msgMetadata = mediaUrl
      ? {
          has_media: true,
          media_url: mediaUrl,
          media_mime: "image/jpeg",
          data: {
            has_media: true,
            media_url: mediaUrl,
            media_mime: "image/jpeg",
          },
        }
      : {};

    const insertMsgQuery = `
      INSERT INTO whatsapp_messages (
        conversation_id,
        phone_number,
        direction,
        message_body,
        status,
        sender_name,
        sender_id,
        watzap_message_id,
        metadata,
        created_at
      )
      VALUES ($1, $2, 'outbound', $3, 'sent', $4, $5, $6, $7, NOW())
      RETURNING *;
    `;

    const msgRes = await client.query(insertMsgQuery, [
      conv.id,
      conv.phone_number,
      savedMessageText,
      params.adminName || 'Admin MTI',
      params.adminId || null,
      sendRes.messageId || null,
      JSON.stringify(msgMetadata),
    ]);

    // Update conversation
    await client.query(
      `UPDATE whatsapp_conversations
       SET 
         last_message = $1,
         last_message_at = NOW(),
         last_message_direction = 'outbound',
         unread_count = 0,
         updated_at = NOW()
       WHERE id = $2`,
      [savedMessageText, conv.id]
    );

    return msgRes.rows[0];
  });

  return { success: true, message: inserted };
}

/**
 * Record an outbound message sent elsewhere in the system (e.g. Kirim Pesan Perorangan or notifications)
 * into whatsapp_conversations and whatsapp_messages.
 */
export async function recordOutboundMessage(params: {
  phoneNumber: string;
  messageText: string;
  adminName?: string;
  adminId?: string;
  watzapMessageId?: string;
  mediaUrl?: string;
}): Promise<WhatsAppMessage | null> {
  const { canonical } = getPhoneVariants(params.phoneNumber);
  if (!canonical) return null;

  const userMatch = await findUserByPhone(canonical);
  const displayName = userMatch?.nama_kunyah 
    ? `${userMatch.full_name} (${userMatch.nama_kunyah})`
    : userMatch?.full_name || `+${canonical}`;

  const studentIdNumber = userMatch?.student_id_number || null;
  const batchName = userMatch?.batch_name || null;
  const userId = userMatch?.id || null;
  const savedText = params.mediaUrl
    ? (params.messageText ? `📷 [Foto]: ${params.messageText}` : "📷 [Foto]")
    : (params.messageText || "");

  return await transaction(async (client) => {
    const upsertConvQuery = `
      INSERT INTO whatsapp_conversations (
        phone_number,
        display_name,
        user_id,
        batch_name,
        student_id_number,
        last_message,
        last_message_at,
        last_message_direction,
        unread_count,
        status,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'outbound', 0, 'open', NOW())
      ON CONFLICT (phone_number) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, whatsapp_conversations.display_name),
        user_id = COALESCE(EXCLUDED.user_id, whatsapp_conversations.user_id),
        batch_name = COALESCE(EXCLUDED.batch_name, whatsapp_conversations.batch_name),
        student_id_number = COALESCE(EXCLUDED.student_id_number, whatsapp_conversations.student_id_number),
        last_message = EXCLUDED.last_message,
        last_message_at = EXCLUDED.last_message_at,
        last_message_direction = 'outbound',
        status = CASE WHEN whatsapp_conversations.status = 'resolved' THEN 'open' ELSE whatsapp_conversations.status END,
        updated_at = NOW()
      RETURNING id;
    `;

    const convResult = await client.query(upsertConvQuery, [
      canonical,
      displayName,
      userId,
      batchName,
      studentIdNumber,
      savedText,
    ]);

    const conversationId = convResult.rows[0].id;

    const msgMetadata = params.mediaUrl
      ? {
          has_media: true,
          media_url: params.mediaUrl,
          media_mime: "image/jpeg",
        }
      : {};

    const insertMsgQuery = `
      INSERT INTO whatsapp_messages (
        conversation_id,
        phone_number,
        direction,
        message_body,
        status,
        sender_name,
        sender_id,
        watzap_message_id,
        metadata,
        created_at
      )
      VALUES ($1, $2, 'outbound', $3, 'sent', $4, $5, $6, $7, NOW())
      RETURNING *;
    `;

    const msgRes = await client.query(insertMsgQuery, [
      conversationId,
      canonical,
      savedText,
      params.adminName || "Admin MTI",
      params.adminId || null,
      params.watzapMessageId || null,
      JSON.stringify(msgMetadata),
    ]);

    return msgRes.rows[0];
  });
}

/**
 * Mark conversation as read (unread_count = 0)
 */
export async function markConversationAsRead(conversationId: string): Promise<boolean> {
  const res = await query(
    `UPDATE whatsapp_conversations
     SET unread_count = 0, updated_at = NOW()
     WHERE id = $1`,
    [conversationId]
  );
  return (res.rowCount || 0) > 0;
}

/**
 * Update conversation status ('open', 'resolved', 'archived')
 */
export async function updateConversationStatus(
  conversationId: string,
  status: 'open' | 'resolved' | 'archived'
): Promise<boolean> {
  const res = await query(
    `UPDATE whatsapp_conversations
     SET status = $1, updated_at = NOW()
     WHERE id = $2`,
    [status, conversationId]
  );
  return (res.rowCount || 0) > 0;
}

/**
 * Get current WatZap webhook configuration
 */
export async function getWatZapWebhookStatus(): Promise<{
  configured: boolean;
  webhookUrl?: string | null;
  instanceOnline?: boolean;
  instanceError?: string | null;
  error?: string;
}> {
  const apiKey = process.env.WATZAP_API_KEY?.trim();
  const numberKey = await whatsappService.getActiveNumberKey();

  if (!apiKey || !numberKey) {
    return { configured: false, error: 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum diset' };
  }

  try {
    const [webhookRes, validateRes] = await Promise.all([
      fetch('https://api.watzap.id/v1/get_webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, number_key: numberKey }),
        signal: AbortSignal.timeout(5000),
      }),
      fetch('https://api.watzap.id/v1/validate_number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, number_key: numberKey, phone_no: '628138884240' }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => null),
    ]);

    const data = await webhookRes.json();
    let instanceOnline: boolean | undefined = undefined;
    let instanceError: string | null = null;

    if (validateRes) {
      try {
        const valData = await validateRes.json();
        if (valData.status === '200' || valData.status === 200 || valData.ack === 'successfully') {
          instanceOnline = true;
        } else {
          instanceOnline = false;
          instanceError = valData.message || 'WhatsApp Instance Offline';
        }
      } catch {
        // Ignore parse error from validate_number
      }
    }

    if (data.status === '200' || data.status === 200 || data.ack === 'successfully') {
      return {
        configured: true,
        webhookUrl: data.message || null,
        instanceOnline,
        instanceError,
      };
    }

    if (data.status === '1005') {
      return { configured: false, webhookUrl: null, instanceOnline, instanceError };
    }

    return { configured: false, error: data.message, instanceOnline, instanceError };
  } catch (err: any) {
    return { configured: false, error: err.message };
  }
}

/**
 * Register or update WatZap webhook URL
 */
export async function setWatZapWebhookUrl(targetUrl: string): Promise<{ success: boolean; message?: string }> {
  const apiKey = process.env.WATZAP_API_KEY?.trim();
  const numberKey = await whatsappService.getActiveNumberKey();

  if (!apiKey || !numberKey) {
    return { success: false, message: 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum diset' };
  }

  try {
    const res = await fetch('https://api.watzap.id/v1/set_webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        number_key: numberKey,
        endpoint_url: targetUrl,
      }),
    });

    const data = await res.json();
    if (data.status === '200' || data.status === 200 || data.ack === 'successfully') {
      return { success: true, message: data.message || 'Webhook berhasil diatur' };
    }

    return { success: false, message: data.message || 'Gagal mengatur webhook' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}


export interface WhatsAppBotConfig {
  enabled: boolean;
  auto_reply_delay_ms: number;
  escalation_admin_phones: string[];
  system_prompt_extra: string;
}

const DEFAULT_BOT_CONFIG: WhatsAppBotConfig = {
  enabled: true,
  auto_reply_delay_ms: 2000,
  escalation_admin_phones: [],
  system_prompt_extra: '',
};

export async function getWhatsAppBotConfig(): Promise<WhatsAppBotConfig> {
  try {
    const row = await queryOne<{ value: any }>(
      `SELECT value FROM system_settings WHERE key = 'whatsapp_bot_config' LIMIT 1`
    );
    if (!row || !row.value) return DEFAULT_BOT_CONFIG;
    return {
      enabled: row.value.enabled !== false,
      auto_reply_delay_ms: Number(row.value.auto_reply_delay_ms) || 2000,
      escalation_admin_phones: Array.isArray(row.value.escalation_admin_phones)
        ? row.value.escalation_admin_phones
        : [],
      system_prompt_extra: typeof row.value.system_prompt_extra === 'string'
        ? row.value.system_prompt_extra
        : '',
    };
  } catch (err) {
    console.warn('[WhatsAppBot] Failed to load bot config, using default:', err);
    return DEFAULT_BOT_CONFIG;
  }
}

export async function updateWhatsAppBotConfig(
  patch: Partial<WhatsAppBotConfig>
): Promise<WhatsAppBotConfig> {
  const current = await getWhatsAppBotConfig();
  const next: WhatsAppBotConfig = {
    enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : current.enabled,
    auto_reply_delay_ms:
      patch.auto_reply_delay_ms !== undefined
        ? Math.min(Math.max(Number(patch.auto_reply_delay_ms) || 2000, 0), 10000)
        : current.auto_reply_delay_ms,
    escalation_admin_phones: Array.isArray(patch.escalation_admin_phones)
      ? patch.escalation_admin_phones.map((p) => String(p).trim()).filter(Boolean)
      : current.escalation_admin_phones,
    system_prompt_extra:
      patch.system_prompt_extra !== undefined
        ? String(patch.system_prompt_extra).slice(0, 2000)
        : current.system_prompt_extra,
  };

  await query(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ('whatsapp_bot_config', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = NOW()`,
    [JSON.stringify(next)]
  );

  return next;
}

export async function setConversationBotEnabled(
  conversationId: string,
  enabled: boolean
): Promise<boolean> {
  const res = await query(
    `UPDATE whatsapp_conversations
     SET bot_enabled = $1, updated_at = NOW()
     WHERE id = $2`,
    [enabled, conversationId]
  );
  return (res.rowCount || 0) > 0;
}

export async function setConversationEscalation(
  conversationId: string,
  needsAdmin: boolean,
  reason?: string | null
): Promise<boolean> {
  const res = await query(
    `UPDATE whatsapp_conversations
     SET needs_admin = $1,
         escalation_reason = CASE WHEN $1 THEN COALESCE($2, escalation_reason) ELSE NULL END,
         escalated_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE id = $3`,
    [needsAdmin, reason || null, conversationId]
  );
  return (res.rowCount || 0) > 0;
}

/**
 * Disables Murojaah 40x afternoon WhatsApp reminders for all user accounts
 * matching the sender's phone number and sends a non-AI system confirmation.
 */
export async function handleMurojaahOptOut(params: {
  conversationId: string;
  phoneNumber: string;
}): Promise<{
  disabledCount: number;
  matchedUsers: number;
  confirmationSent: boolean;
}> {
  const { canonical, local } = getPhoneVariants(params.phoneNumber);
  const bare = canonical.startsWith('62') ? canonical.slice(2) : canonical;
  const phoneVariants = Array.from(new Set([canonical, local, bare].filter(Boolean)));

  let userIds: string[] = [];
  if (phoneVariants.length > 0) {
    const [usersRes, regRes, convRes] = await Promise.all([
      query<{ id: string }>(
        `SELECT id FROM users
         WHERE regexp_replace(COALESCE(whatsapp, ''), '[^0-9]', '', 'g') = ANY($1::text[])`,
        [phoneVariants]
      ),
      query<{ id: string }>(
        `SELECT DISTINCT user_id AS id
         FROM pendaftaran_tikrar_tahfidz
         WHERE user_id IS NOT NULL
           AND regexp_replace(COALESCE(wa_phone, ''), '[^0-9]', '', 'g') = ANY($1::text[])`,
        [phoneVariants]
      ),
      queryOne<{ user_id: string | null }>(
        `SELECT user_id FROM whatsapp_conversations WHERE id = $1`,
        [params.conversationId]
      ),
    ]);

    const idSet = new Set<string>();
    for (const r of usersRes.rows) if (r.id) idSet.add(r.id);
    for (const r of regRes.rows) if (r.id) idSet.add(r.id);
    if (convRes?.user_id) idSet.add(convRes.user_id);
    userIds = Array.from(idSet);
  }

  let disabledCount = 0;
  let totalProgressRows = 0;

  if (userIds.length > 0) {
    const [updateRes, countRow] = await Promise.all([
      query<{ id: string }>(
        `UPDATE murojaah_40x_progress
         SET is_reminder_active = false, updated_at = NOW()
         WHERE user_id = ANY($1::uuid[])
           AND COALESCE(is_reminder_active, true) = true
         RETURNING id`,
        [userIds]
      ),
      queryOne<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt
         FROM murojaah_40x_progress
         WHERE user_id = ANY($1::uuid[])`,
        [userIds]
      ),
    ]);

    disabledCount = updateRes.rowCount || updateRes.rows.length || 0;
    totalProgressRows = Number(countRow?.cnt || 0);
  }

  const confirmationText =
    disabledCount > 0
      ? `Wa'alaikumussalam warahmatullah. Pengingat sore Murojaah 40x melalui WhatsApp telah dinonaktifkan untuk akun Ukhti. Jika suatu saat ingin menyalakannya kembali, silakan buka menu Muraja'ah 40x di https://markaztikrar.id/murojaah.`
      : totalProgressRows > 0
      ? `Wa'alaikumussalam warahmatullah. Pengingat sore Murojaah 40x untuk akun Ukhti saat ini sudah dalam status nonaktif.`
      : `Baarakallahu fiik. Permintaan STOP telah dicatat — nomor Ukhti tidak terdaftar dalam daftar pengingat sore Murojaah 40x yang aktif.`;

  const { config: autoConfig } = await getWhatsAppAutoMessagesConfig();
  const shouldSendConfirmation = autoConfig.auto_reply_stop_opt_out;

  let confirmationSent = false;
  try {
    const sendRes = shouldSendConfirmation
      ? await whatsappService.sendTextMessage(params.phoneNumber, confirmationText, { sourceTag: 'opt_out_reply' })
      : { success: false, messageId: undefined as string | undefined };
    confirmationSent = Boolean(sendRes.success);
    if (!shouldSendConfirmation) {
      console.log(`[WhatsAppOptOut] Outbound confirmation WA skipped (disabled by admin setting) for +${params.phoneNumber}`);
    }

    await transaction(async (client) => {
      if (sendRes.success) {
        await client.query(
          `INSERT INTO whatsapp_messages (
             conversation_id,
             phone_number,
             direction,
             message_body,
             status,
             sender_name,
             watzap_message_id,
             metadata,
             created_at
           )
           VALUES ($1, $2, 'outbound', $3, 'sent', $4, $5, $6, NOW())`,
          [
            params.conversationId,
            canonical || params.phoneNumber,
            confirmationText,
            'Sistem MTI (Auto Opt-Out)',
            sendRes.messageId || null,
            JSON.stringify({
              is_opt_out_reply: true,
              disabled_count: disabledCount,
              matched_users: userIds.length,
            }),
          ]
        );
      }

      await client.query(
        `UPDATE whatsapp_conversations
         SET last_message = COALESCE($1, last_message),
             last_message_at = CASE WHEN $1 IS NOT NULL THEN NOW() ELSE last_message_at END,
             last_message_direction = CASE WHEN $1 IS NOT NULL THEN 'outbound' ELSE last_message_direction END,
             unread_count = 0,
             status = 'resolved',
             updated_at = NOW()
         WHERE id = $2`,
        [sendRes.success ? confirmationText : null, params.conversationId]
      );
    });
  } catch (err) {
    console.warn('[WhatsAppOptOut] Failed sending/recording confirmation:', err);
  }

  console.log(
    `[WhatsAppOptOut] Processed STOP for +${params.phoneNumber}: matchedUsers=${userIds.length}, disabledCount=${disabledCount}, confirmationSent=${confirmationSent}`
  );

  return {
    disabledCount,
    matchedUsers: userIds.length,
    confirmationSent,
  };
}
