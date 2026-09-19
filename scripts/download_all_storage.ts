import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
    }
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'] || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${serviceRoleKey}`,
  'apikey': serviceRoleKey,
  'Content-Type': 'application/json'
};

async function listBuckets() {
  const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to list buckets: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

async function listFilesInBucket(bucketName: string, prefix = ''): Promise<string[]> {
  let fileList: string[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/list/${bucketName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prefix,
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      })
    });

    if (!res.ok) {
      console.error(`Error listing ${bucketName}/${prefix}:`, res.status, await res.text());
      break;
    }

    const items = await res.json();
    if (!items || items.length === 0) {
      hasMore = false;
    } else {
      for (const item of items) {
        const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id === null || !item.metadata) {
          // Folder
          const subFiles = await listFilesInBucket(bucketName, itemPath);
          fileList = fileList.concat(subFiles);
        } else {
          fileList.push(itemPath);
        }
      }
      if (items.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }
  }

  return fileList;
}

async function downloadFile(bucketName: string, filePath: string, destPath: string) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
    return; // Skip already downloaded
  }

  const destFolder = path.dirname(destPath);
  if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder, { recursive: true });
  }

  const url = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    // Try public url
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
    const pubRes = await fetch(publicUrl);
    if (!pubRes.ok) {
      throw new Error(`Download failed (${res.status} / ${pubRes.status})`);
    }
    const arrayBuffer = await pubRes.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    return;
  }
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

// Concurrent queue runner
async function runConcurrent<T>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<void>) {
  let index = 0;
  const workers = new Array(concurrency).fill(null).map(async () => {
    while (index < items.length) {
      const currentIndex = index++;
      await fn(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
}

async function main() {
  console.log('====================================================');
  console.log('⚡ CONCURRENT DOWNLOAD OF SUPABASE STORAGE TO LOCAL');
  console.log('====================================================\n');

  const baseUploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(baseUploadsDir)) {
    fs.mkdirSync(baseUploadsDir, { recursive: true });
  }

  const buckets = await listBuckets();
  console.log(`Found ${buckets.length} buckets:`, buckets.map((b: any) => b.name));

  let totalDownloaded = 0;
  let totalErrors = 0;

  for (const b of buckets) {
    const bucketName = b.name;
    const bucketDir = path.join(baseUploadsDir, bucketName);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }

    console.log(`\nScanning bucket: ${bucketName}...`);
    const files = await listFilesInBucket(bucketName);
    console.log(`Found ${files.length} files in bucket '${bucketName}'. Downloading with concurrency 12...`);

    let done = 0;
    await runConcurrent(files, 12, async (filePath, _idx) => {
      const destPath = path.join(bucketDir, filePath);
      try {
        await downloadFile(bucketName, filePath, destPath);
        done++;
        totalDownloaded++;
        if (done % 25 === 0 || done === files.length) {
          console.log(`  [${bucketName}] Progress: ${done}/${files.length} downloaded`);
        }
      } catch (e: any) {
        totalErrors++;
        console.error(`  ❌ Failed '${filePath}':`, e.message);
      }
    });
  }

  console.log('\n====================================================');
  console.log(`✅ DOWNLOAD COMPLETE: ${totalDownloaded} files verified, ${totalErrors} errors.`);
  console.log(`📁 Files saved in: ${baseUploadsDir}`);
  console.log('====================================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
