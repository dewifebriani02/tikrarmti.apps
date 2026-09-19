import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { validateServerActionAuth } from '@/lib/rbac'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function DebugAuthPage() {
  try {
    await validateServerActionAuth('admin')
  } catch {
    redirect('/dashboard')
  }

  const supabase = createClient()
  
  // 1. Get Session
  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  
  // 2. Client-side DB lookup
  const { data: dbUserById, error: dbErrorById } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser?.id)
    .maybeSingle()
    
  // 3. Admin-side DB lookup
  const supabaseAdmin = createSupabaseAdmin()
  
  const { data: dbUserByEmail, error: dbErrorByEmail } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', authUser?.email)
    .maybeSingle()

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-green-800 border-b pb-4">Auth & Role Diagnostic</h1>
        
        {/* Session Info */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-500 rounded"></span>
            1. Sesi Auth (Supabase Auth)
          </h2>
          <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
            {authUser ? (
              <pre className="text-xs">
                {JSON.stringify({
                  id: authUser.id,
                  email: authUser.email,
                  user_metadata: authUser.user_metadata,
                  app_metadata: authUser.app_metadata
                }, null, 2)}
              </pre>
            ) : (
              <p className="text-red-500 font-medium">❌ Tidak ada sesi login aktif.</p>
            )}
          </div>
        </section>

        {/* DB Lookups */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Lookup by ID */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-6 bg-purple-500 rounded"></span>
              2. Data Database (By ID)
            </h2>
            <div className="bg-gray-100 p-4 rounded-lg border">
              {dbUserById ? (
                <div className="text-xs space-y-1">
                  <p><strong>Nama:</strong> {dbUserById.full_name}</p>
                  <p><strong>Role (String):</strong> {dbUserById.role}</p>
                  <p><strong>Roles (Array):</strong> {JSON.stringify(dbUserById.roles)}</p>
                  <p className="text-green-600 font-bold">✅ Data Ditemukan</p>
                </div>
              ) : (
                <div className="text-xs space-y-1">
                  <p className="text-orange-500">❌ Tidak ditemukan berdasarkan ID.</p>
                  {dbErrorById && <p className="text-red-400">Error: {dbErrorById.message}</p>}
                </div>
              )}
            </div>
          </section>

          {/* Lookup by Email */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-6 bg-orange-500 rounded"></span>
              3. Data Database (By Email - Admin)
            </h2>
            <div className="bg-gray-100 p-4 rounded-lg border border-orange-200">
              {dbUserByEmail ? (
                <div className="text-xs space-y-1">
                  <p><strong>ID Database:</strong> {dbUserByEmail.id}</p>
                  <p><strong>Email:</strong> {dbUserByEmail.email}</p>
                  <p><strong>Roles:</strong> {JSON.stringify(dbUserByEmail.roles)}</p>
                  {dbUserByEmail.id !== authUser?.id ? (
                    <p className="text-red-600 font-bold mt-2 animate-pulse">⚠️ ID MISMATCH DETECTED!</p>
                  ) : (
                    <p className="text-green-600 font-bold">✅ ID Matches Session</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-red-500">❌ Tidak ditemukan bahkan melalui email.</p>
              )}
            </div>
          </section>
        </div>

        {/* Diagnosis Result */}
        <section className="bg-green-50 p-6 rounded-xl border border-green-200">
          <h2 className="text-xl font-bold text-green-800 mb-4">Diagnosis & Rekomendasi</h2>
          
          {!authUser && <p className="mb-4">Silakan login terlebih dahulu untuk memulai diagnosis.</p>}
          
          {authUser && dbUserByEmail && dbUserByEmail.id !== authUser.id && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-red-800">
                Deteksi: Akun Ukhti ditemukan di database sebagai Admin, tapi memiliki ID yang berbeda dengan sesi saat ini.
              </p>
              <form action="/auth/repair" method="POST">
                <input type="hidden" name="email" value={authUser.email} />
                <input type="hidden" name="newId" value={authUser.id} />
                <button 
                  type="submit"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-all shadow-md active:scale-95"
                >
                  SINKRONISASI ID SEKARANG (FIX PERMANEN)
                </button>
              </form>
              <p className="text-xs text-gray-500 italic">
                Tombol di atas akan memperbarui ID di tabel users Ukhti agar sesuai dengan login saat ini.
              </p>
            </div>
          )}

          {authUser && dbUserByEmail && dbUserByEmail.id === authUser.id && (
            <div className="space-y-2">
              <p className="text-green-700 font-medium">✅ Akun Ukhti sudah tersinkronisasi dengan benar!</p>
              <p className="text-sm">Silakan kembali ke <Link href="/dashboard" className="underline font-bold">Dashboard</Link> dan pastikan peran 'Administrator' sudah tampil.</p>
            </div>
          )}

          {!dbUserByEmail && authUser && (
            <p className="text-sm text-gray-600">
              Email {authUser.email} tidak ditemukan di tabel users. Silakan hubungi developer untuk pengecekan data manual.
            </p>
          )}
        </section>

        <div className="mt-8 text-center pt-6 border-t">
          <Link href="/dashboard" className="text-green-700 font-semibold hover:underline">
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
