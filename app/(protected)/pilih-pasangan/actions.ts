'use server'

import {
  PilihPasanganFormData,
  submitPilihPasanganImpl,
} from '@/lib/pilih-pasangan/pilih-pasangan-service'

export type { PilihPasanganFormData }

export async function submitPilihPasangan(
  registrationId: string,
  data: PilihPasanganFormData
) {
  return submitPilihPasanganImpl(registrationId, data)
}
