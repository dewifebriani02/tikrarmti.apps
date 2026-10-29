/**
 * Partner-choice locking for daftar_ulang_submissions.
 *
 * A partner choice is locked once its effective status (partner_status, falling
 * back to the overall submission status — same convention as the dashboard and
 * perjalanan-saya) is submitted/approved. A locked choice can only be changed by
 * an admin (e.g. setting partner_status back to 'draft').
 *
 * Self-match WhatsApp numbers are revealed only for locked choices, so the
 * server must never let a thalibah rewrite a locked choice — otherwise she could
 * cycle partner_user_id to harvest every number in the batch.
 */

export interface PartnerChoiceRow {
  partner_type?: string | null
  partner_user_id?: string | null
  partner_status?: string | null
  status?: string | null
}

export const PARTNER_CHOICE_FIELDS = [
  'partner_type',
  'partner_user_id',
  'partner_name',
  'partner_relationship',
  'partner_wa_phone',
  'partner_notes',
] as const

export function isPartnerChoiceLocked(row: PartnerChoiceRow | null | undefined): boolean {
  if (!row?.partner_type) return false
  const effectiveStatus = row.partner_status || row.status
  return effectiveStatus === 'submitted' || effectiveStatus === 'approved'
}

/** The self-match partner this row has locked in, or null */
export function lockedSelfMatchPartnerId(row: PartnerChoiceRow | null | undefined): string | null {
  if (!row || row.partner_type !== 'self_match' || !row.partner_user_id) return null
  return isPartnerChoiceLocked(row) ? row.partner_user_id : null
}

/** Copy of `data` without partner fields, for writes against a locked choice */
export function withoutPartnerChoiceFields<T extends Record<string, any>>(data: T): T {
  const copy: Record<string, any> = { ...data }
  for (const field of PARTNER_CHOICE_FIELDS) delete copy[field]
  return copy as T
}
