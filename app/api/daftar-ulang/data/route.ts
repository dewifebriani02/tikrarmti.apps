import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiResponses } from '@/lib/api-responses'


export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return ApiResponses.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    let batchId = searchParams.get('batchId')

    let query = supabase
      .from('pendaftaran_tikrar_tahfidz')
      .select('*, batch:batches(opening_class_date)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (batchId) {
      query = query.eq('batch_id', batchId)
    }

    const { data: registrations, error: regError } = await query

    if (regError || !registrations || registrations.length === 0) {
      return ApiResponses.error('NOT_FOUND', 'Pendaftaran tidak ditemukan', undefined, 404)
    }

    const approvedRegistration = registrations.find(reg => reg.selection_status === 'selected' || reg.selection_status === 'waitlist' || (reg.oral_total_score ?? 0) >= 80);
    const registration = approvedRegistration || registrations[0]
    
    const { data: existingSubmission } = await supabase
      .from('daftar_ulang_submissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('registration_id', registration.id)
      .maybeSingle()

    const oralScore = registration.oral_total_score ?? 0;
    const isPassed = registration.selection_status === 'selected' || registration.selection_status === 'waitlist' || oralScore >= 80;
    
    // Jika user belum lulus seleksi tapi sudah memiliki submission Akad, izinkan lanjut pilih halaqah
    if (!isPassed && !existingSubmission) {
      return ApiResponses.error('FORBIDDEN', 'Pendaftaran Ukhti belum lulus seleksi', undefined, 403)
    }

    batchId = registration.batch_id

    // Ambil Halaqah yang sesuai
    const { data: rawHalaqah, error: halaqahError } = await supabase
      .from('halaqah')
      .select(`
        id, name, description,
        day_of_week, start_time, end_time, location, max_students,
        mentors:halaqah_mentors(
          mentor_id, role, is_primary,
          users:users!halaqah_mentors_mentor_id_fkey(full_name)
        ),
        programs!inner(batch_id, class_type)
      `)
      .eq('programs.batch_id', batchId)
      .eq('status', 'active')

    if (halaqahError) {
      console.error('Error fetching halaqah:', halaqahError)
      return ApiResponses.databaseError(halaqahError)
    }

    let halaqahData = []
    if (rawHalaqah && rawHalaqah.length > 0) {
      const finalJuz = (registration.chosen_juz || '').toUpperCase()
      
      const quotaUrl = new URL('/api/shared/halaqah-quota', request.url)
      quotaUrl.searchParams.set('batch_id', batchId || '')
      quotaUrl.searchParams.set('user_id', user.id)

      let halaqahWithQuotas = rawHalaqah as any[]
      try {
        const quotaResponse = await fetch(quotaUrl.toString(), {
          headers: {
            'Cookie': request.headers.get('Cookie') || ''
          }
        })

        if (quotaResponse.ok) {
          const quotaResult = await quotaResponse.json()
          if (quotaResult?.data && Array.isArray(quotaResult.data.halaqah)) {
            const quotaMap = new Map<string, any>(quotaResult.data.halaqah.map((h: any) => [h.id, h]))
            halaqahWithQuotas = rawHalaqah.map((h: any) => {
              const quotaInfo = quotaMap.get(h.id)
              return quotaInfo ? { ...h, ...quotaInfo } : h
            })
          }
        }
      } catch (err) {
        console.error('Error fetching quota, falling back to raw halaqah:', err)
        // Ensure program_class_type is set even if quota fetch fails
        halaqahWithQuotas = rawHalaqah.map(h => ({
          ...h,
          program_class_type: Array.isArray(h.programs) ? h.programs[0]?.class_type : (h.programs as any)?.class_type,
          is_full: false,
          available_slots: h.max_students || 5
        }))
      }
      
      halaqahData = halaqahWithQuotas.filter((h: any) => {
        if (!finalJuz || finalJuz === 'N/A') return true
        
        if (h.muallimah_preferred_juz || h.preferred_juz) {
          const pref = h.muallimah_preferred_juz || h.preferred_juz
          const preferredJuzs = pref.split(',').map((j: string) => j.trim().toUpperCase())
          
          if (preferredJuzs.includes(finalJuz)) return true
          
          // Match base juz (e.g. "30A" matches "30")
          const baseJuzMatch = finalJuz.match(/^(\d+)/)
          if (baseJuzMatch) {
            const baseJuz = baseJuzMatch[1]
            if (preferredJuzs.includes(baseJuz)) return true
          }
          
          return false
        }
        return true
      })
    }

    return ApiResponses.success({
      registration,
      existingSubmission,
      halaqah: halaqahData
    })

  } catch (error) {
    console.error('API /api/daftar-ulang/data error:', error)
    return ApiResponses.handleUnknown(error)
  }
}
