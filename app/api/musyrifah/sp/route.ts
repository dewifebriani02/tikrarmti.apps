import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAnyRole, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';

// Validation schema for creating SP
const createSPSchema = z.object({
  user_id: z.string().uuid().optional(),
  thalibah_id: z.string().uuid().optional(),
  batch_id: z.string().uuid().optional().nullable(),
  week_number: z.number().int().min(1).max(30),
  sp_level: z.number().int().min(1).max(3).optional(),
  sp_type: z.string().nullable().optional(),
  reason: z.string().min(1),
  notes: z.string().optional(),
  status: z.string().optional().default('active'),
});

// Validation schema for updating SP
const updateSPSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'cancelled', 'resolved', 'appealed', 'expired']).optional(),
  notes: z.string().optional(),
  sp_type: z.string().nullable().optional(),
  udzur_type: z.string().nullable().optional(),
  udzur_notes: z.string().nullable().optional(),
  is_blacklisted: z.boolean().optional(),
});

// =====================================================
// GET - Fetch all SP records with rich metadata & stats
// =====================================================
export async function GET(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized('Unable to get authorization context');

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');
    const thalibahId = searchParams.get('thalibah_id') || searchParams.get('user_id');
    const spLevel = searchParams.get('sp_level');
    const weekNumber = searchParams.get('week_number') || searchParams.get('pekan');
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // Base query using direct PostgreSQL for speed and resilience
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      whereConditions.push(`sp.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (batchId && batchId !== 'all') {
      whereConditions.push(`sp.batch_id = $${paramIndex++}`);
      queryParams.push(batchId);
    }

    if (thalibahId) {
      whereConditions.push(`sp.thalibah_id = $${paramIndex++}`);
      queryParams.push(thalibahId);
    }

    if (spLevel && spLevel !== 'all') {
      whereConditions.push(`sp.sp_level = $${paramIndex++}`);
      queryParams.push(parseInt(spLevel, 10));
    }

    if (weekNumber && weekNumber !== 'all') {
      whereConditions.push(`sp.week_number = $${paramIndex++}`);
      queryParams.push(parseInt(weekNumber, 10));
    }

    if (search.trim()) {
      whereConditions.push(`(
        u.full_name ILIKE $${paramIndex} OR 
        u.nama_kunyah ILIKE $${paramIndex} OR 
        u.whatsapp ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM surat_peringatan sp
      LEFT JOIN users u ON u.id = sp.thalibah_id
      ${whereClause}
    `;
    const { rows: countRows } = await query(countQuery, queryParams);
    const totalCount = parseInt(countRows[0]?.total || '0', 10);

    // Data query
    const dataQuery = `
      SELECT 
        sp.id,
        sp.thalibah_id,
        sp.batch_id,
        sp.week_number,
        sp.sp_level,
        sp.sp_type,
        sp.reason,
        sp.udzur_type,
        sp.udzur_notes,
        sp.is_blacklisted,
        sp.status,
        sp.issued_at,
        sp.issued_by,
        sp.reviewed_at,
        sp.reviewed_by,
        sp.notes,
        sp.created_at,
        sp.updated_at,
        u.id as user_id,
        u.full_name,
        u.nama_kunyah,
        u.whatsapp,
        u.email,
        b.name as batch_name,
        admin_issued.full_name as issued_by_name,
        admin_reviewed.full_name as reviewed_by_name,
        du.confirmed_chosen_juz,
        h.name as halaqah_name
      FROM surat_peringatan sp
      LEFT JOIN users u ON u.id = sp.thalibah_id
      LEFT JOIN batches b ON b.id = sp.batch_id
      LEFT JOIN users admin_issued ON admin_issued.id = sp.issued_by
      LEFT JOIN users admin_reviewed ON admin_reviewed.id = sp.reviewed_by
      LEFT JOIN daftar_ulang du ON du.user_id = sp.thalibah_id AND (sp.batch_id IS NULL OR du.batch_id = sp.batch_id)
      LEFT JOIN halaqah h ON h.id = du.tashih_halaqah_id
      ${whereClause}
      ORDER BY sp.issued_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const { rows: spRecords } = await query(dataQuery, [...queryParams, limit, offset]);

    // Calculate aggregated stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_sp,
        COUNT(DISTINCT thalibah_id) as total_thalibah_sp,
        COUNT(*) FILTER (WHERE sp_level = 1) as count_sp1,
        COUNT(*) FILTER (WHERE sp_level = 2) as count_sp2,
        COUNT(*) FILTER (WHERE sp_level = 3) as count_sp3,
        COUNT(*) FILTER (WHERE sp_type LIKE '%do%' OR sp_type = 'temporary_do' OR sp_type = 'permanent_do') as count_do,
        COUNT(*) FILTER (WHERE is_blacklisted = true) as count_blacklist
      FROM surat_peringatan
      WHERE status = 'active'
    `;
    const { rows: statsRows } = await query(statsQuery);
    const statsData = statsRows[0] || {};

    const stats = {
      total_sp: parseInt(statsData.total_sp || '0', 10),
      total_thalibah_sp: parseInt(statsData.total_thalibah_sp || '0', 10),
      count_sp1: parseInt(statsData.count_sp1 || '0', 10),
      count_sp2: parseInt(statsData.count_sp2 || '0', 10),
      count_sp3: parseInt(statsData.count_sp3 || '0', 10),
      count_do: parseInt(statsData.count_do || '0', 10),
      count_blacklist: parseInt(statsData.count_blacklist || '0', 10),
    };

    return ApiResponses.success({
      entries: spRecords.map(r => ({
        id: r.id,
        thalibah_id: r.thalibah_id,
        batch_id: r.batch_id,
        batch_name: r.batch_name,
        week_number: r.week_number,
        sp_level: r.sp_level,
        sp_type: r.sp_type,
        reason: r.reason,
        udzur_type: r.udzur_type,
        udzur_notes: r.udzur_notes,
        is_blacklisted: r.is_blacklisted,
        status: r.status,
        issued_at: r.issued_at,
        issued_by_name: r.issued_by_name,
        reviewed_at: r.reviewed_at,
        reviewed_by_name: r.reviewed_by_name,
        notes: r.notes,
        user: {
          id: r.user_id,
          full_name: r.full_name,
          nama_kunyah: r.nama_kunyah,
          whatsapp: r.whatsapp,
          email: r.email,
        },
        confirmed_chosen_juz: r.confirmed_chosen_juz,
        halaqah_name: r.halaqah_name,
      })),
      stats,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      }
    });
  } catch (error) {
    console.error('[Musyrifah SP API] Unexpected error (GET):', error);
    return ApiResponses.handleUnknown(error);
  }
}

// =====================================================
// POST - Create a new SP record
// =====================================================
export async function POST(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    const body = await request.json();
    const validatedData = createSPSchema.parse(body);
    const targetUserId = validatedData.thalibah_id || validatedData.user_id;

    if (!targetUserId) {
      return ApiResponses.error('VALIDATION_ERROR', 'user_id or thalibah_id is required', {}, 400);
    }

    // Verify user exists
    const { rows: userRows } = await query(`SELECT id, full_name, is_blacklisted FROM users WHERE id = $1`, [targetUserId]);
    if (userRows.length === 0) {
      return ApiResponses.notFound('Thalibah not found');
    }

    // Resolve active batch if not supplied
    let batchId = validatedData.batch_id;
    if (!batchId) {
      const { rows: batchRows } = await query(`SELECT id FROM batches WHERE is_active = true LIMIT 1`);
      batchId = batchRows[0]?.id || null;
    }

    // Determine SP level if not explicitly provided
    let spLevel = validatedData.sp_level;
    if (!spLevel) {
      const { rows: existingSPRows } = await query(
        `SELECT sp_level FROM surat_peringatan 
         WHERE thalibah_id = $1 AND status = 'active' 
         ORDER BY sp_level DESC LIMIT 1`,
        [targetUserId]
      );
      const currentHighest = existingSPRows[0]?.sp_level || 0;
      spLevel = Math.min(currentHighest + 1, 3);
    }

    // Insert SP record
    const { rows: insertedRows } = await query(
      `INSERT INTO surat_peringatan (
        thalibah_id, batch_id, week_number, sp_level, sp_type, reason, notes, issued_by, status, issued_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [
        targetUserId,
        batchId,
        validatedData.week_number,
        spLevel,
        validatedData.sp_type || null,
        validatedData.reason,
        validatedData.notes || null,
        context.userId,
        validatedData.status || 'active'
      ]
    );

    const newSP = insertedRows[0];

    // If SP3 with DO or Blacklist, handle user flags if needed
    if (spLevel === 3) {
      if (validatedData.sp_type === 'permanent_do' || validatedData.sp_type === 'temporary_do') {
        // Can optionally log to sp_history
        await query(
          `INSERT INTO sp_history (
            thalibah_id, batch_id, final_action, total_sp_count, action_taken_by, notes
          ) VALUES ($1, $2, $3, 3, $4, $5)`,
          [targetUserId, batchId, validatedData.sp_type, context.userId, validatedData.notes || 'Diterbitkan via SP3']
        ).catch(() => {});
      }
    }

    revalidatePath('/panel-musyrifah');
    revalidatePath('/presensi-jurnal');

    return ApiResponses.success(newSP, `Surat Peringatan (SP ${spLevel}) berhasil diterbitkan`, 201);
  } catch (error) {
    console.error('[Musyrifah SP API] Unexpected error (POST):', error);
    return ApiResponses.handleUnknown(error);
  }
}

// =====================================================
// PUT - Update an existing SP record
// =====================================================
export async function PUT(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    const body = await request.json();
    const validatedData = updateSPSchema.parse(body);

    const { rows: existingRows } = await query(`SELECT * FROM surat_peringatan WHERE id = $1`, [validatedData.id]);
    if (existingRows.length === 0) {
      return ApiResponses.notFound('SP record not found');
    }

    const updates: string[] = ['reviewed_by = $2', 'reviewed_at = NOW()', 'updated_at = NOW()'];
    const values: any[] = [validatedData.id, context.userId];
    let valIdx = 3;

    if (validatedData.status !== undefined) {
      updates.push(`status = $${valIdx++}`);
      values.push(validatedData.status);
    }
    if (validatedData.notes !== undefined) {
      updates.push(`notes = $${valIdx++}`);
      values.push(validatedData.notes);
    }
    if (validatedData.sp_type !== undefined) {
      updates.push(`sp_type = $${valIdx++}`);
      values.push(validatedData.sp_type);
    }
    if (validatedData.udzur_type !== undefined) {
      updates.push(`udzur_type = $${valIdx++}`);
      values.push(validatedData.udzur_type);
    }
    if (validatedData.udzur_notes !== undefined) {
      updates.push(`udzur_notes = $${valIdx++}`);
      values.push(validatedData.udzur_notes);
    }
    if (validatedData.is_blacklisted !== undefined) {
      updates.push(`is_blacklisted = $${valIdx++}`);
      values.push(validatedData.is_blacklisted);
    }

    const updateQuery = `
      UPDATE surat_peringatan 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const { rows: updatedRows } = await query(updateQuery, values);

    revalidatePath('/panel-musyrifah');
    revalidatePath('/presensi-jurnal');

    return ApiResponses.success(updatedRows[0], 'SP berhasil diperbarui');
  } catch (error) {
    console.error('[Musyrifah SP API] Unexpected error (PUT):', error);
    return ApiResponses.handleUnknown(error);
  }
}

// =====================================================
// DELETE - Cancel or delete an SP record
// =====================================================
export async function DELETE(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiResponses.error('VALIDATION_ERROR', 'SP ID is required', {}, 400);
    }

    const { rows: existingRows } = await query(`SELECT id FROM surat_peringatan WHERE id = $1`, [id]);
    if (existingRows.length === 0) {
      return ApiResponses.notFound('SP record not found');
    }

    // Set status to cancelled
    await query(
      `UPDATE surat_peringatan 
       SET status = 'cancelled', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [id, context.userId]
    );

    revalidatePath('/panel-musyrifah');
    revalidatePath('/presensi-jurnal');

    return ApiResponses.success({ id }, 'SP berhasil dibatalkan');
  } catch (error) {
    console.error('[Musyrifah SP API] Unexpected error (DELETE):', error);
    return ApiResponses.handleUnknown(error);
  }
}
