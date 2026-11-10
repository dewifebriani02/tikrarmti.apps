import { NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  DEFAULT_FORM_PUBLICATION_SETTINGS,
  FormPublicationSettings,
} from '@/lib/form-settings';

const SETTINGS_KEY = 'form_publication_settings';

export async function GET() {
  try {
    const row = await queryOne(
      'SELECT value FROM system_settings WHERE key = $1',
      [SETTINGS_KEY]
    );

    const saved = row?.value || {};
    const settings: FormPublicationSettings = {
      ...DEFAULT_FORM_PUBLICATION_SETTINGS,
      ...saved,
    };

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('[FormSettings API] GET Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch form publication settings',
      settings: DEFAULT_FORM_PUBLICATION_SETTINGS,
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const roles = Array.isArray(user.roles) ? [...user.roles] : [];
    if (user.role) roles.push(user.role);

    if (!roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const incomingSettings = body.settings || body;

    // Fetch existing settings first
    const row = await queryOne(
      'SELECT value FROM system_settings WHERE key = $1',
      [SETTINGS_KEY]
    );
    const existing = row?.value || {};

    const updatedSettings: FormPublicationSettings = {
      ...DEFAULT_FORM_PUBLICATION_SETTINGS,
      ...existing,
      ...incomingSettings,
    };

    // Sanitize booleans
    const sanitized: FormPublicationSettings = {
      tikrar_tahfidz: Boolean(updatedSettings.tikrar_tahfidz),
      pra_tikrar: Boolean(updatedSettings.pra_tikrar),
      muallimah: Boolean(updatedSettings.muallimah),
      musyrifah: Boolean(updatedSettings.musyrifah),
      kelas_berbayar: Boolean(updatedSettings.kelas_berbayar),
      daftar_ulang: Boolean(updatedSettings.daftar_ulang),
    };

    await query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [SETTINGS_KEY, JSON.stringify(sanitized)]
    );

    return NextResponse.json({
      success: true,
      settings: sanitized,
      message: 'Pengaturan publikasi formulir berhasil disimpan.',
    });
  } catch (error: any) {
    console.error('[FormSettings API] POST Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
