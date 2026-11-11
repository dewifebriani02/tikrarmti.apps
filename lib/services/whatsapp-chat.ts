import { query, queryOne, transaction } from '@/lib/db';
import { normalizePhoneNumber, whatsappService } from './whatsapp';

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
         p.nama_lengkap AS full_name, 
         p.no_wa AS whatsapp,
         b.name AS batch_name
       FROM pendaftaran_tikrar_tahfidz p
       LEFT JOIN batches b ON b.id = p.batch_id
       WHERE regexp_replace(p.no_wa, '[^0-9]', '', 'g') IN ($1, $2)
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
export async function processIncomingWebhook(payload: any): Promise<{ handled: boolean; reason?: string; messageId?: string }> {
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
      RETURNING id;
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
}): Promise<{ conversations: WhatsAppConversation[]; total: number; totalUnread: number }> {
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

  const [listRes, countRes] = await Promise.all([
    query<WhatsAppConversation>(listSql, [...queryParams, limit, offset]),
    query<{ total: number; total_unread: number }>(countSql, queryParams),
  ]);

  return {
    conversations: listRes.rows,
    total: countRes.rows[0]?.total || 0,
    totalUnread: countRes.rows[0]?.total_unread || 0,
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
    sendRes = await whatsappService.sendImageUrl(conv.phone_number, mediaUrl, text || undefined);
    savedMessageText = text ? `📷 [Foto]: ${text}` : `📷 [Foto]`;
  } else {
    sendRes = await whatsappService.sendTextMessage(conv.phone_number, text);
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
  error?: string;
}> {
  const apiKey = process.env.WATZAP_API_KEY?.trim();
  const numberKey = process.env.WATZAP_NUMBER_KEY?.trim();

  if (!apiKey || !numberKey) {
    return { configured: false, error: 'WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum diset' };
  }

  try {
    const res = await fetch('https://api.watzap.id/v1/get_webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, number_key: numberKey }),
    });

    const data = await res.json();
    if (data.status === '200' || data.status === 200 || data.ack === 'successfully') {
      return {
        configured: true,
        webhookUrl: data.message || null,
      };
    }

    if (data.status === '1005') {
      return { configured: false, webhookUrl: null };
    }

    return { configured: false, error: data.message };
  } catch (err: any) {
    return { configured: false, error: err.message };
  }
}

/**
 * Register or update WatZap webhook URL
 */
export async function setWatZapWebhookUrl(targetUrl: string): Promise<{ success: boolean; message?: string }> {
  const apiKey = process.env.WATZAP_API_KEY?.trim();
  const numberKey = process.env.WATZAP_NUMBER_KEY?.trim();

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
