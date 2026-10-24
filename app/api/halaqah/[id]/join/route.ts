import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationContext, isUserAdmin } from '@/lib/rbac';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface JoinRequest {
  thalibah_id?: string;
  enrollment_type?: 'new' | 're_enrollment';
}

// POST /api/halaqah/[id]/join - Thalibah joins halaqah (with waitlist support)
const supabaseAdmin = createSupabaseAdmin();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const halaqahId = params.id;

  try {
    const context = await getAuthorizationContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!UUID_RE.test(halaqahId)) {
      return NextResponse.json({ error: 'Halaqah not found' }, { status: 404 });
    }

    const body: JoinRequest = await request.json().catch(() => ({}));
    const isAdmin = isUserAdmin(context);
    // Only admin may enroll someone else; everyone else always enrolls themselves
    const thalibah_id = isAdmin && body.thalibah_id ? body.thalibah_id : context.userId;
    const enrollment_type = body.enrollment_type === 'new' ? 'new' : 're_enrollment';

    if (!isAdmin) {
      // Self-join is only allowed into the halaqah chosen in her own daftar ulang
      const { data: ownSubmission } = await supabaseAdmin
        .from('daftar_ulang_submissions')
        .select('id')
        .eq('user_id', context.userId)
        .in('status', ['submitted', 'approved'])
        .or(`ujian_halaqah_id.eq.${halaqahId},tashih_halaqah_id.eq.${halaqahId}`)
        .limit(1)
        .maybeSingle();

      if (!ownSubmission) {
        return NextResponse.json(
          { error: 'Forbidden - halaqah ini tidak sesuai dengan daftar ulang Anda' },
          { status: 403 }
        );
      }
    }

    // Get halaqah details with capacity info
    const { data: halaqah, error: halaqahError } = await supabase
      .from('halaqah')
      .select('*, max_students, waitlist_max, program:programs(class_type)')
      .eq('id', halaqahId)
      .single();

    if (halaqahError || !halaqah) {
      return NextResponse.json({ error: 'Halaqah not found' }, { status: 404 });
    }

    // Count active students from halaqah_students (ONLY active status counts, NOT waitlist)
    const { data: activeStudents } = await supabase
      .from('halaqah_students')
      .select('thalibah_id')
      .eq('halaqah_id', halaqahId)
      .eq('status', 'active');

    // Count submitted submissions from daftar_ulang_submissions (ONLY submitted status counts, NOT draft)
    // Get all submissions for this halaqah (both ujian and tashih)
    const { data: submittedSubmissions } = await supabase
      .from('daftar_ulang_submissions')
      .select('user_id')
      .eq('status', 'submitted')
      .or(`ujian_halaqah_id.eq.${halaqahId},tashih_halaqah_id.eq.${halaqahId}`);

    // Count waitlist students (waitlist does NOT reduce quota)
    const { count: waitlistCount } = await supabase
      .from('halaqah_students')
      .select('*', { count: 'exact', head: true })
      .eq('halaqah_id', halaqahId)
      .eq('status', 'waitlist');

    // Calculate actual quota usage: active students + submitted submissions (unique users)
    const activeStudentIds = new Set<string>((activeStudents || []).map((s: any) => s.thalibah_id));
    const submittedUserIds = new Set<string>((submittedSubmissions || []).map((s: any) => s.user_id));

    // Combine both sets to get unique count (use forEach for ES5 compatibility)
    const allUserIds = new Set<string>();
    activeStudentIds.forEach((id: string) => allUserIds.add(id));
    submittedUserIds.forEach((id: string) => allUserIds.add(id));
    const activeCount = allUserIds.size;

    // Check if student already enrolled
    const { data: existingEnrollment } = await supabase
      .from('halaqah_students')
      .select('*')
      .eq('halaqah_id', halaqahId)
      .eq('thalibah_id', thalibah_id)
      .single();

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return NextResponse.json({
          error: 'Already enrolled in this halaqah',
          status: existingEnrollment.status,
          position: null
        }, { status: 400 });
      }
      if (existingEnrollment.status === 'waitlist') {
        return NextResponse.json({
          status: 'waitlisted',
          position: getWaitlistPosition(existingEnrollment.joined_waitlist_at, waitlistCount || 0)
        });
      }
    }

    // Check capacity
    const currentActive = activeCount || 0;
    const maxCapacity = halaqah.max_students || 20;
    const maxWaitlist = halaqah.waitlist_max || 5;
    const currentWaitlist = waitlistCount || 0;

    let resultStatus: 'joined' | 'waitlisted' | 'error';
    let position: number | null = null;

    if (currentActive < maxCapacity) {
      // Has capacity - join as active
      const { error: joinError } = await supabase
        .from('halaqah_students')
        .insert({
          halaqah_id: halaqahId,
          thalibah_id,
          enrollment_type,
          status: 'active',
          assigned_at: new Date().toISOString()
        });

      if (joinError) {
        return NextResponse.json({ error: joinError.message }, { status: 400 });
      }

      resultStatus = 'joined';
    } else if (currentWaitlist < maxWaitlist) {
      // Full - join waitlist
      const { error: waitlistError } = await supabase
        .from('halaqah_students')
        .insert({
          halaqah_id: halaqahId,
          thalibah_id,
          enrollment_type,
          status: 'waitlist',
          joined_waitlist_at: new Date().toISOString(),
          assigned_at: new Date().toISOString()
        });

      if (waitlistError) {
        return NextResponse.json({ error: waitlistError.message }, { status: 400 });
      }

      resultStatus = 'waitlisted';
      position = currentWaitlist + 1;
    } else {
      // Both active and waitlist are full
      return NextResponse.json({
        error: 'Halaqah is full and waitlist is at maximum capacity',
        status: 'error',
        current_active: currentActive,
        max_capacity: maxCapacity,
        current_waitlist: currentWaitlist,
        max_waitlist: maxWaitlist
      }, { status: 400 });
    }

    return NextResponse.json({
      status: resultStatus,
      position,
      halaqah: {
        id: halaqahId,
        name: halaqah.name,
        program: halaqah.program
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to calculate waitlist position
function getWaitlistPosition(joinedAt: string | null, totalCount: number): number {
  if (!joinedAt) return totalCount + 1;
  // This is a simplified calculation - in production, you'd query for actual position
  return totalCount + 1;
}
