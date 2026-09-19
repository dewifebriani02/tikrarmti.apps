import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await query(
      `SELECT id, name, status, start_date, first_week_start_date, created_at 
       FROM batches 
       ORDER BY created_at DESC`
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Unexpected error fetching batches:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
