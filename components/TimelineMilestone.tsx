import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  Calendar, 
  Sparkles, 
  Target, 
  Clock, 
  Info, 
  Ban, 
  FileText 
} from 'lucide-react';
import { cn, parseAkadFiles } from '@/lib/utils';
import { formatDateIndo } from '@/lib/utils/date-helpers';

export interface TimelineItem {
  id: number;
  date: string;
  day: string;
  hijriDate: string;
  title: string;
  description: string;
  icon: React.ReactElement;
  hasSelectionTasks?: boolean;
  startDateIso?: string;
  endDateIso?: string;
}

export interface TimelineItemWithStatus extends TimelineItem {
  status: 'completed' | 'current' | 'future';
}

interface TimelineMilestoneProps {
  timelineData: TimelineItemWithStatus[];
  registrationStatus: any;
  user: any;
  percentage: number;
  batchId: string | null;
  examEligibility: any;
  isJuz30: boolean;
  getStatusStyles: (status: 'completed' | 'current' | 'future') => any;
  getDayNameFromNumber: (dayNum: number | string | undefined) => string;
  getJuzLabel: (juzValue: string) => string;
  batch?: any;
}

const getIsDateStarted = (dateStr: string | null | undefined) => {
  if (!dateStr) return false;
  const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return false;
  
  const yyyymmdd = dateMatch[1];
  const startWIB = new Date(`${yyyymmdd}T00:00:00+07:00`);
  const now = new Date();
  return now >= startWIB;
};

