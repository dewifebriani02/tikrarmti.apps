'use server'

import {
  submitTikrarRegistrationImpl,
  getRegistrationQuestionsImpl,
} from '@/lib/pendaftaran/registration-service'

export async function submitTikrarRegistration(
  formData: any,
  userProfile: any,
  user: any,
  batch: any,
  isEditMode: boolean,
  existingRegistrationId?: string
) {
  return submitTikrarRegistrationImpl(
    formData,
    userProfile,
    user,
    batch,
    isEditMode,
    existingRegistrationId
  )
}

export async function getRegistrationQuestions() {
  return getRegistrationQuestionsImpl()
}
