import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function cleanProofUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://localhost') || trimmed.startsWith('http://127.0.0.1')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.pathname;
    } catch {
      return trimmed.replace(/^http:\/\/localhost(:\d+)?/, '');
    }
  }
  return trimmed;
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    // Date calculation (default to Asia/Jakarta current month)
    const now = new Date();
    const jakartaDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD
    const [defYearStr, defMonthStr] = jakartaDateStr.split('-');
    
    const month = parseInt(searchParams.get('month') || defMonthStr, 10);
    const year = parseInt(searchParams.get('year') || defYearStr, 10);
    const batchIdParam = searchParams.get('batch_id');

    // 1. Get Batches list
    const { rows: batchRows } = await query(
      `SELECT id, name, status, start_date, end_date 
       FROM batches 
       ORDER BY created_at DESC`
    );

    let activeBatch = null;
    if (batchIdParam && batchIdParam !== 'all') {
      activeBatch = batchRows.find((b: any) => b.id === batchIdParam);
    }
    if (!activeBatch) {
      activeBatch = batchRows.find((b: any) => b.status === 'ongoing' || b.status === 'open') || batchRows[0];
    }

    if (!activeBatch) {
      return NextResponse.json({
        success: true,
        data: {
          thalibah_list: [],
          batches: batchRows,
          selected_batch: null,
          stats: {
            total_donasi_cohort: 0,
            total_paid: 0,
            total_pending: 0,
            total_unpaid: 0,
            amount_paid: 0,
            amount_pending: 0,
          }
        }
      });
    }

    // 2. Fetch all approved daftar ulang submissions for this batch
    const { rows: thalibahRows } = await query(
      `SELECT 
         du.id as daftar_ulang_id,
         du.user_id,
         du.batch_id,
         du.confirmed_full_name,
         du.confirmed_wa_phone,
         du.confirmed_chosen_juz,
         du.pengabdian_choice,
         du.donasi_amount,
         du.review_notes,
         u.full_name as user_full_name,
         u.nama_kunyah,
         u.email,
         u.whatsapp,
         u.avatar_url,
         h.name as halaqah_name
       FROM daftar_ulang_submissions du
       JOIN users u ON du.user_id = u.id
       LEFT JOIN halaqah h ON du.tashih_halaqah_id = h.id
       WHERE du.batch_id = $1 AND du.status = 'approved'
       ORDER BY du.confirmed_full_name ASC`,
      [activeBatch.id]
    );

    const userIds = thalibahRows.map((t: any) => t.user_id);

    // 3. Fetch ALL donations for these users
    let userDonationsMap = new Map<string, any[]>();
    if (userIds.length > 0) {
      const { rows: donationRows } = await query(
        `SELECT id, user_id, amount, donor_name, whatsapp, proof_url, status, notes, created_at, updated_at
         FROM donations
         WHERE user_id = ANY($1::uuid[])
         ORDER BY created_at DESC`,
        [userIds]
      );

      donationRows.forEach((d: any) => {
        const cleaned = {
          ...d,
          proof_url: cleanProofUrl(d.proof_url),
        };
        const arr = userDonationsMap.get(d.user_id) || [];
        arr.push(cleaned);
        userDonationsMap.set(d.user_id, arr);
      });
    }

    // 4. Month Names
    const monthNamesIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNamesIndo[month - 1];

    // Helper: Determine payment status for a specific month & year
    const getMonthDonation = (userDons: any[], targetMonth: number, targetYear: number) => {
      // Find donation where created_at is within targetMonth (with 5-day grace before month start)
      const startOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0));
      const graceStart = new Date(startOfMonth.getTime() - 5 * 24 * 60 * 60 * 1000);
      const endOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0));

      const matched = userDons.filter((d) => {
        const dDate = new Date(d.created_at);
        return dDate >= graceStart && dDate < endOfMonth;
      });

      if (matched.length === 0) return null;
      // Prioritize approved, then pending, then rejected
      const approved = matched.find((m) => m.status === 'approved');
      if (approved) return approved;
      const pending = matched.find((m) => m.status === 'pending');
      if (pending) return pending;
      return matched[0];
    };

    let totalDonasiCohort = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalUnpaid = 0;
    let totalRejected = 0;
    let amountPaid = 0;
    let amountPending = 0;

    const list = thalibahRows.map((t: any) => {
      const isDonasiChoice = t.pengabdian_choice && t.pengabdian_choice.toLowerCase().includes('donasi');
      const hasDispensation = !!(t.review_notes && t.review_notes.toLowerCase().includes('[dispensasi]'));
      const userDons = userDonationsMap.get(t.user_id) || [];

      // Calculate monthly status map for months 1..12
      const monthlyStatus: Record<number, {
        payment_status: 'paid' | 'pending' | 'unpaid' | 'rejected';
        donation: any | null;
      }> = {};

      for (let m = 1; m <= 12; m++) {
        const d = getMonthDonation(userDons, m, year);
        let pStatus: 'paid' | 'pending' | 'unpaid' | 'rejected' = 'unpaid';
        if (d) {
          if (d.status === 'approved') pStatus = 'paid';
          else if (d.status === 'pending') pStatus = 'pending';
          else if (d.status === 'rejected') pStatus = 'rejected';
        }
        monthlyStatus[m] = {
          payment_status: pStatus,
          donation: d ? {
            id: d.id,
            amount: Number(d.amount),
            status: d.status,
            proof_url: d.proof_url,
            notes: d.notes,
            created_at: d.created_at,
          } : null,
        };
      }

      // Selected month donation
      const curMonthStatus = monthlyStatus[month];
      const selectedMonthDonation = curMonthStatus.donation;
      const paymentStatus = curMonthStatus.payment_status;

      if (isDonasiChoice) {
        totalDonasiCohort++;
        if (paymentStatus === 'paid') {
          totalPaid++;
          amountPaid += Number(selectedMonthDonation?.amount || 0);
        } else if (paymentStatus === 'pending') {
          totalPending++;
          amountPending += Number(selectedMonthDonation?.amount || 0);
        } else if (paymentStatus === 'rejected') {
          totalRejected++;
        } else {
          totalUnpaid++;
        }
      }

      const phoneRaw = t.confirmed_wa_phone || t.whatsapp || '';
      const phoneClean = phoneRaw.replace(/\D/g, '');
      const formattedPhone = phoneClean.startsWith('0') 
        ? '62' + phoneClean.slice(1) 
        : phoneClean;

      const commitmentAmount = t.donasi_amount ? Number(t.donasi_amount) : 25000;

      return {
        user_id: t.user_id,
        daftar_ulang_id: t.daftar_ulang_id,
        full_name: t.confirmed_full_name || t.user_full_name,
        nama_kunyah: t.nama_kunyah,
        email: t.email,
        whatsapp: formattedPhone,
        whatsapp_display: phoneRaw,
        avatar_url: t.avatar_url,
        chosen_juz: t.confirmed_chosen_juz,
        halaqah_name: t.halaqah_name || 'Belum Ditugaskan',
        is_donasi_choice: isDonasiChoice,
        commitment_type: t.pengabdian_choice || 'Belum Memilih',
        commitment_amount: commitmentAmount,
        has_dispensation: hasDispensation,
        payment_status: paymentStatus,
        donation: selectedMonthDonation,
        monthly_status: monthlyStatus,
        donations_history: userDons.map((d) => ({
          id: d.id,
          amount: Number(d.amount),
          status: d.status,
          proof_url: d.proof_url,
          notes: d.notes,
          created_at: d.created_at,
          donor_name: d.donor_name,
          whatsapp: d.whatsapp,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        month,
        year,
        month_name: monthName,
        batches: batchRows,
        selected_batch: activeBatch,
        stats: {
          total_donasi_cohort: totalDonasiCohort,
          total_paid: totalPaid,
          total_pending: totalPending,
          total_unpaid: totalUnpaid,
          total_rejected: totalRejected,
          amount_paid: amountPaid,
          amount_pending: amountPending,
        },
        thalibah_list: list,
      }
    });
  } catch (error: any) {
    console.error('[Admin Donations Rekap API] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch donations rekap' },
      { status: 500 }
    );
  }
}
