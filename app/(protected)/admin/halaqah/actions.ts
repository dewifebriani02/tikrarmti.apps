'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getClientIp, getUserAgent, logAudit } from '@/lib/audit-log'
import { headers } from 'next/headers'
import { syncApprovedSubmissionToHalaqahStudents } from '@/lib/halaqah-students-sync'

/**
 * HALAQAH SERVER ACTIONS
 *
 * SECURITY ARCHITECTURE V3 COMPLIANCE:
 * - Server Actions for all halaqah mutations
 * - Admin validation on server-side
 * - Uses service role key safely (server-only)
 * - RLS bypassed only when necessary and validated
 *
 * CRITICAL: These functions are ONLY callable from server.
 * Service role key is NEVER exposed to client bundle.
 */

// Types
interface HalaqahFilters {
  batch_id?: string
  program_id?: string
  status?: 'draft' | 'active' | 'completed' | 'cancelled'
}

interface UpdateHalaqahData {
  id: string
  name?: string
  description?: string
  status?: 'draft' | 'active' | 'completed' | 'cancelled'
  day_of_week?: number
  start_time?: string
  end_time?: string
  max_students?: number
  waitlist_max?: number
  preferred_juz?: string
  program_id?: string
  muallimah_id?: string
  libur_date?: string | null
  zoom_link?: string | null
  zoom_link_id?: string | null
}

interface AssignThalibahParams {
  thalibah_ids: string[]
  batch_id: string
  manual_assignments?: {
    thalibah_id: string
    halaqah_ids: string[]
  }[]
}

interface AutoCreateSimpleParams {
  batch_id: string
}

/**
 * Verify admin role - MUST be called before any admin action
 */
async function verifyAdmin() {
  const supabase = createServerClient()

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Unauthorized - Invalid session')
  }

  // Verify admin role from database
  const supabaseAdmin = createSupabaseAdmin()
  const { data: userData, error: dbError } = await supabaseAdmin
    .from('users')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (dbError || !userData || !userData.roles?.includes('admin')) {
    throw new Error('Forbidden - Admin access required')
  }

  return { user, supabaseAdmin }
}

/**
 * Get IP and User Agent for audit logging
 */
function getRequestInfo() {
  const headersList = headers()
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'
  return { ip, userAgent }
}

/**
 * Get halaqahs with enriched data (Admin only)
 *
 * @param filters - Optional filters for batch_id, program_id, status
 * @returns Halaqahs with enriched program, batch, student counts, and muallimah info
 */
export async function getHalaqahs(filters?: HalaqahFilters) {
  try {
    // CRITICAL: Verify admin role first
    const { supabaseAdmin } = await verifyAdmin()

    // Build query with filters
    let query = supabaseAdmin
      .from('halaqah')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.batch_id) {
      // Filter by batch_id via program
      const { data: programs } = await supabaseAdmin
        .from('programs')
        .select('id')
        .eq('batch_id', filters.batch_id)

      if (programs && programs.length > 0) {
        const programIds = programs.map((p: any) => p.id)
        query = query.in('program_id', programIds)
      } else {
        // No programs for this batch, return empty
        return {
          success: true,
          data: []
        }
      }
    }

    if (filters?.program_id) {
      query = query.eq('program_id', filters.program_id)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data: halaqahs, error } = await query

    if (error) {
      console.error('[getHalaqahs] Error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    if (!halaqahs || halaqahs.length === 0) {
      return {
        success: true,
        data: []
      }
    }

    // Enrich with program, batch, student counts, and muallimah data
    const enrichedHalaqahs = await Promise.all(
      halaqahs.map(async (halaqah: any) => {
        const [programData, studentCount, muallimaData] = await Promise.all([
          // Get program and batch data
          halaqah.program_id
            ? supabaseAdmin
                .from('programs')
                .select(`
                  id,
                  name,
                  class_type,
                  batches (
                    id,
                    name,
                    start_date,
                    end_date
                  )
                `)
                .eq('id', halaqah.program_id)
                .single()
            : Promise.resolve({ data: null, error: null }),

          // Get student count
          supabaseAdmin
            .from('halaqah_students')
            .select('id', { count: 'exact', head: true })
            .eq('halaqah_id', halaqah.id)
            .eq('status', 'active'),

          // Get muallimah data
          halaqah.muallimah_id
            ? supabaseAdmin
                .from('users')
                .select('id, full_name, email')
                .eq('id', halaqah.muallimah_id)
                .single()
            : Promise.resolve({ data: null, error: null })
        ])

        return {
          ...halaqah,
          program: programData.data,
          _count: {
            students: studentCount.count || 0
          },
          muallimah: muallimaData.data
        }
      })
    )

    return {
      success: true,
      data: enrichedHalaqahs
    }

  } catch (error) {
    console.error('[getHalaqahs] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch halaqahs'
    }
  }
}

/**
 * Update an existing halaqah (Admin only)
 *
 * @param data - Halaqah data to update (must include id)
 * @returns Success status and updated halaqah
 */
export async function updateHalaqah(data: UpdateHalaqahData) {
  try {
    // CRITICAL: Verify admin role first
    const { user, supabaseAdmin } = await verifyAdmin()

    // Validate required fields
    if (!data.id) {
      return {
        success: false,
        error: 'Halaqah ID is required'
      }
    }

    // Extract id and prepare update data
    const { id, ...updateData } = data

    // Add updated timestamp
    const halaqahData = {
      ...updateData,
      updated_at: new Date().toISOString(),
    }

    // Remove undefined values
    Object.keys(halaqahData).forEach(key => {
      if (halaqahData[key as keyof typeof halaqahData] === undefined) {
        delete halaqahData[key as keyof typeof halaqahData]
      }
    })

    // Update halaqah using admin client (bypasses RLS)
    const { data: updatedHalaqah, error } = await supabaseAdmin
      .from('halaqah')
      .update(halaqahData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[updateHalaqah] Error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    // Audit log
    const { ip, userAgent } = getRequestInfo()
    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      resource: 'halaqah',
      details: {
        halaqah_id: id,
        updated_fields: Object.keys(updateData)
      },
      ipAddress: ip,
      userAgent: userAgent,
      level: 'INFO'
    })

    // Revalidate admin halaqah page cache
    revalidatePath('/admin/halaqah')

    return {
      success: true,
      data: updatedHalaqah
    }

  } catch (error) {
    console.error('[updateHalaqah] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update halaqah'
    }
  }
}

