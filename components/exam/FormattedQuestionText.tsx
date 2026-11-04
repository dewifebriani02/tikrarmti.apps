import React from 'react';

interface FormattedQuestionTextProps {
  text: string;
  className?: string;
  arabicClassName?: string;
  latinClassName?: string;
}

/**
 * Komponen cerdas untuk merender teks soal ujian tahfidz:
 * - Memisahkan secara otomatis teks ayat Al-Qur'an (Arab) dan instruksi/soal (Latin).
 * - Ayat Arab dirender dengan dir="rtl", font Arab khusus (Amiri), ukuran besar, dan line-height lega.
 * - Instruksi Latin dirender dengan dir="ltr", font sans bersih dan badge yang mudah dibaca.
 */
export function FormattedQuestionText({
  text,
  className = '',
  arabicClassName = 'text-xl sm:text-2xl font-serif text-gray-900 leading-loose text-right py-1',
  latinClassName = 'text-xs sm:text-sm font-sans font-semibold text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 rounded-lg px-3 py-1.5 inline-block text-left'
}: FormattedQuestionTextProps) {
  if (!text) return null;

  // Normalisasi pemisah antara karakter Arab dan Latin jika masih menempel
  const normalized = text
    .replace(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])([a-zA-Z])/g, '$1\n\n$2')
    .replace(/([a-zA-Z])([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])/g, '$1\n\n$2');

  const lines = normalized.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  if (lines.length <= 1) {
    const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(normalized);
    if (isArabic) {
      return (
        <div
          dir="rtl"
          className={arabicClassName}
          style={{ fontFamily: 'var(--font-amiri, "Amiri", "Traditional Arabic", serif)' }}
        >
          {normalized}
        </div>
      );
    }
    return (
      <div dir="ltr" className={latinClassName}>
        {normalized}
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {lines.map((line, idx) => {
        const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(line);
        const hasLatin = /[a-zA-Z]/.test(line);

        if (hasArabic && !hasLatin) {
          return (
            <div
              key={idx}
              dir="rtl"
              className={arabicClassName}
              style={{ fontFamily: 'var(--font-amiri, "Amiri", "Traditional Arabic", serif)' }}
            >
              {line}
            </div>
          );
        }

        // Baris instruksi / soal Latin
        return (
          <div key={idx} dir="ltr" className="flex items-center pt-0.5">
            <span className={latinClassName}>
              {line}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default FormattedQuestionText;
