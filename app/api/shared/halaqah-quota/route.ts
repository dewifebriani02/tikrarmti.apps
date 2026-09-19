import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

/**
 * GET /api/shared/halaqah-quota?batch_id={batchId}
 *
 * Shared API for calculating halaqah quota.
 * Used by both admin and thalibah to ensure consistency.
 *
 * Query parameters:
 * - batch_id (required): The batch ID to calculate quota for
 * - user_id (optional): Current user's ID (for excluding from count in thalibah view)
 *
 * Returns: Halaqah list with quota information (current_students, max_students, available_slots, is_full)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    // Never trust a caller-provided user_id when calculating quota.
    const userId = user.id

    if (!batchId) {
      return NextResponse.json(
        { error: 'batch_id is required' },
        { status: 400 }
      )
    }

    // Fetch all active halaqah
    const { data: halaqahData, error: halaqahError } = await supabaseAdmin
      .from('halaqah')
      .select(`
        id,
        name,
        description,
        day_of_week,
        start_time,
        end_time,
        location,
        max_students,
        status,
        preferred_juz,
        muallimah_id,
        programs!inner(batch_id, class_type)
      `)
      .eq('status', 'active')
      .eq('programs.batch_id', batchId)
      .order('day_of_week', { ascending: true })

    if (halaqahError) {
      console.error('[HalaqahQuota] Error fetching halaqah:', halaqahError)
      return NextResponse.json(
        { error: 'Failed to fetch halaqah data', details: halaqahError.message },
        { status: 500 }
      )
    }

    // Fetch muallimah registrations for this batch
    const { data: muallimahRegs } = await supabaseAdmin
      .from('muallimah_registrations')
      .select('user_id, class_type, preferred_juz, preferred_schedule, full_name')
      .eq('batch_id', batchId)
      .eq('status', 'approved')

    // Create muallimah map for quick lookup
    const muallimahMap = new Map<string, any>(
      (muallimahRegs || []).map((reg: any) => [reg.user_id, reg])
    )

    // Fetch all submissions for this batch (only submitted and approved count towards quota)
    // IMPORTANT: Draft submissions do NOT reduce quota
    const { data: submissions } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .select('ujian_halaqah_id, tashih_halaqah_id, is_tashih_umum, status, user_id')
      .eq('batch_id', batchId)
      .in('status', ['submitted', 'approved'])

    // Fetch halaqah_students (assigned thalibah with active status only)
    // IMPORTANT: waitlist does NOT reduce quota, only active status counts
    const { data: halaqahStudents } = await supabaseAdmin
      .from('halaqah_students')
      .select('halaqah_id, thalibah_id, status')
      .eq('status', 'active')

    // Count students per halaqah
    // Use a Set to track unique users per halaqah
    const halaqahStudentMap = new Map<string, Set<string>>()
    const activeStudentMap = new Map<string, Set<string>>()

    // Count from daftar_ulang_submissions (only submitted and approved)
    if (submissions) {
      for (const sub of submissions) {
        // Skip current user when counting quota (if userId is provided)
        // This is used when thalibah views available halaqah - they shouldn't count against themselves
        if (userId && sub.user_id === userId) continue

        // For tashih_ujian classes, ujian_halaqah_id and tashih_halaqah_id are the same
        // We need to count each user only once per halaqah, even if they selected both ujian and tashih
        const uniqueHalaqahIds: string[] = []

        if (sub.ujian_halaqah_id) {
          uniqueHalaqahIds.push(sub.ujian_halaqah_id)
        }
        if (sub.tashih_halaqah_id && !sub.is_tashih_umum) {
          // Only add if not already in the list (for tashih_ujian case)
          if (!uniqueHalaqahIds.includes(sub.tashih_halaqah_id)) {
            uniqueHalaqahIds.push(sub.tashih_halaqah_id)
          }
        }

        // Add user to each unique halaqah
        for (let i = 0; i < uniqueHalaqahIds.length; i++) {
          const halaqahId = uniqueHalaqahIds[i]
          if (!halaqahStudentMap.has(halaqahId)) {
            halaqahStudentMap.set(halaqahId, new Set())
          }
          halaqahStudentMap.get(halaqahId)!.add(sub.user_id)
        }
      }
    }

    // Also count students from halaqah_students table (active only)
    // Waitlist does NOT reduce quota, only active status counts
    if (halaqahStudents) {
      for (const student of halaqahStudents) {
        if (!activeStudentMap.has(student.halaqah_id)) {
          activeStudentMap.set(student.halaqah_id, new Set())
        }
        activeStudentMap.get(student.halaqah_id)!.add(student.thalibah_id)

        // Skip current user if they're already in halaqah_students
        if (userId && student.thalibah_id === userId) continue

        const halaqahId = student.halaqah_id
        if (!halaqahStudentMap.has(halaqahId)) {
          halaqahStudentMap.set(halaqahId, new Set())
        }
        halaqahStudentMap.get(halaqahId)!.add(student.thalibah_id)
      }
    }

    // Process halaqah data and add quota information
    const processedHalaqah = (halaqahData || []).map(h => {
      // Get current student count from submissions map
      const currentStudents = halaqahStudentMap.get(h.id)?.size || 0
      const activeStudents = activeStudentMap.get(h.id)?.size || 0
      const maxStudents = h.max_students || 5
      const isFull = currentStudents >= maxStudents
      const availableSlots = maxStudents - currentStudents

      // Get muallimah registration data from the map using muallimah_id
      const muallimahReg = h.muallimah_id ? muallimahMap.get(h.muallimah_id) : null
      const classType = muallimahReg?.class_type || 'tashih_ujian'
      
      // Use strictly the halaqah's preferred juz as requested by the user
      const muallimahPreferredJuz = h.preferred_juz
      
      const muallimahName = muallimahReg?.full_name || 'Muallimah'

      // Use halaqah schedule first, fallback to muallimah_registrations schedule
      const halaqahSchedule = (h.day_of_week !== null && h.start_time && h.end_time)
        ? JSON.stringify({
            day: ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'][h.day_of_week],
            time_start: h.start_time,
            time_end: h.end_time
          })
        : muallimahReg?.preferred_schedule || null

      // Determine class types from muallimah registration
      // class_type can be: 'tashih_ujian', 'tashih_only', 'ujian_only'
      let classTypes: Array<{ class_type: string; label: string }> = []
      if (classType === 'tashih_ujian' || classType === 'tashih_only') {
        classTypes.push({ class_type: 'tashih', label: 'Tashih' })
      }
      if (classType === 'tashih_ujian' || classType === 'ujian_only') {
        classTypes.push({ class_type: 'ujian', label: 'Ujian' })
      }

      return {
        ...h,
        // Displayed roster count: must match Jadwal Harian (active memberships only).
        total_current_students: activeStudents,
        total_reserved_students: currentStudents,
        total_max_students: maxStudents,
        available_slots: availableSlots,
        is_full: isFull,
        class_type: classType,
        program_class_type: Array.isArray(h.programs) ? h.programs[0]?.class_type : (h.programs as any)?.class_type,
        class_types: classTypes,
        muallimah_preferred_juz: muallimahPreferredJuz,
        muallimah_schedule: halaqahSchedule,
        muallimah_name: muallimahName
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        halaqah: processedHalaqah,
        batch_id: batchId
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('[HalaqahQuota] API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
