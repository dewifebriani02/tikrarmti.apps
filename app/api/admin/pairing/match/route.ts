import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/pairing/match
 *
 * Get matching candidates for a specific user
 *
 * Query params:
 * - user_id: User ID to find matches for (required)
 * - batch_id: Batch ID (required)
 */
export async function GET(request: Request) {
  console.log('[MATCH API] ========== MATCH API CALLED ==========')
  console.log('[MATCH API] URL:', request.url)

  const supabase = createClient()

  // 1. Verify admin access
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.roles || !profile.roles.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse query params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const batchId = searchParams.get('batch_id')

  console.log('[MATCH API] Query params:', { userId, batchId })

  if (!userId || !batchId) {
    return NextResponse.json(
      { error: 'user_id and batch_id are required' },
      { status: 400 }
    )
  }

  try {
    // 3. Fetch user data from daftar_ulang_submissions (not pendaftaran_tikrar_tahfidz)
    const { data: userData, error: userError } = await supabase
      .from('daftar_ulang_submissions')
      .select(`
        user_id,
        batch_id,
        registration_id,
        partner_type,
        users!daftar_ulang_submissions_user_id_fkey (
          id,
          full_name,
          email,
          zona_waktu,
          whatsapp
        ),
        registrations:pendaftaran_tikrar_tahfidz!daftar_ulang_submissions_registration_id_fkey (
          user_id,
          full_name,
          chosen_juz,
          main_time_slot,
          backup_time_slot,
          timezone,
          oral_total_score
        )
      `)
      .eq('user_id', userId)
      .eq('batch_id', batchId)
      .single()

    console.log('[MATCH API] User data lookup:', { data: userData, error: userError })

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found in this batch' },
        { status: 404 }
      )
    }

    // Use timezone from registration if available, otherwise fall back to users.zona_waktu
    const userDataUsers = (Array.isArray(userData.users) ? userData.users : (userData.users ? [userData.users] : [])) as any
    const userRegistrations = (Array.isArray(userData.registrations) ? userData.registrations : (userData.registrations ? [userData.registrations] : [])) as any

    const userTimezone = userRegistrations?.[0]?.timezone || userDataUsers?.[0]?.zona_waktu || 'WIB'
    const userChosenJuz = userRegistrations?.[0]?.chosen_juz || 'N/A'
    const userMainTimeSlot = userRegistrations?.[0]?.main_time_slot || 'N/A'
    const userBackupTimeSlot = userRegistrations?.[0]?.backup_time_slot || 'N/A'
    const userOralScore = userRegistrations?.[0]?.oral_total_score || 0

    console.log('[MATCH API] User parsed data:', {
      user_id: userData.user_id,
      userTimezone,
      userChosenJuz,
      userMainTimeSlot,
      userBackupTimeSlot,
      hasUsers: !!userData.users,
      hasRegistrations: !!userData.registrations,
    })

    // 4. Fetch existing pairings to exclude already paired users
    const { data: existingPairings } = await supabase
      .from('study_partners')
      .select('user_1_id, user_2_id, user_3_id')
      .eq('batch_id', batchId)
      .eq('pairing_status', 'active')

    // Create a set of already paired user IDs
    const pairedUserIds = new Set<string>()
    for (const pairing of existingPairings || []) {
      pairedUserIds.add(pairing.user_1_id)
      if (pairing.user_2_id) pairedUserIds.add(pairing.user_2_id)
      if (pairing.user_3_id) pairedUserIds.add(pairing.user_3_id)
    }

    console.log('[MATCH API] Paired users to exclude:', pairedUserIds.size)

    // 5. Fetch all potential candidates - ALL submissions regardless of partner_type
    // We want to show ALL users who haven't been paired yet
    const { data: submissions, error: submissionsError } = await supabase
      .from('daftar_ulang_submissions')
      .select('user_id')
      .eq('batch_id', batchId)
      .eq('partner_type', 'system_match')
      .in('status', ['submitted', 'approved']) // Include both submitted and approved
      .neq('user_id', userId) // Exclude self

    if (submissionsError) throw submissionsError

    // Filter out already paired users
    const availableUserIds: string[] = Array.from(new Set(
      (submissions || [])
        .filter((s: any) => !pairedUserIds.has(s.user_id))
        .map((s: any) => s.user_id)
    ))

    console.log('[MATCH API] Submissions found:', submissions?.length || 0, 'After filtering paired:', availableUserIds.length)

    // Get all user_ids from available submissions
    const userIds = availableUserIds
    console.log('[MATCH API] User IDs to fetch:', userIds)

    // Fetch user data for all candidates
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, zona_waktu, whatsapp, tanggal_lahir')
      .in('id', userIds)

    if (usersError) throw usersError

    console.log('[MATCH API] Users data fetched:', usersData?.length || 0)

    // Fetch registration data for all candidates
    const { data: registrationsData, error: registrationsError } = await supabase
      .from('pendaftaran_tikrar_tahfidz')
      .select('user_id, chosen_juz, main_time_slot, backup_time_slot, timezone, oral_total_score')
      .eq('batch_id', batchId)
      .in('user_id', userIds)

    if (registrationsError) throw registrationsError

    console.log('[MATCH API] Registrations data fetched:', registrationsData?.length || 0)

    // Create maps for quick lookup
    const usersMap = new Map<string, any>((usersData || []).map((u: any) => [u.id, u]))
    const registrationsMap = new Map<string, any>((registrationsData || []).map((r: any) => [r.user_id, r]))

    // 6. Calculate matches with scoring
    const matches: any[] = []

    for (const candidateUserId of availableUserIds) {
      const user = usersMap.get(candidateUserId)
      const registration = registrationsMap.get(candidateUserId)

      console.log('[MATCH API] Processing candidate:', {
        user_id: candidateUserId,
        hasUser: !!user,
        hasRegistration: !!registration,
        user,
        registration,
      })

      if (!user) {
        console.log('[MATCH API] Skipping candidate - no user data:', candidateUserId)
        continue
      }

      // Use timezone from registration if available, otherwise fall back to users.zona_waktu
      const candidateTimezone = registration?.timezone || user.zona_waktu || 'WIB'

      const candidateData = {
        user_id: candidateUserId,
        full_name: user.full_name,
        email: user.email,
        zona_waktu: candidateTimezone,
        wa_phone: user.whatsapp,
        tanggal_lahir: user.tanggal_lahir,
        chosen_juz: registration?.chosen_juz || 'N/A',
        main_time_slot: registration?.main_time_slot || 'N/A',
        backup_time_slot: registration?.backup_time_slot || 'N/A',
        oral_total_score: registration?.oral_total_score || 0,
      }

      console.log('[MATCH API] Candidate data prepared:', candidateData)

      // Calculate matching score - pass parsed user data
      const score = calculateMatchScore(
        {
          chosen_juz: userChosenJuz,
          zona_waktu: userTimezone,
          main_time_slot: userMainTimeSlot,
          backup_time_slot: userBackupTimeSlot,
          oral_total_score: userOralScore,
        },
        candidateData
      )

      matches.push({
        ...candidateData,
        match_score: score,
        match_reasons: getMatchReasons(
          {
            chosen_juz: userChosenJuz,
            zona_waktu: userTimezone,
            main_time_slot: userMainTimeSlot,
            backup_time_slot: userBackupTimeSlot,
            oral_total_score: userOralScore,
          },
          candidateData
        ),
      })
    }

    // 7. Sort by score (highest first)
    matches.sort((a, b) => b.match_score - a.match_score)

    console.log('[MATCH API] Total matches calculated:', matches.length)

    // 8. Group by match type - NEW PRIORITY ORDER
    // Priority 1: Zona Waktu + Waktu Utama + Juz Sama (Perfect match)
    // Priority 2: Zona Waktu + Waktu Utama + Juz Beda
    // Priority 3: Zona Waktu + Waktu Cadangan + Juz Sama
    // Priority 4: Zona Waktu + Waktu Cadangan + Juz Beda
    // Priority 5: Lintas zona waktu

    const zonaWaktuUtamaJuzMatches = matches.filter(m =>
      m.match_reasons.some(r => r.includes('Zona waktu sama')) &&
      m.match_reasons.some(r => r.includes('Waktu utama cocok')) &&
      m.match_reasons.some(r => r.includes('Juz sama'))
    ) // Zona + Waktu Utama + Juz Sama

    const zonaWaktuUtamaJuzBedaMatches = matches.filter(m =>
      m.match_reasons.some(r => r.includes('Zona waktu sama')) &&
      m.match_reasons.some(r => r.includes('Waktu utama cocok')) &&
      !m.match_reasons.some(r => r.includes('Juz sama'))
    ) // Zona + Waktu Utama + Juz Beda

    const zonaWaktuCadanganJuzMatches = matches.filter(m =>
      m.match_reasons.some(r => r.includes('Zona waktu sama')) &&
      m.match_reasons.some(r => r.includes('Waktu cadangan cocok')) &&
      m.match_reasons.some(r => r.includes('Juz sama')) &&
      !m.match_reasons.some(r => r.includes('Waktu utama cocok'))
    ) // Zona + Waktu Cadangan + Juz Sama (tanpa waktu utama)

    const zonaWaktuCadanganJuzBedaMatches = matches.filter(m =>
      m.match_reasons.some(r => r.includes('Zona waktu sama')) &&
      m.match_reasons.some(r => r.includes('Waktu cadangan cocok')) &&
      !m.match_reasons.some(r => r.includes('Juz sama')) &&
      !m.match_reasons.some(r => r.includes('Waktu utama cocok'))
    ) // Zona + Waktu Cadangan + Juz Beda (tanpa waktu utama)

    const crossZonaMatches = matches.filter(m =>
      !m.match_reasons.some(r => r.includes('Zona waktu sama'))
    ) // Lintas zona waktu

    console.log('[MATCH API] Match groups:', {
      zona_waktu_utama_juz: zonaWaktuUtamaJuzMatches.length,
      zona_waktu_utama_juz_beda: zonaWaktuUtamaJuzBedaMatches.length,
      zona_waktu_cadangan_juz: zonaWaktuCadanganJuzMatches.length,
      zona_waktu_cadangan_juz_beda: zonaWaktuCadanganJuzBedaMatches.length,
      cross_zona: crossZonaMatches.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          user_id: userData.user_id,
          full_name: userDataUsers?.[0]?.full_name || 'Unknown',
          chosen_juz: userChosenJuz,
          zona_waktu: userTimezone,
          main_time_slot: userMainTimeSlot,
          backup_time_slot: userBackupTimeSlot,
        },
        matches: {
          zona_waktu_utama_juz: zonaWaktuUtamaJuzMatches,      // Zona + Waktu Utama + Juz Sama
          zona_waktu_utama_juz_beda: zonaWaktuUtamaJuzBedaMatches, // Zona + Waktu Utama + Juz Beda
          zona_waktu_cadangan_juz: zonaWaktuCadanganJuzMatches, // Zona + Waktu Cadangan + Juz Sama
          zona_waktu_cadangan_juz_beda: zonaWaktuCadanganJuzBedaMatches, // Zona + Waktu Cadangan + Juz Beda
          cross_zona: crossZonaMatches,   // Lintas zona waktu
        },
        candidates: matches,
        total_matches: matches.length,
      },
    })
  } catch (error: any) {
    console.error('Error calculating matches:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to calculate matches' },
      { status: 500 }
    )
  }
}

