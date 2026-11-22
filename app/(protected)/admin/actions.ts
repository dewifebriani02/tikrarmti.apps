'use server'

import {
  CreateUserData,
  UpdateUserData,
  SystemLogFilter,
  SystemLogEntry,
  SystemLogsResponse,
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
} from '@/lib/admin/admin-service'

export type { CreateUserData, UpdateUserData, SystemLogFilter, SystemLogEntry, SystemLogsResponse }

export async function createUser(data: CreateUserData) {
  return createUserImpl(data)
}

export async function updateUser(data: UpdateUserData) {
  return updateUserImpl(data)
}

export async function deleteUser(userId: string) {
  return deleteUserImpl(userId)
}

export async function bulkUpdateUsers(updates: UpdateUserData[]) {
  return bulkUpdateUsersImpl(updates)
}

export async function getSystemLogs(filter: SystemLogFilter = {}): Promise<SystemLogsResponse> {
  return getSystemLogsImpl(filter)
}

export async function getSystemLogsStats(filter: Omit<SystemLogFilter, 'limit' | 'offset'> = {}) {
  return getSystemLogsStatsImpl(filter)
}

export async function resetUserPassword(userId: string) {
  return resetUserPasswordImpl(userId)
}

export async function toggleJuzOptionActive(code: string, isActive: boolean) {
  return toggleJuzOptionActiveImpl(code, isActive)
}

export async function createJuzOption(data: {
  code: string
  name: string
  juz_number: number
  part: 'A' | 'B'
  start_page: number
  end_page: number
  is_active: boolean
  sort_order: number
}) {
  return createJuzOptionImpl(data)
}

export async function updateJuzOption(
  id: string,
  data: {
    code: string
    name: string
    juz_number: number
    part: 'A' | 'B'
    start_page: number
    end_page: number
    is_active: boolean
  sort_order: number
  }
) {
  return updateJuzOptionImpl(id, data)
}

export async function getJuzOptionsAdmin() {
  return getJuzOptionsAdminImpl()
}

export async function getRegistrationQuestionsAdmin() {
  return getRegistrationQuestionsAdminImpl()
}

export async function updateRegistrationQuestion(
  id: string,
  data: {
    label: string
    description?: string | null
    warning_text?: string | null
    is_active: boolean
    is_required: boolean
    sort_order: number
    options?: any
    input_type?: string
  }
) {
  return updateRegistrationQuestionImpl(id, data)
}

export async function getReregistrationQuestionsAdmin() {
  return getReregistrationQuestionsAdminImpl()
}

export async function updateReregistrationQuestion(
  id: string,
  data: {
    label: string
    description?: string | null
    warning_text?: string | null
    is_active: boolean
    is_required: boolean
    sort_order: number
    options?: any
    input_type?: string
  }
) {
  return updateReregistrationQuestionImpl(id, data)
}

export async function getMuallimahRegistrationQuestionsAdmin() {
  return getMuallimahRegistrationQuestionsAdminImpl()
}

export async function updateMuallimahRegistrationQuestion(
  id: string,
  data: {
    label: string
    description?: string | null
    warning_text?: string | null
    is_active: boolean
    is_required: boolean
    sort_order: number
    options?: any
    input_type?: string
  }
) {
  return updateMuallimahRegistrationQuestionImpl(id, data)
}

export async function getPraTikrarRegistrationQuestionsAdmin() {
  return getPraTikrarRegistrationQuestionsAdminImpl()
}

export async function updatePraTikrarRegistrationQuestion(
  id: string,
  data: {
    label: string
    description?: string | null
    warning_text?: string | null
    is_active: boolean
    is_required: boolean
    sort_order: number
    options?: any
    input_type?: string
  }
) {
  return updatePraTikrarRegistrationQuestionImpl(id, data)
}

export async function getMusyrifahRegistrationQuestionsAdmin() {
  return getMusyrifahRegistrationQuestionsAdminImpl()
}

export async function updateMusyrifahRegistrationQuestion(
  id: string,
  data: {
    label: string
    description?: string | null
    warning_text?: string | null
    is_active: boolean
    is_required: boolean
    sort_order: number
    options?: any
    input_type?: string
  }
) {
  return updateMusyrifahRegistrationQuestionImpl(id, data)
}
