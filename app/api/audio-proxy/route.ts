import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const audioUrl = searchParams.get('url');

    if (!audioUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markaztikrar.id';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmbvklixthlqtkkgqnjl.supabase.co';

    // Allow local domain, relative paths, or legacy supabase url
    const isAllowedOrigin =
      audioUrl.startsWith('/') ||
      audioUrl.startsWith('https://markaztikrar.id') ||
      audioUrl.startsWith('http://localhost') ||
      audioUrl.startsWith(appUrl) ||
      audioUrl.startsWith(supabaseUrl);

    if (!isAllowedOrigin) {
      return new Response('Unauthorized audio origin', { status: 403 });
    }

    // If it's a local /uploads/ URL, try reading directly from local filesystem first
    if (audioUrl.includes('/uploads/')) {
      const relativePart = audioUrl.split('/uploads/')[1];
      const localFilePath = join(process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads'), relativePart);
      if (existsSync(localFilePath)) {
        const fileBuffer = await readFile(localFilePath);
        const ext = relativePart.split('.').pop()?.toLowerCase();
        const contentType = ext === 'mp3' ? 'audio/mpeg' : ext === 'ogg' ? 'audio/ogg' : ext === 'wav' ? 'audio/wav' : 'audio/webm';
        return new Response(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // Otherwise fetch via HTTP
    const targetUrl = audioUrl.startsWith('/') ? `${appUrl}${audioUrl}` : audioUrl;
    const response = await fetch(targetUrl);
    if (!response.ok) {
      return new Response(`Failed to fetch audio: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'audio/webm';
    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Audio proxy error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