/**
 * Calculate match score between two users
 *
 * Scoring uses lexicographic weights so a higher-priority criterion always
 * beats every possible combination below it:
 * - Waktu utama cocok: +1000
 * - Waktu cadangan cocok: +100
 * - Juz option sama: +10
 * - Zona waktu sama: +1
 */
function calculateMatchScore(user1: any, user2: any): number {
  let score = 0

  const user1Zona = user1.zona_waktu
  const user2Zona = user2.zona_waktu

  const user1Juz = user1.chosen_juz
  const user2Juz = user2.chosen_juz

  // Priority 1: Waktu utama cocok
  if (hasTimeSlotOverlap(user1.main_time_slot, user2.main_time_slot)) {
    score += 1000000
  }

  // Priority 2: Waktu utama dan cadangan cocok
  if (hasTimeSlotOverlap(user1.main_time_slot, user2.backup_time_slot) ||
      hasTimeSlotOverlap(user1.backup_time_slot, user2.main_time_slot)) {
    score += 100000
  }

  // Priority 3: Waktu cadangan cocok
  if (hasTimeSlotOverlap(user1.backup_time_slot, user2.backup_time_slot)) {
    score += 10000
  }

  // Priority 4: Keseimbangan Nilai Lisan (selisih nilai absolut)
  // Rentang selisih adalah 0-100, jadi kita beri bobot (selisih * 10)
  // Maksimal tambahan poin dari sini adalah 1000 (jika selisih 100)
  const scoreDiff = Math.abs((Number(user1.oral_total_score) || 0) - (Number(user2.oral_total_score) || 0))
  score += (scoreDiff * 10)

  // Priority 5: Zona waktu sama
  if (user1Zona && user2Zona && user1Zona === user2Zona) {
    score += 100
  }

  // Priority 6: Juz sama
  if (user1Juz && user2Juz && user1Juz === user2Juz) {
    score += 10
  }

  return score
}

