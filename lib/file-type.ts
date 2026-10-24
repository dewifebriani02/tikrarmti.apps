/**
 * File type detection from magic bytes — never trust the client's file name or MIME type.
 * The returned extension is safe to use for the stored file name.
 */

export type FileKind = 'image' | 'pdf' | 'audio';

export interface DetectedFileType {
  kind: FileKind;
  ext: string;
}

/** Detect the real file type from its magic bytes and return a safe extension. */
export function sniffFileType(buf: Buffer): DetectedFileType | null {
  if (buf.length < 12) return null;
  const ascii = (start: number, end: number) => buf.subarray(start, end).toString('latin1');

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: 'image', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { kind: 'image', ext: 'png' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { kind: 'image', ext: 'webp' };
  if (ascii(0, 5) === '%PDF-') return { kind: 'pdf', ext: 'pdf' };

  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { kind: 'audio', ext: 'webm' };
  if (ascii(0, 4) === 'OggS') return { kind: 'audio', ext: 'ogg' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return { kind: 'audio', ext: 'wav' };
  if (ascii(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return { kind: 'audio', ext: 'mp3' };
  if (ascii(4, 8) === 'ftyp') {
    // ISO-BMFF container: HEIC photos (iPhone) vs. MP4/M4A audio recordings
    const brand = ascii(8, 12);
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return { kind: 'image', ext: 'heic' };
    return { kind: 'audio', ext: 'mp4' };
  }

  return null;
}
