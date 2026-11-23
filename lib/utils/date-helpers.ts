/**
 * Date utility functions for Indonesian and Hijri calendar
 * All dates are converted to WIB (UTC+7) timezone
 */

/**
 * Convert ISO date string to Date object for display purposes
 * @param dateString - ISO date string (from database DATE or TIMESTAMP column)
 * @returns Date object for formatting
 *
 * Note:
 * - For DATE type (e.g., "2026-01-01"): PostgreSQL stores just the date without time/timezone
 *   We want to display this date as-is, regardless of timezone
 * - For TIMESTAMP WITH TIME ZONE: The value includes timezone info
 *
 * This function creates a Date object representing midnight local time on the given date,
 * ensuring the date displays correctly (e.g., "2026-01-01" → "1 Januari 2026", not "31 Desember 2025")
 */
function toWIBDate(dateString: string): Date {
  // Parse the date string to get year, month, day
  // dateString could be "2026-01-01" or "2026-01-01T00:00:00Z"
  const date = new Date(dateString);

  // Use UTC components to get the actual date from the database
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  // Create a new Date object representing midnight local time on that date
  // This ensures that when we call getDate(), getMonth(), etc., we get the correct values
  return new Date(year, month, day);
}

/**
 * Format date to Indonesian locale (WIB timezone)
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "31 Desember 2025")
 */
export function formatDateIndo(dateString: string): string {
  const date = toWIBDate(dateString);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Format date to Indonesian locale with day name (WIB timezone)
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Rabu, 31 Desember 2025")
 */
export function formatDateWithDayIndo(dateString: string): string {
  const date = toWIBDate(dateString);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${dayName}, ${day} ${month} ${year}`;
}

/**
 * Get day name in Indonesian (WIB timezone)
 * @param dateString - ISO date string
 * @returns Day name (e.g., "Rabu")
 */
export function getDayNameIndo(dateString: string): string {
  const date = toWIBDate(dateString);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
}

/**
 * Convert Gregorian date to Hijri (approximate calculation)
 * Note: This is an approximation. For precise dates, consider using a library like 'hijri-date'
 * @param dateString - ISO date string
 * @returns Hijri date string (e.g., "6 Rajab 1446")
 */
export function toHijri(dateString: string): string {
  const date = toWIBDate(dateString);

  // Reference: January 1, 2024 = 19 Rajab 1445
  // Hijri epoch: July 16, 622 CE (Julian calendar)
  const GREGORIAN_TO_HIJRI_EPOCH = 227014; // Days difference
  const HIJRI_YEAR_DAYS = 354.36667; // Average days in Hijri year
  const HIJRI_MONTH_DAYS = 29.5; // Average days in Hijri month

  // Calculate days since a known reference point
  // Using January 1, 2024 as reference (19 Rajab 1445)
  const referenceDate = new Date('2024-01-01');
  const referenceHijriYear = 1445;
  const referenceHijriMonth = 7; // Rajab is 7th month
  const referenceHijriDay = 19;

  const daysDiff = Math.floor((date.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

  // Approximate Hijri date calculation
  let hijriYear = referenceHijriYear;
  let hijriMonth = referenceHijriMonth;
  let hijriDay = referenceHijriDay;

  // Add the days difference
  hijriDay += daysDiff;

  // Normalize days to month
  while (hijriDay > 30) {
    hijriDay -= 30;
    hijriMonth++;
  }

  // Normalize month to year
  while (hijriMonth > 12) {
    hijriMonth -= 12;
    hijriYear++;
  }

  // Handle negative days
  while (hijriDay < 1) {
    hijriMonth--;
    hijriDay += 30;
  }

  // Handle negative months
  while (hijriMonth < 1) {
    hijriMonth += 12;
    hijriYear--;
  }

  const hijriMonthNames = [
    'Muharram', 'Safar', 'Rabiul Awwal', 'Rabiul Akhir',
    'Jumadil Awwal', 'Jumadil Akhir', 'Rajab', "Sya'ban",
    'Ramadhan', 'Syawal', 'Dzulqaidah', 'Dzulhijjah'
  ];

  return `${hijriDay} ${hijriMonthNames[hijriMonth - 1]} ${hijriYear}`;
}

/**
 * Format date range to Indonesian (WIB timezone)
 * @param startDate - Start date ISO string
 * @param endDate - End date ISO string
 * @returns Formatted range (e.g., "31 Desember 2025 - 5 Januari 2026")
 */
export function formatDateRangeIndo(startDate: string, endDate: string): string {
  return `${formatDateIndo(startDate)} - ${formatDateIndo(endDate)}`;
}

/**
 * Format date with full details: day name, date, and hijri date (WIB timezone)
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Rabu, 31 Desember 2025\n6 Rajab 1446")
 */
export function formatFullDateIndo(dateString: string): { day: string; date: string; hijriDate: string } {
  return {
    day: getDayNameIndo(dateString),
    date: formatDateIndo(dateString),
    hijriDate: toHijri(dateString)
  };
}

/**
 * Check if an exam schedule date and time has passed in WIB (UTC+7 / Asia/Jakarta)
 * @param examDate - Date string (YYYY-MM-DD or ISO string)
 * @param startTime - Start time string (HH:mm or HH:mm:ss)
 * @param endTime - End time string (optional, HH:mm or HH:mm:ss)
 * @param nowDate - Optional Date object for testing/mocking (defaults to new Date())
 * @returns boolean - true if the schedule is in the past
 */
export function isSchedulePast(
  examDate: string | Date,
  startTime?: string | null,
  endTime?: string | null,
  nowDate: Date = new Date()
): boolean {
  if (!examDate) return false;

  let scheduleDateStr = '';
  if (typeof examDate === 'string') {
    const match = examDate.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) {
      scheduleDateStr = match[0];
    } else {
      const d = new Date(examDate);
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        scheduleDateStr = `${y}-${m}-${day}`;
      }
    }
  } else if (examDate instanceof Date && !isNaN(examDate.getTime())) {
    const y = examDate.getUTCFullYear();
    const m = String(examDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(examDate.getUTCDate()).padStart(2, '0');
    scheduleDateStr = `${y}-${m}-${day}`;
  }

  if (!scheduleDateStr) return false;

  const wibDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(nowDate);

  if (scheduleDateStr < wibDateStr) return true;
  if (scheduleDateStr > wibDateStr) return false;

  // On the same day: check time against startTime (or endTime if startTime not provided)
  const targetTime = startTime || endTime;
  if (!targetTime) return false;

  const wibTimeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(nowDate);

  const cleanTargetTime = targetTime.trim();
  const normalizedTargetTime = cleanTargetTime.length === 5 ? `${cleanTargetTime}:00` : cleanTargetTime;

  return wibTimeStr >= normalizedTargetTime;
}
