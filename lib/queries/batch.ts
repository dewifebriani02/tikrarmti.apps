/**
 * BATCH QUERIES
 *
 * Cached queries for batch-related data.
 */

import { unstable_cache } from 'next/cache'
import type { Batch } from '@/types/database'

/**
 * Get a single batch by ID (cached).
 * Batches don't change frequently, so we cache for 5 minutes.
 */
export async function getCachedBatch(
  supabase: any,
  batchId: string
): Promise<Batch | null> {
  const cached = unstable_cache(
    async (id: string) => {
      // @ts-ignore - supabase client types
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('[getCachedBatch] Error:', error)
        return null
      }

      return data
    },
    [`batch:${batchId}`],
    { revalidate: 300 } // 5 minutes
  )

  return cached(batchId)
}

/**
 * Get all active batches (cached).
 * Active batches list is relatively stable.
 */
export async function getCachedActiveBatches(
  supabase: any
): Promise<Batch[]> {
  const cached = unstable_cache(
    async () => {
      // @ts-ignore - supabase client types
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[getCachedActiveBatches] Error:', error)
        return []
      }

      return data || []
    },
    ['batches:active'],
    { revalidate: 300 } // 5 minutes
  )

  return cached()
}

/**
 * Get batch with programs (cached).
 * Includes related programs data.
 */
export async function getCachedBatchWithPrograms(
  supabase: any,
  batchId: string
): Promise<(Batch & { programs: unknown[] }) | null> {
  const cached = unstable_cache(
    async (id: string) => {
      // @ts-ignore - supabase client types
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          programs (*)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('[getCachedBatchWithPrograms] Error:', error)
        return null
      }

      return data
    },
    [`batch:${batchId}:with-programs`],
    { revalidate: 300 } // 5 minutes
  )

  return cached(batchId)
}
