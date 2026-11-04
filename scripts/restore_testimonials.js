const fs = require('fs');
const { Client } = require('/home/markaztikrar/htdocs/markaztikrar.id/node_modules/pg');

async function restoreAndClean() {
  const backup = JSON.parse(fs.readFileSync('/home/markaztikrar/htdocs/markaztikrar.id/backups/live_check2/json/testimonials.json'));
  const backupUserIds = new Set(backup.map(b => b.user_id));

  const client = new Client({ connectionString: 'postgresql://mti_user:kFrBgSUxMY1JFLIUkCfVfdlgaDGTQwaE@localhost:5432/mti_db' });
  await client.connect();

  try {
    await client.query('BEGIN');

    const keepSpecialIds = [
      'dee8cb41-dca9-49d1-bd91-a38b8445b3ee',
      '68525f51-6b32-4b52-9e39-526d4335f9c6',
      '40e6f7bd-51fe-46ef-b530-9fa2b54320f8',
      'fe293527-1400-44a1-a0f6-baf3b482e708',
      'c268b81a-b54d-426f-b1f5-f6eb622e2211',
      '7d014e16-1e50-4ce5-8cf7-2a989271a36d',
      'bcb2d453-dcd0-43f0-8149-85f133f97dc5'
    ];

    const backupUserIdsArray = Array.from(backupUserIds);

    const deleteRes = await client.query(
      'DELETE FROM testimonials WHERE NOT (user_id = ANY($1::uuid[])) AND NOT (id = ANY($2::uuid[])) RETURNING id',
      [backupUserIdsArray, keepSpecialIds]
    );
    console.log('Deleted spam rows:', deleteRes.rowCount);

    let restoredCount = 0;
    for (const item of backup) {
      const q = [
        'INSERT INTO testimonials (id, user_id, content, rating, is_approved, batch_name, program_name, created_at, updated_at)',
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        'ON CONFLICT (user_id) DO UPDATE SET',
        '  content = EXCLUDED.content,',
        '  rating = EXCLUDED.rating,',
        '  is_approved = EXCLUDED.is_approved,',
        '  batch_name = COALESCE(EXCLUDED.batch_name, testimonials.batch_name),',
        '  program_name = COALESCE(EXCLUDED.program_name, testimonials.program_name),',
        '  created_at = EXCLUDED.created_at,',
        '  updated_at = EXCLUDED.updated_at'
      ].join(' ');

      const batchName = item.batch_name || 'Tikrar Tahfidz MTI Batch 2';
      const programName = item.program_name || 'Tikrar Tahfidz';

      await client.query(q, [
        item.id,
        item.user_id,
        item.content,
        item.rating || 5,
        item.is_approved !== false,
        batchName,
        programName,
        item.created_at || new Date().toISOString(),
        item.updated_at || new Date().toISOString()
      ]);
      restoredCount++;
    }

    console.log('Successfully restored/updated backup testimonials:', restoredCount);

    await client.query('COMMIT');
    console.log('Transaction committed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during transaction, rolled back:', err);
    throw err;
  } finally {
    await client.end();
  }
}
restoreAndClean();
