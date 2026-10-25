import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';

// Load pdfjs-dist legacy build for Node.js server environment
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

export interface QrStampPosition {
  preset: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'custom';
  customX?: number; // In points from left
  customY?: number; // In points from bottom
  size?: number; // Size in points (default: 72 = 1 inch)
  margin?: number; // Margin from page edge in points (default: 36 = 0.5 inch)
}

export interface StudentCandidate {
  id: string;
  full_name: string;
  student_id_number?: string | null;
  email: string;
  current_juz?: number | string | null;
}

export interface ExtractedPageResult {
  pageNumber: number;
  extractedText: string;
  matchedStudent: StudentCandidate | null;
  confidence: number; // 0 - 1
  detectedJuz: string | null;
}

/**
 * Extracts plain text from each page of a PDF document
 */
export async function extractPagesFromPdf(pdfBuffer: Buffer): Promise<{ pageNumber: number; text: string }[]> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: true,
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const pages: { pageNumber: number; text: string }[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => item.str || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pages.push({ pageNumber: i, text });
    } catch (err) {
      console.error(`[PDF-Stamper] Failed to extract page ${i}:`, err);
      pages.push({ pageNumber: i, text: '' });
    }
  }

  return pages;
}

/**
 * Smart matcher: Matches extracted text or filename against student database records
 */
export function matchStudentToText(
  text: string,
  filename: string,
  students: StudentCandidate[]
): { matchedStudent: StudentCandidate | null; confidence: number; detectedJuz: string | null } {
  const lowerText = (text + ' ' + filename).toLowerCase();

  // 1. Detect Juz (e.g. "Juz 30", "Juz 1", "Juz 29", "Juz II")
  let detectedJuz: string | null = null;
  const juzMatch = lowerText.match(/\bjuz\s*([0-9]{1,2})\b/i);
  if (juzMatch) {
    detectedJuz = `Juz ${juzMatch[1]}`;
  }

  // 2. Match by NIT (highest confidence)
  for (const student of students) {
    if (student.student_id_number) {
      const cleanNit = student.student_id_number.trim().toLowerCase();
      // Test full NIT (e.g. "mti-2501-0055") or numeric part ("2501-0055" or "0055")
      const nitDigits = cleanNit.replace(/[^0-9]/g, '');
      if (lowerText.includes(cleanNit) || (nitDigits.length >= 4 && lowerText.includes(nitDigits))) {
        return {
          matchedStudent: student,
          confidence: 1.0,
          detectedJuz: detectedJuz || (student.current_juz ? `Juz ${student.current_juz}` : null)
        };
      }
    }
  }

  // 3. Match by Full Name
  let bestMatch: StudentCandidate | null = null;
  let highestConfidence = 0;

  for (const student of students) {
    const rawName = student.full_name.trim().toLowerCase();
    // Normalize titles like "ukhti", "akhwat", "dr.", etc.
    const cleanName = rawName
      .replace(/\b(ukhti|akhwat|ummu|ibu|sdri|dr|h)\b/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanName || cleanName.length < 3) continue;

    // Exact full name match
    if (lowerText.includes(cleanName)) {
      return {
        matchedStudent: student,
        confidence: 0.95,
        detectedJuz: detectedJuz || (student.current_juz ? `Juz ${student.current_juz}` : null)
      };
    }

    // Word-by-word matching
    const nameWords = cleanName.split(' ').filter(w => w.length > 2);
    if (nameWords.length > 1) {
      let matchedWords = 0;
      for (const word of nameWords) {
        if (lowerText.includes(word)) {
          matchedWords++;
        }
      }
      const score = matchedWords / nameWords.length;
      if (score > 0.6 && score > highestConfidence) {
        highestConfidence = score;
        bestMatch = student;
      }
    }
  }

  if (bestMatch && highestConfidence >= 0.6) {
    return {
      matchedStudent: bestMatch,
      confidence: Math.round(highestConfidence * 100) / 100,
      detectedJuz: detectedJuz || (bestMatch.current_juz ? `Juz ${bestMatch.current_juz}` : null)
    };
  }

  return {
    matchedStudent: null,
    confidence: 0,
    detectedJuz
  };
}

/**
 * Generates high-resolution QR Code PNG buffer
 */
export async function generateQrCodeBuffer(url: string, width = 400): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width,
    margin: 1,
    color: {
      dark: '#1B4332', // Emerald dark green MTI brand color
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
}

/**
 * Extracts a single page from source PDF and stamps dynamic QR Code onto it
 */
export async function extractAndStampSingleCertificate(
  sourcePdfBuffer: Buffer,
  pageIndex: number, // 0-indexed
  verificationUrl: string,
  certificateNumber: string,
  positionConfig: QrStampPosition
): Promise<Uint8Array> {
  // 1. Load source document
  const sourceDoc = await PDFDocument.load(sourcePdfBuffer);
  
  // 2. Create target standalone single-page document
  const targetDoc = await PDFDocument.create();
  const [copiedPage] = await targetDoc.copyPages(sourceDoc, [pageIndex]);
  const page = targetDoc.addPage(copiedPage);

  const { width: pageWidth, height: pageHeight } = page.getSize();

  // 3. Generate QR code PNG
  const qrBuffer = await generateQrCodeBuffer(verificationUrl, 350);
  const qrImage = await targetDoc.embedPng(qrBuffer);

  // 4. Calculate coordinates
  const size = positionConfig.size || 70; // 70pt ~ 2.5cm
  const margin = positionConfig.margin || 36; // 36pt = 0.5 inch

  let x = 0;
  let y = 0;

  switch (positionConfig.preset) {
    case 'bottom-right':
      x = pageWidth - margin - size;
      y = margin;
      break;
    case 'bottom-left':
      x = margin;
      y = margin;
      break;
    case 'bottom-center':
      x = (pageWidth - size) / 2;
      y = margin;
      break;
    case 'top-right':
      x = pageWidth - margin - size;
      y = pageHeight - margin - size;
      break;
    case 'custom':
      x = positionConfig.customX ?? (pageWidth - margin - size);
      y = positionConfig.customY ?? margin;
      break;
    default:
      x = pageWidth - margin - size;
      y = margin;
  }

  // 5. Draw QR Code
  page.drawImage(qrImage, {
    x,
    y,
    width: size,
    height: size,
  });

  // 6. Save final PDF
  return targetDoc.save();
}
