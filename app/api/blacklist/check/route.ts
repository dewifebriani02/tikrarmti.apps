import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger-secure'
import { authRateLimit, checkRateLimit, getClientIP } from '@/lib/rate-limiter'
import { ApiResponses } from '@/lib/api-responses'

/**
 * GET /api/blacklist/check
 * Check if a phone number or email is blacklisted
 * Can be called during registration to prevent blacklisted users from registering
 */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request)

  try {
    const rate = await checkRateLimit(`blacklist-check:${ip}`, authRateLimit, '/api/blacklist/check')
    if (!rate.success) {
      return ApiResponses.error('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi nanti.', undefined, 429)
    }

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const email = searchParams.get('email')

    // At least one parameter is required
    if (!phone && !email) {
      return ApiResponses.error('VALIDATION_ERROR', 'Either phone or email parameter is required', undefined, 400)
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Each value is bound separately — never interpolated into a filter string
    const runCheck = (column: 'whatsapp' | 'email', value: string) =>
      supabaseAdmin
        .from('users')
        .select('id')
        .eq('is_blacklisted', true)
        .eq(column, value)
        .limit(1)

    const results = await Promise.all([
      phone ? runCheck('whatsapp', phone) : null,
      email ? runCheck('email', email) : null,
    ])
    const error = results.find(r => r?.error)?.error
    const data = results.flatMap(r => r?.data || [])

    if (error) {
      logger.error('Failed to check blacklist status', {
        error: error.message,
        phone,
        email,
        ip
      })
      // Don't expose error details to potential attackers
      return NextResponse.json({
        isBlacklisted: false,
        message: 'Unable to verify blacklist status'
      })
    }

    // If any matching blacklisted user found
    if (data && data.length > 0) {
      logger.info('Blacklist check positive', {
        phone,
        email,
        matchedUserId: data[0].id,
        ip
      })

      return NextResponse.json({
        isBlacklisted: true,
        message: 'This phone number or email has been blacklisted from registering'
      })
    }

    return NextResponse.json({
      isBlacklisted: false,
      message: 'No blacklist found for this phone or email'
    })

  } catch (error) {
    logger.error('Unhandled error in blacklist check API', {
      error: error as Error,
      ip
    })
    // Don't expose error details to potential attackers
    return NextResponse.json({
      isBlacklisted: false,
      message: 'Unable to verify blacklist status'
    })
  }
}
