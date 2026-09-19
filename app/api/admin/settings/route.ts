import { NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const data = await queryOne(
      'SELECT value FROM system_settings WHERE key = $1',
      ['app_is_frozen']
    );

    return NextResponse.json({
      success: true,
      is_frozen: data?.value?.frozen === true,
    });
  } catch (error: any) {
    console.error('[Settings API] GET Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { is_frozen } = await req.json();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const roles = [...(user.roles || [])];
    if (user.role) roles.push(user.role);

    if (!roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      ['app_is_frozen', JSON.stringify({ frozen: is_frozen })]
    );

    return NextResponse.json({ success: true, is_frozen });
  } catch (error: any) {
    console.error('[Settings API] POST Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
