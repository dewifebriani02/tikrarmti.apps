const OPT_OUT_COMMANDS = new Set([
  'stop',
  'stop reminder',
  'stop pengingat',
  'stop murojaah',
  'stop murajaah',
  "stop muroja'ah",
  "stop muraja'ah",
  'stop wa',
  'unsubscribe',
]);

/**
 * Checks whether an inbound WhatsApp text is an explicit opt-out command
 * (e.g. "STOP", "*STOP*", "stop.", "stop reminder").
 * Uses whole-message matching (never substring matching) so normal questions
 * containing the word "stop" still reach the AI assistant.
 */
export function isMurojaahOptOutCommand(messageBody?: string | null, hasMedia?: boolean): boolean {
  if (hasMedia || !messageBody) return false;

  const trimmed = messageBody.trim();
  if (!trimmed || trimmed.length > 40) return false;

  const cleaned = trimmed
    .replace(/^[\s*_~"'`.,!?;:()\[\]]+|[\s*_~"'`.,!?;:()\[\]]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  return OPT_OUT_COMMANDS.has(cleaned);
}
