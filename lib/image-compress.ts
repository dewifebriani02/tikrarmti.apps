/**
 * Utility to compress image files in the browser using HTML5 Canvas
 * Dramatically reduces upload payload from 5-15MB phone camera shots down to ~150-300KB
 * Prevents mobile 'Failed to fetch' network timeouts and proxy payload limits.
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  // If not an image (e.g. PDF), return unchanged
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // If already small (< 300KB), return unchanged
  if (file.size < 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let width = img.width;
        let height = img.height;

        // Calculate scaled dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file); // Fallback
      };

      img.src = objectUrl;
    } catch (err) {
      console.warn('[Image Compress] Canvas error, using original file:', err);
      resolve(file);
    }
  });
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Uploads a file with automatic compression and fallback to Base64 JSON if FormData fails
 */
export async function uploadFileWithFallback(
  rawFile: File,
  options: {
    bucket?: string;
    subfolder?: string;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<{ url: string; publicUrl: string }> {
  const bucket = options.bucket || 'documents';
  const subfolder = options.subfolder || 'donations';

  // 1. Compress if image
  let fileToUpload = rawFile;
  try {
    fileToUpload = await compressImage(
      rawFile,
      options.maxWidth || 1200,
      options.maxHeight || 1200,
      options.quality || 0.8
    );
  } catch (compErr) {
    console.warn('[Upload] Image compression skipped:', compErr);
  }

  // 2. Try Standard FormData upload first
  try {
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('bucket', bucket);
    formData.append('subfolder', subfolder);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const json = await res.json();
      const url = json.data?.publicUrl || json.data?.url;
      if (url) {
        return { url, publicUrl: url };
      }
    }
  } catch (formErr) {
    console.warn('[Upload] FormData upload failed, attempting Base64 fallback:', formErr);
  }

  // 3. Fallback: Base64 JSON upload (handles strict mobile webviews / proxy issues)
  const base64Data = await fileToBase64(fileToUpload);
  const jsonRes = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64: base64Data,
      fileName: fileToUpload.name || 'upload.jpg',
      bucket,
      subfolder,
    }),
  });

  if (!jsonRes.ok) {
    const errJson = await jsonRes.json().catch(() => ({}));
    throw new Error(errJson.error || 'Gagal mengunggah file.');
  }

  const result = await jsonRes.json();
  const url = result.data?.publicUrl || result.data?.url;
  if (!url) {
    throw new Error('Gagal mendapatkan URL file setelah unggah.');
  }

  return { url, publicUrl: url };
}
