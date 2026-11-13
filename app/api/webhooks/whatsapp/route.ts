import { NextRequest, NextResponse } from 'next/server';
import { processIncomingWebhook } from '@/lib/services/whatsapp-chat';
import { handleIncomingAiReply } from '@/lib/services/whatsapp-ai-agent';

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

    // 1. Save incoming message to inbox DB
    const result = await processIncomingWebhook(rawBody);

    // 2. Trigger AI Agent reply asynchronously for inbound messages (so webhook returns 200 OK immediately)
    if (
      result.handled &&
      result.direction === 'inbound' &&
      result.conversationId &&
      result.phoneNumber &&
      result.messageBody
    ) {
      void handleIncomingAiReply({
        conversationId: result.conversationId,
        phoneNumber: result.phoneNumber,
        messageBody: result.messageBody,
        botEnabled: result.botEnabled !== false,
        hasMedia: result.hasMedia,
      }).catch((aiErr) => {
        console.error('[WhatsApp Webhook AI Error]', aiErr);
      });
    }

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
