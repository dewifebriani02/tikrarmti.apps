import { ApiResponses, HTTP_STATUS } from '@/lib/api-responses'

/**
 * Health Check Endpoint
 *
 * Checks database connectivity and returns system status.
 * This endpoint is used for monitoring and load balancer health checks.
 */
export async function GET() {
  try {
    const startTime = Date.now()
    const { queryOne } = await import('@/lib/db')
    await queryOne('SELECT 1 as health')

    const responseTime = Date.now() - startTime

    return ApiResponses.success({
      status: 'ok',
      database: 'connected',
      responseTime
    }, 'All systems operational')
  } catch {
    return ApiResponses.serverError('Health check failed')
  }
}