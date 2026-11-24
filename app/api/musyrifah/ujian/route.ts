import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { isStaff } from '@/lib/roles';

const supabaseAdmin = createSupabaseAdmin();

export async function GET() {
  try {
    const supabase = createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has staff/admin/musyrifah role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const roles = userData?.roles || [];
    if (!isStaff(roles)) {
      return NextResponse.json({ error: 'Forbidden: Staff access required' }, { status: 403 });
    }

    // Get all ujian results
    const { data: allResults, error } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        id,
        user_id,
        registration_id,
        juz_number,
        exam_type,
        score,
        status,
        submitted_at,
        created_at,
        updated_at,
        thalibah:users(id, full_name, nama_kunyah, whatsapp, email)
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    // Group results by user_id and juz_number
    const resultKey = new Map<string, any>();

    allResults?.forEach((attempt: any) => {
      const thalibahId = attempt.user_id;
      const key = `${thalibahId}_${attempt.juz_number}_${attempt.exam_type || 'selection'}`;
      const existing = resultKey.get(key);

      if (!existing) {
        resultKey.set(key, attempt);
      } else {
        const existingScore = existing.score || 0;
        const currentScore = attempt.score || 0;
        const existingStatus = existing.status;
        const currentStatus = attempt.status;

        let shouldReplace = false;

        if (currentStatus === 'submitted' && existingStatus !== 'submitted') {
          shouldReplace = true;
        } else if (currentStatus === existingStatus) {
          if (currentScore > existingScore) {
            shouldReplace = true;
          } else if (currentScore === existingScore) {
            const existingDate = new Date(existing.submitted_at || existing.created_at);
            const currentDate = new Date(attempt.submitted_at || attempt.created_at);
            if (currentDate > existingDate) {
              shouldReplace = true;
            }
          }
        }

        if (shouldReplace) {
          resultKey.set(key, attempt);
        }
      }
    });

    const uniqueResults = Array.from(resultKey.values());

    // Group by user_id for UI display
    const resultsByThalibah = new Map<string, any[]>();
    uniqueResults.forEach((result: any) => {
      const thalibahId = result.user_id;
      if (!resultsByThalibah.has(thalibahId)) {
        resultsByThalibah.set(thalibahId, []);
      }
      const thalibahResults = resultsByThalibah.get(thalibahId);
      if (thalibahResults) {
        thalibahResults.push(result);
      }
    });

    // Calculate summary for each thalibah
    const thalibahSummaries = new Map();
    resultsByThalibah.forEach((attempts: any[], thalibahId: string) => {
      const passedAttempts = attempts.filter((a: any) => (a.score || 0) >= 80);
      const uniqueJuz = new Set(attempts.map((a: any) => a.juz_number));
      const firstAttempt = attempts[0];

      thalibahSummaries.set(thalibahId, {
        total_attempts: attempts.length,
        passed_attempts: passedAttempts.length,
        unique_juz_count: uniqueJuz.size,
        latest_attempt_date: firstAttempt?.submitted_at || firstAttempt?.created_at,
      });
    });

    const groupedData = Array.from(resultsByThalibah.entries()).map(([thalibahId, attempts]) => {
      const summary = thalibahSummaries.get(thalibahId);
      const thalibahInfo = attempts[0]?.thalibah || {};

      return {
        thalibah_id: thalibahId,
        thalibah: thalibahInfo,
        summary,
        attempts: attempts.map((a: any) => ({
          id: a.id,
          juz_number: a.juz_number,
          exam_type: a.exam_type || 'selection',
          score: a.score,
          status: a.status,
          submitted_at: a.submitted_at,
          created_at: a.created_at,
          updated_at: a.updated_at,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: groupedData,
    });
  } catch (error: any) {
    console.error('Error in musyrifah ujian API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
