import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface AkadFileItem {
  url: string;
  name: string;
}

export function parseAkadFiles(akadFiles: any): AkadFileItem[] {
  if (!akadFiles) return [];

  if (Array.isArray(akadFiles)) {
    return akadFiles.map((file, idx) => {
      if (typeof file === 'string') {
        try {
          const parsed = JSON.parse(file);
          if (typeof parsed === 'object' && parsed !== null) {
            return {
              url: parsed.url || file,
              name: parsed.name || `Berkas ${idx + 1}`
            };
          }
        } catch {
          return {
            url: file,
            name: `Berkas ${idx + 1}`
          };
        }
      }
      return {
        url: file?.url || '',
        name: file?.name || `Berkas ${idx + 1}`
      };
    }).filter(f => Boolean(f.url));
  }

  if (typeof akadFiles === 'string') {
    try {
      const parsed = JSON.parse(akadFiles);
      if (Array.isArray(parsed)) {
        return parseAkadFiles(parsed);
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return [{
          url: parsed.url || akadFiles,
          name: parsed.name || 'Berkas Akad'
        }];
      }
    } catch {
      if (akadFiles.startsWith('{') && akadFiles.endsWith('}')) {
        const cleaned = akadFiles.slice(1, -1);
        const matches = cleaned.match(/\{[^{}]+\}/g);
        if (matches) {
          return matches.map((m, idx) => {
            try {
              const unescaped = m.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
              const obj = JSON.parse(unescaped);
              return {
                url: obj.url || '',
                name: obj.name || `Berkas ${idx + 1}`
              };
            } catch {
              return null;
            }
          }).filter(Boolean) as AkadFileItem[];
        }
      }
      if (akadFiles.startsWith('http')) {
        return [{ url: akadFiles, name: 'Berkas Akad' }];
      }
      return [];
    }
  }

  if (typeof akadFiles === 'object' && akadFiles !== null) {
    return [{
      url: akadFiles.url || '',
      name: akadFiles.name || 'Berkas Akad'
    }].filter(f => Boolean(f.url));
  }

  return [];
}