import { NextRequest, NextResponse } from 'next/server';
import {
  createUserImpl,
  updateUserImpl,
  deleteUserImpl,
  bulkUpdateUsersImpl,
  getSystemLogsImpl,
  getSystemLogsStatsImpl,
  resetUserPasswordImpl,
  toggleJuzOptionActiveImpl,
  createJuzOptionImpl,
  updateJuzOptionImpl,
  getJuzOptionsAdminImpl,
  getRegistrationQuestionsAdminImpl,
  updateRegistrationQuestionImpl,
  getReregistrationQuestionsAdminImpl,
  updateReregistrationQuestionImpl,
  getMuallimahRegistrationQuestionsAdminImpl,
  updateMuallimahRegistrationQuestionImpl,
  getPraTikrarRegistrationQuestionsAdminImpl,
  updatePraTikrarRegistrationQuestionImpl,
  getMusyrifahRegistrationQuestionsAdminImpl,
  updateMusyrifahRegistrationQuestionImpl,
} from '@/lib/admin/admin-service';

const handlers: Record<string, (...args: any[]) => Promise<any>> = {
  createUser: createUserImpl,
  updateUser: updateUserImpl,
  deleteUser: deleteUserImpl,
  bulkUpdateUsers: bulkUpdateUsersImpl,
  getSystemLogs: getSystemLogsImpl,
  getSystemLogsStats: getSystemLogsStatsImpl,
  resetUserPassword: resetUserPasswordImpl,
  toggleJuzOptionActive: toggleJuzOptionActiveImpl,
  createJuzOption: createJuzOptionImpl,
  updateJuzOption: updateJuzOptionImpl,
  getJuzOptionsAdmin: getJuzOptionsAdminImpl,
  getRegistrationQuestionsAdmin: getRegistrationQuestionsAdminImpl,
  updateRegistrationQuestion: updateRegistrationQuestionImpl,
  getReregistrationQuestionsAdmin: getReregistrationQuestionsAdminImpl,
  updateReregistrationQuestion: updateReregistrationQuestionImpl,
  getMuallimahRegistrationQuestionsAdmin: getMuallimahRegistrationQuestionsAdminImpl,
  updateMuallimahRegistrationQuestion: updateMuallimahRegistrationQuestionImpl,
  getPraTikrarRegistrationQuestionsAdmin: getPraTikrarRegistrationQuestionsAdminImpl,
  updatePraTikrarRegistrationQuestion: updatePraTikrarRegistrationQuestionImpl,
  getMusyrifahRegistrationQuestionsAdmin: getMusyrifahRegistrationQuestionsAdminImpl,
  updateMusyrifahRegistrationQuestion: updateMusyrifahRegistrationQuestionImpl,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const action = body?.action;
    const args = Array.isArray(body?.args) ? body.args : [];

    if (!action || typeof action !== 'string' || !handlers[action]) {
      return NextResponse.json(
        { success: false, error: 'Action admin tidak valid.' },
        { status: 400 }
      );
    }

    const result = await handlers[action](...args);
    const status = result?.success
      ? 200
      : result?.error?.includes('Unauthorized')
        ? 401
        : result?.error?.includes('Forbidden')
          ? 403
          : 400;

    return NextResponse.json(result ?? { success: false, error: 'Empty response' }, { status });
  } catch (error: any) {
    console.error('[API /api/admin/actions POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Terjadi kesalahan pada server admin.' },
      { status: 500 }
    );
  }
}
