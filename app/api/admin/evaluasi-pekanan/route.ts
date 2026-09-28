import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAnyRole } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createSupabaseAdmin();

interface WeekEvaluationItem {
  week_number: number;
  label?: string; // e.g. "Pekan 1", "Pekan ke 2"
  special_status?: string; // e.g. "Tashih", "Pemutihan"
  sp1_names: string[];
  sp2_names: string[];
  do_names: string[];
  blacklist_names: string[];
  custom_note?: string;
}

const DEFAULT_WEEKS: WeekEvaluationItem[] = [
  {
    week_number: 1,
    special_status: 'Tashih',
    sp1_names: [],
    sp2_names: [],
    do_names: [],
    blacklist_names: []
  },
  {
    week_number: 2,
    sp1_names: [],
    sp2_names: [],
    do_names: ['Nida'],
    blacklist_names: []
  },
  {
    week_number: 3,
    sp1_names: ['Eri Choiriyah', 'Lisda'],
    sp2_names: [],
    do_names: ['Amanda', 'Diah'],
    blacklist_names: []
  },
  {
    week_number: 4,
    sp1_names: [],
    sp2_names: [],
    do_names: ['Arma Yunita'],
    blacklist_names: []
  },
  {
    week_number: 5,
    sp1_names: ['Lina Wartabone', 'Izzatu Dini'],
    sp2_names: [],
    do_names: ['Siti Hasan'],
    blacklist_names: ['Lenny Bellyana']
  },
  {
    week_number: 6,
    special_status: 'Pemutihan',
    sp1_names: [],
    sp2_names: [],
    do_names: [],
    blacklist_names: []
  },
  {
    week_number: 7,
    sp1_names: [
      'Dita Tri Aprilia',
      'Earlita Arsyfa Khoirina',
      'Farida',
      'Nurdiani',
      'Rahel Pangestu Azzahra',
      'Yunita Dian Fakih',
      'Zainab binti Yusri'
    ],
    sp2_names: ['Izzatu Dini', 'Lina Wartabone'],
    do_names: [],
    blacklist_names: []
  }
];

// Helper to format WhatsApp Chat
function formatEvaluationToChat(weeks: WeekEvaluationItem[]): string {
  const sections: string[] = [];

  weeks.forEach((w) => {
    // Only include weeks with some content or special status
    const hasContent =
      w.special_status ||
      w.sp1_names?.length > 0 ||
      w.sp2_names?.length > 0 ||
      w.do_names?.length > 0 ||
      w.blacklist_names?.length > 0 ||
      w.custom_note;

    if (!hasContent) return;

    const lines: string[] = [];
    // Header format: Pekan 1 or Pekan ke 2
    const pekanHeader = w.week_number === 1 ? '🧱Pekan 1' : `🧱Pekan ke ${w.week_number}`;
    lines.push(pekanHeader);
    lines.push('-----------------------------------');

    if (w.special_status) {
      lines.push(w.special_status);
      lines.push('');
    }

    if (w.blacklist_names && w.blacklist_names.length > 0) {
      lines.push('❌ Blacklist');
      w.blacklist_names.forEach((name, idx) => {
        lines.push(w.blacklist_names.length === 1 ? name : `${idx + 1}. ${name}`);
      });
      lines.push('');
    }

    if (w.do_names && w.do_names.length > 0) {
      lines.push('🚫DO');
      w.do_names.forEach((name, idx) => {
        lines.push(w.do_names.length === 1 ? name : `${idx + 1}. ${name}`);
      });
      lines.push('');
    }

    if (w.sp1_names && w.sp1_names.length > 0) {
      lines.push('🔺SP1');
      w.sp1_names.forEach((name, idx) => {
        lines.push(w.sp1_names.length === 1 ? name : `${idx + 1}. ${name}`);
      });
      lines.push('');
    }

    if (w.sp2_names && w.sp2_names.length > 0) {
      lines.push('🔺🔺SP2');
      w.sp2_names.forEach((name, idx) => {
        lines.push(w.sp2_names.length === 1 ? name : `${idx + 1}. ${name}`);
      });
      lines.push('');
    }

    if (w.custom_note) {
      lines.push(w.custom_note);
      lines.push('');
    }

    // Trim trailing empty line from the section
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    sections.push(lines.join('\n'));
  });

  return sections.join('\n\n-----------------------------------\n');
}

/**
 * GET /api/admin/evaluasi-pekanan
 * Fetch weekly evaluation template and available batches
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');

    // 1. Fetch active batches
    const { data: batches } = await supabaseAdmin
      .from('batches')
      .select('id, name, is_active')
      .order('created_at', { ascending: false });

    const activeBatch = batches?.find((b: any) => b.is_active) || batches?.[0];
    const targetBatchId = batchId || activeBatch?.id || 'default';

    // 2. Try fetching saved template from system_settings
    const settingsKey = `weekly_evaluation_template_${targetBatchId}`;
    const { data: savedSetting } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', settingsKey)
      .single();

    let weeksData: WeekEvaluationItem[] = savedSetting?.value?.weeks || [];

    // If no custom template saved, use DEFAULT_WEEKS as starting base
    if (!weeksData || weeksData.length === 0) {
      weeksData = JSON.parse(JSON.stringify(DEFAULT_WEEKS));
    }

    // Ensure at least 14 weeks are available for easy editing
    const maxWeek = Math.max(14, ...weeksData.map((w) => w.week_number));
    for (let w = 1; w <= maxWeek; w++) {
      if (!weeksData.find((item) => item.week_number === w)) {
        weeksData.push({
          week_number: w,
          sp1_names: [],
          sp2_names: [],
          do_names: [],
          blacklist_names: []
        });
      }
    }

    // Sort weeks ascending
    weeksData.sort((a, b) => a.week_number - b.week_number);

    // Format initial chat template
    const formattedChat = formatEvaluationToChat(weeksData);

    return ApiResponses.success({
      batches: batches || [],
      selected_batch_id: targetBatchId,
      weeks: weeksData,
      formatted_chat: formattedChat
    });
  } catch (error: any) {
    console.error('[Admin Evaluasi Pekanan GET] Error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

/**
 * POST /api/admin/evaluasi-pekanan
 * Save weekly evaluation template
 */
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const body = await request.json();
    const { batch_id, weeks } = body;

    if (!batch_id) {
      return NextResponse.json({ error: 'Missing batch_id' }, { status: 400 });
    }

    const settingsKey = `weekly_evaluation_template_${batch_id}`;
    const formattedChat = formatEvaluationToChat(weeks || []);

    const payload = {
      weeks: weeks || [],
      formatted_chat: formattedChat,
      updated_at: new Date().toISOString()
    };

    // Upsert into system_settings
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .upsert(
        {
          key: settingsKey,
          value: payload,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Admin Evaluasi Pekanan POST] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    return ApiResponses.success({
      settings: data,
      formatted_chat: formattedChat
    }, 'Template rekap evaluasi pekanan berhasil disimpan');
  } catch (error: any) {
    console.error('[Admin Evaluasi Pekanan POST] Error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
