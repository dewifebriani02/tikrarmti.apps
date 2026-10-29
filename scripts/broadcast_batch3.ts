import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Safeguard API Keys
if (!process.env.WATZAP_API_KEY) process.env.WATZAP_API_KEY = 'TUEMR1E3NSJD2BDV';
if (!process.env.WATZAP_NUMBER_KEY) process.env.WATZAP_NUMBER_KEY = '4R49U9Cu5y5YWdLE';

import { query } from '../lib/db';
import { whatsappService } from '../lib/services/whatsapp';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const batchId = '2478b493-1b6b-412a-a05f-6193db815a43'; // Tikrar Tahfidz MTI Batch 3

  console.log(`=== MENGAMBIL DATA THALIBAH AKTIF BATCH 3 DARI VIEW v_active_thalibah ===`);
  
  // Mengambil data thalibah aktif langsung dari view v_active_thalibah (Single Source of Truth)
  const { rows: thalibahs } = await query(
    `SELECT user_id, full_name, nama_kunyah, whatsapp, confirmed_chosen_juz, halaqah_name
     FROM v_active_thalibah
     WHERE batch_id = $1 AND whatsapp IS NOT NULL AND TRIM(whatsapp) != ''
     ORDER BY full_name ASC`,
    [batchId]
  );

  console.log(`Data ditarik: ${thalibahs.length} Thalibah Aktif (100% verified, non-blacklist, approved).`);
  console.log(`Pengirim: Layanan Resmi WhatsApp Markaz Tikrar Indonesia (0813-3000-0784)`);
  
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log(`\n[DRY RUN MODE AKTIF] - Tidak ada pesan riil yang dikirim.`);
    thalibahs.slice(0, 5).forEach((t: any, idx: number) => {
      console.log(`  ${idx + 1}. ${t.full_name} (${t.whatsapp}) - Juz ${t.confirmed_chosen_juz || '-'}`);
    });
    console.log(`  ... total ${thalibahs.length} thalibah siap dibroadcast.`);
    process.exit(0);
  }

  const startTime = Date.now();
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < thalibahs.length; i++) {
    const t = thalibahs[i];
    const message = 
`Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. Ukhti *${t.full_name}*,

Semoga Ukhti senantiasa dalam limpahan taufik dan lindungan Allah Ta'ala.

Melalui pesan ini, kami menginformasikan bahwa *nomor resmi layanan notifikasi WhatsApp Markaz Tikrar Indonesia (MTI)* kini aktif melalui:

📱 *0813-3000-0784* (Nomor Resmi MTI)

Nomor ini akan digunakan untuk menyampaikan informasi penting kegiatan thalibah, antara lain:
1. Notifikasi dan tautan halaqah bimbingan.
2. Pengingat pengisian Jurnal Harian Tikrar.
3. Informasi pengumuman ujian, kelulusan, dan administrasi akademik MTI.

📌 *Mohon bantuannya untuk menyimpan (save) nomor ini di kontak handphone Ukhti* dengan nama:
*Markaz Tikrar Indonesia*
(Agar tautan dan notifikasi penting tidak tertandai sebagai spam dan dapat Ukhti terima dengan lancar).

*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*

Terima kasih atas perhatian dan kerja samanya. Semoga Allah memudahkan ikhtiar muroja'ah serta hafalan Al-Qur'an kita. Aamiin.

Jazakillahu khairan.
Wassalamu'alaikum Warahmatullahi Wabarakatuh.
━━━━━━━━━━━━━━
Tim Akademik & Administrasi Markaz Tikrar Indonesia
🌐 https://markaztikrar.id`;

    process.stdout.write(`[${i + 1}/${thalibahs.length}] Mengirim ke ${t.full_name} (${t.whatsapp})... `);
    try {
      const res = await whatsappService.sendTextMessage(t.whatsapp, message);
      if (res.success) {
        successCount++;
        console.log(`OK (Delivered)`);
        results.push({ ...t, success: true, messageId: res.messageId });
      } else {
        failCount++;
        console.log(`GAGAL: ${res.error || 'Unknown error'}`);
        results.push({ ...t, success: false, error: res.error });
      }
    } catch (err) {
      failCount++;
      console.log(`ERROR: ${(err as Error).message}`);
      results.push({ ...t, success: false, error: (err as Error).message });
    }

    // Simpan progres ke file JSON
    fs.writeFileSync('/tmp/batch3_broadcast_results.json', JSON.stringify({
      total: thalibahs.length,
      processed: i + 1,
      successCount,
      failCount,
      updatedAt: new Date().toISOString(),
      results
    }, null, 2));

    if (i < thalibahs.length - 1) {
      await sleep(2500); // Jeda aman 2.5 detik per pesan
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== BROADCAST SELESAI ===`);
  console.log(`Total: ${thalibahs.length} | Berhasil: ${successCount} | Gagal: ${failCount} | Waktu: ${durationSec} detik`);
}

main().catch(err => {
  console.error("Fatal broadcast error:", err);
  process.exit(1);
});
