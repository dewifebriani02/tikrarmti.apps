/**
 * Reconcile Backup vs Hostinger
 * ─────────────────────────────────────────────────────────────────────────────
 * Bandingkan snapshot JSON hasil `scripts/backup-full-database.ts` (Supabase
 * lama) dengan state DB Hostinger sekarang.
 *
 * Untuk tiap tabel:
 *   1. Hitung jumlah row di backup vs DB
 *   2. Identifikasi row yang ADA di backup tapi TIDAK ADA di DB (missing)
 *   3. Untuk tabel kritis, generate `INSERT ... ON CONFLICT DO NOTHING`
 *
 * USAGE (jalankan di VPS atau via SSH tunnel):
 *   BACKUP_DIR=./backups/backup_2026-09-18T12-48-01-132Z \
 *   npx tsx scripts/reconcile-backup-vs-hostinger.ts
 *
 * Opsional:
 *   REPORT_ONLY=true   → cuma laporan, tidak generate SQL recovery
 *   TABLES=jurnal_records,tashih_records → subset tabel
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load env sebelum import db module supaya pool pick up connection info
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { query } from '../lib/db'

const BACKUP_DIR = process.env.BACKUP_DIR
if (!BACKUP_DIR) {
  console.error('❌ Set BACKUP_DIR ke folder backup (yang berisi json/ dan sql/)')
  process.exit(1)
}

const JSON_DIR = path.join(BACKUP_DIR, 'json')
if (!fs.existsSync(JSON_DIR)) {
  console.error(`❌ Folder ${JSON_DIR} tidak ditemukan`)
  process.exit(1)
}

const REPORT_ONLY = process.env.REPORT_ONLY === 'true'
const TABLE_FILTER = process.env.TABLES ? process.env.TABLES.split(',').map(t => t.trim()) : null

// Tabel yang punya unique key jelas → bisa di-reconcile per row
const RECONCILABLE: Record<string, { keyCols: string[]; skipCols?: string[] }> = {
  users: { keyCols: ['id'] },
  batches: { keyCols: ['id'] },
  programs: { keyCols: ['id'] },
  halaqah: { keyCols: ['id'] },
  halaqah_mentors: { keyCols: ['id'] },
  halaqah_students: { keyCols: ['id'] },
  pendaftaran_tikrar_tahfidz: { keyCols: ['id'] },
  daftar_ulang_submissions: { keyCols: ['id'] },
  jurnal_records: { keyCols: ['id'] },
  tashih_records: { keyCols: ['id'] },
  tashih_blocks: { keyCols: ['id'] },
  exam_attempts: { keyCols: ['id'] },
  exam_questions: { keyCols: ['id'] },
  study_partners: { keyCols: ['id'] },
  surat_peringatan: { keyCols: ['id'] },
  muallimah_registrations: { keyCols: ['id'] },
  musyrifah_registrations: { keyCols: ['id'] },
  muallimah_akads: { keyCols: ['id'] },
  muallimah_schedules: { keyCols: ['id'] },
  akad_quiz_questions: { keyCols: ['id'] },
  akad_quiz_attempts: { keyCols: ['id'] },
  final_exam_schedules: { keyCols: ['id'] },
  final_exam_registrations: { keyCols: ['id'] },
  final_exam_questions: { keyCols: ['id'] },
  juz_options: { keyCols: ['id'] },
  faqs: { keyCols: ['id'] },
  registration_questions: { keyCols: ['id'] },
  reregistration_questions: { keyCols: ['id'] },
  muallimah_registration_questions: { keyCols: ['id'] },
  transfer_schedule_requests: { keyCols: ['id'] },
  sp_history: { keyCols: ['id'] },
  audit_logs: { keyCols: ['id'] },
  activity_logs: { keyCols: ['id'] },
  system_logs: { keyCols: ['id'] },
}

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') return String(val)
  if (val instanceof Date) return `'${val.toISOString()}'`
  if (Array.isArray(val)) {
    if (val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
      return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
    }
    const esc = val.map(item => {
      if (item === null || item === undefined) return 'NULL'
      if (typeof item === 'object') return `"${JSON.stringify(item).replace(/"/g, '\\"')}"`
      return `"${String(item).replace(/"/g, '\\"')}"`
    })
    return `ARRAY[${esc.map(e => e === 'NULL' ? 'NULL' : `'${e.slice(1, -1).replace(/'/g, "''")}'`).join(', ')}]`
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
  }
  return `'${String(val).replace(/'/g, "''")}'`
}

interface TableReport {
  table: string
  backupCount: number
  dbCount: number
  missingCount: number
  missingIds: string[]
  status: 'ok' | 'missing' | 'extra' | 'skip'
  note?: string
}

async function reconcileTable(table: string): Promise<TableReport> {
  const jsonFile = path.join(JSON_DIR, `${table}.json`)
  if (!fs.existsSync(jsonFile)) {
    return { table, backupCount: 0, dbCount: 0, missingCount: 0, missingIds: [], status: 'skip', note: 'no backup file' }
  }

  const backupRows: any[] = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
  const backupCount = backupRows.length

  let dbCount = 0
  try {
    const { rows } = await query(`SELECT COUNT(*)::int AS cnt FROM ${table}`)
    dbCount = rows[0]?.cnt || 0
  } catch (err: any) {
    return { table, backupCount, dbCount: 0, missingCount: 0, missingIds: [], status: 'skip', note: `table not queryable: ${err.message}` }
  }

  const cfg = RECONCILABLE[table]
  if (!cfg || backupCount === 0) {
    return {
      table,
      backupCount,
      dbCount,
      missingCount: 0,
      missingIds: [],
      status: backupCount === dbCount ? 'ok' : (dbCount < backupCount ? 'missing' : 'extra'),
    }
  }

  // Reconcile by id
  const idCol = cfg.keyCols[0]
  const backupIds = backupRows.map(r => r[idCol]).filter(Boolean)

  const missingIds: string[] = []
  const CHUNK = 500
  for (let i = 0; i < backupIds.length; i += CHUNK) {
    const chunk = backupIds.slice(i, i + CHUNK)
    const { rows: existing } = await query(
      `SELECT ${idCol} FROM ${table} WHERE ${idCol} = ANY($1)`,
      [chunk]
    )
    const existingSet = new Set(existing.map((r: any) => r[idCol]))
    for (const id of chunk) if (!existingSet.has(id)) missingIds.push(id)
  }

  return {
    table,
    backupCount,
    dbCount,
    missingCount: missingIds.length,
    missingIds,
    status: missingIds.length === 0 ? (dbCount > backupCount ? 'extra' : 'ok') : 'missing',
  }
}

function generateRecoverySql(table: string, missingIds: string[]): string {
  const jsonFile = path.join(JSON_DIR, `${table}.json`)
  const backupRows: any[] = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
  const idCol = RECONCILABLE[table]?.keyCols[0] || 'id'
  const missingSet = new Set(missingIds)
  const rowsToInsert = backupRows.filter(r => missingSet.has(r[idCol]))
  if (rowsToInsert.length === 0) return ''

  const cols = Object.keys(rowsToInsert[0])
  let sql = `-- Recovery INSERTs untuk ${table} (${rowsToInsert.length} row missing)\n`
  sql += `-- Review dulu sebelum jalankan!\n`
  for (const row of rowsToInsert) {
    const values = cols.map(c => escapeSqlValue(row[c]))
    sql += `INSERT INTO public.${table} ("${cols.join('", "')}") VALUES (${values.join(', ')}) ON CONFLICT (${idCol}) DO NOTHING;\n`
  }
  return sql + '\n'
}

async function main() {
  console.log('═'.repeat(70))
  console.log(`📊 RECONCILIATION REPORT`)
  console.log(`Backup: ${BACKUP_DIR}`)
  console.log(`Target: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`)
  console.log('═'.repeat(70))

  const allTables = Object.keys(RECONCILABLE)
  const tables = TABLE_FILTER ? allTables.filter(t => TABLE_FILTER.includes(t)) : allTables

  const reports: TableReport[] = []
  for (const table of tables) {
    process.stdout.write(`⏳ ${table}...`)
    try {
      const rep = await reconcileTable(table)
      reports.push(rep)
      const icon = rep.status === 'ok' ? '✅' : rep.status === 'missing' ? '⚠️ ' : rep.status === 'extra' ? '➕' : '⏭️ '
      process.stdout.write(` ${icon} backup=${rep.backupCount} db=${rep.dbCount} missing=${rep.missingCount}${rep.note ? ' (' + rep.note + ')' : ''}\n`)
    } catch (err: any) {
      process.stdout.write(` ❌ ${err.message}\n`)
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70))
  console.log('SUMMARY')
  console.log('═'.repeat(70))
  const totalMissing = reports.reduce((s, r) => s + r.missingCount, 0)
  const problemTables = reports.filter(r => r.status === 'missing')

  console.log(`Total tabel dicek       : ${reports.length}`)
  console.log(`Tabel dengan data missing: ${problemTables.length}`)
  console.log(`Total row missing        : ${totalMissing}`)
  if (problemTables.length > 0) {
    console.log('\nTabel yang perlu di-recover:')
    for (const r of problemTables) {
      console.log(`  - ${r.table}: ${r.missingCount} row missing (backup=${r.backupCount}, db=${r.dbCount})`)
    }
  }

  // Generate recovery SQL
  if (!REPORT_ONLY && problemTables.length > 0) {
    const outDir = path.join(BACKUP_DIR, 'recovery')
    fs.mkdirSync(outDir, { recursive: true })
    let combinedSql = `-- Recovery SQL — generated ${new Date().toISOString()}\n\n`
    for (const r of problemTables) {
      const sql = generateRecoverySql(r.table, r.missingIds)
      if (sql) {
        fs.writeFileSync(path.join(outDir, `${r.table}.sql`), sql)
        combinedSql += sql
      }
    }
    fs.writeFileSync(path.join(outDir, 'ALL_recovery.sql'), combinedSql)
    console.log(`\n💾 Recovery SQL disimpan ke: ${outDir}`)
    console.log(`   Review dulu sebelum apply. Untuk apply:`)
    console.log(`   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "${path.join(outDir, 'ALL_recovery.sql')}"`)
  }

  // Report file
  const reportPath = path.join(BACKUP_DIR, `reconcile_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2))
  console.log(`\n📄 Report JSON: ${reportPath}`)

  if (totalMissing === 0) {
    console.log('\n🎉 SEMUA DATA DI BACKUP SUDAH ADA DI DB HOSTINGER. Aman untuk hapus Supabase.')
  } else {
    console.log('\n⛔ MASIH ADA DATA HILANG. Jangan hapus Supabase sampai recovery selesai.')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
