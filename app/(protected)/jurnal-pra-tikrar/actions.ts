'use server';

export type {
  PraTikrarEntryInput,
  PraTikrarStudentRecord,
  PraTikrarContextResponse,
  TashihPayload,
} from '@/lib/pra-tikrar';

import type {
  PraTikrarEntryInput,
  PraTikrarContextResponse,
  TashihPayload,
} from '@/lib/pra-tikrar';
import {
  getPraTikrarContextImpl,
  savePraTikrarDailyEntryImpl,
  submitTashihByMuallimahImpl,
  submitPresensiByMusyrifahImpl,
  submitBatchPresensiByMusyrifahImpl,
  type PresensiPayload,
} from '@/lib/pra-tikrar-service';

export type { PresensiPayload };

export async function getPraTikrarContext(): Promise<PraTikrarContextResponse> {
  return getPraTikrarContextImpl();
}

export async function savePraTikrarDailyEntry(input: PraTikrarEntryInput) {
  return savePraTikrarDailyEntryImpl(input);
}

export async function submitTashihByMuallimah(
  paramOrEntryId: string | TashihPayload,
  legacyData?: {
    catatan_muallimah?: string;
    status_bacaan?: string;
    evaluasi_tajwid?: any[];
    jenis_kelas?: string;
    jenis_kelas_custom?: string;
    asal_bimbingan?: string;
    kategori_kelas?: string;
  }
) {
  return submitTashihByMuallimahImpl(paramOrEntryId, legacyData);
}

export async function submitPresensiByMusyrifah(
  paramOrEntryId: string | PresensiPayload,
  legacyData?: {
    kehadiran_zoom?: string;
    catatan_musyrifah?: string;
  }
) {
  return submitPresensiByMusyrifahImpl(paramOrEntryId, legacyData);
}

export async function submitBatchPresensiByMusyrifah(
  items: Array<{ studentId: string; kehadiran_zoom: string; catatan_musyrifah?: string }>,
  halaqahId: string,
  batchId: string | null,
  tanggal: string
) {
  return submitBatchPresensiByMusyrifahImpl(items, halaqahId, batchId, tanggal);
}
