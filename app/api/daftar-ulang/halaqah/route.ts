import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/daftar-ulang/halaqah
 * Fetch available halaqah for daftar ulang
 * Now uses shared quota calculation API for consistency
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
    const url = new URL(request.url)
    const batchId = url.searchParams.get('batchId')

    // Get user's registration to find batch_id and calculate final juz
    let query = supabase
      .from('pendaftaran_tikrar_tahfidz')
      .select('batch_id, chosen_juz, exam_score, main_time_slot, backup_time_slot, selection_status, oral_total_score')
      .eq('user_id', user.id)

    if (batchId) {
      query = query.eq('batch_id', batchId)
    }

    const { data: registrations, error: regError } = await query
      .order('created_at', { ascending: false })

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

    // ===== CHECK RE-ENROLLMENT DATE =====
    // Fetch batch data to check if re-enrollment is open
    const { data: batch } = await supabase
      .from('batches')
      .select('id, name, re_enrollment_date, selection_result_date, status, min_exam_score')
      .eq('id', registration.batch_id)
      .single()

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    // Check if selection results have been announced
    if (batch.selection_result_date) {
      const now = new Date()
      const announcementDate = new Date(batch.selection_result_date)

      announcementDate.setHours(0, 0, 0, 0)
      now.setHours(0, 0, 0, 0)

      if (now < announcementDate) {
        return NextResponse.json(
          {
            error: 'Pengumuman seleksi belum dibuka',
            message: 'Hasil seleksi belum diumumkan'
          },
          { status: 403 }
        )
      }
    }

    // Check if re-enrollment has started
    if (batch.re_enrollment_date) {
      const now = new Date()
      const reEnrollDate = new Date(batch.re_enrollment_date)

      // Set reEnrollDate to start of day (00:00:00) for comparison
      reEnrollDate.setHours(0, 0, 0, 0)
      now.setHours(0, 0, 0, 0)

      if (now < reEnrollDate) {
        const formattedDate = reEnrollDate.toLocaleDateString('id-ID', { day: 'numeric',
          month: 'long',
          year: 'numeric', timeZone: 'Asia/Jakarta' })
        return NextResponse.json(
          {
            error: 'Daftar ulang belum dibuka',
            message: `Daftar ulang akan dibuka pada tanggal ${formattedDate}`
          },
          { status: 403 }
        )
      }
    }
    // ===== END CHECK RE-ENROLLMENT DATE =====

    // Use final juz placement directly from registration (without recalculation)
    const finalJuz = (registration.chosen_juz || '').toUpperCase()

    // Fetch user's existing daftar ulang submission if any
    // For submitted or approved status, include related halaqah and partner data
    const { data: existingSubmission, error: submissionError } = await supabase
      .from('daftar_ulang_submissions')
      .select(`
        *,
        ujian_halaqah_obj:halaqah!daftar_ulang_submissions_ujian_halaqah_id_fkey (
          id,
          name,
          day_of_week,
          start_time,
          end_time,
          location
        ),
        tashih_halaqah_obj:halaqah!daftar_ulang_submissions_tashih_halaqah_id_fkey (
          id,
          name,
          day_of_week,
          start_time,
          end_time,
          location
        ),
        partner_user_obj:users!daftar_ulang_submissions_partner_user_id_fkey (
          id,
          full_name
        )
      `)
      .eq('user_id', user.id)
      .eq('batch_id', registration.batch_id)
      .maybeSingle()

    // Debug log to check existing submission data from DB
    console.log('[API Daftar Ulang] Existing submission from DB:', existingSubmission)
    console.log('[API Daftar Ulang] ujian_halaqah_obj:', existingSubmission?.ujian_halaqah_obj)
    console.log('[API Daftar Ulang] tashih_halaqah_obj:', existingSubmission?.tashih_halaqah_obj)
    console.log('[API Daftar Ulang] submissionError:', submissionError)

    // Call shared quota calculation API
    // Pass user_id to exclude current user from count
    const quotaUrl = new URL('/api/shared/halaqah-quota', request.url)
    quotaUrl.searchParams.set('batch_id', registration.batch_id)
    quotaUrl.searchParams.set('user_id', user.id)

    const quotaResponse = await fetch(quotaUrl.toString(), {
      headers: {
        'Cookie': request.headers.get('Cookie') || ''
      }
    })

    if (!quotaResponse.ok) {
      const errorData = await quotaResponse.json()
      return NextResponse.json(
        { error: 'Failed to fetch quota data', details: errorData.error },
        { status: quotaResponse.status }
      )
    }

    const quotaData = await quotaResponse.json()

    // Filter halaqah by thalibah's juz and filter out tashih_only classes
    const processedHalaqah = (quotaData.data.halaqah || [])
      .map((h: any) => ({
        ...h,
        mentors: h.muallimah_name ? [{
          mentor_id: h.muallimah_id,
          role: 'muallimah',
          is_primary: true,
          users: {
            full_name: h.muallimah_name
          }
        }] : []
      }))
      .filter((h: any) => {
        if (!h.muallimah_preferred_juz) return true // Muallimah teaches all juz

        // Use finalJuz (adjusted based on written quiz score) instead of chosen_juz
        const thalibahJuz = finalJuz

        // Parse muallimah's preferred_juz (could be comma-separated like "30,29" or single "30")
        const muallimahJuzList = h.muallimah_preferred_juz.split(',').map((j: string) => j.trim())

        // Check if there's a match
        return muallimahJuzList.some((muallimahJuz: string) => {
          // Exact match
          if (muallimahJuz === thalibahJuz) return true

          // Check base juz (e.g., "30" matches "30A", "30B", "30")
          if (thalibahJuz.startsWith(muallimahJuz)) return true

          // Check if muallimah's juz starts with thalibah's juz (e.g., "30A" matches "30")
          if (muallimahJuz.startsWith(thalibahJuz)) return true

          // Allow "Juz Campur" to match any thalibah's juz
          if (muallimahJuz.toLowerCase().includes('campur')) return true

          return false
        })
      })
      // Filter out tashih_only classes from daftar ulang page
      .filter((h: any) => {
        if (registration.selection_status === 'waitlist') {
          return h.class_type === 'pra_tahfidz'
        }
        return h.class_type !== 'tashih_only' && h.class_type !== 'pra_tahfidz'
      })

    return NextResponse.json({
      success: true,
      data: {
        halaqah: processedHalaqah,
        user_schedule: {
          chosen_juz: registration.chosen_juz,
          main_time_slot: registration.main_time_slot,
          backup_time_slot: registration.backup_time_slot
        },
        existing_submission: existingSubmission
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
