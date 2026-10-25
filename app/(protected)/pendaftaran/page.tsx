'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Users,
  UserCheck,
  ShieldCheck,
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Star,
  Loader2,
  Crown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBatchProgram } from '@/hooks/useBatchProgram';
import { useMyRegistrations } from '@/hooks/useRegistrations';
import { BatchStatus, ProgramStatus } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import { RegistrationHubCard } from '@/components/registration/RegistrationHubCard';

interface PendaftaranType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  benefits: string[];
  requirements: string[];
  status: 'open' | 'closed' | 'upcoming';
  batchInfo?: {
    batch: string;
    period: string;
    deadline: string;
    capacity: number;
    registered: number;
  };
  price?: string;
  duration?: string;
  programId?: string;
  batchId?: string;
}

export default function PendaftaranPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [pendaftaranTypes, setPendaftaranTypes] = useState<PendaftaranType[]>([]);

  // SWR hooks for data fetching
  const { batches, programs, loading, error, hasPrograms } = useBatchProgram();
  const { registrations, isLoading: registrationsLoading } = useMyRegistrations();

  const [isAlumniBlocked, setIsAlumniBlocked] = useState(false);
  const [checkingAlumni, setCheckingAlumni] = useState(true);

  useEffect(() => {
    async function checkAlumniStatus() {
      try {
        const res = await fetch('/api/alumni/testimonial/my');
        if (res.ok) {
          const data = await res.json();
          if (data.isAlumni && !data.testimonial) {
            setIsAlumniBlocked(true);
          }
        }
      } catch (err) {
        console.error('Error checking alumni status:', err);
      } finally {
        setCheckingAlumni(false);
      }
    }
    if (user) {
      checkAlumniStatus();
    } else {
      setCheckingAlumni(false);
    }
  }, [user]);

  // Calculate registration status from SWR data - per role
  const registrationStatus = useMemo(() => {
    if (!user || !registrations.length) return null;

    return {
      registered: true,
      registrations: registrations,
      hasActiveRegistration: registrations.some(reg => ['approved', 'pending'].includes(reg.status)),
      pendingApproval: registrations.some(reg => reg.status === 'pending'),
      approved: registrations.some(reg => reg.status === 'approved'),
      // Per-role registration status
      byRole: {
        thalibah: registrations.some(reg =>
          ['approved', 'pending'].includes(reg.status)
        ),
        admin: registrations.some(reg =>
          ['approved', 'pending'].includes(reg.status) && 
          reg.program?.name?.toLowerCase().includes('muallimah')
        )
      }
    };
  }, [user, registrations]);

  useEffect(() => {
    // Transform data from API to match expected format
    if (batches.length > 0 || programs.length > 0) {
      const transformedData: PendaftaranType[] = [];
      const activeBatchIds = new Set<string>();

      // Filter programs to only show those with an active/open batch
      const activePrograms = programs.filter(program => program.batch?.status === 'open');

      // Add programs from database first (this is the primary source)
      activePrograms.forEach((program) => {
        // Skip if this is a Thalibah Tahfidz program that matches an active batch
        if (program.name.toLowerCase().includes('tahfidz') &&
            program.name.toLowerCase().includes('tikrar')) {
          // Mark this batch as having a program
          if (program.batch_id) {
            activeBatchIds.add(program.batch_id);
          }
        }

        const programType = getProgramTypeByName(program.name);

        // All programs are now FREE
        const programPrice = 'GRATIS';

        // Duration from program or batch
        const durationWeeks = program.duration_weeks || program.batch?.duration_weeks || 13;
        const batchDuration = `${durationWeeks} pekan`;
        
        transformedData.push({
          id: `program-${program.id}`,
          title: program.name,
          description: program.description || `Program ${program.name} MTI`,
          icon: programType.icon,
          color: programType.color,
          benefits: programType.benefits,
          requirements: programType.requirements,
          status: mapProgramStatus(program.status, program.registration_end_date || program.batch?.registration_end_date),
          batchInfo: program.batch ? {
            batch: program.batch.name,
            period: `${formatDate(program.batch.start_date)} - ${formatDate(program.batch.end_date)}`,
            deadline: formatDate(program.registration_end_date || program.batch.registration_end_date),
            capacity: program.max_thalibah || program.batch.total_quota || 50,
            registered: program.batch.registered_count || 0
          } : undefined,
          price: programPrice,
          duration: batchDuration,
          programId: program.id,
          batchId: program.batch_id
        });
      });

      // Ensure Muallimah and Musyrifah are always available as options for the open batch
      const targetBatch = batches.find(b => b.status === 'open') || batches[0];
      if (targetBatch) {
        const hasMuallimah = transformedData.some(p => p.title.toLowerCase().includes('muallimah'));
        if (!hasMuallimah) {
          const muallimahType = getProgramTypeByName('muallimah');
          transformedData.push({
            id: `program-muallimah-${targetBatch.id}`,
            title: "Mu'allimah MTI",
            description: 'Pendaftaran & Akad Komitmen Pengajar Tashih dan Penguji Ujian MTI',
            icon: ShieldCheck,
            color: 'purple',
            benefits: muallimahType.benefits,
            requirements: muallimahType.requirements,
            status: mapProgramStatus('open', targetBatch.registration_end_date),
            batchInfo: {
              batch: targetBatch.name,
              period: `${formatDate(targetBatch.start_date)} - ${formatDate(targetBatch.end_date)}`,
              deadline: formatDate(targetBatch.registration_end_date),
              capacity: targetBatch.total_quota || 50,
              registered: 0
            },
            price: 'GRATIS',
            duration: `${targetBatch.duration_weeks || 13} pekan`,
            programId: 'muallimah',
            batchId: targetBatch.id
          });
        }

        const hasMusyrifah = transformedData.some(p => p.title.toLowerCase().includes('musyrifah'));
        if (!hasMusyrifah) {
          const musyrifahType = getProgramTypeByName('musyrifah');
          transformedData.push({
            id: `program-musyrifah-${targetBatch.id}`,
            title: 'Musyrifah / Raisah MTI',
            description: 'Pendaftaran Tim Pendamping Halaqah dan Kepemimpinan MTI',
            icon: UserCheck,
            color: 'blue',
            benefits: musyrifahType.benefits,
            requirements: musyrifahType.requirements,
            status: mapProgramStatus('open', targetBatch.registration_end_date),
            batchInfo: {
              batch: targetBatch.name,
              period: `${formatDate(targetBatch.start_date)} - ${formatDate(targetBatch.end_date)}`,
              deadline: formatDate(targetBatch.registration_end_date),
              capacity: targetBatch.total_quota || 50,
              registered: 0
            },
            price: 'GRATIS',
            duration: `${targetBatch.duration_weeks || 13} pekan`,
            programId: 'musyrifah',
            batchId: targetBatch.id
          });
        }
      }

      setPendaftaranTypes(transformedData);
    }
  }, [batches, programs]);

  const getProgramTypeByName = (name: string) => {
    if (name.toLowerCase().includes('musyrifah')) {
      return {
        icon: UserCheck,
        color: 'blue',
        benefits: [
          'Training manajerial dan kepemimpinan',
          'Metode pembinaan thalibah modern',
          'Sertifikasi musyrifah profesional',
          'Peluang karir di berbagai lembaga',
          'Networking dengan praktisi pendidikan'
        ],
        requirements: [
          'Minimal pendidikan SMA/Sederajat',
          'Pengalaman di bidang pendidikan minimal 1 tahun',
          'Memiliki leadership skill',
          'Lulus tes psikologi dan wawancara'
        ],
        price: 'GRATIS',
        duration: '13 pekan'
      };
    } else if (name.toLowerCase().includes('muallimah')) {
      return {
        icon: ShieldCheck,
        color: 'purple',
        benefits: [
          'Sertifikasi Mu\'allimah Al-Quran internasional',
          'Mastery berbagai metode pengajaran Al-Quran',
          'Kurikulum berbasis research dan best practice',
          'Praktik mengajar terbimbing',
          'Beasiswa lanjutan S1/S2 untuk peserta terbaik'
        ],
        requirements: [
          'Minimal hafal 3 juz Al-Quran',
          'Minimal pendidikan SMA/Sederajat',
          'Passion mengajar dan mendidik',
          'Lulus tes akademik dan mengajar'
        ],
        price: 'GRATIS',
        duration: '13 pekan'
      };
    } else if (name.toLowerCase().includes('kelas khusus') || name.toLowerCase().includes('elite')) {
      return {
        icon: Star,
        color: 'yellow',
        benefits: [
          'Kurikulum khusus dengan metode tikrar itqan terbaru',
          'Pembimbingan one-on-one dengan hafidzah berprestasi',
          'Fasilitas premium dan kelas berkapasitas terbatas',
          'Program pengembangan leadership dan public speaking',
          'Sertifikat internasional dan beasiswa lanjutan',
          'Program pengabdian masyarakat terintegrasi'
        ],
        requirements: [
          'Minimal hafal 5 juz Al-Quran',
          'Nilai akademik minimal 80 (rata-rata)',
          'Surat rekomendasi dari ustadz/ah',
          'Lulus tes psikotes dan wawancara ketua',
          'Siap mengikuti program boarding'
        ],
        price: 'GRATIS',
        duration: '13 pekan'
      };
    } else if (name.toLowerCase().includes('pengurus')) {
      return {
        icon: ShieldCheck,
        color: 'indigo',
        benefits: [
          'Training kepemimpinan islami modern',
          'Sertifikasi manajemen lembaga tahfidz',
          'Magang langsung di tingkat manajemen MTI',
          'Networking dengan pimpinan lembaga tahfidz se-Indonesia',
          'Peluang karir sebagai manager dan direktur MTI',
          'Program study tour ke lembaga tahfidz internasional'
        ],
        requirements: [
          'Minimal S1 atau sederajat (IPK minimal 3.00)',
          'Pengalaman organisasi minimal 2 tahun',
          'Kemampuan leadership dan problem solving',
          'Bisa berbahasa Inggris (pasif/aktif)',
          'Lulus assessment center dan interview board'
        ],
        price: 'GRATIS',
        duration: '13 pekan'
      };
    } else if (name.toLowerCase().includes('pra-tikrar') || name.toLowerCase().includes('pra tikrar')) {
      return {
        icon: Users,
        color: 'fuchsia',
        benefits: [
          'Fokus pada perbaikan bacaan dasar (Tahsin)',
          'Kelas fleksibel dan tidak terikat pada satu halaqah (Zoom terbuka)',
          'Sertifikat kelulusan Pra-Tikrar',
          'Persiapan menuju kelas Tikrar Tahfidz'
        ],
        requirements: [
          'Target hafalan otomatis Juz 30',
          'Hanya melewati seleksi lisan (tanpa tes tertulis)',
          'Komitmen mengisi Jurnal Harian (Catatan Tashih)'
        ],
        price: 'GRATIS',
        duration: '13 pekan'
      };
    } else {
      // Default for Kelas Umum
      return {
        icon: Users,
        color: 'green',
        benefits: [
          'Belajar tajwid dan tahsin praktis',
          'Kelas fleksibel (online/offline)',
          'Materi disesuaikan level kemampuan',
          'Sertifikat kelulusan',
          'Komunitas pengajian yang mendukung'
        ],
        requirements: [
          'Bisa membaca Al-Quran',
          'Memiliki perangkat untuk online (jika kelas online)',
          'Komitmen mengikuti kelas'
        ],
        price: 'GRATIS',
        duration: '13 pekan'
      };
    }
  };

  const mapProgramStatus = (status: ProgramStatus, deadline?: string | null): 'open' | 'closed' | 'upcoming' => {
    if (deadline) {
      const dateMatch = deadline.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const yyyymmdd = dateMatch[1];
        // Deadline is 23:59:59 WIB (UTC+7) on that date
        const deadlineWIB = new Date(`${yyyymmdd}T23:59:59+07:00`);
        const now = new Date();
        
        if (now > deadlineWIB) {
          return 'closed';
        }
      }
    }

    switch (status) {
      case 'open':
      case 'ongoing':
        return 'open';
      case 'completed':
      case 'cancelled':
        return 'closed';
      case 'draft':
      default:
        return 'upcoming';
    }
  };

  const calculateDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric',
      month: 'long',
      year: 'numeric', timeZone: 'Asia/Jakarta' });
  };

  const getStatusBadge = (status: 'open' | 'closed' | 'upcoming') => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-green-500/50 animate-pulse">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
            <span className="hidden xs:inline">Pendaftaran Dibuka</span>
            <span className="xs:hidden">Dibuka</span>
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium bg-red-100 text-red-900">
            <AlertCircle className="w-3 h-3 mr-1" />
            <span className="hidden xs:inline">Pendaftaran Ditutup</span>
            <span className="xs:hidden">Ditutup</span>
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium bg-green-100 text-green-900">
            <Clock className="w-3 h-3 mr-1" />
            <span className="hidden xs:inline">Akan Dibuka</span>
            <span className="xs:hidden">Akan Dibuka</span>
          </span>
        );
    }
  };

  // Helper function to determine role from program type
  const getRoleFromType = (type: PendaftaranType): 'thalibah' | 'admin' => {
    if (type.title.toLowerCase().includes('muallimah') || type.title.toLowerCase().includes('musyrifah')) {
      return 'admin';
    }
    return 'thalibah';
  };

  // Helper function to check if user is registered for a specific program
  const isRegisteredForProgram = (type: PendaftaranType): boolean => {
    return !!(user && registrations.some(reg => {
      if (reg.batch_id !== type.batchId) return false;
      if (reg.program_id !== type.programId) return false;
      return ['approved', 'pending'].includes(reg.status);
    }));
  };

  const handleRegistrationClick = (type: PendaftaranType) => {
    if (isAlumniBlocked) {
      toast.error('Afwan Ukhti, Ukhti harus mengisi testimoni alumni terlebih dahulu.');
      router.push('/alumni');
      return;
    }
    if (type.status === 'open' && !isRegisteredForProgram(type)) {
      // Direct to registration page without showing terms modal
      const queryParams = `?batchId=${type.batchId}&programId=${type.programId}`;
      
      if (type.title.toLowerCase().includes('pra-tikrar') || type.title.toLowerCase().includes('pra tikrar')) {
        router.push(`/pendaftaran/pra-tikrar${queryParams}`);
      } else if (type.title.toLowerCase().includes('tikrar')) {
        router.push(`/pendaftaran/tikrar-tahfidz${queryParams}`);
      } else if (type.title.toLowerCase().includes('muallimah')) {
        router.push(`/pendaftaran/muallimah${queryParams}`);
      } else if (type.title.toLowerCase().includes('musyrifah')) {
        router.push(`/pendaftaran/musyrifah${queryParams}`);
      } else {
        // Default to tikrar if not specified
        router.push(`/pendaftaran/tikrar-tahfidz${queryParams}`);
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Memuat data program...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Pendaftaran Program</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Pilih program yang sesuai dengan kebutuhan dan minat Ukhti
          </p>
        </div>

        {isAlumniBlocked && (
          <Card className="border-red-200 bg-red-50/50 shadow-md">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-750 flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-red-950 text-base">Umpan Balik Alumni Diperlukan</h3>
                <p className="text-red-900 text-sm leading-relaxed">
                  Afwan Ukhti, Ukhti harus mengisi testimoni alumni terlebih dahulu sebelum mendaftar program di batch berikutnya. Ini adalah prasyarat wajib kelulusan dan pendaftaran program baru.
                </p>
                <div className="pt-2">
                  <Button asChild className="bg-red-800 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-md">
                    <Link href="/alumni">Isi Testimoni Sekarang</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unified Registration Hub Card (Featured) */}
        <RegistrationHubCard showTitle={false} alwaysShow={true} />

        {/* Registration Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {pendaftaranTypes.map((type) => {
            const Icon = type.icon;
            const isExpanded = selectedType === type.id;

            return (
              <Card key={type.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                {/* Card Header */}
                <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 p-3 sm:p-4 lg:p-6 border-b border-amber-200 relative overflow-hidden">
                  {/* Decorative crown sparkles */}
                  <div className="absolute top-2 right-2 opacity-20">
                    <Crown className="w-12 h-12 sm:w-16 lg:w-20 text-amber-400" />
                  </div>

                  <div className="flex items-start gap-2 sm:gap-3 lg:gap-4 relative z-10">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 sm:w-12 lg:w-14 h-10 sm:h-12 lg:h-14 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center mr-2 sm:mr-3 lg:mr-4 shadow-lg shadow-amber-500/50">
                        <Crown className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white animate-pulse" />
                      </div>
                      {/* Sparkle effect */}
                      <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 bg-yellow-300 rounded-full animate-ping"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-1 leading-tight">{type.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">{type.description}</p>
                    </div>
                  </div>

                  {/* Quick Info */}
                  {type.batchInfo && (
                    <div className="space-y-2 sm:space-y-3 mt-3 sm:mt-4">
                      <div className="flex items-center text-gray-700 bg-white/60 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-amber-600 flex-shrink-0" />
                        <span className="truncate text-xs sm:text-sm">{type.batchInfo.period}</span>
                      </div>
                      <div className="flex justify-center">
                        {getStatusBadge(type.status)}
                      </div>
                      <div className="flex items-center text-gray-700 bg-white/60 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-amber-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{type.batchInfo.registered}/{type.batchInfo.capacity} peserta</span>
                      </div>
                    </div>
                  )}
                </div>

                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {/* Price and Duration */}
                    {type.price && (
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-2.5 sm:p-3 lg:p-4 border border-amber-200">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">Biaya Program</p>
                          <p className="font-bold text-sm sm:text-base lg:text-lg text-gray-900">{type.price}</p>
                        </div>
                        {type.duration && (
                          <div className="flex-1 sm:text-right">
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Durasi</p>
                            <p className="font-medium text-base sm:text-lg text-gray-900">{type.duration}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Progress Bar */}
                    {type.batchInfo && type.batchInfo.capacity > 0 && (
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
                          <span>Kuota Tersedia</span>
                          <span className="font-semibold text-amber-600">{type.batchInfo.capacity - type.batchInfo.registered} lagi</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-yellow-500 h-full rounded-full transition-all duration-500 shadow-md"
                            style={{
                              width: `${(type.batchInfo.registered / type.batchInfo.capacity) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => handleRegistrationClick(type)}
                      disabled={type.status !== 'open' || isRegisteredForProgram(type) || isAlumniBlocked}
                      className={`w-full flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 shadow-md hover:shadow-lg ${
                        type.status === 'open' && !isRegisteredForProgram(type)
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                          : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {type.status === 'open' && !isRegisteredForProgram(type) ? (
                        <>
                          Daftar Sekarang
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </>
                      ) : isRegisteredForProgram(type) ? (
                        'Sudah Terdaftar'
                      ) : type.status === 'upcoming' ? (
                        'Pendaftaran Akan Dibuka'
                      ) : (
                        'Pendaftaran Ditutup'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {pendaftaranTypes.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Program Tersedia</h3>
              <p className="text-gray-600">Program pembelajaran akan segera dibuka. Silakan cembali lagi nanti.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
}