'use server'

import {
  JurnalFormData,
  saveJurnalRecordImpl,
  uploadJurnalScreenshotImpl,
} from '@/lib/jurnal/jurnal-service'

export type { JurnalFormData }

export async function saveJurnalRecord(data: JurnalFormData) {
  return saveJurnalRecordImpl(data)
}

export async function uploadJurnalScreenshot(formData: FormData) {
  return uploadJurnalScreenshotImpl(formData)
}
