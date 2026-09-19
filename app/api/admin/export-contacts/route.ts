import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger-secure';

const supabaseAdmin = createSupabaseAdmin();

// Helper function to get batch year from batch start date (last 2 digits)
function getBatchYearFromDate(startDate: string | null): string {
  if (!startDate) return 'XX';
  try {
    const date = new Date(startDate);
    const year = date.getFullYear();
    // Return last 2 digits of year
    return year.toString().slice(-2);
  } catch {
    return 'XX';
  }
}

// Helper function to calculate year from birth date (last 2 digits)
function getYearFromBirthDate(birthDate: string | null): string {
  if (!birthDate) return '';
  try {
    const date = new Date(birthDate);
    const year = date.getFullYear();
    // Return last 2 digits of year
    return year.toString().slice(-2);
  } catch {
    return '';
  }
}

// Helper function to format text to Proper Case (capitalize first letter of each word)
function toProperCase(text: string | null): string {
  if (!text) return '';
  return text.toLowerCase().replace(/(^\w|\s\w|-\w|\.\w|,\s*\w)/g, (letter) => letter.toUpperCase());
}

// Helper function to normalize phone number (remove +, spaces, dashes)
function normalizePhoneNumber(phone: string | null): string {
  if (!phone) return '';
  return phone.replace(/[\s\-\+]/g, '');
}

// Helper function to get juz number from juz code (e.g., "28A" -> 28, "29B" -> 29)
function getJuzNumber(juzCode: string | null): number {
  if (!juzCode) return 999;
  const match = juzCode.match(/(\d+)/);
  return match ? parseInt(match[1]) : 999;
}

// Helper function to get juz sequence key (number only, not including A/B)
// This ensures sequence numbers are per juz number (28, 29, 30)
// 28A and 28B share the same sequence numbering
function getJuzSequenceKey(juzCode: string | null): string {
  const juzNumber = getJuzNumber(juzCode);
  return juzNumber.toString();
}

// Helper function to format Nomor Induk Thalibah
// Pattern: MTIA-batchYYnomor_urut juz nama tahun lahir domisili (Tikrar)
// Pattern: MTIPRA-batchYYnomor_urut juz nama tahun lahir domisili (Pra Tikrar)
// nomor_urut dibuat per juz (angka saja), jadi 28A dan 28B berbagi nomor urut yang sama
// batchYY adalah 2 digit terakhir tahun batch dimulai
function formatNomorIndukThalibah(
  fullName: string,
  juzCode: string | null,
  birthDate: string | null,
  domicile: string | null,
  sequenceNumber: number,
  category: 'tikrar' | 'pra_tikrar',
  batchYear: string
): string {
  const birthYearYY = getYearFromBirthDate(birthDate);
  const formattedName = toProperCase(fullName);
  const formattedDomicile = toProperCase(domicile);
  const juz = juzCode || '-';
  const code = category === 'tikrar' ? 'MTIA' : 'MTIPRA';

  // Format: CODE-batchYYnomor_urut juz name birthYearYY domicile
  // Example: MTIA-26001 30A Dewi Febriani 95 Jakarta
  const nomorInduk = `${code}-${batchYear}${String(sequenceNumber).padStart(3, '0')} ${juz} ${formattedName} ${birthYearYY} ${formattedDomicile}`;

  return nomorInduk;
}

// Helper function to escape CSV fields (handle commas and quotes)
function escapeCsvField(field: string | null): string {
  if (!field) return '';
  const str = field.toString();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper function to escape VCF fields (handle backslashes, semicolons, newlines)
function escapeVcfField(field: string | null): string {
  if (!field) return '';
  let str = field.toString();
  // Escape backslashes first, then other special characters
  str = str.replace(/\\/g, '\\\\');  // Backslash
  str = str.replace(/;/g, '\\;');    // Semicolon
  str = str.replace(/\n/g, '\\n');   // Newline
  str = str.replace(/\r/g, '\\r');   // Carriage return
  return str;
}

// Helper function to format phone for VCF (must include country code, no special chars)
function formatPhoneForVcf(phone: string | null): string {
  if (!phone) return '';
  let formatted = normalizePhoneNumber(phone);
  // Ensure it starts with country code (62 for Indonesia)
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.slice(1);
  }
  return formatted;
}

