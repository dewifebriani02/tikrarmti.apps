export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

/**
 * GET /api/user/pairing
 *
 * Get current user's pairing information for the Perjalanan Saya page
 *
 * Query params:
 * - batch_id: Batch ID (optional, will use latest if not provided)
 */
export async function GET(request: Request) {
  const supabase = createClient()

  // 1. Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse query params
  const { searchParams } = new URL(request.url)
  const batchIdParam = searchParams.get('batch_id')

  try {
    // 3. Get user's batch_id from registration if not provided
    let batchId = batchIdParam
    if (!batchId) {
      const { data: registration } = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .select('batch_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!registration) {
        return NextResponse.json(
          { error: 'No registration found' },
          { status: 404 }
        )
      }
      batchId = registration.batch_id
    }

    const supabaseAdmin = createSupabaseAdmin();

    // 4. Find user's pairing using admin to avoid RLS issues
    const { data: pairing, error: pairingError } = await supabaseAdmin
      .from('study_partners')
      .select('*')
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id},user_3_id.eq.${user.id}`)
      .eq('batch_id', batchId)
      .eq('pairing_status', 'active')
      .maybeSingle()

    if (pairingError) throw pairingError

    // 11. Get submission data for family/tarteel/self_match partner details
    const { data: submissionData } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .select('id, partner_name, partner_relationship, partner_notes, partner_wa_phone, partner_type, partner_user_id, status')
      .eq('user_id', user.id)
      .eq('batch_id', batchId)
      .in('status', ['draft', 'submitted', 'approved'])
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (!pairing) {
      if (!submissionData) {
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No pairing found'
        })
      }
      
      // If we have a submission but no formal pairing yet, return the pending data
      // Get current user's registration for their details
      const { data: currentUserReg } = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .select('chosen_juz, main_time_slot, backup_time_slot, timezone')
        .eq('user_id', user.id)
        .eq('batch_id', batchId)
        .maybeSingle()
        
      const { data: currentUserDetails } = await supabase
        .from('users')
        .select('id, full_name, email, zona_waktu, whatsapp, tanggal_lahir')
        .eq('id', user.id)
        .single()
        
      let partnerName = submissionData.partner_name;
      let isMutualMatch = false;
      let partnerDetailsExt: any = null;

      if (submissionData.partner_type === 'self_match' && submissionData.partner_user_id) {
        const { data: pDetails } = await supabaseAdmin
          .from('users')
          .select('full_name, zona_waktu, whatsapp')
          .eq('id', submissionData.partner_user_id)
          .single()
        if (pDetails) {
          partnerName = pDetails.full_name;
        }

        const { data: pReg } = await supabaseAdmin
          .from('pendaftaran_tikrar_tahfidz')
          .select('chosen_juz, main_time_slot, backup_time_slot, timezone')
          .eq('user_id', submissionData.partner_user_id)
          .eq('batch_id', batchId)
          .maybeSingle()

        if (pDetails || pReg) {
          partnerDetailsExt = {
            zona_waktu: pReg?.timezone || pDetails?.zona_waktu || 'WIB',
            chosen_juz: pReg?.chosen_juz || 'N/A',
            main_time_slot: pReg?.main_time_slot || 'N/A',
            backup_time_slot: pReg?.backup_time_slot || 'N/A',
            whatsapp: pDetails?.whatsapp,
          }
        }

        // Check mutual match
        const { data: partnerSubmission } = await supabaseAdmin
          .from('daftar_ulang_submissions')
          .select('id, status, partner_status')
          .eq('user_id', submissionData.partner_user_id)
          .eq('partner_user_id', user.id)
          .eq('batch_id', batchId)
          .eq('partner_type', 'self_match')
          .maybeSingle();
        
        isMutualMatch = Boolean(
          partnerSubmission &&
          (partnerSubmission.partner_status === 'submitted' ||
            partnerSubmission.partner_status === 'approved' ||
            partnerSubmission.status === 'submitted' ||
            partnerSubmission.status === 'approved')
        );
      }
        
      return NextResponse.json({
        success: true,
        data: {
          submission_id: submissionData.id,
          current_user: {
            id: currentUserDetails?.id,
            full_name: currentUserDetails?.full_name,
            email: currentUserDetails?.email,
            zona_waktu: currentUserReg?.timezone || currentUserDetails?.zona_waktu || 'WIB',
            whatsapp: currentUserDetails?.whatsapp,
            tanggal_lahir: currentUserDetails?.tanggal_lahir,
            chosen_juz: currentUserReg?.chosen_juz || 'N/A',
            main_time_slot: currentUserReg?.main_time_slot || 'N/A',
            backup_time_slot: currentUserReg?.backup_time_slot || 'N/A',
          },
          pairing: null,
          user_1: null,
          user_2: null,
          user_3: null,
          partner_details: {
            partner_name: partnerName,
            partner_relationship: submissionData.partner_relationship,
            partner_notes: submissionData.partner_notes,
            partner_wa_phone: submissionData.partner_wa_phone,
            partner_type: submissionData.partner_type,
            partner_user_id: submissionData.partner_user_id,
            is_mutual_match: isMutualMatch,
            zona_waktu: partnerDetailsExt?.zona_waktu,
            chosen_juz: partnerDetailsExt?.chosen_juz,
            main_time_slot: partnerDetailsExt?.main_time_slot,
            backup_time_slot: partnerDetailsExt?.backup_time_slot,
            whatsapp: partnerDetailsExt?.whatsapp,
            status: submissionData.status,
          },
        }
      })
    }


    // 5. Get all user IDs in the pairing
    const userIds = [pairing.user_1_id, pairing.user_2_id, pairing.user_3_id].filter(Boolean) as string[]

    // 6. Get all users' details (use Admin to bypass RLS so we can read partner's full_name)
    const { data: usersData } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, zona_waktu, whatsapp, tanggal_lahir')
      .in('id', userIds)

    const usersMap = new Map<string, any>((usersData || []).map((u: any) => [u.id, u]))

    // 7. Get registration data for all users
    const { data: registrations } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('user_id, chosen_juz, main_time_slot, backup_time_slot, timezone')
      .eq('batch_id', batchId)
      .in('user_id', userIds)

    const regMap = new Map<string, any>((registrations || []).map((r: any) => [r.user_id, r]))

    // 8. Build user data objects
    const buildUserData = (userId: string) => {
      const userData = usersMap.get(userId)
      const userReg = regMap.get(userId)
      return {
        id: userData?.id,
        full_name: userData?.full_name,
        email: userData?.email,
        zona_waktu: userReg?.timezone || userData?.zona_waktu || 'WIB',
        whatsapp: userData?.whatsapp,
        tanggal_lahir: userData?.tanggal_lahir,
        chosen_juz: userReg?.chosen_juz || 'N/A',
        main_time_slot: userReg?.main_time_slot || 'N/A',
        backup_time_slot: userReg?.backup_time_slot || 'N/A',
      }
    }

    // 9. Determine current user's role in the pairing
    const userRole = pairing.user_1_id === user.id ? 'user_1' :
                     pairing.user_2_id === user.id ? 'user_2' :
                     pairing.user_3_id === user.id ? 'user_3' : null

    // 10. Get current user's data for comparison
    const currentUserData = buildUserData(user.id)

    // We already fetched submissionData on line 58, reuse it!

    return NextResponse.json({
      success: true,
      data: {
        submission_id: submissionData?.id,
        current_user: currentUserData,
        pairing: {
          id: pairing.id,
          pairing_type: pairing.pairing_type,
          paired_at: pairing.paired_at,
          is_group_of_3: !!pairing.user_3_id,
          user_role: userRole,
        },
        user_1: buildUserData(pairing.user_1_id),
        user_2: buildUserData(pairing.user_2_id),
        user_3: pairing.user_3_id ? buildUserData(pairing.user_3_id) : null,
        partner_details: submissionData ? {
          partner_name: submissionData.partner_name,
          partner_relationship: submissionData.partner_relationship,
          partner_notes: submissionData.partner_notes,
          partner_wa_phone: submissionData.partner_wa_phone,
          partner_type: submissionData.partner_type,
          partner_user_id: submissionData.partner_user_id,
          is_mutual_match: pairing.pairing_type === 'self_match',
          status: submissionData.status,
        } : null,
      }
    })
  } catch (error: any) {
    console.error('Error fetching user pairing:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch pairing details' },
      { status: 500 }
    )
  }
}
