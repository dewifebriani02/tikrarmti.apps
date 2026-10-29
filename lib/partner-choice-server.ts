/**
 * Server-side enforcement of the partner-choice rules in lib/partner-choice.ts.
 *
 * - validateSelfMatchPartner: a self-match partner_user_id from the client must be a
 *   thalibah of the same batch who passed selection and isn't locked to someone else.
 * - writePartnerChoice: partner fields are written with a single conditional UPDATE, so a
 *   concurrent request can never rewrite a choice that got locked in the meantime.
 */

import { query, queryOne } from '@/lib/db'
import { PARTNER_CHOICE_FIELDS, isPartnerChoiceLocked, lockedSelfMatchPartnerId } from '@/lib/partner-choice'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const PARTNER_TYPES = ['self_match', 'system_match', 'family', 'tarteel'] as const

export const PARTNER_LOCKED_ERROR =
  'Pilihan pasangan Ukhti sudah terkunci. Silakan hubungi admin jika perlu perubahan.'

/** SQL twin of isPartnerChoiceLocked() for a daftar_ulang_submissions row (never NULL) */
export const PARTNER_CHOICE_LOCKED_SQL = `COALESCE(
  NULLIF(partner_type, '') IS NOT NULL
  AND COALESCE(NULLIF(partner_status, ''), status) IN ('submitted', 'approved'),
  false)`

/** The submission (or at least its partner step) is still a draft */
const PARTNER_CHOICE_DRAFT_SQL = `COALESCE(
  COALESCE(NULLIF(partner_status, ''), status) NOT IN ('submitted', 'approved'),
  true)`

export type PartnerChoice = Record<(typeof PARTNER_CHOICE_FIELDS)[number], string | null>

export const EMPTY_PARTNER_CHOICE: PartnerChoice = {
  partner_type: null,
  partner_user_id: null,
  partner_name: null,
  partner_relationship: null,
  partner_wa_phone: null,
  partner_notes: null,
}

/** Partner fields from client input: '' → null, unknown types dropped, partner_user_id only for self_match */
export function normalizePartnerChoice(
  data: Partial<Record<(typeof PARTNER_CHOICE_FIELDS)[number], unknown>>
): PartnerChoice {
  const text = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null)
  const type = text(data.partner_type)
  const partnerType = type && (PARTNER_TYPES as readonly string[]).includes(type) ? type : null
  return {
    partner_type: partnerType,
    partner_user_id: partnerType === 'self_match' ? text(data.partner_user_id) : null,
    partner_name: text(data.partner_name),
    partner_relationship: text(data.partner_relationship),
    partner_wa_phone: text(data.partner_wa_phone),
    partner_notes: text(data.partner_notes),
  }
}

/**
 * Check that `userId` may pick `partnerUserId` as self-match partner in `batchId`: another
 * registrant of that batch who passed selection (same rule as /api/daftar-ulang/partners)
 * and whose own choice isn't locked to someone else. Returns an error message, or null.
 */
export async function validateSelfMatchPartner(
  userId: string,
  batchId: string,
  partnerUserId: string
): Promise<string | null> {
  if (!UUID_RE.test(partnerUserId) || partnerUserId === userId) {
    return 'Pasangan belajar yang dipilih tidak valid.'
  }

  const candidate = await queryOne(
    `SELECT id FROM pendaftaran_tikrar_tahfidz
      WHERE user_id = $1 AND batch_id = $2
        AND (selection_status IN ('selected', 'waitlist') OR COALESCE(oral_total_score, 0) >= 80)
      LIMIT 1`,
    [partnerUserId, batchId]
  )
  if (!candidate) {
    return 'Pasangan belajar yang dipilih bukan thalibah yang lolos seleksi di angkatan ini.'
  }

  const { rows } = await query(
    `SELECT partner_type, partner_user_id, partner_status, status
       FROM daftar_ulang_submissions
      WHERE user_id = $1 AND batch_id = $2`,
    [partnerUserId, batchId]
  )
  if (rows.some(row => isPartnerChoiceLocked(row) && lockedSelfMatchPartnerId(row) !== userId)) {
    return 'Thalibah ini sudah mengunci pilihan pasangan belajarnya. Silakan pilih thalibah lain.'
  }
  return null
}

/**
 * Atomically write the partner fields of submission `submissionId`. Returns false when the
 * row no longer accepts the write.
 * - 'lock':  only while the choice is unlocked; a chosen partner type becomes locked
 *            (partner_status = 'submitted').
 * - 'draft': only while the partner step is still a draft; partner_status is left alone.
 */
export async function writePartnerChoice(
  submissionId: string,
  choice: PartnerChoice,
  mode: 'lock' | 'draft'
): Promise<boolean> {
  const sets = PARTNER_CHOICE_FIELDS.map((field, i) => `${field} = $${i + 1}`)
  if (mode === 'lock' && choice.partner_type) sets.push(`partner_status = 'submitted'`)
  const guard = mode === 'lock' ? `NOT ${PARTNER_CHOICE_LOCKED_SQL}` : PARTNER_CHOICE_DRAFT_SQL

  const { rowCount } = await query(
    `UPDATE daftar_ulang_submissions
        SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${PARTNER_CHOICE_FIELDS.length + 1} AND ${guard}`,
    [...PARTNER_CHOICE_FIELDS.map(field => choice[field]), submissionId]
  )
  return rowCount > 0
}
