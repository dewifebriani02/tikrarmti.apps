import { ApiResponses, HTTP_STATUS } from '@/lib/api-responses'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getOwnerEmails } from '@/lib/env'
import { consolidateRoles } from '@/lib/roles'

interface EnsureUserRequest {
  userId: string
  email?: string
  full_name?: string
  provider?: string
}

/**
 * Ensure User Exists Endpoint
 *
 * Creates or updates a user record in the database.
 * This is called after authentication to ensure the user exists in the users table.
 *
 * NOTE: This endpoint has relaxed validation to ensure users are created
 * even with incomplete metadata. The user should complete their profile later.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as EnsureUserRequest
    const { userId, email, full_name, provider = 'email' } = body

    if (!userId) {
      return ApiResponses.error(
        'VALIDATION_ERROR',
        'userId is required',
        { field: 'userId' },
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Use native pg client (no Supabase dependency)
    const db = createSupabaseAdmin()

    const { data: existingUser, error: checkError } = await db
      .from('users')
      .select('id, email, role, roles')
      .eq('id', userId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[ensure-user] Error checking existing user:', checkError)
      return ApiResponses.databaseError(checkError)
    }

    if (existingUser) {
      const needsMigration = !existingUser.roles || existingUser.roles.length === 0
      if (needsMigration && existingUser.role) {
        const ownerEmails = getOwnerEmails()
        const consolidatedRoles = consolidateRoles(
          [existingUser.role],
          existingUser.email,
          ownerEmails
        )

        const { error: updateError } = await db
          .from('users')
          .update({ roles: consolidatedRoles })
          .eq('id', userId)

        if (updateError) {
          console.error('[ensure-user] Failed to migrate roles:', updateError)
        }
      }

      return ApiResponses.success(
        { existed: true, userId: existingUser.id },
        'User already exists'
      )
    }

    const userEmail = email
    if (!userEmail) {
      return ApiResponses.error(
        'VALIDATION_ERROR',
        'email is required for new users',
        { field: 'email' },
        HTTP_STATUS.BAD_REQUEST
      )
    }

    const ownerEmails = getOwnerEmails()
    const userRole = 'thalibah'
    const userRoles = consolidateRoles([userRole], userEmail, ownerEmails)

    const { data: newUser, error: insertError } = await db
      .from('users')
      .insert({
        id: userId,
        email: userEmail,
        full_name: full_name || userEmail?.split('@')[0] || '',
        role: userRole,
        roles: userRoles,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email, full_name, roles, created_at')
      .single()

    if (insertError) {
      console.error('[ensure-user] Error creating user:', insertError)
      return ApiResponses.databaseError(insertError)
    }

    return ApiResponses.success(
      { existed: false, user: newUser },
      'User created successfully',
      HTTP_STATUS.CREATED
    )

  } catch (error) {
    console.error('[ensure-user] Uncaught error:', error)
    return ApiResponses.handleUnknown(error)
  }
}
