'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  Calendar,
  User,
  ShieldCheck,
  AlertCircle,
  Mail,
  MapPin,
  Phone,
  HeartHandshake, Heart, AppWindow, Users,
  Clock,
  Star,
  FileCheck,
  RotateCcw,
  BookOpen,
  Info
} from 'lucide-react';
import { cn, parseAkadFiles } from '@/lib/utils';
import { SafeAudioPlayer } from '@/components/SafeAudioPlayer';

interface ReviewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'written' | 'oral' | 'akad' | 'profile' | 'pairing' | null;
  registrationStatus: any;
  pairingData: any;
  user?: any;
}

export function ReviewSubmissionModal({
  isOpen,
  onClose,
  type,
  registrationStatus,
  pairingData,
  user
}: ReviewSubmissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isRetracting, setIsRetracting] = useState(false);

  useEffect(() => {
    if (isOpen && type === 'written') {
      fetchWrittenData();
    }
  }, [isOpen, type]);

  const fetchWrittenData = async () => {
    setLoading(true);
    try {
      // 1. Fetch attempt answers
      const attemptRes = await fetch('/api/exam/attempts');
      const attemptData = await attemptRes.json();
      
      // 2. Fetch questions to match with answers
      const questionsRes = await fetch('/api/exam/questions/for-user');
      const questionsData = await questionsRes.json();
      
      setQuestions(questionsData.data || []);
      setData(attemptData.attempt || null);
    } catch (error) {
      console.error('Error fetching written data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderWrittenReview = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-gray-500 font-medium">Memuat jawaban Ukhti...</p>
      </div>
    );

    if (!data || !questions.length) return (
      <div className="text-center py-10">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Data jawaban tidak ditemukan.</p>
      </div>
    );

    const answersMap = (data.answers || []).reduce((acc: any, curr: any) => {
      acc[curr.questionId] = curr.answer;
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Ujian Seleksi</p>
            <p className="text-2xl font-black text-emerald-900">Selesai ✓</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Status</p>
            <p className="text-sm font-bold text-emerald-700">Telah Dinilai</p>
          </div>
        </div>

        {questions.map((q: any, idx: number) => {
          const userAnswer = answersMap[q.id];
          const isCorrect = q.options?.find((o: any) => o.text === userAnswer)?.isCorrect;
          
          return (
            <div key={q.id} className="p-5 rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                  {idx + 1}
                </div>
                <div className="space-y-4 flex-1">
                  <p className="text-sm font-bold text-gray-900 leading-relaxed font-arabic">
                    {q.question_text}
                  </p>
                  
                  <div className="space-y-2">
                    {q.options?.map((opt: any, oIdx: number) => {
                      const isSelected = userAnswer === opt.text;
                      return (
                        <div 
                          key={oIdx}
                          className={cn(
                            "p-3 rounded-xl text-xs flex items-center justify-between border transition-all",
                            isSelected 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-bold"
                              : "bg-gray-50 border-gray-100 text-gray-500 font-medium"
                          )}
                        >
                          <span>{opt.text}</span>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Retake Button for Written Exam */}
        <div className="flex justify-center pt-4">
          <Button 
            onClick={() => window.location.href = `/seleksi/pilihan-ganda?batchId=${registrationStatus.registration?.batch_id}`}
            variant="outline"
            className="rounded-2xl border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-600 font-bold h-12 px-6 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Ulang Ujian (Jika Kesempatan Masih Ada)
          </Button>
        </div>
      </div>
    );
  };

  const handleRetract = async () => {
    if (!window.confirm('Apakah Ukhti yakin ingin menarik rekaman ini dan merekam ulang? Rekaman saat ini akan dihapus.')) {
      return;
    }

    setIsRetracting(true);
    try {
      const response = await fetch(`/api/pendaftaran/tikrar/${registrationStatus.registrationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          oral_submission_url: null,
          oral_submission_file_name: null,
          oral_submitted_at: null,
          oral_assessment_status: 'not_submitted',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Gagal menarik rekaman');
      }

      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Gagal menarik rekaman');
    } finally {
      setIsRetracting(false);
    }
  };

  const renderOralReview = () => {
    return (
      <div className="space-y-8 py-2">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
            <Play className="w-10 h-10 text-emerald-600 ml-1" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900">Rekaman Ujian Lisan</h3>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className="text-emerald-600 font-bold uppercase tracking-wider">
                {registrationStatus.oralAssessmentStatus === 'pending' 
                  ? 'Belum Dinilai' 
                  : (registrationStatus.showSelectionResult 
                      ? (registrationStatus.oralAssessmentStatus === 'pass' ? 'Lulus ✓' : 'Tidak Lulus') 
                      : 'Selesai'
                    )
                }
              </span>
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 rounded-[2.5rem] border border-gray-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Audio Setoran Ukhti</p>
          {registrationStatus.oralSubmissionUrl ? (
            <div className="flex flex-col gap-4">
              <SafeAudioPlayer src={registrationStatus.oralSubmissionUrl} />
              {registrationStatus.oralAssessmentStatus === 'pending' && (
                <Button
                  onClick={handleRetract}
                  disabled={isRetracting}
                  variant="outline"
                  className="w-full rounded-2xl border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 hover:text-red-700 font-bold transition-all h-12 flex items-center justify-center gap-2 mt-2"
                >
                  {isRetracting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Tarik Rekaman & Rekam Ulang
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 italic text-sm">
              Link audio tidak tersedia atau telah dihapus.
            </div>
          )}
        </div>

        {registrationStatus.oralAssessmentAudioUrl && (registrationStatus.showSelectionResult || registrationStatus.needsRevision) && (
          <div className="p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4 text-center">VN Koreksi dari Penguji</p>
            <SafeAudioPlayer src={registrationStatus.oralAssessmentAudioUrl} />
          </div>
        )}

        {registrationStatus.oralAssessmentNotes && (registrationStatus.showSelectionResult || registrationStatus.needsRevision) && (
          <div className="p-6 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100/50 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 text-center">Catatan Koreksi Penguji</p>
            <div className="text-xs text-gray-700 leading-relaxed bg-white p-4 rounded-2xl border border-gray-100 whitespace-pre-wrap font-medium">
              {registrationStatus.oralAssessmentNotes}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Status Penilaian</p>
            <p className="text-sm font-black text-emerald-600">
              {registrationStatus.oralAssessmentStatus === 'pending' ? 'Belum Dinilai' : 'Selesai ✓'}
            </p>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Pilihan Juz</p>
            <p className="text-lg font-black text-emerald-600">{registrationStatus.chosenJuz || registrationStatus.registration?.chosen_juz || '-'}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderAkadReview = () => {
    const reg = registrationStatus.registration;
    const daftarUlang = reg?.daftar_ulang;
    const akadFiles = parseAkadFiles(daftarUlang?.akad_files);
    
    return (
      <div className="space-y-8">
        {/* Verification Info Header */}
        <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2rem] border border-emerald-100 relative overflow-hidden">
          <ShieldCheck className="absolute -bottom-4 -right-4 w-24 h-24 text-emerald-500/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500 rounded-xl">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black text-emerald-900">Status Akad</h3>
            </div>
            <p className="text-sm text-emerald-800 leading-relaxed font-medium">
              Ukhti telah menyetujui seluruh syarat dan ketentuan program Tikrar Tahfidz pada tahap daftar ulang.
            </p>
          </div>
        </div>

        {/* Core Akad Content Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 px-2">Isi Akad & Komitmen</h4>
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-8">
            <div className="text-center">
              <p className="text-2xl font-arabic text-emerald-900 mb-2">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
              <p className="text-[10px] text-gray-500 italic">"Dengan menyebut nama Allah Yang Maha Pengasih lagi Maha Penyayang"</p>
            </div>

            <div className="space-y-6">
              {[
                { 
                  title: '1. Niat & Keikhlasan', 
                  desc: 'Thalibah wajib berniat ikhlas lillahi ta\'ala, mengharap ridho Allah semata, serta bertekad mengamalkan dan mengajarkan Al-Qur\'an.',
                  icon: HeartHandshake
                },
                { 
                  title: '2. Komitmen Waktu', 
                  desc: 'Berkomitmen mengikuti program (13-16 pekan), menyediakan min. 2 jam/hari, serta hadir di kelas tashih dan ujian sesuai jadwal.',
                  icon: Clock 
                },
                { 
                  title: '3. Izin Wali', 
                  desc: 'Wajib mendapat izin dari suami (bagi yang menikah) atau orang tua/wali (bagi yang belum) dengan ridho, tanpa paksaan.',
                  icon: ShieldCheck
                },
                { 
                  title: '4. Adab & Akhlaq', 
                  desc: 'Menjaga adab kepada Allah, Rasul-Nya, Al-Qur\'an, Mu\'allimah, Musyrifah, dan sesama thalibah selama program berlangsung.',
                  icon: Star
                }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-sm font-black text-gray-900">{item.title}</h5>
                    <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <p className="text-[10px] text-center text-gray-400 italic leading-relaxed">
                "Dengan mendaftar, Ukhti menyatakan telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan yang berlaku."
              </p>
            </div>
          </div>
        </div>

        {/* Uploaded Documents Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 px-2">Dokumen Terunggah</h4>
          <div className="grid grid-cols-1 gap-3">
            {akadFiles.length > 0 ? (
              akadFiles.map((file: any, idx: number) => (
                <a 
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-50 rounded-lg text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{file.name || `Dokumen ${idx + 1}`}</p>
                      <p className="text-[10px] text-gray-400">Klik untuk melihat file</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </a>
              ))
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400 italic">Tidak ada dokumen yang diunggah.</p>
              </div>
            )}
          </div>
        </div>

        {/* Verification Footer Data */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          {[
            { 
              label: 'Waktu Akad', 
              value: (daftarUlang?.submitted_at || daftarUlang?.akad_submitted_at || daftarUlang?.created_at || reg?.re_enrollment_completed_at) 
                ? new Date(daftarUlang?.submitted_at || daftarUlang?.akad_submitted_at || daftarUlang?.created_at || reg?.re_enrollment_completed_at).toLocaleString('id-ID') 
                : '-', 
              icon: Calendar 
            },
            { label: 'Status Verifikasi', value: reg?.re_enrollment_completed ? 'Sudah Terverifikasi' : 'Proses Verifikasi', icon: CheckCircle },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center gap-1">
              <item.icon className="w-4 h-4 text-emerald-500 mb-1" />
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
              <p className="text-[10px] font-bold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProfileReview = () => {
    const reg = registrationStatus?.registration;
    const profile = {
      full_name: reg?.full_name || user?.full_name || '-',
      nama_kunyah: user?.nama_kunyah || '-',
      email: user?.email || '-',
      whatsapp: reg?.wa_phone || user?.whatsapp || '-',
      telegram: user?.telegram || '-',
      tanggal_lahir: user?.tanggal_lahir || '-',
      tempat_lahir: user?.tempat_lahir || '-',
      pekerjaan: user?.pekerjaan || '-',
      alamat: reg?.address || user?.alamat || '-',
      kota: user?.kota || '-',
      provinsi: user?.provinsi || '-',
      negara: user?.negara || '-',
      zona_waktu: user?.zona_waktu || 'WIB',
    };

    const sections = [
      {
        title: 'Informasi Dasar',
        fields: [
          { label: 'Nama Lengkap', value: profile.full_name, icon: User },
          { label: 'Nama Kunyah', value: profile.nama_kunyah, icon: Star },
          { label: 'Tempat, Tgl Lahir', value: `${profile.tempat_lahir}, ${profile.tanggal_lahir}`, icon: Calendar },
          { label: 'Pekerjaan', value: profile.pekerjaan, icon: FileText },
        ]
      },
      {
        title: 'Kontak & Sosial',
        fields: [
          { label: 'Email Akun', value: profile.email, icon: Mail },
          { label: 'WhatsApp', value: profile.whatsapp, icon: Phone },
          { label: 'Telegram', value: profile.telegram, icon: MapPin },
          { label: 'Zona Waktu', value: profile.zona_waktu, icon: Clock },
        ]
      },
      {
        title: 'Alamat Pengiriman',
        fields: [
          { label: 'Alamat Lengkap', value: profile.alamat, icon: MapPin },
          { label: 'Kota / Kabupaten', value: profile.kota, icon: MapPin },
          { label: 'Provinsi', value: profile.provinsi, icon: MapPin },
          { label: 'Negara', value: profile.negara, icon: MapPin },
        ]
      }
    ];

    return (
      <div className="space-y-6">
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2.5rem] border border-blue-100 flex items-center gap-6">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-blue-100 flex-shrink-0">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-gray-900 leading-tight">{profile.full_name}</h3>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Status: Thalibah Tikrar</p>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-2">{section.title}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.fields.map((field, fIdx) => (
                  <div key={fIdx} className={cn(
                    "p-4 bg-white rounded-3xl border border-gray-100 shadow-sm transition-all hover:border-blue-100",
                    field.label === 'Alamat Lengkap' && "sm:col-span-2"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-xl text-blue-600 flex-shrink-0">
                        <field.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{field.label}</p>
                        <p className="text-xs font-bold text-gray-900 break-words">{field.value || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-start gap-4 mb-4">
          <div className="p-2 bg-amber-100 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
            Pastikan data di atas sudah benar. Data ini akan digunakan sebagai basis pencetakan <span className="text-amber-700 italic">Sertifikat Wisuda</span> dan pengiriman hadiah (jika ada).
          </p>
        </div>
      </div>
    );
  };

  const renderPairingReview = () => {
    if (!pairingData) return (
      <div className="text-center py-10">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium text-xs">Data pasangan belum tersedia atau masih dalam proses pencocokan.</p>
      </div>
    );

    let partner = [pairingData?.user_1, pairingData?.user_2, pairingData?.user_3].find(p => p && p.id !== user?.id);
    const reg = registrationStatus?.registration;
    const currentUser = pairingData?.current_user;
    
    // Construct partner from partner_details if in pending state
    if (!partner && pairingData?.partner_details?.partner_user_id) {
      partner = {
        full_name: pairingData.partner_details.partner_name,
        whatsapp: pairingData.partner_details.whatsapp,
        zona_waktu: pairingData.partner_details.zona_waktu,
        chosen_juz: pairingData.partner_details.chosen_juz,
        main_time_slot: pairingData.partner_details.main_time_slot,
        backup_time_slot: pairingData.partner_details.backup_time_slot,
      }
    }

    const isMainSlotMatch = currentUser?.main_time_slot === partner?.main_time_slot;
    const isBackupSlotMatch = currentUser?.backup_time_slot === partner?.backup_time_slot;
    const isJuzMatch = currentUser?.chosen_juz === partner?.chosen_juz;
    const isTimezoneMatch = (currentUser?.zona_waktu || 'WIB').toUpperCase() === (partner?.zona_waktu || 'WIB').toUpperCase();

    // Add Lisan match


    return (
      <div className="space-y-8">
        <div className="p-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[3rem] border border-emerald-100 flex flex-col items-center text-center gap-4 relative overflow-hidden">
          <HeartHandshake className="absolute -bottom-6 -right-6 w-32 h-32 text-emerald-500/10" />
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-emerald-50 relative z-10">
            <User className="w-10 h-10 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Partner Belajar Ukhti</p>
            <h3 className="text-2xl font-black text-gray-900 leading-tight">{partner?.full_name || 'Menunggu Pasangan'}</h3>
            {(() => {
              const pType = pairingData?.partner_details?.partner_type;
              if (!pType) return null;
              
              const typeConfig: Record<string, { label: string, icon: any, color: string, fill?: string }> = {
                'self_match': { label: 'Mutual Self Match', icon: Heart, color: 'text-pink-600 bg-pink-100 border-pink-200', fill: 'fill-pink-600' },
                'system_match': { label: 'System Match', icon: Heart, color: 'text-blue-600 bg-blue-100 border-blue-200', fill: 'fill-blue-600' },
                'tarteel': { label: 'Tarteel', icon: AppWindow, color: 'text-indigo-600 bg-indigo-100 border-indigo-200' },
                'family': { label: 'Family', icon: Users, color: 'text-orange-600 bg-orange-100 border-orange-200' }
              };
              const config = typeConfig[pType];
              if (!config) return null;
              
              const Icon = config.icon;
              return (
                <div className={`mt-2 mx-auto flex items-center gap-1.5 w-max px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${config.color}`}>
                  <Icon className={`w-3 h-3 ${config.fill || ''}`} />
                  {config.label}
                </div>
              );
            })()}
            <p className="text-xs font-bold text-emerald-700 mt-2 bg-emerald-200/50 px-4 py-1.5 rounded-full inline-block">
              Thalibah Batch {reg?.batch?.batch_number || '-'}
            </p>
            {partner?.whatsapp && (
              <a
                href={`https://wa.me/${partner.whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2 justify-center px-4 py-2 bg-[#25D366] hover:bg-[#20b858] text-white rounded-full text-xs font-semibold transition-colors mx-auto w-max shadow-sm"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                Hubungi WhatsApp
              </a>
            )}
            {partner ? (
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-2 tracking-widest">Analisis Kecocokan Pasangan</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Main Slot */}
              <div className={cn(
                "p-5 rounded-3xl border transition-all",
                isMainSlotMatch ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-xl flex-shrink-0", isMainSlotMatch ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Waktu Utama</p>
                    <p className="text-sm font-black text-gray-900 leading-tight">
                      {partner?.main_time_slot || '-'} {partner?.main_time_slot && partner.main_time_slot !== 'N/A' ? (partner.zona_waktu || 'WIB') : ''}
                    </p>
                    <p className={cn("text-[10px] font-bold mt-0.5", isMainSlotMatch ? "text-emerald-600" : "text-amber-600")}>
                      {isMainSlotMatch ? 'Cocok (Sama)' : 'Berbeda'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Backup Slot */}
              <div className={cn(
                "p-5 rounded-3xl border transition-all",
                isBackupSlotMatch ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-xl flex-shrink-0", isBackupSlotMatch ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Waktu Cadangan</p>
                    <p className="text-sm font-black text-gray-900 leading-tight">
                      {partner?.backup_time_slot || '-'} {partner?.backup_time_slot && partner.backup_time_slot !== 'N/A' ? (partner.zona_waktu || 'WIB') : ''}
                    </p>
                    <p className={cn("text-[10px] font-bold mt-0.5", isBackupSlotMatch ? "text-emerald-600" : "text-amber-600")}>
                      {isBackupSlotMatch ? 'Cocok (Sama)' : 'Berbeda'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Juz Compatibility */}
              <div className={cn(
                "p-5 rounded-3xl border transition-all",
                isJuzMatch ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-xl flex-shrink-0", isJuzMatch ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600")}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Target Juz</p>
                    <p className="text-sm font-black text-gray-900 leading-tight">
                      {partner?.chosen_juz ? `Juz ${partner.chosen_juz}` : '-'}
                    </p>
                    <p className={cn("text-[10px] font-bold mt-0.5", isJuzMatch ? "text-emerald-600" : "text-blue-600")}>
                      {isJuzMatch ? 'Cocok (Sama)' : 'Berbeda'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timezone */}
              <div className={cn(
                "p-5 rounded-3xl border transition-all",
                isTimezoneMatch ? "bg-emerald-50 border-emerald-100" : "bg-purple-50 border-purple-100"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-xl flex-shrink-0", isTimezoneMatch ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600")}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Zona Waktu</p>
                    <p className="text-sm font-black text-gray-900 leading-tight">
                      {partner?.zona_waktu || 'WIB'}
                    </p>
                    <p className={cn("text-[10px] font-bold mt-0.5", isTimezoneMatch ? "text-emerald-600" : "text-purple-600")}>
                      {isTimezoneMatch ? 'Satu Wilayah' : 'Luar Wilayah'}
                    </p>
                  </div>
                </div>
              </div>


            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100 text-center space-y-3 relative overflow-hidden">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-2 text-gray-400">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-900 text-lg">Proses Pengecekan</h4>
            {pairingData?.partner_details?.partner_type === 'self_match' && (!pairingData?.partner_details?.is_mutual_match) ? (
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                Ukhti memilih <b>{pairingData?.partner_details?.partner_name}</b> sebagai partner. Kami sedang menunggu yang bersangkutan untuk memilih Ukhti juga (mutual match).
              </p>
            ) : pairingData?.partner_details?.partner_type === 'system_match' ? (
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                Sistem kami sedang mencari thalibah dengan kecocokan jadwal dan juz terbaik untuk Ukhti. Silakan cek kembali nanti.
              </p>
            ) : pairingData?.partner_details?.partner_type === 'family' && pairingData?.status !== 'approved' && pairingData?.partner_details?.status !== 'approved' ? (
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                Ukhti memilih belajar bersama keluarga ({pairingData?.partner_details?.partner_name}). Menunggu verifikasi dari admin.
              </p>
            ) : pairingData?.partner_details?.partner_type === 'tarteel' && pairingData?.status !== 'approved' && pairingData?.partner_details?.status !== 'approved' ? (
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                Ukhti memilih ujian mandiri via Tarteel. Menunggu verifikasi dari admin.
              </p>
            ) : (
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                Status pasangan Ukhti sedang diproses. Mohon bersabar menunggu pembaruan selanjutnya.
              </p>
            )}
          </div>
        )}
          </div>
        </div>

        <div className="p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0">
            <Star className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-1">
            <h5 className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Pesan Belajar</h5>
            <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
              Gunakan waktu yang sudah dicocokkan di atas untuk saling menyimak setoran hafalan satu sama lain minimal <span className="font-bold underline">2 jam per hari</span>.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const getTitle = () => {
    switch (type) {
      case 'written': return 'Review Jawaban Tertulis';
      case 'oral': return 'Review Hasil Tes Lisan';
      case 'akad': return 'Detail Konfirmasi Akad';
      case 'profile': return 'Verifikasi Profil Ukhti';
      case 'pairing': return 'Detail Pasangan Belajar';
      default: return 'Review Data';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'written': return <FileText className="w-6 h-6 text-emerald-600" />;
      case 'oral': return <Play className="w-6 h-6 text-emerald-600" />;
      case 'akad': return <ShieldCheck className="w-6 h-6 text-emerald-600" />;
      case 'profile': return <User className="w-6 h-6 text-blue-600" />;
      case 'pairing': return <HeartHandshake className="w-6 h-6 text-emerald-600" />;
      default: return <FileText className="w-6 h-6 text-emerald-600" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl border-none shadow-2xl rounded-[2.5rem] overflow-hidden p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="pt-16 sm:pt-10 p-8 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-emerald-50 rounded-2xl flex-shrink-0">{getIcon()}</div>
              <div>
                <DialogTitle className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">{getTitle()}</DialogTitle>
                <DialogDescription className="text-[9px] sm:text-sm font-medium text-gray-500">Verifikasi data perjalanan Ukhti</DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex-shrink-0">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-8 pt-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-100">
          {type === 'written' && renderWrittenReview()}
          {type === 'oral' && renderOralReview()}
          {type === 'akad' && renderAkadReview()}
          {type === 'profile' && renderProfileReview()}
          {type === 'pairing' && renderPairingReview()}
        </div>

        <div className="p-6 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <Button 
            variant="ghost"
            onClick={onClose}
            className="rounded-2xl h-12 px-6 font-bold text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <Button 
            onClick={onClose}
            className="rounded-2xl h-12 px-8 font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
          >
            Syukron, Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
