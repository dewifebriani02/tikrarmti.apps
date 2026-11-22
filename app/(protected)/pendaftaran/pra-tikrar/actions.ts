'use server'

import { submitPraTikrarRegistrationImpl } from '@/lib/pendaftaran/registration-service'

export async function submitPraTikrarRegistration(
  formData: any,
  userProfile: any,
  user: any,
  batch: any,
  isEditMode: boolean,
  existingRegistrationId?: string
) {
  return submitPraTikrarRegistrationImpl(
    formData,
    userProfile,
    user,
    batch,
    isEditMode,
    existingRegistrationId
  )
}
