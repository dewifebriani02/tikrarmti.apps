import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';

// Helper to parse a JSON-string field to array
const parseJsonField = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Helper to check admin
async function isAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const supabaseAdmin = createSupabaseAdmin();
  const { data } = await supabaseAdmin.from('users').select('roles').eq('id', user.id).single();
  return data?.roles?.includes('admin') ?? false;
}

export async function GET() {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin.from('faqs').select('*').order('sort_order', { ascending: true });
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // `questions` column is stored as text (JSON string) in the DB — parse it
    const parsed = (data || []).map((row: any) => ({
      ...row,
      questions: parseJsonField(row.questions),
    }));
    
    return NextResponse.json({ data: parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin.from('faqs').insert({
      category: body.category || 'Kategori Baru',
      icon: body.icon || 'HelpCircle',
      color: body.color || 'gray',
      questions: JSON.stringify(body.questions || []),
      sort_order: body.sort_order || 0
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    return NextResponse.json({ data: { ...data, questions: parseJsonField(data?.questions) } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const supabaseAdmin = createSupabaseAdmin();
    
    // Support bulk update for reordering or single update
    if (Array.isArray(body)) {
      const itemsToUpsert = body.map((item: any) => {
        const payload: any = {
          category: item.category,
          icon: item.icon,
          color: item.color,
          questions: typeof item.questions === 'string' ? item.questions : JSON.stringify(item.questions || []),
          sort_order: item.sort_order,
          updated_at: new Date().toISOString()
        };
        // Omit id if it's a temporary ID starting with 'temp-'
        if (item.id && !item.id.startsWith('temp-')) {
          payload.id = item.id;
        }
        return payload;
      });

      const { data, error } = await supabaseAdmin.from('faqs').upsert(itemsToUpsert).select();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      
      const parsedData = (data || []).map((row: any) => ({
        ...row,
        questions: parseJsonField(row.questions),
      }));
      return NextResponse.json({ success: true, data: parsedData });
    }

    const { id, category, icon, color, questions, sort_order } = body;
    const { data, error } = await supabaseAdmin.from('faqs').update({
      category,
      icon,
      color,
      questions: typeof questions === 'string' ? questions : JSON.stringify(questions || []),
      sort_order,
      updated_at: new Date().toISOString()
    }).eq('id', id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    return NextResponse.json({ data: { ...data, questions: parseJsonField(data?.questions) } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabaseAdmin = createSupabaseAdmin();
    const { error } = await supabaseAdmin.from('faqs').delete().eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
