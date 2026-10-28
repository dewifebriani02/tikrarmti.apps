import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/daftar-ulang/partners
 * Fetch ALL eligible partners for self-matching
 * Returns all thalibah who passed selection (selection_status='selected')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')

    // Get user's registration data
    let query = supabase
      .from('pendaftaran_tikrar_tahfidz')
      .select('id, batch_id, chosen_juz, main_time_slot, backup_time_slot, full_name, selection_status, oral_total_score, timezone')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (batchId) {
      query = query.eq('batch_id', batchId)
    }

    const { data: registrations, error: regError } = await query

    if (regError || !registrations || registrations.length === 0) {
      return NextResponse.json(
        { error: 'No valid registration found' },
        { status: 404 }
      )
    }

    const approvedRegistration = registrations.find(reg => reg.selection_status === 'selected' || reg.selection_status === 'waitlist' || (reg.oral_total_score ?? 0) >= 80);
    const registration = approvedRegistration || registrations[0];

    const oralScore = registration.oral_total_score ?? 0;
    const isPassed = registration.selection_status === 'selected' || registration.selection_status === 'waitlist' || oralScore >= 80;

    if (!isPassed) {
      return NextResponse.json(
        { error: 'Belum lulus seleksi' },
        { status: 403 }
      )
    }
    
    // Use admin client to bypass RLS when searching for other participants
    const adminClient = createSupabaseAdmin()

    // Fetch ALL thalibah who passed selection in the same batch (for partner search)
    // INCLUDING extra fields for the marketplace UI
    const { data: rawAllThalibah, error: errTest } = await adminClient
      .from('pendaftaran_tikrar_tahfidz')
      .select('user_id, full_name, chosen_juz, main_time_slot, backup_time_slot, domicile, timezone, birth_date, wa_phone, selection_status, oral_total_score, exam_status, exam_score')
      .eq('batch_id', registration.batch_id)
      .neq('user_id', user.id) // Exclude current user
      
    if (errTest) {
      console.error('Error fetching rawAllThalibah:', errTest)
    }

    const allSelectedThalibah = (rawAllThalibah || []).filter((reg: any) => {
      const score = reg.oral_total_score ?? 0;
      return reg.selection_status === 'selected' || reg.selection_status === 'waitlist' || score >= 80;
    })

    // Fetch all submissions in this batch to determine who is locked or selected who
    const { data: allSubmissions, error: errSub } = await adminClient
      .from('daftar_ulang_submissions')
      .select('user_id, partner_user_id, partner_type, akad_url, akad_files, status')
      .eq('batch_id', registration.batch_id)
      
    if (errSub) {
      console.error('Error fetching allSubmissions:', errSub)
    }

    const submissions = allSubmissions || []
    
    // Map of user_id -> partner_user_id they selected (for self_match)
    const userChoices = new Map<string, string>()
    const lockedUsersSet = new Set<string>() // Users who have submitted (any type)
    const usersWithAkadSet = new Set<string>() // Users who have uploaded akad

    submissions.forEach((sub: any) => {
      // Track who has uploaded akad
      if (sub.akad_url || sub.akad_files?.length > 0) {
        usersWithAkadSet.add(sub.user_id)
      }

      // Track locks only for submitted/approved forms WHERE a partner choice was actually made.
      // (Since completing the Akad step now sets status to 'submitted', we must check partner_type to see if they've finished the partner step).
      if ((sub.status === 'submitted' || sub.status === 'approved') && sub.partner_type) {
        lockedUsersSet.add(sub.user_id)
        if (sub.partner_type === 'self_match' && sub.partner_user_id) {
          userChoices.set(sub.user_id, sub.partner_user_id)
        }
      }
    })

    // Fetch who passed the akad quiz
    const { data: allQuizAttempts, error: errQuiz } = await adminClient
      .from('akad_quiz_attempts')
      .select('user_id')
      .eq('passed', true)

    if (errQuiz) {
      console.error('Error fetching allQuizAttempts:', errQuiz)
    }

    const quizPassedUsersSet = new Set<string>()
    ;(allQuizAttempts || []).forEach((att: any) => {
      quizPassedUsersSet.add(att.user_id)
    })

    // Find mutual matches
    // A mutual match is when user A chose user B, and user B chose user A.
    const mutualMatchesSet = new Set<string>()
    userChoices.forEach((chosenPartnerId, userId) => {
      if (userChoices.get(chosenPartnerId) === userId) {
        mutualMatchesSet.add(userId)
        mutualMatchesSet.add(chosenPartnerId)
      }
    })

    // Check who selected the CURRENT user
    const selectedByOthersSet = new Set<string>()
    userChoices.forEach((chosenPartnerId, userId) => {
      if (chosenPartnerId === user.id) {
        selectedByOthersSet.add(userId)
      }
    })

    // Current user's own choice
    const currentUserChoice = userChoices.get(user.id)

    // Filter available partners based on logic
    const partners = (allSelectedThalibah || []).filter((reg: any) => {
      const partnerId = reg.user_id
      
      // 1. If they are part of a mutual match (with ANYONE), exclude them entirely
      if (mutualMatchesSet.has(partnerId)) {
        return false
      }
      
      // 2. If they have submitted any form, unless they explicitly chose the current user via self_match, exclude them
      // (They are locked to someone else, or to system_match/family)
      const theirChoice = userChoices.get(partnerId)
      if (lockedUsersSet.has(partnerId) && theirChoice !== user.id) {
        return false
      }
      
      // 3. Otherwise, they are available
      return true
    }).map((reg: any) => {
      // Calculate schedule compatibility
      const schedule_compatible = checkScheduleCompatibility(
        registration,
        reg
      )

      let readiness_level = 3;
      let status_label = '📝 Baru Lulus';

      const hasWritten = (reg.exam_status === 'completed' || reg.exam_score != null) || (reg.chosen_juz || '').toUpperCase().startsWith('30');
      const hasPassedQuiz = quizPassedUsersSet.has(reg.user_id);

      if (usersWithAkadSet.has(reg.user_id)) {
        readiness_level = 1;
        status_label = '✅ Siap Jodoh';
      } else if (hasWritten && hasPassedQuiz) {
        readiness_level = 2;
        status_label = '⏳ Menunggu Akad';
      }

      // Only what the partner-matching UI needs — no exact birth date, scores or exam status
      const publicRegistration = {
        user_id: reg.user_id,
        full_name: reg.full_name,
        chosen_juz: reg.chosen_juz,
        main_time_slot: reg.main_time_slot,
        backup_time_slot: reg.backup_time_slot,
        domicile: reg.domicile,
        timezone: reg.timezone,
        age: calculateAge(reg.birth_date),
        wa_phone: reg.wa_phone,
      }

      return {
        user_id: reg.user_id,
        readiness_level,
        status_label,
        registration_id: registration.id,
        status: 'available',
        created_at: null,
        users: {
          id: reg.user_id,
          full_name: reg.full_name,
          email: null,
          whatsapp: reg.wa_phone
        },
        registrations: [publicRegistration],
        is_mutual_match: false, // Since we filtered them out, this is technically false for all returned
        has_user_selected_them: selectedByOthersSet.has(reg.user_id),
        has_selected_them: currentUserChoice === reg.user_id,
        schedule_compatible: schedule_compatible,
        juz_compatible: registration.chosen_juz === reg.chosen_juz,
        timezone_compatible: (registration.timezone || 'WIB').toUpperCase() === (reg.timezone || 'WIB').toUpperCase()
      }
    })

    // Sort: Those who selected current user first, then by readiness_level, then with matching juz/schedule
    partners.sort((a: any, b: any) => {
      if (a.has_user_selected_them && !b.has_user_selected_them) return -1
      if (!a.has_user_selected_them && b.has_user_selected_them) return 1
      if (a.readiness_level !== b.readiness_level) return a.readiness_level - b.readiness_level
      if (a.juz_compatible && !b.juz_compatible) return -1
      if (!a.juz_compatible && b.juz_compatible) return 1
      if (a.schedule_compatible && !b.schedule_compatible) return -1
      if (!a.schedule_compatible && b.schedule_compatible) return 1
      return 0
    })

    const partners_selected_by_others = partners.filter((p: any) => p.has_user_selected_them)
    const partners_selected_by_user = partners.filter((p: any) => p.has_selected_them)

    return NextResponse.json({
      success: true,
      data: {
        current_user: {
          id: user.id,
          registration_id: registration.id,
          chosen_juz: registration.chosen_juz,
          main_time_slot: registration.main_time_slot,
          backup_time_slot: registration.backup_time_slot
        },
        all_available_partners: partners, // Now filtered based on marketplace logic
        partners_selected_by_others,
        partners_selected_by_user,
        mutual_matches: Array.from(mutualMatchesSet)
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/** Age in whole years from a birth date, or null if unknown/invalid */
function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

/**
 * Helper function to check schedule compatibility
 * Two users are compatible if their main or backup time slots match
 */
function checkScheduleCompatibility(
  userReg: { main_time_slot: string; backup_time_slot: string },
  partnerReg: { chosen_juz?: string; main_time_slot?: string; backup_time_slot?: string } | null | undefined
): boolean {
  if (!partnerReg) return false

  const userSlots = [userReg.main_time_slot, userReg.backup_time_slot]
  const partnerSlots = [partnerReg.main_time_slot || '', partnerReg.backup_time_slot || '']

  return userSlots.some(slot => slot && partnerSlots.includes(slot))
}

// Keep POST for backward compatibility or future use
export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Deprecated' }, { status: 400 })
}
