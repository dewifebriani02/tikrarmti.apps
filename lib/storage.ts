import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, relative, resolve, sep } from 'path';

/**
 * Base directory for uploads. In Next.js, public/uploads is served statically.
 */
const UPLOAD_BASE_DIR = resolve(process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads'));
const APP_URL = (process.env.NODE_ENV === 'production' || !process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.includes('localhost'))
  ? 'https://markaztikrar.id'
  : process.env.NEXT_PUBLIC_APP_URL;

const SAFE_BUCKET_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Resolve <bucket>/<filePath> to an absolute path and make sure it stays inside
 * that bucket's directory. Throws on traversal attempts ("..", absolute paths,
 * NUL bytes) or an invalid bucket name.
 */
function resolveUploadPath(bucket: string, filePath: string): { cleanPath: string; fullPath: string } {
  if (!SAFE_BUCKET_RE.test(bucket)) {
    throw new Error(`Invalid storage bucket: ${bucket}`);
  }
  const trimmed = filePath.replace(/^\/+/, '');
  if (!trimmed || trimmed.includes('\0')) {
    throw new Error('Invalid storage path');
  }
  const bucketDir = join(UPLOAD_BASE_DIR, bucket);
  const fullPath = resolve(bucketDir, trimmed);
  if (!fullPath.startsWith(bucketDir + sep)) {
    throw new Error('Storage path escapes bucket directory');
  }
  const cleanPath = relative(bucketDir, fullPath).split(sep).join('/');
  return { cleanPath, fullPath };
}

/**
 * Save an uploaded file buffer to the local VPS storage (public/uploads/<bucket>/<filePath>)
 */
export async function saveUploadedFile(
  bucket: string,
  filePath: string,
  data: Buffer | ArrayBuffer | Uint8Array
): Promise<{ publicUrl: string; localPath: string }> {
  const { cleanPath, fullPath } = resolveUploadPath(bucket, filePath);

  const folder = dirname(fullPath);
  if (!existsSync(folder)) {
    await mkdir(folder, { recursive: true });
  }

  const buffer = Buffer.isBuffer(data)
    ? data
    : data instanceof ArrayBuffer
    ? Buffer.from(data)
    : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  await writeFile(fullPath, buffer);

  // Return relative path or public production URL
  const publicUrl = `/uploads/${bucket}/${cleanPath}`;

  return {
    publicUrl,
    localPath: fullPath,
  };
}

/**
 * Delete a file from local storage if it exists
 */
export async function deleteUploadedFile(bucket: string, filePath: string): Promise<boolean> {
  try {
    const { fullPath } = resolveUploadPath(bucket, filePath);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[Storage] Failed to delete file ${bucket}/${filePath}:`, err);
    return false;
  }
}

/**
 * Generate public URL for a given bucket and file path
 */
export function getStoragePublicUrl(bucket: string, filePath: string): string {
  const cleanPath = filePath.replace(/^\/+/, '');
  return `${APP_URL}/uploads/${bucket}/${cleanPath}`;
}
