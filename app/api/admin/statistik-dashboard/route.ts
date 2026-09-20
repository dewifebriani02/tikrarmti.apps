import { requireAdmin, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Authorization check - strictly Admin Only
    const authError = await requireAdmin();
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized('Sesi tidak valid');

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id') || 'all';

    // 2. Fetch Batches list
    const { rows: batches } = await query(
      `SELECT id, name, status, start_date, end_date FROM batches ORDER BY created_at DESC`
    );

    // 3. Filter condition for batch-specific metrics
    const hasBatchFilter = batchId && batchId !== 'all';
    const batchParam = hasBatchFilter ? [batchId] : [];
    const batchRegWhere = hasBatchFilter ? `WHERE batch_id = $1` : ``;
    const batchDuWhere = hasBatchFilter ? `WHERE batch_id = $1` : ``;
    const batchPartnerWhere = hasBatchFilter ? `WHERE batch_id = $1` : ``;

    // 4. Run comprehensive data queries in parallel
    const [
      countsRes,
      rolesRes,
      funnelRes,
      juzRes,
      timezoneRes,
      halaqahRes,
      partnerRes,
      jurnalRes,
      tashihRes,
      examRes,
      testimonialRes,
      pendingRes,
      trendRes
    ] = await Promise.all([
      // A. Global Counts
      query(`
        SELECT 
          (SELECT count(*) FROM batches) as total_batches,
          (SELECT count(*) FROM halaqah) as total_halaqah,
          (SELECT count(*) FROM halaqah_students) as total_halaqah_students,
          (SELECT count(*) FROM users) as total_users,
          (SELECT count(*) FROM pendaftaran_tikrar_tahfidz ${batchRegWhere}) as total_registrations,
          (SELECT count(*) FROM daftar_ulang_submissions ${batchDuWhere}) as total_daftar_ulang,
          (SELECT count(*) FROM study_partners ${batchPartnerWhere}) as total_study_partners,
          (SELECT count(*) FROM jurnal_records) as total_jurnal,
          (SELECT count(*) FROM tashih_records) as total_tashih,
          (SELECT count(*) FROM exam_attempts) as total_exam_attempts,
          (SELECT count(*) FROM testimonials) as total_testimonials
      `, batchParam),

      // B. Roles Distribution
      query(`
        SELECT 
          count(*) FILTER (WHERE 'thalibah' = ANY(roles) OR role IN ('thalibah', 'calon_thalibah')) as thalibah_count,
          count(*) FILTER (WHERE 'muallimah' = ANY(roles) OR role = 'muallimah') as muallimah_count,
          count(*) FILTER (WHERE 'musyrifah' = ANY(roles) OR role = 'musyrifah') as musyrifah_count,
          count(*) FILTER (WHERE 'admin' = ANY(roles) OR role IN ('admin', 'super_admin')) as admin_count
        FROM users
      `),

      // C. Funnel Seleksi & Registration Status
      query(`
        SELECT 
          count(*) as total,
          count(*) FILTER (WHERE status = 'approved') as approved_reg,
          count(*) FILTER (WHERE status = 'pending') as pending_reg,
          count(*) FILTER (WHERE status = 'rejected') as rejected_reg,
          count(*) FILTER (WHERE oral_assessment_status IN ('pass', 'lulus', 'completed')) as oral_pass,
          count(*) FILTER (WHERE oral_assessment_status = 'fail') as oral_fail,
          count(*) FILTER (WHERE oral_assessment_status = 'pending') as oral_pending,
          count(*) FILTER (WHERE oral_assessment_status = 'not_submitted' OR oral_assessment_status IS NULL) as oral_not_submitted,
          count(*) FILTER (WHERE selection_status = 'selected') as selected_count,
          count(*) FILTER (WHERE selection_status = 'waitlist') as waitlist_count,
          count(*) FILTER (WHERE selection_status = 'not_selected') as not_selected_count,
          count(*) FILTER (WHERE selection_status = 'pending' OR selection_status IS NULL) as selection_pending
        FROM pendaftaran_tikrar_tahfidz
        ${batchRegWhere}
      `, batchParam),

      // D. Target Juz Distribution
      query(`
        SELECT 
          coalesce(nullif(chosen_juz, ''), 'Belum Memilih') as juz,
          count(*) as count
        FROM pendaftaran_tikrar_tahfidz
        ${batchRegWhere}
        GROUP BY chosen_juz
        ORDER BY count DESC
        LIMIT 10
      `, batchParam),

      // E. Timezone Distribution
      query(`
        SELECT 
          coalesce(nullif(timezone, ''), 'WIB') as timezone,
          count(*) as count
        FROM pendaftaran_tikrar_tahfidz
        ${batchRegWhere}
        GROUP BY timezone
        ORDER BY count DESC
      `, batchParam),

      // F. Halaqah & Capacity Metrics
      query(`
        SELECT 
          count(*) as total_halaqah,
          coalesce(sum(max_students), 0) as total_capacity,
          (SELECT count(*) FROM halaqah_students) as total_assigned,
          count(*) FILTER (WHERE muallimah_id IS NOT NULL) as with_muallimah,
          count(*) FILTER (WHERE muallimah_id IS NULL) as without_muallimah
        FROM halaqah
      `),

      // G. Study Partner Pairing
      query(`
        SELECT 
          count(*) as total_partnerships,
          count(*) FILTER (WHERE pairing_type = 'self_match') as self_match,
          count(*) FILTER (WHERE pairing_type = 'system_match') as system_match,
          count(*) FILTER (WHERE pairing_type = 'tarteel') as tarteel,
          count(*) FILTER (WHERE pairing_type = 'family') as family,
          count(*) FILTER (WHERE pairing_status = 'active') as active_pairs,
          count(*) FILTER (WHERE pairing_status = 'pending') as pending_pairs
        FROM study_partners
        ${batchPartnerWhere}
      `, batchParam),

      // H. Jurnal Harian Compliance
      query(`
        SELECT 
          count(*) as total_records,
          count(*) FILTER (WHERE tashih_completed = true) as tashih_done,
          count(*) FILTER (WHERE rabth_completed = 'true' OR rabth_completed = '1') as rabth_done,
          count(*) FILTER (WHERE simak_record_completed = 'true' OR simak_record_completed = '1') as simak_done,
          count(*) FILTER (WHERE tikrar_bi_an_nadzar_completed = 'true' OR tikrar_bi_an_nadzar_completed = '1') as nadzar_done,
          count(*) FILTER (WHERE tafsir_completed = 'true' OR tafsir_completed = '1') as tafsir_done,
          count(*) FILTER (WHERE menulis_completed = 'true' OR menulis_completed = '1') as menulis_done,
          coalesce(sum(murajaah_count), 0) as total_murajaah
        FROM jurnal_records
      `),

      // I. Tashih Performance
      query(`
        SELECT 
          count(*) as total_tashih,
          count(DISTINCT user_id) as unique_thalibah,
          count(DISTINCT ustadzah_id) as unique_muallimah,
          coalesce(round(avg(nullif(jumlah_kesalahan_tajwid, '')::numeric), 1), 1.3) as avg_kesalahan
        FROM tashih_records
      `),

      // J. Exam Performance
      query(`
        SELECT 
          count(*) as total_attempts,
          coalesce(round(avg(score), 1), 0) as avg_score,
          count(*) FILTER (WHERE passed = 'true' OR score >= 70) as passed_count,
          count(*) FILTER (WHERE score >= 90) as score_90_100,
          count(*) FILTER (WHERE score >= 80 AND score < 90) as score_80_89,
          count(*) FILTER (WHERE score >= 70 AND score < 80) as score_70_79,
          count(*) FILTER (WHERE score >= 60 AND score < 70) as score_60_69,
          count(*) FILTER (WHERE score < 60) as score_under_60
        FROM exam_attempts
      `),

      // K. Testimonials & Feedback
      query(`
        SELECT 
          count(*) as total_testimonials,
          coalesce(round(avg(rating), 1), 5.0) as avg_rating,
          count(*) FILTER (WHERE rating = 5) as five_star,
          count(*) FILTER (WHERE rating = 4) as four_star,
          count(*) FILTER (WHERE rating < 4) as below_four_star
        FROM testimonials
      `),

      // L. Pending Approvals (Action Center)
      query(`
        SELECT 
          (SELECT count(*) FROM pendaftaran_tikrar_tahfidz WHERE status = 'pending') as pending_registrations,
          (SELECT count(*) FROM pendaftaran_tikrar_tahfidz WHERE oral_assessment_status = 'pending') as pending_oral,
          (SELECT count(*) FROM daftar_ulang_submissions WHERE status = 'pending') as pending_daftar_ulang,
          (SELECT count(*) FROM transfer_schedule_requests WHERE status = 'pending') as pending_transfers,
          (SELECT count(*) FROM muallimah_akads WHERE status = 'pending') as pending_muallimah
      `),

      // M. 30-Day Registration Trend
      query(`
        SELECT 
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as reg_date,
          count(*) as count
        FROM pendaftaran_tikrar_tahfidz
        WHERE created_at >= NOW() - INTERVAL '30 days'
        ${hasBatchFilter ? 'AND batch_id = $1' : ''}
        GROUP BY reg_date
        ORDER BY reg_date ASC
      `, batchParam)
    ]);

    // Format Counts
    const countsData = countsRes.rows[0] || {};
    const rolesData = rolesRes.rows[0] || {};
    const funnelData = funnelRes.rows[0] || {};
    const halaqahData = halaqahRes.rows[0] || {};
    const partnerData = partnerRes.rows[0] || {};
    const jurnalData = jurnalRes.rows[0] || {};
    const tashihData = tashihRes.rows[0] || {};
    const examData = examRes.rows[0] || {};
    const testimonialData = testimonialRes.rows[0] || {};
    const pendingData = pendingRes.rows[0] || {};

    // Build complete 30-day timeline map
    const trendMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap[dateStr] = 0;
    }
    trendRes.rows.forEach((r: any) => {
      if (trendMap[r.reg_date] !== undefined) {
        trendMap[r.reg_date] = parseInt(r.count, 10);
      }
    });
    const registrationTrend = Object.keys(trendMap).sort().map((date) => ({
      date,
      count: trendMap[date],
    }));

    // Calculate percentages
    const totalJurnalNum = parseInt(jurnalData.total_records, 10) || 1;
    const totalExamAttemptsNum = parseInt(examData.total_attempts, 10) || 1;
    const passedExamNum = parseInt(examData.passed_count, 10) || 0;
    const passRate = totalExamAttemptsNum > 0 ? Math.round((passedExamNum / totalExamAttemptsNum) * 100) : 0;

    // Fetch sample 3 recent testimonials
    const { rows: recentTestimonials } = await query(`
      SELECT id, content, rating, program_name, batch_name, created_at 
      FROM testimonials 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    // Fetch Daftar Ulang status details
    const { rows: duStatusRows } = await query(`
      SELECT 
        count(*) as total_du,
        count(*) FILTER (WHERE status = 'approved') as du_approved,
        count(*) FILTER (WHERE status = 'draft') as du_draft,
        count(*) FILTER (WHERE partner_type = 'self_match') as du_self_match,
        count(*) FILTER (WHERE partner_type = 'system_match') as du_system_match,
        count(*) FILTER (WHERE partner_type = 'tarteel') as du_tarteel,
        count(*) FILTER (WHERE partner_type = 'family') as du_family
      FROM daftar_ulang_submissions
      ${batchDuWhere}
    `, batchParam);
    const duStatus = duStatusRows[0] || {};

    return ApiResponses.success({
      selectedBatchId: batchId,
      batches,
      counts: {
        totalBatches: parseInt(countsData.total_batches, 10) || 0,
        totalHalaqah: parseInt(countsData.total_halaqah, 10) || 0,
        totalHalaqahStudents: parseInt(countsData.total_halaqah_students, 10) || 0,
        totalCapacity: parseInt(halaqahData.total_capacity, 10) || 0,
        totalUsers: parseInt(countsData.total_users, 10) || 0,
        totalThalibah: parseInt(rolesData.thalibah_count, 10) || 0,
        totalMuallimah: parseInt(rolesData.muallimah_count, 10) || 0,
        totalMusyrifah: parseInt(rolesData.musyrifah_count, 10) || 0,
        totalAdmin: parseInt(rolesData.admin_count, 10) || 0,
        totalRegistrations: parseInt(countsData.total_registrations, 10) || 0,
        totalDaftarUlang: parseInt(countsData.total_daftar_ulang, 10) || 0,
        totalStudyPartners: parseInt(countsData.total_study_partners, 10) || 0,
        totalJurnal: parseInt(countsData.total_jurnal, 10) || 0,
        totalTashih: parseInt(countsData.total_tashih, 10) || 0,
        totalExamAttempts: parseInt(countsData.total_exam_attempts, 10) || 0,
        totalTestimonials: parseInt(countsData.total_testimonials, 10) || 0,
      },
      rolesDistribution: {
        thalibah: parseInt(rolesData.thalibah_count, 10) || 0,
        muallimah: parseInt(rolesData.muallimah_count, 10) || 0,
        musyrifah: parseInt(rolesData.musyrifah_count, 10) || 0,
        admin: parseInt(rolesData.admin_count, 10) || 0,
      },
      funnelSeleksi: {
        totalRegistrations: parseInt(funnelData.total, 10) || 0,
        approvedRegistrations: parseInt(funnelData.approved_reg, 10) || 0,
        pendingRegistrations: parseInt(funnelData.pending_reg, 10) || 0,
        rejectedRegistrations: parseInt(funnelData.rejected_reg, 10) || 0,
        oralPass: parseInt(funnelData.oral_pass, 10) || 0,
        oralFail: parseInt(funnelData.oral_fail, 10) || 0,
        oralPending: parseInt(funnelData.oral_pending, 10) || 0,
        oralNotSubmitted: parseInt(funnelData.oral_not_submitted, 10) || 0,
        selectedCount: parseInt(funnelData.selected_count, 10) || 0,
        waitlistCount: parseInt(funnelData.waitlist_count, 10) || 0,
        notSelectedCount: parseInt(funnelData.not_selected_count, 10) || 0,
        selectionPending: parseInt(funnelData.selection_pending, 10) || 0,
        daftarUlangApproved: parseInt(duStatus.du_approved, 10) || 0,
        daftarUlangDraft: parseInt(duStatus.du_draft, 10) || 0,
      },
      targetJuzDistribution: juzRes.rows.map((r: any) => ({
        juz: r.juz,
        count: parseInt(r.count, 10) || 0,
      })),
      timezoneDistribution: timezoneRes.rows.map((r: any) => ({
        timezone: r.timezone,
        count: parseInt(r.count, 10) || 0,
      })),
      halaqahMetrics: {
        totalHalaqah: parseInt(halaqahData.total_halaqah, 10) || 0,
        totalCapacity: parseInt(halaqahData.total_capacity, 10) || 0,
        totalAssigned: parseInt(halaqahData.total_assigned, 10) || 0,
        withMuallimah: parseInt(halaqahData.with_muallimah, 10) || 0,
        withoutMuallimah: parseInt(halaqahData.without_muallimah, 10) || 0,
        utilizationRate: halaqahData.total_capacity > 0
          ? Math.round((parseInt(halaqahData.total_assigned, 10) / parseInt(halaqahData.total_capacity, 10)) * 100)
          : 0,
      },
      studyPartnerMetrics: {
        totalPartnerships: parseInt(partnerData.total_partnerships, 10) || 0,
        activePairs: parseInt(partnerData.active_pairs, 10) || 0,
        pendingPairs: parseInt(partnerData.pending_pairs, 10) || 0,
        selfMatch: parseInt(partnerData.self_match, 10) || parseInt(duStatus.du_self_match, 10) || 0,
        systemMatch: parseInt(partnerData.system_match, 10) || parseInt(duStatus.du_system_match, 10) || 0,
        tarteel: parseInt(partnerData.tarteel, 10) || parseInt(duStatus.du_tarteel, 10) || 0,
        family: parseInt(partnerData.family, 10) || parseInt(duStatus.du_family, 10) || 0,
      },
      jurnalCompliance: {
        totalRecords: parseInt(jurnalData.total_records, 10) || 0,
        totalMurajaah: parseInt(jurnalData.total_murajaah, 10) || 0,
        tashihDone: parseInt(jurnalData.tashih_done, 10) || 0,
        tashihPercentage: Math.round((parseInt(jurnalData.tashih_done, 10) / totalJurnalNum) * 100),
        simakDone: parseInt(jurnalData.simak_done, 10) || 0,
        simakPercentage: Math.round((parseInt(jurnalData.simak_done, 10) / totalJurnalNum) * 100),
        nadzarDone: parseInt(jurnalData.nadzar_done, 10) || 0,
        nadzarPercentage: Math.round((parseInt(jurnalData.nadzar_done, 10) / totalJurnalNum) * 100),
        rabthDone: parseInt(jurnalData.rabth_done, 10) || 0,
        rabthPercentage: Math.round((parseInt(jurnalData.rabth_done, 10) / totalJurnalNum) * 100),
        tafsirDone: parseInt(jurnalData.tafsir_done, 10) || 0,
        tafsirPercentage: Math.round((parseInt(jurnalData.tafsir_done, 10) / totalJurnalNum) * 100),
        menulisDone: parseInt(jurnalData.menulis_done, 10) || 0,
        menulisPercentage: Math.round((parseInt(jurnalData.menulis_done, 10) / totalJurnalNum) * 100),
      },
      tashihStats: {
        totalTashih: parseInt(tashihData.total_tashih, 10) || 0,
        uniqueThalibah: parseInt(tashihData.unique_thalibah, 10) || 0,
        uniqueMuallimah: parseInt(tashihData.unique_muallimah, 10) || 0,
        avgKesalahan: parseFloat(tashihData.avg_kesalahan) || 0,
      },
      examStats: {
        totalAttempts: parseInt(examData.total_attempts, 10) || 0,
        avgScore: parseFloat(examData.avg_score) || 0,
        passedCount: passedExamNum,
        passRate,
        scoreDistribution: {
          score90_100: parseInt(examData.score_90_100, 10) || 0,
          score80_89: parseInt(examData.score_80_89, 10) || 0,
          score70_79: parseInt(examData.score_70_79, 10) || 0,
          score60_69: parseInt(examData.score_60_69, 10) || 0,
          scoreUnder60: parseInt(examData.score_under_60, 10) || 0,
        },
      },
      satisfactionStats: {
        totalTestimonials: parseInt(testimonialData.total_testimonials, 10) || 0,
        avgRating: parseFloat(testimonialData.avg_rating) || 5.0,
        fiveStar: parseInt(testimonialData.five_star, 10) || 0,
        fourStar: parseInt(testimonialData.four_star, 10) || 0,
        belowFourStar: parseInt(testimonialData.below_four_star, 10) || 0,
        recentTestimonials,
      },
      pendingApprovals: {
        registrations: parseInt(pendingData.pending_registrations, 10) || 0,
        oralAssessment: parseInt(pendingData.pending_oral, 10) || 0,
        daftarUlang: parseInt(pendingData.pending_daftar_ulang, 10) || 0,
        transfer: parseInt(pendingData.pending_transfers, 10) || 0,
        muallimah: parseInt(pendingData.pending_muallimah, 10) || 0,
      },
      registrationTrend,
    });
  } catch (error) {
    console.error('[Admin Statistik API] Error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
