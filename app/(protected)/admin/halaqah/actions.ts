'use server'

import {
  HalaqahFilters,
  UpdateHalaqahData,
  AssignThalibahParams,
  AutoCreateSimpleParams,
  getHalaqahsImpl,
  updateHalaqahImpl,
  deleteHalaqahImpl,
  assignThalibahToHalaqahImpl,
  autoCreateSimpleHalaqahImpl,
  addThalibahToHalaqahImpl,
  getEligibleThalibahForHalaqahImpl,
  searchUsersForAsistenImpl,
  assignAsistenImpl,
  removeAsistenImpl,
} from '@/lib/admin/halaqah-service'

export async function getHalaqahs(filters?: HalaqahFilters) {
  return getHalaqahsImpl(filters)
}

export async function updateHalaqah(data: UpdateHalaqahData) {
  return updateHalaqahImpl(data)
}

export async function deleteHalaqah(halaqahId: string) {
  return deleteHalaqahImpl(halaqahId)
}

export async function assignThalibahToHalaqah(params: AssignThalibahParams) {
  return assignThalibahToHalaqahImpl(params)
}

export async function autoCreateSimpleHalaqah(params: AutoCreateSimpleParams) {
  return autoCreateSimpleHalaqahImpl(params)
}

export async function addThalibahToHalaqah(params: {
  halaqahId: string
  thalibahIds: string[]
  halaqahType: 'ujian' | 'tashih' | 'both'
}) {
  return addThalibahToHalaqahImpl(params)
}

export async function getEligibleThalibahForHalaqah(batchId?: string) {
  return getEligibleThalibahForHalaqahImpl(batchId)
}

export async function searchUsersForAsisten(searchQuery: string) {
  return searchUsersForAsistenImpl(searchQuery)
}

export async function assignAsisten(
  halaqahId: string,
  userId: string,
  asistenRole: 'roisah' | 'musyrifah'
) {
  return assignAsistenImpl(halaqahId, userId, asistenRole)
}

export async function removeAsisten(halaqahId: string, userId: string) {
  return removeAsistenImpl(halaqahId, userId)
}
