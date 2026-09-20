import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/**
 * GET /api/admin/pairing
 *
 * Fetch all pairing requests for admin review
 *
 * Query params:
 * - batch_id: Filter by batch (optional)
 * - status: Filter by status (optional) - 'pending', 'approved', 'rejected', 'paired'
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

  // 2. Parse query params
  const { searchParams } = new URL(request.url)
  const batchId = searchParams.get('batch_id')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    // 3. Fetch pairing requests with pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    // First, get total count for all partner types (both submitted and approved)
    const { count: totalCount, error: countError } = await supabase
      .from('daftar_ulang_submissions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'approved'])
      .eq('batch_id', batchId || '')

    if (countError) throw countError

    console.log('[PAIRING API] Total submissions count:', totalCount)

    // Fetch paginated data for ALL partner types
    let query = supabase
      .from('daftar_ulang_submissions')
      .select(`
        id,
        user_id,
        batch_id,
        registration_id,
        status,
        pairing_status,
        partner_type,
        partner_user_id,
        partner_name,
        partner_relationship,
        partner_notes,
        submitted_at,
        users!daftar_ulang_submissions_user_id_fkey (
          id,
          full_name,
          email,
          zona_waktu,
          whatsapp,
          tanggal_lahir
        ),
        registrations:pendaftaran_tikrar_tahfidz!daftar_ulang_submissions_registration_id_fkey (
          id,
          chosen_juz,
          main_time_slot,
          backup_time_slot,
          timezone,
          exam_score,
          oral_total_score
        ),
        batch:batches!daftar_ulang_submissions_batch_id_fkey (
          id,
          name
        )
      `)
      .in('status', ['submitted', 'approved']) // Get both submitted and approved daftar ulang

    if (batchId) {
      query = query.eq('batch_id', batchId)
    }

    // Fetch ALL submissions without pagination for filtering
    const { data: submissions, error } = await query
      .order('submitted_at', { ascending: false })

    if (error) throw error

    // 4. Filter to keep only the latest submission per user (same as statistics API)
    const uniqueUserSubmissions = new Map<string, any>()

    for (const submission of submissions || []) {
      const userId = submission.user_id

      // Only keep the latest submission for each user
      if (!uniqueUserSubmissions.has(userId)) {
        uniqueUserSubmissions.set(userId, submission)
      }
    }

    console.log('[PAIRING API] Filtered to unique users:', uniqueUserSubmissions.size, 'from', submissions?.length)

    // Convert Map to Array for iteration
    const uniqueSubmissionsArray = Array.from(uniqueUserSubmissions.values())

    // 4.1. Build a map of all self-match requests for mutual match detection
    const selfMatchMap = new Map<string, any>()
    for (const submission of uniqueSubmissionsArray) {
      if (submission.partner_type === 'self_match' && submission.partner_user_id) {
        selfMatchMap.set(submission.user_id, {
          submission_id: submission.id,
          partner_user_id: submission.partner_user_id,
          batch_id: submission.batch_id
        })
      }
    }

    // 4.2. Calculate effective partner type for non-mutual self matches
    for (const submission of uniqueSubmissionsArray) {
      if (submission.partner_type === 'self_match' && submission.partner_user_id) {
        const partnerChoice = selfMatchMap.get(submission.partner_user_id);
        const isMutualMatch = partnerChoice?.partner_user_id === submission.user_id;
        (submission as any).effective_partner_type = isMutualMatch ? 'self_match' : 'system_match';
      } else if (submission.partner_type === 'self_match' && !submission.partner_user_id) {
        (submission as any).effective_partner_type = 'system_match';
      } else {
        (submission as any).effective_partner_type = submission.partner_type;
      }
    }

    // Count per partner type after filtering and applying effective_partner_type
    const partnerTypeCounts: Record<string, number> = { self_match: 0, system_match: 0, tarteel: 0, family: 0 }
    uniqueSubmissionsArray.forEach((sub: any) => {
      const type = sub.effective_partner_type || sub.partner_type
      if (type && partnerTypeCounts.hasOwnProperty(type)) {
        partnerTypeCounts[type] = (partnerTypeCounts[type] || 0) + 1
      }
    })
    console.log('[PAIRING API] Unique users per effective partner type:', JSON.stringify(partnerTypeCounts, null, 2))

    // 4.5. Fetch all existing pairings for this batch
    const { data: existingPairings } = await supabase
      .from('study_partners')
      .select('id, user_1_id, user_2_id, user_3_id')
      .eq('batch_id', batchId || '')
      .eq('pairing_status', 'active')

    // Create a map to quickly check if a user is already paired and their pairing info
    const pairedUsersMap = new Map<string, { partnerId: string, partnerIds: string[], pairingId: string, hasSlot: boolean }>()
    for (const pairing of existingPairings || []) {
      const allMembers = [pairing.user_1_id, pairing.user_2_id, pairing.user_3_id].filter(Boolean)
      const hasSlot = !pairing.user_3_id // Has empty slot for 3rd member

      // For user_1 - always exists
      pairedUsersMap.set(pairing.user_1_id, {
        partnerId: pairing.user_2_id || pairing.user_3_id || '',
        partnerIds: allMembers.filter((id: string) => id !== pairing.user_1_id),
        pairingId: pairing.id,
        hasSlot
      })

      // For user_2 - skip if null (tarteel/family pairings)
      if (pairing.user_2_id) {
        pairedUsersMap.set(pairing.user_2_id, {
          partnerId: pairing.user_1_id,
          partnerIds: allMembers.filter((id: string) => id !== pairing.user_2_id),
          pairingId: pairing.id,
          hasSlot
        })
      }

      // For user_3 if exists
      if (pairing.user_3_id) {
        pairedUsersMap.set(pairing.user_3_id, {
          partnerId: pairing.user_1_id,
          partnerIds: allMembers.filter((id: string) => id !== pairing.user_3_id),
          pairingId: pairing.id,
          hasSlot: false
        })
      }
    }

    console.log('[PAIRING API] Existing pairings:', pairedUsersMap.size, 'users already paired')

    // Fetch all users needed by the page in two batch queries. Previously the
    // self-match and system-match loops executed two queries per thalibah,
    // causing the page to become progressively slower as the batch grew.
    const pairedUserIds = Array.from(pairedUsersMap.keys())
    const relatedUserIds = Array.from(new Set([
      ...pairedUserIds,
      ...uniqueSubmissionsArray.map((submission: any) => submission.user_id),
      ...uniqueSubmissionsArray
        .map((submission: any) => submission.partner_user_id)
        .filter(Boolean),
    ]))
    const { data: pairedUsersData } = await supabase
      .from('users')
      .select('id, full_name, email, zona_waktu, whatsapp, tanggal_lahir')
      .in('id', relatedUserIds)

    // Create a map of user_id -> full_name for paired users
    const pairedUserNamesMap = new Map<string, any>((pairedUsersData || []).map((u: any) => [u.id, u.full_name]))
    const userDetailsMap = new Map<string, any>((pairedUsersData || []).map((u: any) => [u.id, u]))

    // Fetch registration data for paired users (to get time slots and juz)
    const { data: pairedUsersRegistrations } = await supabase
      .from('pendaftaran_tikrar_tahfidz')
      .select('user_id, chosen_juz, main_time_slot, backup_time_slot, timezone, oral_total_score')
      .eq('batch_id', batchId || '')
      .in('user_id', relatedUserIds)

    const pairedUsersRegMap = new Map<string, any>((pairedUsersRegistrations || []).map((r: any) => [r.user_id, r]))

    // Build list of pairings with available slots for UI
    const pairingsWithSlots = (existingPairings || [])
      .filter(p => !p.user_3_id)
      .map(p => ({
        id: p.id,
        user_1_id: p.user_1_id,
        user_2_id: p.user_2_id,
        user_1_name: pairedUserNamesMap.get(p.user_1_id) || 'Unknown',
        user_2_name: pairedUserNamesMap.get(p.user_2_id) || 'Unknown',
        user_1_time: pairedUsersRegMap.get(p.user_1_id)?.main_time_slot || null,
        user_2_time: pairedUsersRegMap.get(p.user_2_id)?.main_time_slot || null,
        user_1_juz: pairedUsersRegMap.get(p.user_1_id)?.chosen_juz || null,
        user_2_juz: pairedUsersRegMap.get(p.user_2_id)?.chosen_juz || null,
      }))

    let batchData: any = null
    if (batchId) {
      const { data: b } = await supabase
        .from('batches')
        .select('id, name')
        .eq('id', batchId)
        .maybeSingle()
      batchData = b
    }

    const processedMutualMatches = new Set<string>() // Track processed mutual matches to avoid duplicates

    // 6. Transform data for frontend with mutual match detection
    const selfMatchRequests = []
    const systemMatchRequests = []
    const tarteelRequests = []
    const familyRequests = []

    console.log('[PAIRING API] Starting to process', uniqueSubmissionsArray.length, 'unique submissions')

    for (const submission of uniqueSubmissionsArray) {
      const userObj = userDetailsMap.get(submission.user_id) || {}
      const regObj = pairedUsersRegMap.get(submission.user_id) || {}

      // Use timezone from registration (pendaftaran_tikrar_tahfidz) if available,
      // otherwise fall back to zona_waktu from users table
      const userTimezone = regObj.timezone || userObj.zona_waktu || 'WIB'

      const requestData = {
        id: submission.id,
        user_id: submission.user_id,
        user_name: userObj.full_name || submission.confirmed_full_name || 'Hamba Allah',
        user_email: userObj.email || '',
        user_zona_waktu: userTimezone,
        user_wa_phone: userObj.whatsapp || submission.confirmed_wa_phone || '',
        user_tanggal_lahir: userObj.tanggal_lahir || null,
        chosen_juz: submission.confirmed_chosen_juz || regObj.chosen_juz || '-',
        main_time_slot: submission.confirmed_main_time_slot || regObj.main_time_slot || '-',
        backup_time_slot: submission.confirmed_backup_time_slot || regObj.backup_time_slot || '-',
        exam_score: regObj.oral_total_score ?? regObj.exam_score ?? null,
        partner_type: submission.partner_type,
        partner_id: submission.partner_user_id,
        partner_name: submission.partner_name,
        partner_relationship: submission.partner_relationship,
        partner_notes: submission.partner_notes,
        partner_wa_phone: submission.partner_wa_phone,
        submitted_at: submission.submitted_at,
        batch_id: submission.batch_id,
        batch_name: batchData?.name || '',
      }

      if (submission.effective_partner_type === 'self_match') {
        // Skip if this is the second half of a mutual match (already processed)
        if (processedMutualMatches.has(submission.user_id)) {
          continue
        }

        // Fetch partner details and check for mutual match
        if (submission.partner_user_id) {
          const partnerUser = userDetailsMap.get(submission.partner_user_id) || null
          const partnerRegistration = pairedUsersRegMap.get(submission.partner_user_id) || null

          // Check for mutual match: does the partner also choose this user?
          const partnerChoice = selfMatchMap.get(submission.partner_user_id)
          const isMutualMatch = partnerChoice?.partner_user_id === submission.user_id

          // Get partner's submission if mutual match exists
          let partnerSubmissionId = null
          if (isMutualMatch && partnerChoice) {
            partnerSubmissionId = partnerChoice.submission_id
            // Mark the partner as processed so we don't show them again
            processedMutualMatches.add(submission.partner_user_id)
          }

          // Check if this user is already paired (from study_partners table)
          const selfPairingInfo = pairedUsersMap.get(submission.user_id)
          const selfPartnerNames = selfPairingInfo
            ? selfPairingInfo.partnerIds.map(id => pairedUserNamesMap.get(id) || 'Unknown')
            : []

          selfMatchRequests.push({
            ...requestData,
            partner_details: partnerUser ? {
              id: partnerUser.id,
              full_name: partnerUser.full_name,
              email: partnerUser.email,
              zona_waktu: partnerRegistration?.timezone || partnerUser.zona_waktu || 'WIB',
              wa_phone: partnerUser.whatsapp,
              tanggal_lahir: partnerUser.tanggal_lahir,
              chosen_juz: partnerRegistration?.chosen_juz || 'N/A',
              main_time_slot: partnerRegistration?.main_time_slot || 'N/A',
              backup_time_slot: partnerRegistration?.backup_time_slot || 'N/A',
              exam_score: partnerRegistration?.oral_total_score,
              is_registered_in_batch: !!partnerRegistration,
            } : null,
            is_mutual_match: isMutualMatch,
            partner_submission_id: partnerSubmissionId,
            // Pairing status from study_partners
            is_paired: !!selfPairingInfo || submission.pairing_status === 'paired',
            paired_partner_name: selfPartnerNames.length > 0 ? selfPartnerNames.join(', ') : null,
            paired_partner_names: selfPartnerNames,
            pairing_id: selfPairingInfo?.pairingId || null,
          })
        }
      } else if (submission.effective_partner_type === 'system_match') {
        // Check if this user is already paired
        const pairingInfo = pairedUsersMap.get(submission.user_id)
        const partnerNames = pairingInfo
          ? pairingInfo.partnerIds.map(id => pairedUserNamesMap.get(id) || 'Unknown')
          : []

        // Calculate matching statistics for this user
        const matchStats = calculateMatchingStatistics(
          submission.user_id,
          regObj.chosen_juz ? regObj : {
            chosen_juz: submission.confirmed_chosen_juz,
            main_time_slot: submission.confirmed_main_time_slot,
            backup_time_slot: submission.confirmed_backup_time_slot,
            timezone: userTimezone,
          },
          uniqueSubmissionsArray,
          pairedUsersMap, // Exclude already paired users from statistics
          userDetailsMap,
          pairedUsersRegMap
        )

        // Get partner details for analysis (when paired)
        let partnerDetails = null
        if (pairingInfo && pairingInfo.partnerIds.length > 0) {
          // Get the first partner's details
          const firstPartnerId = pairingInfo.partnerIds[0]
          const partnerRegistration = pairedUsersRegMap.get(firstPartnerId)
          if (partnerRegistration) {
            partnerDetails = {
              chosen_juz: partnerRegistration.chosen_juz || 'N/A',
              zona_waktu: partnerRegistration.timezone || 'WIB',
              main_time_slot: partnerRegistration.main_time_slot || 'N/A',
              backup_time_slot: partnerRegistration.backup_time_slot || 'N/A',
              exam_score: partnerRegistration.oral_total_score,
              oral_total_score: partnerRegistration.oral_total_score,
            }
          }
        }

        systemMatchRequests.push({
          ...requestData,
          partner_name: partnerNames.length > 0 ? partnerNames.join(', ') : null,
          partner_names: partnerNames,
          partner_user_id: pairingInfo?.partnerId || null,
          partner_user_ids: pairingInfo?.partnerIds || [],
          pairing_id: pairingInfo?.pairingId || null,
          is_paired: !!pairingInfo,
          partner_details: partnerDetails,
          original_partner_type: submission.partner_type, // Keep track of the original choice
          ...matchStats
        })
      } else if (submission.partner_type === 'tarteel') {
        // Check if this user is already paired
        const tarteelPairingInfo = pairedUsersMap.get(submission.user_id)
        const tarteelPartnerNames = tarteelPairingInfo
          ? tarteelPairingInfo.partnerIds.map(id => pairedUserNamesMap.get(id) || 'Unknown')
          : []

        tarteelRequests.push({
          ...requestData,
          is_paired: !!tarteelPairingInfo || submission.pairing_status === 'paired',
          paired_partner_name: tarteelPartnerNames.length > 0 ? tarteelPartnerNames.join(', ') : null,
          paired_partner_names: tarteelPartnerNames,
          pairing_id: tarteelPairingInfo?.pairingId || null,
        })
      } else if (submission.partner_type === 'family') {
        // Check if this user is already paired
        const familyPairingInfo = pairedUsersMap.get(submission.user_id)
        const familyPartnerNames = familyPairingInfo
          ? familyPairingInfo.partnerIds.map(id => pairedUserNamesMap.get(id) || 'Unknown')
          : []

        familyRequests.push({
          ...requestData,
          is_paired: !!familyPairingInfo || submission.pairing_status === 'paired',
          paired_partner_name: familyPartnerNames.length > 0 ? familyPartnerNames.join(', ') : null,
          paired_partner_names: familyPartnerNames,
          pairing_id: familyPairingInfo?.pairingId || null,
        })
      }
    }

    // Count mutual matches vs non-mutual
    const mutualMatchCount = selfMatchRequests.filter((r: any) => r.is_mutual_match).length
    const nonMutualMatchCount = selfMatchRequests.length - mutualMatchCount
    console.log('[PAIRING API] Final counts - Self:', selfMatchRequests.length, `(${mutualMatchCount} mutual + ${nonMutualMatchCount} non-mutual)`, 'System:', systemMatchRequests.length, 'Tarteel:', tarteelRequests.length, 'Family:', familyRequests.length)

    return NextResponse.json({
      success: true,
      data: {
        self_match_requests: selfMatchRequests,
        system_match_requests: systemMatchRequests,
        tarteel_requests: tarteelRequests,
        family_requests: familyRequests,
        pairings_with_slots: pairingsWithSlots, // Pairings that can accept a 3rd member
      },
      meta: {
        totalSubmissions: uniqueSubmissionsArray.length,
        partnerTypeCounts: partnerTypeCounts,
        finalCounts: {
          selfMatch: selfMatchRequests.length,
          systemMatch: systemMatchRequests.length,
          tarteel: tarteelRequests.length,
          family: familyRequests.length,
        },
        selfMatchBreakdown: {
          totalUsers: partnerTypeCounts.self_match,
          mutualMatchPairs: mutualMatchCount,
          nonMutualUsers: nonMutualMatchCount,
          totalEntriesShown: selfMatchRequests.length,
          explanation: `${partnerTypeCounts.self_match} unique users = ${mutualMatchCount} mutual pairs (${mutualMatchCount * 2} users) + ${nonMutualMatchCount} non-mutual users = ${selfMatchRequests.length} entries displayed`
        },
        logs: {
          totalSubmissionsCount: totalCount,
          filteredToUniqueUsers: `${uniqueSubmissionsArray.length} from ${submissions?.length}`,
          uniqueUsersPerPartnerType: partnerTypeCounts,
          finalCounts: {
            selfMatch: selfMatchRequests.length,
            systemMatch: systemMatchRequests.length,
            tarteel: tarteelRequests.length,
            family: familyRequests.length,
          },
        },
      },
      pagination: {
        page,
        limit,
        total: uniqueSubmissionsArray.length, // Use unique users count
        totalPages: 1, // All data shown on one page
        originalTotal: totalCount || 0, // Original submission count for reference
      },
    })
  } catch (error: any) {
    console.error('Error fetching pairing requests:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch pairing requests' },
      { status: 500 }
    )
  }
}

/**
 * Calculate matching statistics for a system_match user
 */
