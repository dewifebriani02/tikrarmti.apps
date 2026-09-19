import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/**
 * GET /api/admin/pairing/statistics
 *
 * Get pairing statistics for admin dashboard
 * Returns waiting and paired counts for each partner type.
 * Counts UNIQUE thalibah, not submission rows or pairing groups.
 */
export async function GET(request: Request) {
  const supabase = createClient()

  // 1. Verify admin access
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.roles || !profile.roles.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    let targetBatchId = (batchId && batchId !== 'null' && batchId !== 'undefined') ? batchId : null
    if (!targetBatchId) {
      const { data: activeBatch } = await supabase
        .from('batches')
        .select('id')
        .in('status', ['open', 'ongoing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      targetBatchId = activeBatch?.id
    }

    if (!targetBatchId) {
      return NextResponse.json({
        total: 0,
        totalApproved: 0,
        selfMatch: { submitted: 0, approved: 0 },
        systemMatch: { submitted: 0, approved: 0 },
        tarteel: { submitted: 0, approved: 0 },
        family: { submitted: 0, approved: 0 },
        mandiri: { submitted: 0, approved: 0 },
        tidak_bersedia: { submitted: 0, approved: 0 },
        waiting: 0,
        paired: 0
      })
    }

    // Get all submissions so we can keep only the latest choice per thalibah.
    const { data: allSubmissions, error: allError } = await supabase
      .from('daftar_ulang_submissions')
      .select('id, user_id, partner_type, partner_user_id, partner_status, pairing_status, status')
      .eq('batch_id', targetBatchId)
      .order('created_at', { ascending: false }) // Order by created_at DESC to get latest submission first

    if (allError) throw allError

    console.log('[STATS DEBUG] Total submissions fetched:', allSubmissions?.length)
    console.log('[STATS DEBUG] Sample first 3 submissions:', JSON.stringify(allSubmissions?.slice(0, 3), null, 2))

    // Keep the existing response keys for frontend compatibility:
    // approved = paired, submitted = waiting.
    const statistics = {
      total: 0,
      totalApproved: 0,
      selfMatch: { submitted: 0, approved: 0 },
      systemMatch: { submitted: 0, approved: 0 },
      tarteel: { submitted: 0, approved: 0 },
      family: { submitted: 0, approved: 0 },
    }

    const userSubmissions = new Map<string, {
      submission_id: string
      partner_type: string
      partner_user_id: string | null
      partner_status: string | null
      pairing_status: string | null
      status: string
      effective_partner_type?: string
    }>()

    // Process submissions in order (latest first)
    for (const submission of allSubmissions || []) {
      const userId = submission.user_id

      // Only keep the latest submission for each user
      if (!userSubmissions.has(userId)) {
        userSubmissions.set(userId, {
          submission_id: submission.id,
          partner_type: submission.partner_type,
          partner_user_id: submission.partner_user_id,
          partner_status: submission.partner_status,
          pairing_status: submission.pairing_status,
          status: submission.status,
        })
      }
    }

    console.log('[STATS DEBUG] Unique users:', userSubmissions.size)
    statistics.total = userSubmissions.size
    statistics.totalApproved = Array.from(userSubmissions.values()).filter(s => s.status === 'approved').length

    // Determine effective partner type based on mutual match
    userSubmissions.forEach((sub, userId) => {
      if (sub.partner_type === 'self_match' && sub.partner_user_id) {
        const partnerChoice = userSubmissions.get(sub.partner_user_id)
        const isMutualMatch = partnerChoice?.partner_user_id === userId
        sub.effective_partner_type = isMutualMatch ? 'self_match' : 'system_match'
      } else if (sub.partner_type === 'self_match' && !sub.partner_user_id) {
        sub.effective_partner_type = 'system_match'
      } else {
        sub.effective_partner_type = sub.partner_type
      }
    })

    const { data: activePairings, error: pairingsError } = await supabase
      .from('study_partners')
      .select('pairing_type, user_1_id, user_2_id, user_3_id')
      .eq('batch_id', targetBatchId)
      .eq('pairing_status', 'active')

    if (pairingsError) throw pairingsError

    const pairedUsers = {
      self_match: new Set<string>(),
      system_match: new Set<string>(),
      tarteel: new Set<string>(),
      family: new Set<string>(),
    }

    for (const pairing of activePairings || []) {
      const type = pairing.pairing_type as keyof typeof pairedUsers
      const target = pairedUsers[type]
      if (!target) continue
      if (pairing.user_1_id) target.add(pairing.user_1_id)
      if (pairing.user_2_id) target.add(pairing.user_2_id)
      if (pairing.user_3_id) target.add(pairing.user_3_id)
    }

    // Also include those whose submission pairing_status is 'paired' (fallback for Tarteel/Family)
    userSubmissions.forEach((sub, userId) => {
      if (sub.pairing_status === 'paired') {
        const type = (sub.effective_partner_type || sub.partner_type) as keyof typeof pairedUsers
        if (pairedUsers[type]) {
          pairedUsers[type].add(userId)
        }
      }
    })

    statistics.selfMatch.approved = pairedUsers.self_match.size
    statistics.systemMatch.approved = pairedUsers.system_match.size
    statistics.tarteel.approved = pairedUsers.tarteel.size
    statistics.family.approved = pairedUsers.family.size

    const statForType = (type: string) => {
      if (type === 'self_match') return statistics.selfMatch
      if (type === 'system_match') return statistics.systemMatch
      if (type === 'tarteel') return statistics.tarteel
      if (type === 'family') return statistics.family
      return null
    }

    userSubmissions.forEach((submission, userId) => {
      const type = (submission.effective_partner_type || submission.partner_type) as keyof typeof pairedUsers
      const targetStat = statForType(type)
      if (!targetStat || pairedUsers[type]?.has(userId)) return

      // A submitted/approved partner choice that has no active study partner
      // is still waiting to be paired.
      if (submission.partner_status === 'submitted' || submission.partner_status === 'approved') {
        targetStat.submitted++
      }
    })

    console.log('[STATS DEBUG] Final statistics:', JSON.stringify(statistics, null, 2))

    return NextResponse.json({
      success: true,
      data: statistics,
    })
  } catch (error: any) {
    console.error('Error fetching pairing statistics:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch pairing statistics' },
      { status: 500 }
    )
  }
}
