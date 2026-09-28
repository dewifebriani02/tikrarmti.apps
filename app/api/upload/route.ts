import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi login tidak valid atau kadaluarsa. Silakan refresh halaman.' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // 1. Handle Base64 JSON Payload
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { base64, fileBase64, fileName, bucket = 'documents', subfolder = 'donations', customFileName } = body;
      const rawBase64 = base64 || fileBase64;

      if (!rawBase64) {
        return NextResponse.json({ error: 'Data berkas tidak ditemukan' }, { status: 400 });
      }

      // Strip data:image/...;base64, prefix if present
      const base64Data = rawBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const originalName = fileName || 'bukti_transfer.jpg';
      const fileExt = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
      const finalFileName = customFileName || `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const filePath = customFileName ? `${subfolder}/${customFileName}` : `${subfolder}/${finalFileName}`;

      const { publicUrl, localPath } = await saveUploadedFile(bucket, filePath, buffer);

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
    }

    // 2. Handle Multipart Form Data Payload
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'documents';
    const subfolder = (formData.get('subfolder') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada berkas yang dikirim' }, { status: 400 });
    }

    const customFileName = formData.get('customFileName') as string | null;
    const originalName = file.name || 'file';
    const fileExt = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
    const finalFileName = customFileName || `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = customFileName ? `${subfolder}/${customFileName}` : `${subfolder}/${finalFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { publicUrl, localPath } = await saveUploadedFile(bucket, filePath, Buffer.from(arrayBuffer));

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
  } catch (error: any) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan berkas' }, { status: 500 });
  }
}
