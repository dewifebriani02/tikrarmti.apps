import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAdmin, isStaff } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Bypass staff / admin / muallimah / musyrifah
    const rawRoles = Array.isArray(authUser.roles) ? authUser.roles : [authUser.role].filter(Boolean);
    const isExemptRole = rawRoles.some((r: string) => 
      ['admin', 'super_admin', 'muallimah', 'musyrifah'].includes(r)
    );

    if (isExemptRole) {
      return NextResponse.json({
        success: true,
        data: {
          is_required: false,
          reason: 'exempt_role',
          is_suspended: false,
        }
      });
    }

    // 2. Check active daftar ulang submission
    const { rows: duRows } = await query(
      `SELECT du.id, du.batch_id, du.status, du.pengabdian_choice, du.donasi_amount, du.review_notes,
              b.name as batch_name, b.start_date, b.end_date, b.status as batch_status
       FROM daftar_ulang_submissions du
       LEFT JOIN batches b ON du.batch_id = b.id
       WHERE du.user_id = $1 AND du.status = 'approved' AND b.status IN ('ongoing', 'open')
       ORDER BY du.created_at DESC
       LIMIT 1`,
      [authUser.id]
    );

    const du = duRows[0];
    if (!du) {
      return NextResponse.json({
        success: true,
        data: {
          is_required: false,
          reason: 'no_active_registration',
          is_suspended: false,
        }
      });
    }

    // Check if user chose 'donasi' (infaq)
    const isDonasiChoice = du.pengabdian_choice && du.pengabdian_choice.toLowerCase().includes('donasi');
    if (!isDonasiChoice) {
      return NextResponse.json({
        success: true,
        data: {
          is_required: false,
          reason: 'pengabdian_route',
          is_suspended: false,
        }
      });
    }

    // Check if admin gave dispensation in notes
    if (du.review_notes && du.review_notes.toLowerCase().includes('[dispensasi]')) {
      return NextResponse.json({
        success: true,
        data: {
          is_required: false,
          reason: 'dispensation_granted',
          is_suspended: false,
        }
      });
    }

    // 3. Calculate Date Info for Asia/Jakarta
    const now = new Date();
    const jakartaDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD
    const [yearStr, monthStr, dayStr] = jakartaDateStr.split('-');
    const currentYear = parseInt(yearStr, 10);
    const currentMonth = parseInt(monthStr, 10);
    const currentDay = parseInt(dayStr, 10);

    const monthNamesIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNamesIndo[currentMonth - 1];

    const startOfMonthIso = `${yearStr}-${monthStr}-01T00:00:00+07:00`;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextMonthStr = String(nextMonth).padStart(2, '0');
    const startOfNextMonthIso = `${nextYear}-${nextMonthStr}-01T00:00:00+07:00`;

    // 4. Query donation record for the current month
    // Also include payments made up to 5 days before the month start (e.g. paid on 28th-31st for next month)
    const { rows: donationRows } = await query(
      `SELECT id, amount, status, proof_url, notes, created_at, updated_at
       FROM donations
       WHERE user_id = $1
         AND (
           (created_at >= ($2::timestamptz - interval '5 days') AND created_at < $3::timestamptz)
           OR (updated_at >= $2::timestamptz AND updated_at < $3::timestamptz)
         )
         AND status IN ('approved', 'pending')
       ORDER BY created_at DESC
       LIMIT 1`,
      [authUser.id, startOfMonthIso, startOfNextMonthIso]
    );

    const latestDonation = donationRows[0] || null;
    const hasPaid = !!latestDonation;

    // 5. Determine Phase & Suspend Status
    let phase: 'paid' | 'reminder' | 'warning' | 'suspended' = 'paid';
    let isSuspended = false;
    let daysLeft = 0;
    let daysOverdue = 0;

    if (hasPaid) {
      phase = 'paid';
      isSuspended = false;
    } else {
      if (currentDay <= 7) {
        phase = 'reminder';
        isSuspended = false;
        daysLeft = Math.max(0, 10 - currentDay);
      } else if (currentDay <= 10) {
        phase = 'warning';
        isSuspended = false;
        daysLeft = Math.max(0, 10 - currentDay);
      } else {
        phase = 'suspended';
        isSuspended = true;
        daysOverdue = currentDay - 10;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        is_required: true,
        has_paid: hasPaid,
        payment_status: latestDonation?.status || 'unpaid',
        phase,
        is_suspended: isSuspended,
        current_day: currentDay,
        current_month: currentMonth,
        current_year: currentYear,
        month_name: monthName,
        days_left: daysLeft,
        days_overdue: daysOverdue,
        commitment_amount: du.donasi_amount ? Number(du.donasi_amount) : 25000,
        batch_name: du.batch_name,
        latest_donation: latestDonation,
      }
    });
  } catch (error: any) {
    console.error('[Infaq Status API] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to check infaq status' },
      { status: 500 }
    );
  }
}
