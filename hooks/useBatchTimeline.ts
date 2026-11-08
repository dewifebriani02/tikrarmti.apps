import useSWR from 'swr';
import { Batch } from '@/types/database';

export type TimelineStatus = 'completed' | 'current' | 'future' | 'locked';
export type TimelineType = 'registration' | 'selection' | 'milestone' | 'learning' | 'assessment' | 'completion';

export interface TimelineAction {
  type: 'link' | 'form' | 'button' | 'none';
  href?: string;
  label?: string;
  isAvailable: boolean; // Available if current date is within date range
  isEnabled: boolean;   // Enabled if user can access (based on status)
  disabledReason?: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  date: string;
  dateRange?: string;
  day?: string;
  hijriDate?: string;
  status: TimelineStatus;
  type: TimelineType;
  description?: string;
  action?: TimelineAction;
}

interface UseBatchTimelineOptions {
  userId?: string;
  registrationStatus?: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  selectionStatus?: 'pending' | 'selected' | 'not_selected' | 'waitlist';
}

// Custom fetcher for batch API - returns batch directly (not wrapped)
const batchFetcher = async (url: string): Promise<Batch> => {
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch batch: ${response.statusText}`);
  }

  const json = await response.json();
  return json.success ? json.data : json;
};

export function useBatchTimeline(batchId: string | null, options?: UseBatchTimelineOptions) {
  const { data, error, isLoading } = useSWR<Batch>(
    batchId ? `/api/batches/${batchId}` : null,
    batchFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      dedupingInterval: 1000,
    }
  );

  const generateTimeline = (batch: Batch | undefined): TimelineItem[] => {
    if (!batch) return [];

    const timeline: TimelineItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper: Determine status based on date
    const getStatus = (startDate: string, endDate?: string): TimelineStatus => {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = endDate ? new Date(endDate) : start;
      end.setHours(23, 59, 59, 999);

      // If before start date
      if (today < start) return 'locked';

      // If after end date
      if (today > end) return 'completed';

      // If within range
      if (today >= start && today <= end) return 'current';

      return 'future';
    };

    // Helper: Check if action is available based on date
    const isActionAvailable = (startDate: string, endDate?: string): boolean => {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = endDate ? new Date(endDate) : start;
      end.setHours(23, 59, 59, 999);

      return today >= start && today <= end;
    };

    // Helper: Format date range
    const formatDateRange = (start: string, end: string): string => {
      return `${formatDate(start)} - ${formatDate(end)}`;
    };

    // 1. Registration Phase
    if (batch.registration_start_date && batch.registration_end_date) {
      const status = getStatus(batch.registration_start_date, batch.registration_end_date);
      const isAvailable = isActionAvailable(batch.registration_start_date, batch.registration_end_date);

      timeline.push({
        id: '1',
        title: 'Mendaftar Program',
        date: batch.registration_start_date,
        dateRange: formatDateRange(batch.registration_start_date, batch.registration_end_date),
        status,
        type: 'registration',
        description: 'Periode pendaftaran program tahfidz',
        action: {
          type: 'link',
          href: '/pendaftaran/tikrar-tahfidz',
          label: 'Daftar Sekarang',
          isAvailable,
          isEnabled: isAvailable && !options?.registrationStatus,
          disabledReason: status === 'locked'
            ? 'Pendaftaran belum dibuka'
            : status === 'completed'
            ? 'Periode pendaftaran telah berakhir'
            : options?.registrationStatus
            ? 'Ukhti sudah mendaftar'
            : undefined
        }
      });
    }

    // 2. Selection Phase
    if (batch.selection_start_date && batch.selection_end_date) {
      const status = getStatus(batch.selection_start_date, batch.selection_end_date);
      const isAvailable = isActionAvailable(batch.selection_start_date, batch.selection_end_date);
      const hasRegistered = options?.registrationStatus === 'approved';

      timeline.push({
        id: '2',
        title: 'Seleksi',
        date: batch.selection_start_date,
        dateRange: formatDateRange(batch.selection_start_date, batch.selection_end_date),
        status: hasRegistered ? status : 'locked',
        type: 'selection',
        description: 'Tes lisan dan tertulis',
        action: {
          type: 'link',
          href: '/seleksi',
          label: 'Ikut Seleksi',
          isAvailable: isAvailable && hasRegistered,
          isEnabled: isAvailable && hasRegistered,
          disabledReason: !hasRegistered
            ? 'Ukhti harus terdaftar terlebih dahulu'
            : status === 'locked'
            ? 'Seleksi belum dimulai'
            : status === 'completed'
            ? 'Periode seleksi telah berakhir'
            : undefined
        }
      });
    }

    // 3. Selection Results
    if (batch.selection_result_date) {
      const status = getStatus(batch.selection_result_date);
      const hasPassed = options?.selectionStatus === 'selected';

      timeline.push({
        id: '3',
        title: 'Pengumuman Hasil Seleksi',
        date: batch.selection_result_date,
        status: hasPassed && status !== 'locked' ? 'completed' : status,
        type: 'milestone',
        description: 'Pengumuman hasil seleksi',
        action: {
          type: 'link',
          href: '/seleksi/hasil',
          label: 'Lihat Hasil',
          isAvailable: status === 'current' || status === 'completed',
          isEnabled: status === 'current' || status === 'completed',
          disabledReason: status === 'locked' ? 'Hasil belum diumumkan' : undefined
        }
      });
    }

    // 4. Re-enrollment
    if (batch.re_enrollment_date) {
      const status = getStatus(batch.re_enrollment_date);
      const hasPassed = options?.selectionStatus === 'selected';
      const isAvailable = isActionAvailable(batch.re_enrollment_date);

      timeline.push({
        id: '4',
        title: 'Mendaftar Ulang',
        date: batch.re_enrollment_date,
        status: hasPassed ? status : 'locked',
        type: 'milestone',
        description: 'Konfirmasi daftar ulang',
        action: {
          type: 'form',
          href: '/pendaftaran/konfirmasi',
          label: 'Konfirmasi',
          isAvailable: isAvailable && hasPassed,
          isEnabled: isAvailable && hasPassed,
          disabledReason: !hasPassed
            ? 'Hanya untuk yang lulus seleksi'
            : status === 'locked'
            ? 'Belum waktunya daftar ulang'
            : status === 'completed'
            ? 'Periode daftar ulang telah berakhir'
            : undefined
        }
      });
    }

    // 5. Opening Class
    if (batch.opening_class_date) {
      const status = getStatus(batch.opening_class_date);
      const isAvailable = isActionAvailable(batch.opening_class_date);

      timeline.push({
        id: '5',
        title: 'Kelas Perdana Gabungan',
        date: batch.opening_class_date,
        status,
        type: 'milestone',
        description: 'Kelas pembukaan bersama',
        action: {
          type: 'link',
          href: '/kelas/perdana',
          label: 'Masuk Kelas',
          isAvailable,
          isEnabled: isAvailable,
          disabledReason: status === 'locked'
            ? 'Kelas belum dimulai'
            : status === 'completed'
            ? 'Kelas perdana telah selesai'
            : undefined
        }
      });
    }

    // 6. First Week (Tashih)
    if (batch.first_week_start_date && batch.first_week_end_date) {
      const status = getStatus(batch.first_week_start_date, batch.first_week_end_date);
      const isAvailable = isActionAvailable(batch.first_week_start_date, batch.first_week_end_date);

      timeline.push({
        id: '6',
        title: 'Proses pembelajaran (tashih)',
        date: batch.first_week_start_date,
        dateRange: `Pekan 1 (${formatDateRange(batch.first_week_start_date, batch.first_week_end_date)})`,
        status,
        type: 'learning',
        description: 'Minggu pertama pembelajaran - Tashih',
        action: {
          type: 'link',
          href: '/tashih',
          label: 'Tashih Bacaan',
          isAvailable,
          isEnabled: isAvailable,
          disabledReason: status === 'locked'
            ? 'Pembelajaran belum dimulai'
            : status === 'completed'
            ? 'Pekan 1 telah selesai'
            : undefined
        }
      });
    }

    // 7. Main Learning Period (Pekan 2-11)
    if (batch.first_week_end_date && batch.review_week_start_date) {
      const week2Start = new Date(batch.first_week_end_date);
      week2Start.setDate(week2Start.getDate() + 1);

      const week11End = new Date(batch.review_week_start_date);
      week11End.setDate(week11End.getDate() - 1);

      const week2StartStr = week2Start.toISOString().split('T')[0];
      const week11EndStr = week11End.toISOString().split('T')[0];

      const status = getStatus(week2StartStr, week11EndStr);
      const isAvailable = isActionAvailable(week2StartStr, week11EndStr);

      timeline.push({
        id: '7',
        title: 'Proses pembelajaran',
        date: week2StartStr,
        dateRange: `Pekan 2-11 (${formatDateRange(week2StartStr, week11EndStr)})`,
        status,
        type: 'learning',
        description: '10 minggu pembelajaran inti - Hafalan & Muraja\'ah',
        action: {
          type: 'link',
          href: '/jurnal-harian',
          label: 'Jurnal Harian',
          isAvailable,
          isEnabled: isAvailable,
          disabledReason: status === 'locked'
            ? 'Pembelajaran belum dimulai'
            : status === 'completed'
            ? 'Periode pembelajaran telah selesai'
            : undefined
        }
      });
    }

    // 8. Review Week (Muraja'ah)
    if (batch.review_week_start_date && batch.review_week_end_date) {
      const status = getStatus(batch.review_week_start_date, batch.review_week_end_date);
      const isAvailable = isActionAvailable(batch.review_week_start_date, batch.review_week_end_date);

      timeline.push({
        id: '8',
        title: 'Pekan muraja\'ah',
        date: batch.review_week_start_date,
        dateRange: `Pekan 12 (${formatDateRange(batch.review_week_start_date, batch.review_week_end_date)})`,
        status,
        type: 'learning',
        description: 'Minggu pengulangan dan persiapan ujian',
        action: {
          type: 'link',
          href: '/jurnal-harian',
          label: 'Muraja\'ah',
          isAvailable,
          isEnabled: isAvailable,
          disabledReason: status === 'locked'
            ? 'Pekan muraja\'ah belum dimulai'
            : status === 'completed'
            ? 'Pekan muraja\'ah telah selesai'
            : undefined
        }
      });
    }

    // 9. Final Exam
    if (batch.final_exam_start_date && batch.final_exam_end_date) {
      const status = getStatus(batch.final_exam_start_date, batch.final_exam_end_date);
      const isAvailable = isActionAvailable(batch.final_exam_start_date, batch.final_exam_end_date);

      timeline.push({
        id: '9',
        title: 'Ujian Akhir',
        date: batch.final_exam_start_date,
        dateRange: `Pekan 13 (${formatDateRange(batch.final_exam_start_date, batch.final_exam_end_date)})`,
        status,
        type: 'assessment',
        description: 'Ujian akhir tahfidz',
        action: {
          type: 'link',
          href: '/ujian',
          label: 'Ikut Ujian',
          isAvailable,
          isEnabled: isAvailable,
          disabledReason: status === 'locked'
            ? 'Ujian belum dibuka'
            : status === 'completed'
            ? 'Periode ujian telah berakhir'
            : undefined
        }
      });
    }

    // 10. Graduation
    if (batch.graduation_start_date && batch.graduation_end_date) {
      const status = getStatus(batch.graduation_start_date, batch.graduation_end_date);
      const isAvailable = isActionAvailable(batch.graduation_start_date, batch.graduation_end_date);

      timeline.push({
        id: '10',
        title: 'Penerbitan Syahadah & Kelulusan',
        date: batch.graduation_start_date,
        dateRange: `Kelulusan (${formatDateRange(batch.graduation_start_date, batch.graduation_end_date)})`,
        status,
        type: 'completion',
        description: 'Pemberian syahadah dan sertifikat kelulusan',
        action: {
          type: 'link',
          href: '/kelulusan-sertifikat',
          label: 'Info Kelulusan',
          isAvailable,
          isEnabled: isAvailable,
          disabledReason: status === 'locked'
            ? 'Penerbitan syahadah belum dimulai'
            : status === 'completed'
            ? 'Penerbitan syahadah telah selesai'
            : undefined
        }
      });
    }

    return timeline;
  };

  const timeline = generateTimeline(data);

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[useBatchTimeline]', {
      batchId,
      hasData: !!data,
      error,
      isLoading,
      timelineLength: timeline.length,
      batch: data ? {
        name: data.name,
        re_enrollment_date: data.re_enrollment_date,
        opening_class_date: data.opening_class_date,
        first_week_start_date: data.first_week_start_date,
        review_week_start_date: data.review_week_start_date,
        final_exam_start_date: data.final_exam_start_date,
        graduation_start_date: data.graduation_start_date,
      } : null
    });
  }

  return {
    batch: data,
    timeline,
    isLoading,
    error,
    isEmpty: !data || timeline.length === 0
  };
}

// Helper function to format date in Indonesian
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}
