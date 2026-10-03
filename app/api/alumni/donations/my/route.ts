import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponses } from '@/lib/api-responses';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/alumni/donations/my
 * Get logged-in user's donation history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows: donations } = await query(
      `SELECT id, user_id, amount, donor_name, whatsapp, proof_url, status, notes, payment_method, created_at, updated_at
       FROM donations 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [user.id]
    );

    return ApiResponses.success(donations || []);
  } catch (error: any) {
    console.error('[Alumni Donations My GET] Server error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

/**
 * POST /api/alumni/donations/my
 * Submit a new donation confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, donor_name, whatsapp, proof_url, notes } = body;

    // Validation
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Jumlah donasi harus berupa angka lebih besar dari 0' }, { status: 400 });
    }

    const donorName = donor_name && typeof donor_name === 'string' && donor_name.trim() 
      ? donor_name.trim() 
      : user.full_name || 'Thalibah MTI';

    if (!proof_url || typeof proof_url !== 'string' || proof_url.trim() === '') {
      return NextResponse.json({ error: 'Bukti transfer wajib diunggah' }, { status: 400 });
    }

    const userPhone = whatsapp ? whatsapp.trim() : (user.whatsapp || null);

    const newDonation = await queryOne(
      `INSERT INTO donations (user_id, amount, donor_name, whatsapp, proof_url, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
       RETURNING *`,
      [
        user.id,
        numericAmount,
        donorName,
        userPhone,
        proof_url.trim(),
        notes ? notes.trim() : null
      ]
    );

    return ApiResponses.success(newDonation, 'Konfirmasi donasi berhasil dikirim', 201);
  } catch (error: any) {
    console.error('[Alumni Donations My POST] Server error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
