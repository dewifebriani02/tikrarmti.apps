import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: activeBatch } = await supabase
    .from('batches')
    .select('id, start_date, end_date')
    .in('status', ['ongoing', 'open'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const currentWeek = activeBatch?.start_date
    ? Math.ceil((Date.now() - new Date(activeBatch.start_date + "T00:00:00+07:00").getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 1;
  const targetWeek = Math.max(1, currentWeek - 1);
  
  let weekStartDate = new Date(0);
  let weekEndDate = new Date();
  if (activeBatch?.start_date) {
    weekStartDate = new Date(activeBatch.start_date + "T00:00:00+07:00");
    weekStartDate.setDate(weekStartDate.getDate() + (targetWeek - 1) * 7);
    weekEndDate = new Date(activeBatch.start_date + "T00:00:00+07:00");
    weekEndDate.setDate(weekEndDate.getDate() + targetWeek * 7);
  }

  const { data: halaqahs } = await supabase
    .from('halaqah')
    .select(`
      id, name, muallimah:users!halaqah_muallimah_id_fkey(full_name, nama_kunyah),
      students:halaqah_students(status, thalibah_id)
    `)
    .eq('status', 'active');

  const tikrarHalaqahs = (halaqahs || []).filter(h => 
    h.name.toLowerCase().includes('tikrar') && !h.name.toLowerCase().includes('pra')
  );

  const thalibahIds = tikrarHalaqahs.flatMap(h => 
    h.students?.filter((s: any) => s.status === 'active')?.map((s: any) => s.thalibah_id) || []
  );

  const { data: jurnalRecords } = await supabase
    .from('jurnal_records')
    .select('user_id, blok, created_at')
    .in('user_id', thalibahIds);
    
  const { data: tashihRecords } = await supabase
    .from('tashih_records')
    .select('user_id, blok, created_at')
    .in('user_id', thalibahIds);

  return NextResponse.json({
    date_info: {
      now: new Date().toISOString(),
      start_date: activeBatch?.start_date,
      currentWeek,
      targetWeek,
      weekStartDate: weekStartDate.toISOString(),
      weekEndDate: weekEndDate.toISOString(),
    },
    jurnal_total: jurnalRecords?.length,
    tashih_total: tashihRecords?.length,
    jurnal_sample: jurnalRecords?.slice(0, 5),
    tashih_sample: tashihRecords?.slice(0, 5)
  });
}