// Helper function to generate VCF content
function generateVCF(users: ThalibahContact[]): string {
  const vcfLines: string[] = [];

  for (const user of users) {
    const nomorInduk = user.nomor_induk;
    const fullName = user.full_name || 'Unknown';
    const whatsapp = formatPhoneForVcf(user.whatsapp);
    const telegram = formatPhoneForVcf(user.telegram);
    const email = user.email || '';

    vcfLines.push('BEGIN:VCARD');
    vcfLines.push('VERSION:3.0');
    // UID is a unique identifier - used by contact managers to update existing contacts instead of creating duplicates
    // Format: mti-thalibah-{category}-{user_id}
    vcfLines.push(`UID:mti-thalibah-${user.category}-${user.id}`);
    // FN is the formatted name - use full nomor_induk
    // Example: MTIA-26057 30B Linawarabone 79 Gorontalo
    vcfLines.push(`FN:${escapeVcfField(nomorInduk)}`);
    // N is the structured name (format: Family Name; Given Name; ; ; )
    // Put full nomorInduk in Family Name position so WhatsApp displays it correctly
    vcfLines.push(`N:${escapeVcfField(nomorInduk)};;;;`);
    vcfLines.push(`ORG:Markaz Tikrar Indonesia`);

    if (email) {
      vcfLines.push(`EMAIL;TYPE=WORK:${escapeVcfField(email)}`);
    }

    if (whatsapp) {
      vcfLines.push(`TEL;TYPE=CELL:${whatsapp}`);
      vcfLines.push(`TEL;TYPE=CELL;TYPE=VOICE:${whatsapp}`);
      vcfLines.push(`X-WA-ID:${whatsapp}`);
    }

    if (telegram) {
      vcfLines.push(`TEL;TYPE=OTHER:${telegram}`);
      vcfLines.push(`X-Telegram:${telegram}`);
    }

    vcfLines.push(`NOTE:${escapeVcfField(`ID: ${user.id}\\nJuz: ${user.confirmed_chosen_juz || '-'}\\nStatus: ${user.status}\\nKategori: ${user.category}\\nNomor Induk: ${nomorInduk}`)}`);
    vcfLines.push('END:VCARD');
    vcfLines.push(''); // Empty line between cards
  }

  return vcfLines.join('\n');
}

interface ThalibahContact {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  telegram: string | null;
  tanggal_lahir: string | null;
  kota: string | null;
  confirmed_chosen_juz: string | null;
  status: string;
  nomor_induk: string;
  category: 'tikrar' | 'pra_tikrar';
}

