import { readFile, stat } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { getCurrentUser } from '@/lib/auth';

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads'));
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

const AUDIO_CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
};

const PRODUCTION_HOST = 'markaztikrar.id';

function getAllowedHosts(appUrl: string): Set<string> {
  const hosts = new Set<string>([PRODUCTION_HOST]);
  try {
    hosts.add(new URL(appUrl).host);
  } catch {
    // ignore malformed NEXT_PUBLIC_APP_URL
  }
  if (process.env.NODE_ENV !== 'production') {
    hosts.add('localhost:3000');
    hosts.add('localhost');
  }
  return hosts;
}

function audioResponse(body: BodyInit, contentType: string) {
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}

/**
 * GET /api/audio-proxy?url=<audio url>
 * Serves recorded audio from our own /uploads/ directory (same-origin, avoids CORS).
 * Only /uploads/ audio files on our own host are allowed — no arbitrary fetching.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const audioUrl = searchParams.get('url');

    if (!audioUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${PRODUCTION_HOST}`;

    let target: URL;
    try {
      target = new URL(audioUrl, appUrl);
    } catch {
      return new Response('Invalid url', { status: 400 });
    }

    const isAllowedOrigin =
      (target.protocol === 'https:' || target.protocol === 'http:') &&
      !target.username &&
      !target.password &&
      getAllowedHosts(appUrl).has(target.host);

    if (!isAllowedOrigin || !target.pathname.startsWith('/uploads/')) {
      return new Response('Unauthorized audio origin', { status: 403 });
    }

    let relativePart: string;
    try {
      relativePart = decodeURIComponent(target.pathname.slice('/uploads/'.length));
    } catch {
      return new Response('Invalid url', { status: 400 });
    }

    const ext = relativePart.split('.').pop()?.toLowerCase() || '';
    const contentType = AUDIO_CONTENT_TYPES[ext];
    if (!contentType) {
      return new Response('Unsupported audio type', { status: 415 });
    }

    // Resolve and make sure the file stays inside the uploads directory
    const localFilePath = resolve(UPLOAD_DIR, relativePart);
    if (!localFilePath.startsWith(UPLOAD_DIR + sep)) {
      return new Response('Forbidden', { status: 403 });
    }

    const fileStat = await stat(localFilePath).catch(() => null);
    if (fileStat?.isFile()) {
      if (fileStat.size > MAX_AUDIO_BYTES) {
        return new Response('Audio file too large', { status: 413 });
      }
      return audioResponse(new Uint8Array(await readFile(localFilePath)), contentType);
    }

    // Not on this server's disk (e.g. local dev) — fetch the same file from the allowed host
    const response = await fetch(target.toString(), { redirect: 'error' });
    if (!response.ok) {
      return new Response('Failed to fetch audio', { status: response.status === 404 ? 404 : 502 });
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_AUDIO_BYTES) {
      return new Response('Audio file too large', { status: 413 });
    }

    const audioBuffer = await response.arrayBuffer();
    if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
      return new Response('Audio file too large', { status: 413 });
    }

    return audioResponse(audioBuffer, contentType);
  } catch (error) {
    console.error('Audio proxy error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
