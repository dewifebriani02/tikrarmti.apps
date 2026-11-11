import { NextRequest, NextResponse } from 'next/server';
import { processIncomingWebhook } from '@/lib/services/whatsapp-chat';

export const dynamic = 'force-dynamic';

/**
 * Health-check & verification endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Markaz Tikrar Indonesia (MTI) WhatsApp Webhook',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Incoming WatZap Webhook Handler
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);

    if (!rawBody) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Process asynchronously / safely
    const result = await processIncomingWebhook(rawBody);

    return NextResponse.json(
      {
        status: 'success',
        handled: result.handled,
        reason: result.reason,
        messageId: result.messageId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[WhatsApp Webhook Error]', error);
    // WatZap requires 200 OK so it does not retry needlessly on application level errors
    return NextResponse.json(
      { status: 'error', message: error.message || 'Internal error' },
      { status: 200 }
    );
  }
}