export async function GET(request: NextRequest) {
  try {
    // Use Supabase SSR client to get session
    const supabase = createServerClient();

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({
        error: 'Unauthorized - Invalid session. Please login again.',
        needsLogin: true
      }, { status: 401 });
    }

    // Check if user is admin using admin client
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.roles?.includes('admin')) {
      console.error('Admin check failed:', userError, userData);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batch_id');
    const format = searchParams.get('format') || 'csv'; // csv or vcf
    const category = searchParams.get('category') || 'tikrar'; // tikrar or pra_tikrar

    logger.info('Admin exporting contacts', {
      adminId: user.id,
      batchId,
      format,
      category
    });

    // Fetch batch information to get start_date
    let batchQuery = supabaseAdmin
      .from('batches')
      .select('id, start_date');

    if (batchId && batchId !== 'all') {
      batchQuery = batchQuery.eq('id', batchId);
    }

    const { data: batchesData } = await batchQuery;

    // Create a map of batch_id -> batch year (2 digits)
    const batchYearMap = new Map<string, string>();
    if (batchesData) {
      for (const batch of batchesData) {
        const batchYear = getBatchYearFromDate(batch.start_date);
        batchYearMap.set(batch.id, batchYear);
      }
    }

    let thalibahContacts: ThalibahContact[] = [];

    if (category === 'tikrar') {
      // ===== TIKRAR (MTIA) - Thalibah yang bisa daftar ulang =====
      // Fetch from daftar_ulang_submissions with status approved/submitted
      let query = supabaseAdmin
        .from('daftar_ulang_submissions')
        .select(`
          id,
          user_id,
          batch_id,
          status,
          confirmed_full_name,
          confirmed_chosen_juz,
          user:users!daftar_ulang_submissions_user_id_fkey(
            id,
            full_name,
            email,
            whatsapp,
            telegram,
            tanggal_lahir,
            kota
          )
        `)
        .in('status', ['approved', 'submitted']);

      // Add batch filter if specified
      if (batchId && batchId !== 'all') {
        query = query.eq('batch_id', batchId);
      }

      const { data: submissions, error: fetchError } = await query.order('confirmed_chosen_juz', { ascending: true });

      if (fetchError) {
        logger.error('Error fetching daftar_ulang_submissions for contact export', { error: fetchError });
        return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
      }

      if (!submissions || submissions.length === 0) {
        return NextResponse.json({ error: 'No daftar ulang submissions with approved/submitted status found' }, { status: 404 });
      }

      // Process submissions and create sequential numbers
      // For Tikrar, numbering is sequential (001, 002, 003...) for ALL entries, not per-juz
      let sequenceCounter = 0;

      for (const submission of submissions) {
        const userData = (submission.user as any);
        if (!userData) continue;

        const juzCode = submission.confirmed_chosen_juz || 'Unknown';
        const batchYear = batchYearMap.get(submission.batch_id) || 'XX';

        // Increment sequence number (sequential for all Tikrar entries)
        sequenceCounter++;

        // Format Nomor Induk Thalibah (Tikrar - MTIA)
        const nomorInduk = formatNomorIndukThalibah(
          submission.confirmed_full_name || userData.full_name || 'Unknown',
          juzCode,
          userData.tanggal_lahir,
          userData.kota,
          sequenceCounter,
          'tikrar',
          batchYear
        );

        thalibahContacts.push({
          id: userData.id,
          full_name: submission.confirmed_full_name || userData.full_name,
          email: userData.email,
          whatsapp: userData.whatsapp,
          telegram: userData.telegram,
          tanggal_lahir: userData.tanggal_lahir,
          kota: userData.kota,
          confirmed_chosen_juz: juzCode,
          status: submission.status,
          nomor_induk: nomorInduk,
          category: 'tikrar'
        });
      }

    } else {
      // ===== PRA TIKRAR (MTIPRA) - Thalibah selected tapi tidak lulus test rekam suara =====
      // Fetch from pendaftaran_tikrar_tahfidz where:
      // 1. selection_status = 'selected' (they were selected to continue)
      // 2. oral_assessment_status IN ('fail', 'not_submitted') (did NOT pass oral assessment)
      // AND they don't have approved/submitted daftar_ulang submission

      let query = supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .select(`
          id,
          user_id,
          batch_id,
          full_name,
          chosen_juz,
          selection_status,
          oral_assessment_status,
          user:users!pendaftaran_tikrar_tahfidz_user_id_fkey(
            id,
            full_name,
            email,
            whatsapp,
            telegram,
            tanggal_lahir,
            kota
          )
        `)
        .eq('selection_status', 'selected')
        .in('oral_assessment_status', ['fail', 'not_submitted']);

      // Add batch filter if specified
      if (batchId && batchId !== 'all') {
        query = query.eq('batch_id', batchId);
      }

      const { data: registrations, error: fetchError } = await query.order('chosen_juz', { ascending: true });

      if (fetchError) {
        logger.error('Error fetching pendaftaran_tikrar_tahfidz for pra tikrar export', { error: fetchError });
        return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
      }

      if (!registrations || registrations.length === 0) {
        return NextResponse.json({ error: 'No pra tikrar registrations found (selection_status=selected AND oral_assessment_status IN (fail, not_submitted))' }, { status: 404 });
      }

      // Get user IDs that have approved/submitted daftar_ulang (these are TIKRAR, not PRA TIKRAR)
      const { data: existingDaftarUlang } = await supabaseAdmin
        .from('daftar_ulang_submissions')
        .select('user_id')
        .in('status', ['approved', 'submitted']);

      const daftarUlangUserIds = new Set(existingDaftarUlang?.map(d => d.user_id) || []);

      // Process registrations and create sequential numbers
      // For Pra Tikrar, numbering is sequential (001, 002, 003...) for ALL entries, not per-juz
      // Only include those who don't have approved/submitted daftar_ulang
      let sequenceCounter = 0;

      for (const registration of registrations) {
        const userData = (registration.user as any);
        if (!userData) continue;

        // Skip if this user already has approved/submitted daftar_ulang (they are TIKRAR)
        if (daftarUlangUserIds.has(userData.id)) continue;

        const juzCode = registration.chosen_juz || 'Unknown';
        const batchYear = batchYearMap.get(registration.batch_id) || 'XX';

        // Increment sequence number (sequential for all Pra Tikrar entries)
        sequenceCounter++;

        // Format Nomor Induk Thalibah (Pra Tikrar - MTIPRA)
        const nomorInduk = formatNomorIndukThalibah(
          registration.full_name || userData.full_name || 'Unknown',
          juzCode,
          userData.tanggal_lahir,
          userData.kota,
          sequenceCounter,
          'pra_tikrar',
          batchYear
        );

        thalibahContacts.push({
          id: userData.id,
          full_name: registration.full_name || userData.full_name,
          email: userData.email,
          whatsapp: userData.whatsapp,
          telegram: userData.telegram,
          tanggal_lahir: userData.tanggal_lahir,
          kota: userData.kota,
          confirmed_chosen_juz: juzCode,
          status: registration.selection_status || 'selected',
          nomor_induk: nomorInduk,
          category: 'pra_tikrar'
        });
      }

      if (thalibahContacts.length === 0) {
        return NextResponse.json({ error: 'No pra tikrar thalibah found (all selected thalibah have approved/submitted daftar ulang)' }, { status: 404 });
      }
    }

    // Data is already sorted by chosen_juz ascending during the query
    // The sequence counter assigns numbers in this order (1, 28, 29, 30)
    // No need to re-sort as it would disrupt the sequential numbering

    logger.info('Contacts prepared for export', {
      adminId: user.id,
      totalContacts: thalibahContacts.length,
      format,
      category
    });

    // Return based on requested format
    if (format === 'vcf') {
      // Generate VCF content
      const vcfContent = generateVCF(thalibahContacts);

      const categorySuffix = category === 'tikrar' ? '-tikrar' : '-pra-tikrar';
      const batchName = batchId && batchId !== 'all' ? `-${batchId}` : '';

      return new NextResponse(vcfContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/vcard; charset=utf-8',
          'Content-Disposition': `attachment; filename="mti-contacts${categorySuffix}${batchName}-${new Date().toISOString().split('T')[0]}.vcf"`,
          'Cache-Control': 'no-cache',
        },
      });
    } else {
      // Generate CSV content
      const csvHeaders = [
        'Name',
        'Given Name',
        'Family Name',
        'Email 1 - Type',
        'Email 1 - Value',
        'Phone 1 - Type',
        'Phone 1 - Value',
        'Phone 2 - Type',
        'Phone 2 - Value',
        'Organization 1 - Name',
        'Notes'
      ];

      const csvRows: string[] = [csvHeaders.join(',')];

      for (const contact of thalibahContacts) {
        const nomorInduk = contact.nomor_induk;
        const categoryLabel = contact.category === 'tikrar' ? 'Tikrar' : 'Pra Tikrar';

        const row = [
          escapeCsvField(nomorInduk), // Name - for display
          escapeCsvField(nomorInduk), // Given Name - THIS is what Gmail uses as contact name
          escapeCsvField(''), // Family Name
          'Work', // Email 1 - Type
          escapeCsvField(contact.email), // Email 1 - Value
          'Mobile', // Phone 1 - Type
          escapeCsvField(contact.whatsapp), // Phone 1 - Value
          contact.telegram ? 'Other' : '', // Phone 2 - Type
          escapeCsvField(contact.telegram || ''), // Phone 2 - Value
          'Markaz Tikrar Indonesia', // Organization 1 - Name
          escapeCsvField(`ID: ${contact.id} | Juz: ${contact.confirmed_chosen_juz} | Status: ${contact.status} | Kategori: ${categoryLabel}`) // Notes - use | separator instead of \n
        ];

        csvRows.push(row.join(','));
      }

      // Add BOM for Excel UTF-8 compatibility
      const BOM = '\uFEFF';
      const csvContent = BOM + csvRows.join('\n');
      const categorySuffix = category === 'tikrar' ? '-tikrar' : '-pra-tikrar';
      const batchName = batchId && batchId !== 'all' ? `-${batchId}` : '';

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="mti-contacts${categorySuffix}${batchName}-${new Date().toISOString().split('T')[0]}.csv"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

  } catch (error) {
    logger.error('Error in export contacts', { error: error as Error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
