import { NextRequest, NextResponse } from 'next/server';
import { resetUserPasswordImpl } from '@/lib/admin/admin-service';

/**
 * POST /api/admin/users/[id]/reset-password
 * Reset user password to default (Admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await resetUserPasswordImpl(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in reset password API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
