import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const parseJsonField = (value: any): any => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : value;
    } catch {
      return [];
    }
  }
  return value ?? [];
};

export async function GET() {
  try {
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