/**
 * Delete a halaqah (Admin only)
 *
 * @param halaqahId - Halaqah ID to delete
 * @returns Success status
 */
export async function deleteHalaqah(halaqahId: string) {
  try {
    // CRITICAL: Verify admin role first
    const { user, supabaseAdmin } = await verifyAdmin()

    // Validate required fields
    if (!halaqahId) {
      return {
        success: false,
        error: 'Halaqah ID is required'
      }
    }

    console.log('[deleteHalaqah] Deleting halaqah:', halaqahId)

    // Step 1: Delete from halaqah_mentors (has foreign key to halaqah)
    const { error: mentorsError } = await supabaseAdmin
      .from('halaqah_mentors')
      .delete()
      .eq('halaqah_id', halaqahId)

    if (mentorsError) {
      console.error('[deleteHalaqah] Error deleting mentors:', mentorsError)
      // Continue anyway - this shouldn't block the deletion
    }

    // Step 2: Delete from halaqah_students (has foreign key to halaqah)
    const { error: studentsError } = await supabaseAdmin
      .from('halaqah_students')
      .delete()
      .eq('halaqah_id', halaqahId)

    if (studentsError) {
      console.error('[deleteHalaqah] Error deleting students:', studentsError)
      // Continue anyway - this shouldn't block the deletion
    }

    // Step 3: Clear halaqah references from daftar_ulang_submissions
    const { error: submissionsError } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .update({
        ujian_halaqah_id: null,
        tashih_halaqah_id: null
      })
      .or(`ujian_halaqah_id.eq.${halaqahId},tashih_halaqah_id.eq.${halaqahId}`)

    if (submissionsError) {
      console.error('[deleteHalaqah] Error clearing submissions:', submissionsError)
      // Continue anyway - this shouldn't block the deletion
    }

    // Step 4: Finally delete the halaqah
    const { error } = await supabaseAdmin
      .from('halaqah')
      .delete()
      .eq('id', halaqahId)

    if (error) {
      console.error('[deleteHalaqah] Error deleting halaqah:', error)
      return {
        success: false,
        error: error.message
      }
    }

    console.log('[deleteHalaqah] Successfully deleted halaqah:', halaqahId)

    // Audit log
    const { ip, userAgent } = getRequestInfo()
    await logAudit({
      userId: user.id,
      action: 'DELETE',
      resource: 'halaqah',
      details: {
        halaqah_id: halaqahId
      },
      ipAddress: ip,
      userAgent: userAgent,
      level: 'WARN'
    })

    // Revalidate admin halaqah page cache
    revalidatePath('/admin/halaqah')

    return {
      success: true
    }

  } catch (error) {
    console.error('[deleteHalaqah] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete halaqah'
    }
  }
}

/**
 * Assign selected thalibah to appropriate halaqah (Admin only)
 *
 * Smart assignment based on:
 * 1. Juz number matching between thalibah and muallimah
 * 2. Class type requirements (ujian only, tashih only, or both)
 * 3. Available capacity in halaqah
 *
 * If class_type is 'tashih_ujian', one halaqah covers both requirements.
 * Otherwise, thalibah needs separate assignment for ujian and tashih.
 *
 * @param params - Assignment parameters
 * @returns Success status with assignment results
 */
