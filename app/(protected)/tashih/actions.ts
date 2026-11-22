'use server'

import {
  TashihFormData,
  saveTashihRecordImpl,
  getJuzOptionImpl,
  getWeekTashihRecordsImpl,
  getPraTikrarHalaqahListImpl,
} from '@/lib/tashih/tashih-service'

export type { TashihFormData }

export async function saveTashihRecord(data: TashihFormData) {
  return saveTashihRecordImpl(data)
}

export async function getJuzOption(code: string) {
  return getJuzOptionImpl(code)
}

export async function getWeekTashihRecords(userId: string, batchId?: string | null) {
  return getWeekTashihRecordsImpl(userId, batchId)
}

export async function getPraTikrarHalaqahList(batchId?: string | null) {
  return getPraTikrarHalaqahListImpl(batchId)
}
