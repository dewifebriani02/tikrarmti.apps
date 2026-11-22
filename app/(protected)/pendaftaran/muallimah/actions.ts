'use server'

import { createClient } from '@/lib/supabase/server'
import {
  submitMuallimahRegistrationImpl,
  getMuallimahRegistrationQuestionsImpl,
} from '@/lib/pendaftaran/registration-service'

export async function submitMuallimahRegistration(
  formData: any,
  userData: any,
  user: any,
  batchId: string
) {
  return submitMuallimahRegistrationImpl(formData, userData, user, batchId)
}

export async function getMuallimahRegistration(userId: string, batchId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('muallimah_akads')
    .select('*, profile:muallimah_registrations(*)')
    .eq('user_id', userId)
    .eq('batch_id', batchId)
    .maybeSingle()

  if (error) return { success: false, error: error.message, data: null }
  return { success: true, data, error: null }
}

export async function getMuallimahRegistrationQuestions() {
  return getMuallimahRegistrationQuestionsImpl()
}