function calculateMatchingStatistics(
  userId: string,
  userRegistration: any,
  allSubmissions: any[],
  pairedUsersMap: Map<string, { partnerId: string, partnerIds: string[], pairingId: string, hasSlot: boolean }>,
  usersMap: Map<string, any>,
  regMap: Map<string, any>
) {
  // Get all other system_match users
  const otherUsers = allSubmissions.filter(
    s => s.effective_partner_type === 'system_match' &&
           (s.status === 'submitted' || s.status === 'approved') &&
           s.user_id !== userId &&
           !pairedUsersMap?.has(s.user_id) // Exclude already paired users
  )

  const userTimezone = userRegistration?.timezone || 'WIB'
  const userJuz = userRegistration?.chosen_juz

  // Counters for detailed statistics
  let perfectMatches = 0 // Zona + Juz + Waktu Utama cocok
  let zonaWaktuMatches = 0 // Zona sama, juz beda
  let sameJuzMatches = 0 // Juz sama, zona beda
  let crossJuzMatches = 0 // Lintas juz dan zona
  let mainTimeMatches = 0 // Waktu utama cocok
  let backupTimeMatches = 0 // Waktu cadangan cocok

  for (const otherUser of otherUsers) {
    const otherReg = regMap.get(otherUser.user_id)
    if (!otherReg) {
      continue
    }

    const otherTimezone = otherReg.timezone || usersMap.get(otherUser.user_id)?.zona_waktu || 'WIB'
    const otherJuz = otherReg.chosen_juz

    // Calculate score
    let score = 0

    // Priority 1: Zona waktu sama (+50 points)
    const zonaMatch = userTimezone === otherTimezone
    if (zonaMatch) score += 50

    // Priority 2: Juz option sama (+50 points)
    const juzMatch = userJuz === otherJuz
    if (juzMatch) score += 50

    // Priority 3: Time slot overlap
    const userMain = userRegistration?.main_time_slot
    const otherMain = otherReg.main_time_slot
    const userBackup = userRegistration?.backup_time_slot
    const otherBackup = otherReg.backup_time_slot

    const mainTimeMatch = hasTimeSlotOverlap(userMain, otherMain)
    const backupTimeMatch = hasTimeSlotOverlap(userMain, otherBackup) ||
                            hasTimeSlotOverlap(userBackup, otherMain) ||
                            hasTimeSlotOverlap(userBackup, otherBackup)

    if (mainTimeMatch) {
      score += 10
      mainTimeMatches++
    }
    if (backupTimeMatch) {
      score += 5
      backupTimeMatches++
    }

    // Categorize based on priority
    if (zonaMatch && juzMatch && mainTimeMatch) {
      // Perfect match: Zona + Juz + Waktu Utama cocok
      perfectMatches++
    } else if (zonaMatch && juzMatch) {
      // Zona + Juz sama (tapi waktu utama tidak cocok)
      zonaWaktuMatches++
    } else if (zonaMatch && !juzMatch) {
      // Zona sama, juz beda
      zonaWaktuMatches++
    } else if (!zonaMatch && juzMatch) {
      // Juz sama, zona beda
      sameJuzMatches++
    } else {
      // Lintas juz dan zona
      crossJuzMatches++
    }
  }

  // Total matches is the count of all candidates with score >= 50
  const totalMatches = otherUsers.filter(otherUser => {
    const otherReg = regMap.get(otherUser.user_id)
    if (!otherReg) return false

    const otherTimezone = otherReg.timezone || usersMap.get(otherUser.user_id)?.zona_waktu || 'WIB'
    const otherJuz = otherReg.chosen_juz

    return userTimezone === otherTimezone || userJuz === otherJuz
  }).length

  return {
    total_matches: totalMatches,
    perfect_matches: perfectMatches,
    zona_waktu_matches: zonaWaktuMatches,
    same_juz_matches: sameJuzMatches,
    cross_juz_matches: crossJuzMatches,
    main_time_matches: mainTimeMatches,
    backup_time_matches: backupTimeMatches,
  }
}

/**
 * Check if two time slots overlap
 */
function hasTimeSlotOverlap(slot1: string, slot2: string): boolean {
  if (!slot1 || !slot2) return false

  const parseSlot = (slot: string) => {
    const [start, end] = slot.split('-').map(Number)
    return { start, end }
  }

  const s1 = parseSlot(slot1)
  const s2 = parseSlot(slot2)

  return s1.start < s2.end && s2.start < s1.end
}
