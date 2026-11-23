/**
 * WhatsApp Safe Throttling & Error Classification Helpers
 *
 * Designed to keep unofficial WatZap instances safely below WatZap's 30 calls/min
 * hard limit and avoid WhatsApp anti-spam / automated-burst bans:
 * - Random 4–7 second jitter between individual messages
 * - 25–35 second cooldown pause every 15 messages (batch pause)
 * - Immediate batch stop on rate-limit or fatal instance/license errors
 */

export const SAFE_DELAY_MIN_MS = 4000;
export const SAFE_DELAY_MAX_MS = 7000;
export const SAFE_BATCH_SIZE = 15;
export const SAFE_BATCH_PAUSE_MIN_MS = 25000;
export const SAFE_BATCH_PAUSE_MAX_MS = 35000;

export function getSafeRandomDelayMs(
  minMs: number = SAFE_DELAY_MIN_MS,
  maxMs: number = SAFE_DELAY_MAX_MS
): number {
  const low = Math.max(0, minMs);
  const high = Math.max(low, maxMs);
  return low + Math.floor(Math.random() * (high - low + 1));
}

export function getSafeBatchPauseMs(
  minMs: number = SAFE_BATCH_PAUSE_MIN_MS,
  maxMs: number = SAFE_BATCH_PAUSE_MAX_MS
): number {
  const low = Math.max(0, minMs);
  const high = Math.max(low, maxMs);
  return low + Math.floor(Math.random() * (high - low + 1));
}

export function sleepMs(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits safely between consecutive WhatsApp messages.
 * - No delay after the final recipient.
 * - Adds a 4–7s randomized delay between sends.
 * - Adds an extra 25–35s cooldown pause after every 15th message.
 * - Polls `shouldAbort` every 500ms so UI stops remain responsive during pauses.
 */
export async function waitBetweenWhatsAppMessages(
  currentIndex: number,
  totalCount: number,
  options?: {
    shouldAbort?: () => boolean;
    onWaitStart?: (info: { delayMs: number; batchPaused: boolean }) => void;
    batchSize?: number;
  }
): Promise<{ waitedMs: number; batchPaused: boolean; aborted: boolean }> {
  if (currentIndex >= totalCount - 1) {
    return { waitedMs: 0, batchPaused: false, aborted: false };
  }

  const batchSize = options?.batchSize || SAFE_BATCH_SIZE;
  const isBatchBoundary = (currentIndex + 1) % batchSize === 0;
  const delayMs = isBatchBoundary
    ? getSafeRandomDelayMs() + getSafeBatchPauseMs()
    : getSafeRandomDelayMs();

  options?.onWaitStart?.({ delayMs, batchPaused: isBatchBoundary });

  const stepMs = 500;
  let elapsed = 0;
  while (elapsed < delayMs) {
    if (options?.shouldAbort?.()) {
      return { waitedMs: elapsed, batchPaused: isBatchBoundary, aborted: true };
    }
    const chunk = Math.min(stepMs, delayMs - elapsed);
    await sleepMs(chunk);
    elapsed += chunk;
  }

  return {
    waitedMs: elapsed,
    batchPaused: isBatchBoundary,
    aborted: Boolean(options?.shouldAbort?.()),
  };
}

export interface WhatsAppErrorClassification {
  isRateLimit: boolean;
  isFatalInstance: boolean;
  shouldStopBatch: boolean;
}

/**
 * Classifies whether a WhatsApp send error should stop the remaining batch immediately
 * (e.g. WatZap rate limit, instance offline/blocked, license missing) versus a
 * single-recipient issue (e.g. invalid phone number) that should only skip that user.
 */
export function classifyWhatsAppError(
  errorMessage?: string | null,
  flags?: { rateLimited?: boolean; fatalInstanceError?: boolean }
): WhatsAppErrorClassification {
  const msg = (errorMessage || '').toLowerCase();

  const isRateLimit =
    Boolean(flags?.rateLimited) ||
    msg.includes('limit exceeded') ||
    msg.includes('too many request') ||
    msg.includes('rate limit') ||
    msg.includes('try again, in');

  const isFatalInstance =
    Boolean(flags?.fatalInstanceError) ||
    msg.includes('instance not started') ||
    msg.includes('license not found') ||
    msg.includes('not started') ||
    msg.includes('disconnected') ||
    msg.includes('belum dikonfigurasi');

  return {
    isRateLimit,
    isFatalInstance,
    shouldStopBatch: isRateLimit || isFatalInstance,
  };
}
