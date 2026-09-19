import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'documents';
    const subfolder = (formData.get('subfolder') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
  }
}