export async function assignThalibahToHalaqah(params: AssignThalibahParams) {
  try {
    // CRITICAL: Verify admin role first
    const { user, supabaseAdmin } = await verifyAdmin()

    const { thalibah_ids, batch_id, manual_assignments } = params

    // Validate required fields
    if (!thalibah_ids || !Array.isArray(thalibah_ids) || thalibah_ids.length === 0) {
      return {
        success: false,
        error: 'thalibah_ids is required and must be a non-empty array'
      }
    }

    if (!batch_id) {
      return {
        success: false,
        error: 'batch_id is required'
      }
    }

    console.log('[assignThalibahToHalaqah] Starting assignment for', thalibah_ids.length, 'thalibahs')

    // Get the batch details to find programs
    const { data: batch } = await supabaseAdmin
      .from('batches')
      .select('id, name')
      .eq('id', batch_id)
      .single()

    if (!batch) {
      return {
        success: false,
        error: 'Batch not found'
      }
    }

    // Get all programs for this batch
    const { data: programs } = await supabaseAdmin
      .from('programs')
      .select('id, name, class_type')
      .eq('batch_id', batch_id)

    if (!programs || programs.length === 0) {
      return {
        success: false,
        error: 'No programs found for this batch'
      }
    }

    const programMap: Map<string, any> = new Map(programs.map((p: any) => [p.id, p]))

    // Get all halaqahs for this batch's programs
    const { data: halaqahs } = await supabaseAdmin
      .from('halaqah')
      .select('id, program_id, muallimah_id, preferred_juz, max_students, status')
      .in('program_id', Array.from(programMap.keys()))
      .eq('status', 'active')

    if (!halaqahs || halaqahs.length === 0) {
      return {
        success: false,
        error: 'No active halaqahs found for this batch'
      }
    }

    // Get current student counts for all halaqahs
    const halaqahIds = halaqahs.map((h: any) => h.id)
    const { data: studentCounts } = await supabaseAdmin
      .from('halaqah_students')
      .select('halaqah_id')
      .in('halaqah_id', halaqahIds)
      .eq('status', 'active')

    // Count students per halaqah
    const studentCountMap = new Map<string, number>()
    for (const halaqahId of halaqahIds) {
      studentCountMap.set(halaqahId, 0)
    }
    for (const student of studentCounts || []) {
      const current = studentCountMap.get(student.halaqah_id) || 0
      studentCountMap.set(student.halaqah_id, current + 1)
    }

    // Add _count to each halaqah
    const halaqahsWithCounts = halaqahs.map((h: any) => ({
      ...h,
      _count: {
        students: studentCountMap.get(h.id) || 0
      }
    }))

    // Get muallimah data for all halaqahs
    const muallimahIds = halaqahs.map((h: any) => h.muallimah_id).filter(Boolean) as string[]
    const { data: muallimahRegs } = await supabaseAdmin
      .from('muallimah_registrations')
      .select('user_id, preferred_juz, class_type')
      .in('user_id', muallimahIds)
      .eq('status', 'approved')

    const muallimahMap: Map<string, any> = new Map(
      muallimahRegs?.map((m: any) => [m.user_id, m]) || []
    )

    // Get thalibah data with their chosen_juz
    const { data: thalibahData } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('id, user_id, full_name, chosen_juz, selection_status')
      .in('id', thalibah_ids)

    if (!thalibahData || thalibahData.length === 0) {
      return {
        success: false,
        error: 'No valid thalibah registrations found'
      }
    }

    // Track assignment results
    const results: {
      success: any[]
      partial: any[]
      failed: any[]
      skipped: any[]
    } = {
      success: [],
      partial: [],
      failed: [],
      skipped: []
    }

    // Process each thalibah
    for (const thalibah of thalibahData) {
      if (thalibah.selection_status !== 'selected') {
        results.skipped.push({
          thalibah_id: thalibah.id,
          name: thalibah.full_name,
          reason: `Not selected (status: ${thalibah.selection_status})`
        })
        continue
      }

      // Parse chosen_juz to get juz number
      const thalibahJuz = parseInt(thalibah.chosen_juz)
      if (isNaN(thalibahJuz)) {
        results.failed.push({
          thalibah_id: thalibah.id,
          name: thalibah.full_name,
          reason: 'Invalid chosen_juz'
        })
        continue
      }

      console.log('[assignThalibahToHalaqah] Processing', thalibah.full_name, 'Juz', thalibahJuz)

      // Check for manual assignment if provided
      let manualAssignment = manual_assignments?.find((m: any) => m.thalibah_id === thalibah.id)

      if (manualAssignment) {
        // Manual assignment - use specified halaqahs
        const assignmentResult = await assignToSpecificHalaqah(
          thalibah,
          manualAssignment,
          programMap,
          user.id,
          supabaseAdmin
        )
        if (assignmentResult.success) {
          results.success.push(assignmentResult.data)
        } else if (assignmentResult.partial) {
          results.partial.push(assignmentResult.data)
        } else {
          results.failed.push(assignmentResult.data)
        }
      } else {
        // Smart auto-assignment
        const assignmentResult = await smartAssignThalibah(
          thalibah,
          thalibahJuz,
          halaqahsWithCounts,
          muallimahMap,
          programMap,
          user.id,
          supabaseAdmin
        )
        if (assignmentResult.success) {
          results.success.push(assignmentResult.data)
        } else if (assignmentResult.partial) {
          results.partial.push(assignmentResult.data)
        } else {
          results.failed.push(assignmentResult.data)
        }
      }
    }

    // Audit log
    const { ip, userAgent } = getRequestInfo()
    await logAudit({
      userId: user.id,
      action: 'CREATE',
      resource: 'halaqah_students',
      details: {
        batch_id,
        total_thalibah: thalibah_ids.length,
        successful: results.success.length,
        partial: results.partial.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      },
      ipAddress: ip,
      userAgent: userAgent,
      level: 'INFO'
    })

    // Revalidate admin halaqah page cache
    revalidatePath('/admin/halaqah')

    return {
      success: true,
      data: results
    }

  } catch (error: any) {
    console.error('[assignThalibahToHalaqah] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign thalibah'
    }
  }
}

/**
 * Auto-create halaqah for approved muallimah (Admin only)
 *
 * Creates halaqah WITHOUT program assignment.
 * Used for initial halaqah setup before program assignment.
 *
 * @param params - Auto-create parameters
 * @returns Success status with creation results
 */
