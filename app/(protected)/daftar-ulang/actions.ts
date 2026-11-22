'use server'

import {
  DaftarUlangFormData,
  saveDaftarUlangDraftImpl,
  submitDaftarUlangImpl,
  uploadAkadImpl,
  updateAkadFilesImpl,
  approveDaftarUlangSubmissionImpl,
  getReregistrationQuestionsImpl,
  resetAkadThalibahImpl,
} from '@/lib/daftar-ulang/daftar-ulang-service'

export type { DaftarUlangFormData }

export async function saveDaftarUlangDraft(
  registrationId: string,
  data: Partial<DaftarUlangFormData>
) {
  return saveDaftarUlangDraftImpl(registrationId, data)
}

export async function submitDaftarUlang(
  registrationId: string,
  data: DaftarUlangFormData
) {
  return submitDaftarUlangImpl(registrationId, data)
}

export async function uploadAkad(formData: FormData) {
  return uploadAkadImpl(formData)
}

export async function updateAkadFiles(
  registrationId: string,
  akadFiles: Array<{ url: string; name: string }>
) {
  return updateAkadFilesImpl(registrationId, akadFiles)
}

export async function approveDaftarUlangSubmission(submissionId: string) {
  return approveDaftarUlangSubmissionImpl(submissionId)
}

export async function getReregistrationQuestions() {
  return getReregistrationQuestionsImpl()
}

export async function resetAkadThalibah(submissionId: string) {
  return resetAkadThalibahImpl(submissionId)
}