/**
 * Get human-readable match reasons
 */
function getMatchReasons(user1: any, user2: any): string[] {
  const reasons = []

  const user1Zona = user1.zona_waktu
  const user2Zona = user2.zona_waktu

  const user1Juz = user1.chosen_juz
  const user2Juz = user2.chosen_juz

  if (hasTimeSlotOverlap(user1.main_time_slot, user2.main_time_slot)) {
    reasons.push('Waktu utama cocok')
  } else if (
    hasTimeSlotOverlap(user1.main_time_slot, user2.backup_time_slot) ||
    hasTimeSlotOverlap(user1.backup_time_slot, user2.main_time_slot)
  ) {
    reasons.push('Waktu utama & cadangan cocok')
  } else if (hasTimeSlotOverlap(user1.backup_time_slot, user2.backup_time_slot)) {
    reasons.push('Waktu cadangan & cadangan cocok')
  }

  const oral1 = Number(user1.oral_total_score) || 0
  const oral2 = Number(user2.oral_total_score) || 0
  const scoreDiff = Math.abs(oral1 - oral2)
  if (scoreDiff >= 20) {
    reasons.push(`Nilai Lisan saling melengkapi (selisih ${scoreDiff} poin)`)
  } else if (scoreDiff < 20) {
    reasons.push(`Nilai Lisan setara (selisih ${scoreDiff} poin)`)
  }

  if (user1Zona && user2Zona && user1Zona === user2Zona) {
    reasons.push(`Zona waktu sama: ${user1Zona}`)
  }

  if (user1Juz && user2Juz && user1Juz === user2Juz) {
    reasons.push(`Juz sama: ${user1Juz}`)
  }

  return reasons
}

/**
 * Check if two time slots overlap
 */
function hasTimeSlotOverlap(slot1: string, slot2: string): boolean {
  if (!slot1 || !slot2) return false

  // Extract hours from time slot (e.g., "04-06" -> [4, 6])
  const parseSlot = (slot: string) => {
    const [start, end] = slot.split('-').map(Number)
    return { start, end }
  }

  const s1 = parseSlot(slot1)
  const s2 = parseSlot(slot2)

  // Check for overlap
  return s1.start < s2.end && s2.start < s1.end
}
