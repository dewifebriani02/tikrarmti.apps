import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/storage';
import { sniffFileType, type FileKind } from '@/lib/file-type';

/**
 * Allowed destinations. Clients may only pick a bucket/subfolder from this list;
 * the file name and extension are always generated server-side.
 */
const UPLOAD_TARGETS: Record<string, { subfolders: string[]; kinds: FileKind[]; maxBytes: number }> = {
  documents: { subfolders: ['donations', 'general'], kinds: ['image', 'pdf'], maxBytes: 10 * 1024 * 1024 },
  'selection-audios': { subfolders: ['feedback'], kinds: ['audio'], maxBytes: 25 * 1024 * 1024 },
};

const DEFAULT_SUBFOLDER: Record<string, string> = {
  documents: 'general',
  'selection-audios': 'feedback',
};

function badRequest(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi login tidak valid atau kadaluarsa. Silakan refresh halaman.' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let bucket: string;
    let requestedSubfolder: string | null;
    let originalName: string;
    let buffer: Buffer;

    if (contentType.includes('application/json')) {
      // 1. Base64 JSON payload
      const body = await request.json();
      const rawBase64: unknown = body.base64 || body.fileBase64;
      bucket = typeof body.bucket === 'string' ? body.bucket : 'documents';
      requestedSubfolder = typeof body.subfolder === 'string' ? body.subfolder : 'donations';
      originalName = typeof body.fileName === 'string' ? body.fileName : 'bukti_transfer';

      if (typeof rawBase64 !== 'string' || !rawBase64) {
        return badRequest('Data berkas tidak ditemukan');
      }

      const target = UPLOAD_TARGETS[bucket];
      if (!target) return badRequest('Tujuan unggah tidak diizinkan', 403);

      // Strip data:...;base64, prefix and reject oversize payloads before decoding
      const base64Data = rawBase64.replace(/^data:[^;]+;base64,/, '');
      if (Math.floor(base64Data.length * 3 / 4) > target.maxBytes) {
        return badRequest('Ukuran berkas melebihi batas', 413);
      }
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      // 2. Multipart form data payload
      const formData = await request.formData();
      const file = formData.get('file');
      bucket = (formData.get('bucket') as string) || 'documents';
      requestedSubfolder = formData.get('subfolder') as string | null;

      if (!file || typeof file === 'string') {
        return badRequest('Tidak ada berkas yang dikirim');
      }

      const target = UPLOAD_TARGETS[bucket];
      if (!target) return badRequest('Tujuan unggah tidak diizinkan', 403);
      if (file.size > target.maxBytes) {
        return badRequest('Ukuran berkas melebihi batas', 413);
      }

      originalName = file.name || 'file';
      buffer = Buffer.from(await file.arrayBuffer());
    }

    const target = UPLOAD_TARGETS[bucket];
    const subfolder = requestedSubfolder || DEFAULT_SUBFOLDER[bucket];
    if (!target.subfolders.includes(subfolder)) {
      return badRequest('Tujuan unggah tidak diizinkan', 403);
    }
    if (buffer.length === 0) {
      return badRequest('Berkas kosong');
    }
    if (buffer.length > target.maxBytes) {
      return badRequest('Ukuran berkas melebihi batas', 413);
    }

    const detected = sniffFileType(buffer);
    if (!detected || !target.kinds.includes(detected.kind)) {
      return badRequest('Jenis berkas tidak didukung', 415);
    }

    // Name and extension are generated here — client-supplied names/paths are ignored
    const fileName = `${Date.now()}_${randomBytes(6).toString('hex')}.${detected.ext}`;
    const filePath = `${subfolder}/${user.id}/${fileName}`;
    const { publicUrl } = await saveUploadedFile(bucket, filePath, buffer);

    return NextResponse.json({
      success: true,
      publicUrl,
      url: publicUrl,
      data: {
        publicUrl,
        url: publicUrl,
        filePath,
        fileName: originalName,
      },
    });
  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan berkas' }, { status: 500 });
  }
}