export async function autoCreateSimpleHalaqah(params: AutoCreateSimpleParams) {
  try {
    // CRITICAL: Verify admin role first
    const { user, supabaseAdmin } = await verifyAdmin()

    const { batch_id } = params

    if (!batch_id) {
      return {
        success: false,
        error: 'Missing required field: batch_id'
      }
    }

    console.log('[autoCreateSimpleHalaqah] Starting auto-create for batch:', batch_id)

    // Get all approved and not excluded muallimah for this batch
    const { data: muallimahs, error: muallimaError } = await supabaseAdmin
      .from('muallimah_akads')
      .select('*, user:users!muallimah_akads_user_id_fkey(full_name)')
      .eq('batch_id', batch_id)
      .eq('status', 'approved')
      .eq('exclude_from_capacity', false)

    if (muallimaError) {
      console.error('[autoCreateSimpleHalaqah] Error fetching muallimah:', muallimaError)
      return { success: false, error: 'Failed to fetch muallimah data' }
    }

    if (!muallimahs || muallimahs.length === 0) {
      return {
        success: true,
        created: 0,
        skipped: 0,
        message: 'No valid muallimah found for this batch'
      }
    }

    // Load programs to map program names to IDs for this batch
    const { data: programsList } = await supabaseAdmin
      .from('programs')
      .select('*')
      .eq('batch_id', batch_id)

    const programsMap: Record<string, any> = {}
    programsList?.forEach((p: any) => {
      const pName = p.name.toLowerCase()
      if (pName.includes('tahfidz tikrar')) programsMap['tikrar_tahfidz'] = p
      else if (pName.includes('pra-tikrar') || pName.includes('pra tikrar') || pName.includes('pra_tahfidz')) programsMap['pra_tahfidz'] = p
    })

    // Auto-create missing programs for this batch if they don't exist
    if (!programsMap['tikrar_tahfidz']) {
      console.log('[autoCreateSimpleHalaqah] Auto-creating missing Tikrar Tahfidz program for batch')
      const { data: newProg } = await supabaseAdmin.from('programs').insert({
        batch_id,
        name: 'Tahfidz Tikrar MTI',
        description: "Program tahfidz khusus dengan tasmi' one-on-one dengan pasangan belajar",
        status: 'open',
        max_thalibah: 150,
        duration_weeks: 13
      }).select().single()
      if (newProg) programsMap['tikrar_tahfidz'] = newProg
    }
    
    if (!programsMap['pra_tahfidz']) {
      console.log('[autoCreateSimpleHalaqah] Auto-creating missing Pra-Tikrar program for batch')
      const { data: newProg } = await supabaseAdmin.from('programs').insert({
        batch_id,
        name: 'Pra-Tikrar MTI',
        description: 'Program perbaikan bacaan sebelum tikrar',
        status: 'open',
        max_thalibah: 100,
        duration_weeks: 13
      }).select().single()
      if (newProg) programsMap['pra_tahfidz'] = newProg
    }

    const mapDayToNumber = (dayStr: string): number | null => {
      if (!dayStr) return null;
      const d = dayStr.toLowerCase().trim();
      if (d.includes('senin')) return 1;
      if (d.includes('selasa')) return 2;
      if (d.includes('rabu')) return 3;
      if (d.includes('kamis')) return 4;
      if (d.includes('jumat') || d.includes("jum'at")) return 5;
      if (d.includes('sabtu')) return 6;
      if (d.includes('ahad') || d.includes('minggu')) return 7;
      return null;
    };

    let created = 0
    let skipped = 0
    const details: string[] = []

    for (const muallimah of muallimahs) {
      const fullName = muallimah.user?.full_name || 'Ustadzah'
      
      try {
        if (!muallimah.class_type) {
          details.push(`✗ ${fullName}: class_type is empty`)
          skipped++
          continue
        }

        const classTypes = muallimah.class_type.split(',').map((t: string) => t.trim())
        
        let schedulesJson: any = null;
        try {
          schedulesJson = typeof muallimah.preferred_schedule === 'string' 
            ? JSON.parse(muallimah.preferred_schedule) 
            : muallimah.preferred_schedule;
        } catch (e) {
          details.push(`✗ ${fullName}: Invalid schedule JSON`)
          skipped++
          continue
        }

        for (const type of classTypes) {
          const program = programsMap[type]
          if (!program) {
            details.push(`✗ ${fullName}: Program not found in batch for type ${type}`)
            skipped++
            continue
          }

          const scheduleKey = type === 'tikrar_tahfidz' ? 'tikrar' : 'pra_tahfidz'
          const schedule = schedulesJson?.[scheduleKey]
          
          if (!schedule || !schedule.day || !schedule.time_start || !schedule.time_end) {
            details.push(`✗ ${fullName}: Missing schedule for ${type}`)
            skipped++
            continue
          }

          const dayNum = mapDayToNumber(schedule.day)

          // Check if halaqah already exists for this muallimah and program
          const { data: existingHalaqahs } = await supabaseAdmin
            .from('halaqah')
            .select('id')
            .eq('muallimah_id', muallimah.user_id)
            .eq('program_id', program.id)

          if (existingHalaqahs && existingHalaqahs.length > 0) {
            details.push(`⚠️ Halaqah already exists for ${fullName} (${program.name})`)
            skipped++
            continue
          }

          let cleanName = fullName
          if (cleanName.toLowerCase().startsWith('halaqah ')) cleanName = cleanName.substring(8)
          else if (cleanName.toLowerCase().startsWith('halaqah')) cleanName = cleanName.substring(7)
          if (cleanName.toLowerCase().startsWith('ustadzah ')) cleanName = cleanName.substring(9)
          else if (cleanName.toLowerCase().startsWith('ustadzah')) cleanName = cleanName.substring(8)
          cleanName = cleanName.trim()
          const halaqahName = `${program.name} - Juz ${muallimah.preferred_juz} - Ustadzah ${cleanName}`

          const { data: newHalaqah, error: createError } = await supabaseAdmin
            .from('halaqah')
            .insert({
              program_id: program.id,
              muallimah_id: muallimah.user_id,
              name: halaqahName,
              description: `Halaqah diampu oleh ${fullName}`,
              day_of_week: dayNum,
              start_time: schedule.time_start,
              end_time: schedule.time_end,
              max_students: muallimah.preferred_max_thalibah || 5,
              waitlist_max: 5,
              preferred_juz: muallimah.preferred_juz,
              status: 'active',
            })
            .select()
            .single()

          if (createError) {
            details.push(`✗ Failed to create halaqah for ${fullName} (${program.name}): ${createError.message}`)
            skipped++
            continue
          }

          const { error: mentorError } = await supabaseAdmin
            .from('halaqah_mentors')
            .insert({
              halaqah_id: newHalaqah.id,
              mentor_id: muallimah.user_id,
              role: 'ustadzah',
              is_primary: true,
            })

          if (mentorError) console.error('[autoCreateSimpleHalaqah] Error adding mentor:', mentorError)

          details.push(`✓ Created ${program.name} for ${fullName}`)
          created++
        }
      } catch (error: any) {
        details.push(`✗ Failed processing ${fullName}: ${error.message}`)
        skipped++
      }
    }

    const { ip, userAgent } = getRequestInfo()
    await logAudit({
      userId: user.id,
      action: 'CREATE',
      resource: 'halaqah',
      details: { batch_id, created, skipped, total_muallimah: muallimahs.length },
      ipAddress: ip,
      userAgent: userAgent,
      level: 'INFO'
    })

    revalidatePath('/admin/halaqah')

    return {
      success: true,
      created,
      skipped,
      details,
      message: `Created ${created} halaqah${skipped > 0 ? `, skipped ${skipped}` : ''}`
    }
  } catch (error: any) {
    console.error('[autoCreateSimpleHalaqah] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to auto-create halaqah'
    }
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Smart assign thalibah to appropriate halaqahs based on juz matching and class type
 */
async function smartAssignThalibah(
  thalibah: any,
  thalibahJuz: number,
  halaqahs: any[],
  muallimahMap: Map<string, any>,
  programMap: Map<string, any>,
  adminId: string,
  supabaseAdmin: any
) {
  // Find matching halaqahs based on juz
  const matchingHalaqahs = halaqahs.filter(h => {
    const muallimah = h.muallimah_id ? muallimahMap.get(h.muallimah_id) : null
    if (!muallimah) return false

    // Parse muallimah preferred_juz (could be single juz or comma-separated)
    const muallimahJuzList = muallimah.preferred_juz
      ?.split(',')
      .map((j: string) => parseInt(j.trim()))
      .filter((j: number) => !isNaN(j)) || []

    return muallimahJuzList.includes(thalibahJuz)
  })

  if (matchingHalaqahs.length === 0) {
    return {
      success: false,
      partial: false,
      data: {
        thalibah_id: thalibah.id,
        name: thalibah.full_name,
        reason: `No halaqah found for Juz ${thalibahJuz}`
      }
    }
  }

  // Group by class type
  const halaqahsByClassType = new Map<string, any[]>()
  for (const h of matchingHalaqahs) {
    const program = programMap.get(h.program_id)
    if (!program) continue

    const classType = program.class_type || 'unknown'
    if (!halaqahsByClassType.has(classType)) {
      halaqahsByClassType.set(classType, [])
    }
    halaqahsByClassType.get(classType)!.push(h)
  }

  const assignments: any[] = []
  let hasTashihUjian = false
  let hasUjian = false
  let hasTashih = false

  // Check what class types are available
  if (halaqahsByClassType.has('tashih_ujian')) {
    hasTashihUjian = true
  }
  if (halaqahsByClassType.has('ujian_only')) {
    hasUjian = true
  }
  if (halaqahsByClassType.has('tashih_only')) {
    hasTashih = true
  }

  // If tashih_ujian is available, assign there (covers both requirements)
  if (hasTashihUjian) {
    const tashihUjianHalaqahs = halaqahsByClassType.get('tashih_ujian')!
    const availableHalaqah = findAvailableHalaqah(tashihUjianHalaqahs)

    if (availableHalaqah) {
      const result = await performAssignment(thalibah.id, availableHalaqah.id, adminId, supabaseAdmin)
      if (result.success) {
        assignments.push({
          halaqah_id: availableHalaqah.id,
          class_type: 'tashih_ujian',
          covers: ['ujian', 'tashih']
        })
      }
    } else {
      return {
        success: false,
        partial: false,
        data: {
          thalibah_id: thalibah.id,
          name: thalibah.full_name,
          reason: 'No available capacity in tashih_ujian halaqah'
        }
      }
    }
  } else {
    // Need separate assignments for ujian and tashih
    let assignedUjian = false
    let assignedTashih = false

    if (hasUjian) {
      const ujianHalaqahs = halaqahsByClassType.get('ujian_only')!
      const availableHalaqah = findAvailableHalaqah(ujianHalaqahs)

      if (availableHalaqah) {
        const result = await performAssignment(thalibah.id, availableHalaqah.id, adminId, supabaseAdmin)
        if (result.success) {
          assignments.push({
            halaqah_id: availableHalaqah.id,
            class_type: 'ujian_only',
            covers: ['ujian']
          })
          assignedUjian = true
        }
      }
    }

    if (hasTashih) {
      const tashihHalaqahs = halaqahsByClassType.get('tashih_only')!
      const availableHalaqah = findAvailableHalaqah(tashihHalaqahs)

      if (availableHalaqah) {
        const result = await performAssignment(thalibah.id, availableHalaqah.id, adminId, supabaseAdmin)
        if (result.success) {
          assignments.push({
            halaqah_id: availableHalaqah.id,
            class_type: 'tashih_only',
            covers: ['tashih']
          })
          assignedTashih = true
        }
      }
    }

    // Check if both assignments were made
    if (assignedUjian && assignedTashih) {
      return {
        success: true,
        data: {
          thalibah_id: thalibah.id,
          name: thalibah.full_name,
          assignments
        }
      }
    } else if (assignedUjian || assignedTashih) {
      return {
        success: false,
        partial: true,
        data: {
          thalibah_id: thalibah.id,
          name: thalibah.full_name,
          reason: assignedUjian ? 'No available tashih class' : 'No available ujian class',
          assignments
        }
      }
    } else {
      return {
        success: false,
        partial: false,
        data: {
          thalibah_id: thalibah.id,
          name: thalibah.full_name,
          reason: 'No available capacity in ujian or tashih halaqahs'
        }
      }
    }
  }

  if (assignments.length > 0) {
    return {
      success: true,
      data: {
        thalibah_id: thalibah.id,
        name: thalibah.full_name,
        assignments
      }
    }
  }

  return {
    success: false,
    partial: false,
    data: {
      thalibah_id: thalibah.id,
      name: thalibah.full_name,
      reason: 'Failed to assign to any halaqah'
    }
  }
}

/**
 * Assign thalibah to specific halaqahs (manual override)
 */
async function assignToSpecificHalaqah(
  thalibah: any,
  manualAssignment: any,
  programMap: Map<string, any>,
  adminId: string,
  supabaseAdmin: any
) {
  const assignments: any[] = []
  let successCount = 0
  const requiredHalaqahs = manualAssignment.halaqah_ids || []

  for (const halaqahId of requiredHalaqahs) {
    const result = await performAssignment(thalibah.id, halaqahId, adminId, supabaseAdmin)
    if (result.success) {
      const program = programMap.get(result.halaqah?.program_id)
      assignments.push({
        halaqah_id: halaqahId,
        class_type: program?.class_type,
        covers: [program?.class_type]
      })
      successCount++
    }
  }

  if (successCount === requiredHalaqahs.length) {
    return {
      success: true,
      data: {
        thalibah_id: thalibah.id,
        name: thalibah.full_name,
        assignments
      }
    }
  } else if (successCount > 0) {
    return {
      success: false,
      partial: true,
      data: {
        thalibah_id: thalibah.id,
        name: thalibah.full_name,
        reason: `Only ${successCount}/${requiredHalaqahs.length} halaqahs assigned successfully`,
        assignments
      }
    }
  } else {
    return {
      success: false,
      partial: false,
      data: {
        thalibah_id: thalibah.id,
        name: thalibah.full_name,
        reason: 'Failed to assign to any specified halaqah'
      }
    }
  }
}

/**
 * Find halaqah with available capacity
 */
function findAvailableHalaqah(halaqahs: any[]): any | null {
  // Find halaqah with space (prefer less full ones for load balancing)
  const availableHalaqahs = halaqahs.filter(h => {
    const currentStudents = h._count?.students || 0
    const maxStudents = h.max_students || 20
    return currentStudents < maxStudents
  })

  if (availableHalaqahs.length === 0) {
    return null
  }

  // Sort by current students (ascending) to distribute load
  availableHalaqahs.sort((a, b) => {
    const aStudents = a._count?.students || 0
    const bStudents = b._count?.students || 0
    return aStudents - bStudents
  })

  return availableHalaqahs[0]
}

/**
 * Perform the actual assignment to halaqah
 */
async function performAssignment(
  thalibahId: string,
  halaqahId: string,
  adminId: string,
  supabaseAdmin: any
) {
  try {
    // Check if already assigned
    const { data: existing } = await supabaseAdmin
      .from('halaqah_students')
      .select('*')
      .eq('halaqah_id', halaqahId)
      .eq('thalibah_id', thalibahId)
      .single()

    if (existing) {
      return {
        success: false,
        halaqah: existing,
        reason: 'Already assigned to this halaqah'
      }
    }

    // Create assignment
    const { data, error } = await supabaseAdmin
      .from('halaqah_students')
      .insert({
        halaqah_id: halaqahId,
        thalibah_id: thalibahId,
        assigned_by: adminId,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Add thalibah to halaqah by updating daftar_ulang_submissions (Admin only)
 *
 * This function:
 * 1. Verifies thalibah exists in enrolment table and has selection_status = 'selected'
 * 2. Updates or creates daftar_ulang_submissions with the halaqah_id based on halaqahType
 * 3. Synchronizes approved submissions into halaqah_students
 *
 * @param halaqahId - Target halaqah ID
 * @param thalibahIds - Array of thalibah (user) IDs to add
 * @param halaqahType - 'ujian', 'tashih', or 'both'
 * @returns Success status with results
 */
export async function addThalibahToHalaqah(params: {
  halaqahId: string
  thalibahIds: string[]
  halaqahType: 'ujian' | 'tashih' | 'both'
}) {
  try {
    // CRITICAL: Verify admin role first
    const { user, supabaseAdmin } = await verifyAdmin()

    const { halaqahId, thalibahIds, halaqahType } = params

    // Validate required fields
    if (!halaqahId) {
      return {
        success: false,
        error: 'Halaqah ID is required'
      }
    }

    if (!thalibahIds || !Array.isArray(thalibahIds) || thalibahIds.length === 0) {
      return {
        success: false,
        error: 'Thalibah IDs is required and must be a non-empty array'
      }
    }

    if (!halaqahType) {
      return {
        success: false,
        error: 'Halaqah type is required'
      }
    }

    console.log('[addThalibahToHalaqah] Adding', thalibahIds.length, 'thalibahs to halaqah', halaqahId, 'type:', halaqahType)
    console.log('[addThalibahToHalaqah] Thalibah IDs:', thalibahIds)

    // Verify halaqah exists
    const { data: halaqah, error: halaqahError } = await supabaseAdmin
      .from('halaqah')
      .select('id, name, max_students')
      .eq('id', halaqahId)
      .single()

    if (halaqahError || !halaqah) {
      console.error('[addThalibahToHalaqah] Halaqah not found:', halaqahError)
      return {
        success: false,
        error: 'Halaqah not found'
      }
    }

    console.log('[addThalibahToHalaqah] Halaqah found:', halaqah.name)

    // Get current student count
    const { data: currentStudents, error: countError } = await supabaseAdmin
      .from('halaqah_students')
      .select('id', { count: 'exact', head: true })
      .eq('halaqah_id', halaqahId)
      .eq('status', 'active')

    const currentCount = currentStudents?.length || 0
    const maxStudents = halaqah.max_students || 20
    const availableSlots = maxStudents - currentCount

    console.log('[addThalibahToHalaqah] Current students:', currentCount, 'Max:', maxStudents, 'Available:', availableSlots)

    if (availableSlots < thalibahIds.length) {
      return {
        success: false,
        error: `Not enough capacity. Current: ${currentCount}/${maxStudents}, Available: ${availableSlots}, Requested: ${thalibahIds.length}`
      }
    }

    const results: {
      success: any[]
      failed: any[]
    } = {
      success: [],
      failed: []
    }

    // Process each thalibah
    for (const thalibahId of thalibahIds) {
      try {
        console.log('[addThalibahToHalaqah] Processing thalibah:', thalibahId)

        // Step 1: Verify thalibah exists in enrolment table (pendaftaran_tikrar_tahfidz)
        const { data: enrolment, error: enrolmentError } = await supabaseAdmin
          .from('pendaftaran_tikrar_tahfidz')
          .select('id, user_id, full_name, status, selection_status, re_enrollment_completed, chosen_juz, batch_id')
          .eq('user_id', thalibahId)
          .single()

        if (enrolmentError) {
          console.error('[addThalibahToHalaqah] Enrolment error for', thalibahId, ':', enrolmentError)
          results.failed.push({
            thalibah_id: thalibahId,
            reason: `Database error: ${enrolmentError.message}`
          })
          continue
        }

        if (!enrolment) {
          console.warn('[addThalibahToHalaqah] Thalibah not found in enrolment table:', thalibahId)
          results.failed.push({
            thalibah_id: thalibahId,
            reason: 'Thalibah not found in enrolment table (pendaftaran_tikrar_tahfidz). Pastikan thalibah sudah mendaftar.'
          })
          continue
        }

        console.log('[addThalibahToHalaqah] Enrolment found:', enrolment.full_name, 'selection_status:', enrolment.selection_status)

        // Verify thalibah is selected (passed selection)
        if (enrolment.selection_status !== 'selected') {
          console.warn('[addThalibahToHalaqah] Thalibah has not passed selection:', enrolment.full_name, 'status:', enrolment.selection_status)
          results.failed.push({
            thalibah_id: thalibahId,
            name: enrolment.full_name,
            reason: `Thalibah has not passed selection (status: ${enrolment.selection_status})`
          })
          continue
        }

        // Step 2: Update/create daftar_ulang_submissions with halaqah_id
        // Use batch_id from enrolment record
        const batchId = enrolment.batch_id

        if (!batchId) {
          console.error('[addThalibahToHalaqah] Enrolment does not have batch_id:', thalibahId)
          results.failed.push({
            thalibah_id: thalibahId,
            name: enrolment.full_name,
            reason: 'Data enrolment tidak memiliki batch_id'
          })
          continue
        }

        // Check if thalibah has a daftar_ulang_submission for this batch
        const { data: existingSubmission } = await supabaseAdmin
          .from('daftar_ulang_submissions')
          .select('id, status')
          .eq('user_id', thalibahId)
          .eq('batch_id', batchId)
          .maybeSingle()

        const updateData: any = {
          updated_at: new Date().toISOString(),
          // Set status to approved when admin manually adds thalibah to halaqah
          status: 'approved',
          submitted_at: new Date().toISOString()
        }

        // Update based on halaqahType
        if (halaqahType === 'ujian') {
          updateData.ujian_halaqah_id = halaqahId
        } else if (halaqahType === 'tashih') {
          updateData.tashih_halaqah_id = halaqahId
        } else if (halaqahType === 'both') {
          updateData.ujian_halaqah_id = halaqahId
          updateData.tashih_halaqah_id = halaqahId
        }

        if (existingSubmission) {
          // Update existing submission - set status to approved
          const { error: updateError } = await supabaseAdmin
            .from('daftar_ulang_submissions')
            .update(updateData)
            .eq('id', existingSubmission.id)

          if (updateError) {
            console.error('[addThalibahToHalaqah] Error updating daftar_ulang_submissions for', thalibahId, ':', updateError)
            results.failed.push({
              thalibah_id: thalibahId,
              name: enrolment.full_name,
              reason: updateError.message
            })
            continue
          }

          console.log('[addThalibahToHalaqah] Updated daftar_ulang_submissions for', enrolment.full_name)
        } else {
          // Create new submission with approved status (admin manually added thalibah)
          const { error: insertError } = await supabaseAdmin
            .from('daftar_ulang_submissions')
            .insert({
              user_id: thalibahId,
              registration_id: enrolment.id,
              batch_id: batchId,
              status: 'approved',
              submitted_at: new Date().toISOString(),
              ...updateData,
              created_at: new Date().toISOString()
            })

          if (insertError) {
            console.error('[addThalibahToHalaqah] Error creating daftar_ulang_submissions for', thalibahId, ':', insertError)
            results.failed.push({
              thalibah_id: thalibahId,
              name: enrolment.full_name,
              reason: insertError.message
            })
            continue
          }

          console.log('[addThalibahToHalaqah] Created daftar_ulang_submissions for', enrolment.full_name)
        }

        await syncApprovedSubmissionToHalaqahStudents(
          supabaseAdmin,
          {
            user_id: thalibahId,
            ujian_halaqah_id: halaqahType === 'ujian' || halaqahType === 'both' ? halaqahId : null,
            tashih_halaqah_id: halaqahType === 'tashih' || halaqahType === 'both' ? halaqahId : null
          },
          user.id
        )

        results.success.push({
          thalibah_id: thalibahId,
          name: enrolment.full_name
        })

        console.log('[addThalibahToHalaqah] Successfully added', enrolment.full_name, 'to', halaqah.name)

      } catch (error: any) {
        console.error('[addThalibahToHalaqah] Error processing thalibah', thalibahId, ':', error)
        results.failed.push({
          thalibah_id: thalibahId,
          reason: error.message || 'Unknown error'
        })
      }
    }

    // Audit log
    const { ip, userAgent } = getRequestInfo()
    await logAudit({
      userId: user.id,
      action: 'CREATE',
      resource: 'halaqah_students',
      details: {
        halaqah_id: halaqahId,
        halaqah_type: halaqahType,
        total_requested: thalibahIds.length,
        successful: results.success.length,
        failed: results.failed.length
      },
      ipAddress: ip,
      userAgent: userAgent,
      level: 'INFO'
    })

    // Revalidate admin halaqah page cache
    revalidatePath('/admin/halaqah')
    revalidatePath('/admin/daftar-ulang')

    console.log('[addThalibahToHalaqah] Final results:', {
      success: results.success.length,
      failed: results.failed.length,
      failed_details: results.failed
    })

    return {
      success: true,
      data: results,
      message: `Successfully added ${results.success.length} thalibah${results.failed.length > 0 ? `, ${results.failed.length} failed` : ''}`
    }

  } catch (error: any) {
    console.error('[addThalibahToHalaqah] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add thalibah to halaqah'
    }
  }
}

/**
 * Get enrolled thalibah that can be added to halaqah
 *
 * Returns ALL thalibah who are selected (selection_status = 'selected')
 * and DON'T already have the specific halaqah_id in daftar_ulang_submissions table.
 *
 * @param batchId - Optional batch ID to filter thalibah
 * @returns List of eligible thalibah
 */
export async function getEligibleThalibahForHalaqah(batchId?: string) {
  try {
    // CRITICAL: Verify admin role first
    const { supabaseAdmin } = await verifyAdmin()

    // First, get ALL thalibah who are selected (regardless of re_enrollment_completed status)
    let query = supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('id, user_id, full_name, chosen_juz, selection_status, re_enrollment_completed, batch_id')
      .eq('selection_status', 'selected')
      .order('full_name', { ascending: true })

    if (batchId && batchId !== 'all') {
      query = query.eq('batch_id', batchId)
    }

    const { data: thalibahs, error } = await query

    if (error) {
      console.error('[getEligibleThalibahForHalaqah] Error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    if (!thalibahs || thalibahs.length === 0) {
      return {
        success: true,
        data: []
      }
    }

    // Get the user IDs to check their daftar_ulang_submissions
    const userIds = thalibahs.map((t: any) => t.user_id)

    // Fetch submissions to check which thalibah already have halaqah assignments
    let submissionsQuery = supabaseAdmin
      .from('daftar_ulang_submissions')
      .select('user_id, ujian_halaqah_id, tashih_halaqah_id')
      .in('user_id', userIds)

    if (batchId && batchId !== 'all') {
      submissionsQuery = submissionsQuery.eq('batch_id', batchId)
    }

    const { data: submissions, error: submissionsError } = await submissionsQuery

    if (submissionsError) {
      console.error('[getEligibleThalibahForHalaqah] Error fetching submissions:', submissionsError)
      // Continue without submission filtering
    }

    // Create a set of user_ids who already have halaqah assignments (either ujian or tashih)
    const thalibahWithHalaqah = new Set<string>()
    if (submissions) {
      submissions.forEach((sub: any) => {
        // If they have either ujian or tashih halaqah assigned
        if (sub.ujian_halaqah_id || sub.tashih_halaqah_id) {
          thalibahWithHalaqah.add(sub.user_id)
        }
      })
    }

    console.log('[getEligibleThalibahForHalaqah] Total thalibah:', thalibahs.length, 'With halaqah:', thalibahWithHalaqah.size, 'batchId:', batchId)

    // Filter out thalibah who already have halaqah assignments
    const eligibleThalibah = thalibahs.filter((t: any) => !thalibahWithHalaqah.has(t.user_id))

    console.log('[getEligibleThalibahForHalaqah] Eligible thalibah:', eligibleThalibah.length)

    return {
      success: true,
      data: eligibleThalibah
    }

  } catch (error: any) {
    console.error('[getEligibleThalibahForHalaqah] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch eligible thalibah'
    }
  }
}

/**
 * Search users by name or email for assignment as Raisah/Musyrifah
 */
export async function searchUsersForAsisten(searchQuery: string) {
  try {
    const { supabaseAdmin } = await verifyAdmin()
    
    if (!searchQuery || searchQuery.length < 3) {
      return { success: true, data: [] }
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, roles, whatsapp')
      .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .limit(10)
      
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Assign a user as Raisah or Musyrifah to a halaqah and update their global roles
 */
export async function assignAsisten(halaqahId: string, userId: string, asistenRole: 'roisah' | 'musyrifah') {
  try {
    const { supabaseAdmin, user } = await verifyAdmin()
    
    // 1. Fetch user to get current roles
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', userId)
      .single()
      
    if (userError || !userData) {
      throw new Error('User not found')
    }
    
    // 2. Fetch existing mentor for this halaqah to potentially replace
    // We consider 'musyrifah' role in halaqah_mentors as the generic assistant role for this purpose
    const { data: existingMentors, error: existingError } = await supabaseAdmin
      .from('halaqah_mentors')
      .select('id, mentor_id')
      .eq('halaqah_id', halaqahId)
      .eq('role', 'musyrifah')
      .eq('is_primary', false)
      
    if (existingError) throw existingError
    
    // If there is an existing assistant different from the new one, remove them from halaqah_mentors
    // Note: We don't automatically revoke their global 'roisah'/'musyrifah' role here because they might be assigned to other halaqahs.
    if (existingMentors && existingMentors.length > 0) {
      for (const m of existingMentors) {
        if (m.mentor_id !== userId) {
          await supabaseAdmin.from('halaqah_mentors').delete().eq('id', m.id)
        }
      }
    }
    
    // 3. Add role to user if they don't have it
    const roles = userData.roles || []
    const roleForUsersTable = asistenRole === 'roisah' ? 'musyrifah' : asistenRole
    if (!roles.includes(roleForUsersTable)) {
      roles.push(roleForUsersTable)
      const { error: updateRoleError } = await supabaseAdmin
        .from('users')
        .update({ roles })
        .eq('id', userId)
        
      if (updateRoleError) throw updateRoleError
    }
    
    // 4. Add to halaqah_mentors using 'musyrifah' as the accepted enum value (DB constraint limitation for 'roisah')
    const isAlreadyAssigned = existingMentors?.some(m => m.mentor_id === userId)
    if (!isAlreadyAssigned) {
      const { error: insertError } = await supabaseAdmin
        .from('halaqah_mentors')
        .insert({
          halaqah_id: halaqahId,
          mentor_id: userId,
          role: 'musyrifah', 
          is_primary: false
        })
        
      if (insertError) throw insertError
    }
    
    // 5. Log audit
    const { ip, userAgent } = getRequestInfo()
    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      resource: 'halaqah_mentors',
      details: { halaqahId, action: 'assign_asisten', mentor_id: userId, assigned_role: asistenRole },
      ipAddress: ip,
      userAgent: userAgent
    })

    revalidatePath('/admin/halaqah')
    return { success: true }
  } catch (error: any) {
    console.error('Assign asisten error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Remove an assistant from a halaqah
 */
export async function removeAsisten(halaqahId: string, userId: string) {
  try {
    const { supabaseAdmin, user } = await verifyAdmin()
    
    const { error: deleteError } = await supabaseAdmin
      .from('halaqah_mentors')
      .delete()
      .eq('halaqah_id', halaqahId)
      .eq('mentor_id', userId)
      .eq('role', 'musyrifah')
      .eq('is_primary', false)
      
    if (deleteError) throw deleteError
    
    // Check if user is still an assistant in ANY other halaqah
    const { data: remainingRoles, error: checkError } = await supabaseAdmin
      .from('halaqah_mentors')
      .select('id')
      .eq('mentor_id', userId)
      .eq('role', 'musyrifah')
      .eq('is_primary', false)
      
    if (!checkError && (!remainingRoles || remainingRoles.length === 0)) {
      // Remove assistant roles from user
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('roles')
        .eq('id', userId)
        .single()
        
      if (!userError && userData && userData.roles) {
        const updatedRoles = userData.roles.filter((r: string) => r !== 'roisah' && r !== 'musyrifah')
        await supabaseAdmin
          .from('users')
          .update({ roles: updatedRoles })
          .eq('id', userId)
      }
    }
    
    const { ip, userAgent } = getRequestInfo()
    await logAudit({
      userId: user.id,
      action: 'DELETE',
      resource: 'halaqah_mentors',
      details: { halaqahId, action: 'remove_asisten', mentor_id: userId },
      ipAddress: ip,
      userAgent: userAgent
    })

    revalidatePath('/admin/halaqah')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
