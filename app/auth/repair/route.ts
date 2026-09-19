import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const formData = await request.formData()
  const email = formData.get('email') as string
  const newId = formData.get('newId') as string
  
  if (!email || !newId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }
  
  // PostgreSQL-backed admin client (replaces Supabase service role)
  const db = createSupabaseAdmin()
  
  console.log(`[RepairRoute] Attempting to sync ID for ${email} to ${newId}`)
  
  // 1. Update public.users
  const { error: userError } = await db
    .from('users')
    .update({ id: newId })
    .eq('email', email)
    
  if (userError) {
    console.error('[RepairRoute] Error updating users table:', userError.message)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }
  
  // 2. Update pendaftaran_tikrar_tahfidz (if exists and needed)
  await db
    .from('pendaftaran_tikrar_tahfidz')
    .update({ user_id: newId })
    .eq('email', email)
    
  console.log(`[RepairRoute] Successfully synced ID for ${email}`)
  
  return NextResponse.redirect(new URL('/debug?success=true', request.url))
}
