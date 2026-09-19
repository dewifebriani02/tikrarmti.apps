import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Base directory for uploads. In Next.js, public/uploads is served statically.
 */
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://markaztikrar.id';

/**
 * Save an uploaded file buffer to the local VPS storage (public/uploads/<bucket>/<filePath>)
 */
export async function saveUploadedFile(
  bucket: string,
  filePath: string,
  data: Buffer | ArrayBuffer | Uint8Array
): Promise<{ publicUrl: string; localPath: string }> {
  // Normalize clean path
  const cleanPath = filePath.replace(/^\/+/, '');
  const targetDir = join(UPLOAD_BASE_DIR, bucket);
  const fullPath = join(targetDir, cleanPath);

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

  const publicUrl = `${APP_URL}/uploads/${bucket}/${cleanPath}`;

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
    const cleanPath = filePath.replace(/^\/+/, '');
    const fullPath = join(UPLOAD_BASE_DIR, bucket, cleanPath);
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