export const TimelineMilestone: React.FC<TimelineMilestoneProps> = ({
  timelineData,
  registrationStatus,
  user,
  percentage,
  batchId,
  examEligibility,
  isJuz30,
  getStatusStyles,
  getDayNameFromNumber,
  getJuzLabel,
  batch,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile & Tablet View - Single Column Milestone Journey */}
      <div className="block lg:hidden">
        <div className="relative pl-10 pt-4 space-y-12">
          {/* Vertical Path - Gradient based on progress */}
          <div className="absolute left-4 top-4 bottom-4 w-1.5 bg-gray-100 rounded-full">
            <div 
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
              style={{ height: `${percentage}%` }}
            ></div>
          </div>

          {timelineData.map((item, index) => {
            const styles = getStatusStyles(item.status);
            
            const isReEnrollmentStarted = getIsDateStarted(batch?.re_enrollment_date);
            const isDaftarUlangCard = item.title === 'Mendaftar Ulang' &&
                                   (registrationStatus?.selectionStatus === 'selected' || registrationStatus?.registration?.status === 'approved') &&
                                   !registrationStatus.registration?.re_enrollment_completed &&
                                   isReEnrollmentStarted;

            const cardContent = (
              <div key={item.id} className="relative group">
                <div className={cn(
                  "absolute -left-8 top-5 w-4 h-4 rounded-full ring-4 ring-white shadow-sm z-20 transition-all duration-500",
                  styles.dotColor,
                  item.status === 'current' && "scale-150 animate-pulse"
                )}>
                   {item.status === 'completed' && <CheckCircle className="w-4 h-4 text-white -ml-0.5 -mt-0.5 scale-75" />}
                </div>

                <Card className={cn(
                  styles.cardBg, 
                  styles.cardBorder, 
                  "relative z-10 transition-all duration-500 hover:shadow-2xl rounded-3xl overflow-hidden glass-premium group-hover:-translate-y-1",
                  item.status === 'current' && "ring-2 ring-yellow-400"
                )}>
                  {item.status === 'current' && (
                    <div className="absolute top-0 right-0 px-4 py-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase rounded-bl-2xl tracking-tighter">
                      Aktivitas Sekarang
                    </div>
                  )}

                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn("p-3 rounded-2xl", styles.iconBg, styles.iconColor)}>
                        {item.icon}
                      </div>
                      <div className="text-right">
                         <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-60 mb-1", styles.textColor)}>
                           {item.day !== '-' ? item.day : 'Pekan'}
                         </p>
                         <p className={cn("text-xs font-bold", styles.textColor)}>
                           {item.date}
                         </p>
                         {item.hijriDate !== '-' && (
                           <p className="text-[10px] text-gray-400 mt-0.5">{item.hijriDate}</p>
                         )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className={cn("text-xl font-black tracking-tight leading-tight", styles.textColor)}>
                        {item.title}
                      </h3>
                      {renderItemDescription(item, registrationStatus, user, styles, isJuz30, examEligibility, getDayNameFromNumber, getJuzLabel, batchId, batch)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );

            if (isDaftarUlangCard) {
              return (
                <Link key={item.id} href={`/daftar-ulang?batch_id=${batchId}`} className="block no-underline">
                  {cardContent}
                </Link>
              );
            }

            return cardContent;
          })}
        </div>
      </div>

      {/* Desktop View - Premium Milestone Path */}
      <div className="hidden lg:block relative py-20 px-10">
        <div className="absolute left-1/2 transform -translate-x-1/2 w-2 h-full bg-gray-50 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 w-full bg-gradient-to-b from-emerald-600 via-emerald-400 to-emerald-200 rounded-full transition-all duration-1000"
            style={{ height: `${percentage}%` }}
          ></div>
        </div>
        <div className="space-y-32">
          {timelineData.map((item, index) => {
            const styles = getStatusStyles(item.status);
            const isLeftSide = index % 2 === 0;

            const isReEnrollmentStarted = getIsDateStarted(batch?.re_enrollment_date);
            const isDaftarUlangCard = item.title === 'Mendaftar Ulang' &&
                                   (registrationStatus?.selectionStatus === 'selected' || registrationStatus?.registration?.status === 'approved') &&
                                   !registrationStatus.registration?.re_enrollment_completed &&
                                   isReEnrollmentStarted;

            const cardContent = (
              <div key={item.id} className={cn("relative flex items-center", isLeftSide ? "justify-start" : "justify-end")}>
                <div className={cn(
                  "absolute left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white shadow-xl z-30 transition-all duration-700 flex items-center justify-center",
                  styles.dotColor,
                  item.status === 'current' && "scale-125 ring-8 ring-yellow-400/20"
                )}>
                   {item.status === 'completed' ? (
                     <CheckCircle className="w-5 h-5 text-white" />
                   ) : item.status === 'current' ? (
                     <Sparkles className="w-5 h-5 text-white animate-spin-slow" />
                   ) : null}
                </div>

                <div className={cn("w-[45%]", isLeftSide ? "pr-12 text-right" : "pl-12 text-left")}>
                  <Card className={cn(
                    styles.cardBg, 
                    styles.cardBorder, 
                    "relative z-10 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-2 rounded-[32px] overflow-hidden glass-premium group",
                    item.status === 'current' && "ring-2 ring-yellow-400"
                  )}>
                    {item.status === 'current' && (
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent pointer-events-none" />
                    )}

                    <CardContent className="p-8">
                      <div className={cn("flex items-start gap-4 mb-6", isLeftSide ? "flex-row-reverse" : "flex-row")}>
                        <div className={cn("p-4 rounded-2xl shadow-inner", styles.iconBg, styles.iconColor)}>
                          {item.icon}
                        </div>
                        <div className="flex-grow">
                          <p className={cn("text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-2", styles.textColor)}>
                            {item.day !== '-' ? item.day : 'Pekan'} • {item.date}
                          </p>
                          <h3 className={cn("text-2xl font-black tracking-tight leading-none", styles.textColor)}>
                            {item.title}
                          </h3>
                        </div>
                      </div>
                      {renderItemDescription(item, registrationStatus, user, styles, isJuz30, examEligibility, getDayNameFromNumber, getJuzLabel, batchId, batch)}
                    </CardContent>
                  </Card>
                </div>

                <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm", styles.iconBg, item.status === 'current' && "ring-4 ring-yellow-200")}>
                    <div className={styles.iconColor}>
                      {item.icon}
                    </div>
                    {item.status === 'current' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </div>
            );

            if (isDaftarUlangCard) {
              return (
                <Link key={item.id} href={`/daftar-ulang?batch_id=${batchId}`} className="block no-underline">
                  {cardContent}
                </Link>
              );
            }

            return cardContent;
          })}
        </div>
      </div>
    </div>
  );
};

function renderItemDescription(
  item: TimelineItemWithStatus, 
  registrationStatus: any, 
  user: any, 
  styles: any, 
  isJuz30: boolean, 
  examEligibility: any,
  getDayNameFromNumber: (dayNum: number | string | undefined) => string,
  getJuzLabel: (juzValue: string) => string,
  batchId: string | null,
  batch?: any
) {
  // Description for Registration Phase
  if (item.id === 1 && registrationStatus?.hasRegistered) {
    const regDate = registrationStatus.registration?.registration_date || registrationStatus.registration?.submitted_at || registrationStatus.registration?.created_at;
    const formattedRegDate = regDate ? new Date(regDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : 'Tanggal tidak tersedia';
    
    const isRegistrationStarted = getIsDateStarted(batch?.registration_start_date);
    const oralCard = (
      <Card className={cn(
        "border-2 h-full transition-all duration-200",
        !isRegistrationStarted
          ? "border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60"
          : registrationStatus?.hasOralSubmission ? "border-green-300 bg-green-50 hover:shadow-md cursor-pointer" : "border-red-300 bg-white hover:shadow-md cursor-pointer"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className={cn("w-5 h-5", !isRegistrationStarted ? "text-gray-300" : registrationStatus?.hasOralSubmission ? "text-green-600" : "text-gray-400")} />
            <div>
              <h4 className={cn("text-sm font-bold", !isRegistrationStarted && "text-gray-400")}>Ujian Lisan</h4>
              <p className="text-xs text-gray-500">
                {!isRegistrationStarted 
                  ? `Belum dimulai (Mulai ${batch?.registration_start_date ? formatDateIndo(batch.registration_start_date) : '-'})` 
                  : registrationStatus?.hasOralSubmission ? "Selesai ✓" : "Belum Rekam"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-1.5">
        <div className="flex items-start space-x-2">
          <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
          <p className={cn("text-sm leading-relaxed", styles.textColor)}>
            Telah mendaftar pada {formattedRegDate}.
          </p>
        </div>
        <div className="flex items-start space-x-2">
          <CheckCircle className={cn(
            "w-4 h-4 mt-0.5 flex-shrink-0",
            registrationStatus.registration?.status === 'approved' ? "text-green-600" : "text-gray-500"
          )} />
          <p className={cn("text-sm leading-relaxed", 
            registrationStatus.registration?.status === 'approved' ? "text-green-700 font-bold" :
            registrationStatus.registration?.status === 'pending' ? "text-yellow-700 font-semibold" :
            styles.textColor
          )}>
            Status: {registrationStatus.registration?.status === 'pending' ? 'Menunggu konfirmasi' : 
                    registrationStatus.registration?.status === 'approved' ? 'Disetujui ✓' : 'Ditarik/Ditolak'}
          </p>
        </div>

        {item.hasSelectionTasks && registrationStatus?.hasActiveRegistration && (
          <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-green-800 mb-1">Tahap Seleksi</h4>
                  <p className="text-xs text-green-700">
                    Silakan kerjakan ujian lisan tepat waktu.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 max-w-sm">
              {isRegistrationStarted ? (
                <Link href={`/seleksi/rekam-suara?batch_id=${batchId}`}>
                  {oralCard}
                </Link>
              ) : (
                oralCard
              )}
            </div>
          </div>
        )}
      </div>
    );
  }



  // Description for Selection Results
  if (item.id === 3) {
    const oralStatus = registrationStatus?.oralAssessmentStatus;
    const isSelected = registrationStatus?.selectionStatus === 'selected';
    
    if (isSelected || oralStatus === 'pass') {
      return (
        <div className="space-y-2">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <h4 className="text-sm font-bold text-green-900">Alhamdulillah, Ukhti Lulus!</h4>
            <p className="text-xs text-green-700 mt-1">
              Ukhti telah dinyatakan terpilih mengikuti program Tikrar Tahfidz MTI.
            </p>
          </div>
          <div className="p-2 bg-emerald-50 rounded-lg">
            <p className="text-[10px] text-emerald-600 font-bold uppercase">Placement Final:</p>
            <p className="text-sm font-bold text-emerald-900">{getJuzLabel(registrationStatus?.registration?.final_juz || registrationStatus?.chosenJuz)}</p>
          </div>
        </div>
      );
    } else if (oralStatus === 'fail') {
      return (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <h4 className="text-sm font-bold text-orange-900">Penempatan Pra-Tikrar</h4>
          <p className="text-xs text-orange-700 mt-1">
            Ukhti disarankan mengikuti kelas persiapan (Pra-Tikrar) terlebih dahulu.
          </p>
        </div>
      );
    }
  }

  // Description for Re-enrollment (Daftar Ulang)
  if (item.id === 4) {
    const daftarUlang = registrationStatus.registration?.daftar_ulang;
    const isCompleted = daftarUlang?.status === 'submitted' || daftarUlang?.status === 'approved';
    const isReEnrollmentStarted = getIsDateStarted(batch?.re_enrollment_date);

    const writtenCard = (
      <Card className={cn(
        "border-2 h-full transition-all duration-200",
        !isReEnrollmentStarted
          ? "border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60"
          : registrationStatus?.writtenQuizSubmittedAt ? "border-green-300 bg-green-50 hover:shadow-md cursor-pointer" : "border-purple-300 bg-white hover:shadow-md cursor-pointer"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className={cn("w-5 h-5 flex-shrink-0", !isReEnrollmentStarted ? "text-gray-300" : registrationStatus?.writtenQuizSubmittedAt ? "text-green-600" : "text-gray-400")} />
            <div>
              <h4 className={cn("text-sm font-bold", !isReEnrollmentStarted && "text-gray-400")}>Test Tertulis (Penempatan Juz)</h4>
              <p className="text-xs text-gray-500">
                {!isReEnrollmentStarted 
                  ? `Belum dimulai (Mulai ${batch?.re_enrollment_date ? formatDateIndo(batch.re_enrollment_date) : '-'})` 
                  : registrationStatus?.writtenQuizSubmittedAt ? "Selesai ✓" : "Belum dikerjakan - Wajib untuk penempatan"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-4">
        {/* Test Tertulis untuk Penempatan */}
        {!isJuz30 && !registrationStatus?.isAlumnus && (
          isReEnrollmentStarted ? (
            <Link href={`/seleksi/pilihan-ganda?batch_id=${batchId}`} className="block">
              {writtenCard}
            </Link>
          ) : (
            writtenCard
          )
        )}

        {isCompleted ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-bold">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Daftar Ulang Selesai ✓</span>
            </div>
            
            {/* Detailed Info for completeness */}
            <div className="space-y-2 pt-2">
              {(() => {
                const files = parseAkadFiles(daftarUlang.akad_files);
                return files.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Berkas Akad:</p>
                    {files.map((file: any, i: number) => (
                      <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <FileText className="w-3 h-3" /> {file.name || `Berkas ${i + 1}`}
                      </a>
                    ))}
                  </div>
                ) : null;
              })()}
              
              {/* Halaqah Assignments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {daftarUlang.ujian_halaqah && (
                  <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                    <p className="text-[9px] font-bold text-blue-600 uppercase">Halaqah Ujian</p>
                    <p className="text-[11px] font-bold text-blue-900">{daftarUlang.ujian_halaqah.name}</p>
                  </div>
                )}
                {daftarUlang.tashih_halaqah && (
                  <div className="p-2 bg-purple-50/50 rounded-lg border border-purple-100">
                    <p className="text-[9px] font-bold text-purple-600 uppercase">Halaqah Tashih</p>
                    <p className="text-[11px] font-bold text-purple-900">{daftarUlang.tashih_halaqah.name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className={cn("text-sm leading-relaxed", styles.textColor)}>
            {item.description}
          </p>
        )}
      </div>
    );
  }

  // Default description for items without special handlers
  return (
    <p className={cn("text-sm leading-relaxed", styles.textColor)}>
      {item.description}
    </p>
  );
}
