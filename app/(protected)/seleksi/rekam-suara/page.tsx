'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Upload, CheckCircle, AlertCircle, Loader2, Play, Pause, FileAudio, RefreshCw } from 'lucide-react';
import { UserProfileCard } from '@/components/UserProfileCard';

export const dynamic = 'force-dynamic';

function RekamSuaraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryBatchId = searchParams.get('batch_id') || searchParams.get('batchId');
  const queryRegistrationId = searchParams.get('registration_id') || searchParams.get('registrationId');

  const { user, isLoading: authLoading } = useAuth();

  const [isClient, setIsClient] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRegistrationId, setActiveRegistrationId] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<{
    url: string;
    fileName: string;
    submittedAt: string;
    assessmentStatus?: string;
    needsRevision?: boolean;
    notes?: string;
    registrationId?: string;
  } | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  const [hasRegistration, setHasRegistration] = useState<boolean | null>(null);

  useEffect(() => {
    if (!existingSubmission?.url) {
      setExistingAudioUrl(null);
      return;
    }
    
    let active = true;
    let createdUrl: string | null = null;
    
    fetch(existingSubmission.url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (active) {
          createdUrl = URL.createObjectURL(blob);
          setExistingAudioUrl(createdUrl);
        }
      })
      .catch((err) => {
        console.error('Error pre-loading existing audio:', err);
      });
      
    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [existingSubmission?.url]);

  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Client-side mount
  useEffect(() => {
    setIsClient(true);

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error('[CLEANUP] Error stopping recorder on unmount:', err);
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, []);

  // Check for existing registration & submission
  useEffect(() => {
    if (!user?.id) return;

    const checkExistingSubmission = async () => {
      try {
        const response = await fetch(`/api/pendaftaran/my`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          setHasRegistration(false);
          return;
        }

        const result = await response.json();
        const dataArray: any[] = result.data || [];
        const thalibahList = Array.isArray(dataArray) ? dataArray.filter(reg => reg.registration_type === 'thalibah') : [];

        let currentReg = null;
        if (queryRegistrationId) {
          currentReg = thalibahList.find(reg => reg.id === queryRegistrationId);
        }
        if (!currentReg && queryBatchId) {
          currentReg = thalibahList.find(reg => reg.batch_id === queryBatchId || reg.batch?.id === queryBatchId);
        }
        if (!currentReg && thalibahList.length > 0) {
          // Prefer active/open batch or registration needing oral submission or revision
          currentReg = thalibahList.find(reg => reg.batch?.status === 'open') ||
                       thalibahList.find(reg => reg.needs_revision === true || reg.oral_assessment_status === 'needs_revision') ||
                       thalibahList.find(reg => reg.oral_assessment_status !== 'pass') ||
                       thalibahList[0];
        }

        if (currentReg) {
          setHasRegistration(true);
          setActiveRegistrationId(currentReg.id);
          setActiveBatchId(currentReg.batch_id);

          if (currentReg.oral_submission_url) {
            setExistingSubmission({
              url: currentReg.oral_submission_url,
              fileName: currentReg.oral_submission_file_name || 'audio.webm',
              submittedAt: currentReg.oral_submitted_at || new Date().toISOString(),
              assessmentStatus: currentReg.oral_assessment_status || 'pending',
              needsRevision: currentReg.needs_revision === true || currentReg.oral_assessment_status === 'needs_revision',
              notes: currentReg.oral_assessment_notes || '',
              registrationId: currentReg.id,
            });
          } else {
            setExistingSubmission(null);
          }
        } else {
          setHasRegistration(false);
        }
      } catch (err) {
        console.error('[ERROR] Error checking submission:', err);
        setHasRegistration(false);
      }
    };

    checkExistingSubmission();
  }, [user?.id, queryBatchId, queryRegistrationId]);

  // Enumerate audio devices
  useEffect(() => {
    const getAudioDevices = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);

        if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('[AUDIO DEVICES] Error enumerating devices:', err);
      }
    };

    getAudioDevices();
  }, []);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError(null);
      setPermissionDenied(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Browser tidak mendukung perekaman langsung. Silakan rekam dengan perekam suara bawaan HP/laptop dan gunakan tombol "Unggah File Audio" di bawah.');
        return;
      }

      // Get stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId ? { deviceId: { ideal: selectedDeviceId } } : true
      });

      streamRef.current = stream;

      // Determine mimeType
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (err: any) {
      console.error('Error starting recording:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Akses mikrofon ditolak oleh browser. Ukhti bisa memberikan izin mikrofon di pengaturan browser ATAU menggunakan opsi "Unggah File Audio" di bawah.');
      } else if (err.name === 'NotFoundError') {
        setError('Mikrofon tidak ditemukan. Silakan unggah file rekaman dari perangkat Ukhti.');
      } else {
        setError('Kendala akses mikrofon: ' + err.message + '. Silakan gunakan opsi "Unggah File Audio" di bawah.');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('Ukuran file terlalu besar. Maksimal 10 MB.');
      return;
    }

    setAudioBlob(file);
    setAudioURL(URL.createObjectURL(file));
  };

  const uploadAudio = async () => {
    const regId = activeRegistrationId || existingSubmission?.registrationId;
    if (!audioBlob || !user?.id) return;

    if (existingSubmission && (existingSubmission.assessmentStatus === 'pass' || existingSubmission.assessmentStatus === 'fail')) {
      setError('Rekaman suara sudah dinilai dan tidak dapat diubah.');
      return;
    }

    if (!regId) {
      setError('Data pendaftaran tidak ditemukan. Pastikan Ukhti sudah mengisi formulir pendaftaran.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (audioBlob.size > maxSize) {
        setError('Ukuran file terlalu besar. Maksimal 10 MB.');
        return;
      }

      const timestamp = new Date().getTime();
      let fileExtension = 'webm';
      if (audioBlob instanceof File && audioBlob.name) {
        const ext = audioBlob.name.split('.').pop()?.toLowerCase();
        if (ext) fileExtension = ext;
      } else if (audioBlob.type) {
        const ext = audioBlob.type.split('/')[1]?.split(';')[0];
        if (ext) fileExtension = ext;
      }

      const fileName = `${user.id}_alfath29_${timestamp}.${fileExtension}`;

      setUploadProgress(30);

      // Upload via server API
      const formData = new FormData();
      formData.append('audio', audioBlob, fileName);
      formData.append('fileName', fileName);
      formData.append('registration_id', regId);
      if (activeBatchId) {
        formData.append('batch_id', activeBatchId);
      }

      const uploadRes = await fetch('/api/seleksi/submit', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengunggah audio seleksi');
      }

      const uploadResult = await uploadRes.json();
      const publicUrl = uploadResult.data?.oral_submission_url || uploadResult.submission?.oral_submission_url || uploadResult.data?.audio_url;

      setUploadProgress(100);
      setUploadSuccess(true);
      setExistingSubmission({
        url: publicUrl,
        fileName,
        submittedAt: new Date().toISOString(),
        assessmentStatus: 'pending',
        registrationId: regId,
      });

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Gagal mengunggah rekaman.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteRecording = async () => {
    const regId = existingSubmission?.registrationId || activeRegistrationId;
    if (!regId) return;

    if (!window.confirm('Apakah Ukhti yakin ingin menghapus rekaman ini?')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/pendaftaran/tikrar/${regId}`, {
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
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menghapus rekaman');
      }

      setExistingSubmission(null);
      setAudioBlob(null);
      setAudioURL(null);
      setError(null);
      setUploadSuccess(false);

    } catch (err: any) {
      console.error('[DELETE] Error:', err);
      setError(err.message || 'Gagal menghapus rekaman.');
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioPlayerRef.current) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isClient || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-900" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const isGraded = (existingSubmission?.assessmentStatus === 'pass' || existingSubmission?.assessmentStatus === 'fail') && !existingSubmission?.needsRevision;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      {/* User Profile Card */}
      <UserProfileCard userId={user?.id} showAlert={false} showTitle={false} />

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-green-900">Rekam Suara - Tes Seleksi</CardTitle>
          <CardDescription>
            Bacaan yang harus direkam: <strong>QS. Al-Fath ayat 29</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Arabic Text */}
          <div className="bg-green-50 p-6 rounded-lg text-center">
            <p className="text-2xl leading-loose text-right font-serif" dir="rtl">
              مُّحَمَّدٌ رَّسُولُ ٱللَّهِ ۚ وَٱلَّذِينَ مَعَهُۥٓ أَشِدَّآءُ عَلَى ٱلْكُفَّارِ رُحَمَآءُ بَيْنَهُمْ ۖ تَرَىٰهُمْ رُكَّعًا سُجَّدًا يَبْتَغُونَ فَضْلًا مِّنَ ٱللَّهِ وَرِضْوَٰنًا ۖ سِيمَاهُمْ فِى وُجُوهِهِم مِّنْ أَثَرِ ٱلسُّجُودِ ۚ ذَٰلِكَ مَثَلُهُمْ فِى ٱلتَّوْرَىٰةِ ۚ وَمَثَلُهُمْ فِى ٱلْإِنجِيلِ كَزَرْعٍ أَخْرَجَ شَطْـَٔهُۥ فَـَٔازَرَهُۥ فَٱسْتَغْلَظَ فَٱسْتَوَىٰ عَلَىٰ سُوقِهِۦ يُعْجِبُ ٱلزُّرَّاعَ لِيَغِيظَ بِهِمُ ٱلْكُفَّارَ ۗ وَعَدَ ٱللَّهُ ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّٰلِحَٰتِ مِنْهُم مَّغْفِرَةً وَأَجْرًا عَظِيمًۭا
            </p>
            <p className="text-sm text-gray-600 mt-4">QS. Al-Fath (48) : 29</p>
          </div>

          {/* No Registration Alert */}
          {hasRegistration === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p><strong>Ukhti belum terdaftar</strong></p>
                  <p className="text-sm">Ukhti harus mengisi formulir pendaftaran Tikrar Tahfidz terlebih dahulu.</p>
                  <Button onClick={() => router.push('/pendaftaran/tikrar-tahfidz')} className="w-full bg-red-700">
                    Isi Formulir Pendaftaran
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Existing Submission */}
          {existingSubmission && !uploadSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-3">
                  <p><strong className="text-green-800">Rekaman sudah terkirim</strong></p>
                  <p className="text-sm text-gray-600">Dikirim pada: {new Date(existingSubmission.submittedAt).toLocaleString('id-ID')}</p>

                  {existingSubmission.needsRevision && (
                    <Alert className="bg-amber-50 border-amber-300">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription>
                        <p className="text-sm font-semibold text-amber-900">Perlu Rekam Ulang / Revisi</p>
                        {existingSubmission.notes && (
                          <p className="text-xs text-amber-800 mt-1">Catatan Penguji: {existingSubmission.notes}</p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Audio Player */}
                  <div className="bg-white p-3 rounded border border-green-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Rekaman Ukhti:</p>
                    <div className="flex justify-center mb-3">
                      <Button onClick={() => {
                        const audio = document.getElementById('existing-audio') as HTMLAudioElement;
                        if (audio) {
                          if (audio.paused) audio.play(); else audio.pause();
                          setIsPlaying(!audio.paused);
                        }
                      }} size="lg" variant="outline" className="h-16 w-16 rounded-full p-0">
                        {isPlaying ? <Pause className="w-8 h-8 text-green-900" /> : <Play className="w-8 h-8 text-green-900 ml-1" />}
                      </Button>
                    </div>
                    <audio id="existing-audio" src={existingAudioUrl || undefined} className="w-full" onEnded={() => setIsPlaying(false)} />
                  </div>

                  {!isGraded ? (
                    <div className="space-y-3">
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription>
                          <p className="text-sm text-blue-800">Ukhti bisa menghapus rekaman ini dan merekam ulang / mengunggah file baru sebelum dinilai.</p>
                        </AlertDescription>
                      </Alert>
                      <div className="flex gap-2">
                        <Button onClick={deleteRecording} disabled={isDeleting} variant="destructive" className="flex-1">
                          {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menghapus...</> : 'Hapus & Rekam Ulang'}
                        </Button>
                        <Button onClick={() => router.push('/perjalanan-saya')} variant="outline" className="flex-1">Kembali</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 italic">Rekaman telah dinilai oleh admin dan tidak dapat diubah lagi.</p>
                      <Button onClick={() => router.push('/perjalanan-saya')} className="w-full bg-green-700">Kembali ke Perjalanan Saya</Button>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Permission Denied Alert */}
          {permissionDenied && (
            <Alert className="bg-amber-50 border-amber-300">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="space-y-2">
                <p className="font-bold text-amber-900">Akses Mikrofon Ditolak atau Tidak Diizinkan Browser</p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Jika Ukhti membuka website ini dari aplikasi WhatsApp/Instagram, silakan salin link dan buka di aplikasi <strong>Chrome</strong> atau <strong>Safari</strong>, lalu klik &quot;Izinkan&quot; saat meminta akses mikrofon.
                </p>
                <p className="text-xs font-semibold text-green-800">
                  💡 Solusi Mudah: Rekam suara Ukhti menggunakan aplikasi Perekam Suara bawaan HP (Voice Recorder), lalu klik tombol <strong>&quot;Pilih File Audio&quot;</strong> di bawah ini untuk mengunggah.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Upload Progress */}
          {isUploading && uploadProgress > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription>
                <p className="text-blue-800">Mengunggah rekaman... {uploadProgress}%</p>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {uploadSuccess && audioBlob && audioURL && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-4">
                  <p><strong className="text-green-800">Rekaman berhasil dikirim!</strong></p>
                  <div className="bg-white p-3 rounded border border-green-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Rekaman Ukhti:</p>
                    <div className="flex justify-center mb-3">
                      <Button onClick={togglePlayPause} size="lg" variant="outline" className="h-16 w-16 rounded-full p-0">
                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                      </Button>
                    </div>
                    <audio ref={audioPlayerRef} src={audioURL} controls className="w-full" onEnded={() => setIsPlaying(false)} />
                  </div>
                  <Button onClick={() => router.push('/perjalanan-saya')} className="w-full bg-green-700">Kembali ke Perjalanan Saya</Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Recording & Upload Controls */}
          {!existingSubmission && !uploadSuccess && hasRegistration === true && (
            <div className="space-y-6">
              {/* Microphone Selection */}
              {audioDevices.length > 0 && !isRecording && !audioBlob && (
                <div className="w-full space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Pilih Mikrofon:</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-sm"
                    disabled={isRecording}
                  >
                    {audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recording in progress */}
              {isRecording && (
                <div className="space-y-4 w-full">
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                      <span className="font-bold text-red-700 tracking-wider">SEDANG MEREKAM</span>
                    </div>
                    <div className="text-4xl font-mono text-red-600 font-bold animate-pulse">{formatTime(recordingTime)}</div>
                    <p className="text-xs text-red-500 mt-2">Bacakan QS. Al-Fath ayat 29 dengan tartil</p>
                  </div>
                  <Button onClick={stopRecording} variant="destructive" className="w-full py-6 text-base font-semibold">
                    <Mic className="w-5 h-5 mr-2" /> Hentikan Rekaman
                  </Button>
                </div>
              )}

              {/* Ready to record or upload */}
              {!isRecording && !audioBlob && (
                <div className="space-y-4">
                  {/* Live Recording Button */}
                  <Button
                    onClick={startRecording}
                    className="w-full bg-green-700 hover:bg-green-800 text-white py-6 text-base font-bold shadow-sm"
                  >
                    <Mic className="w-5 h-5 mr-2" /> Mulai Merekam Langsung
                  </Button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">atau</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  {/* Audio File Upload Fallback */}
                  <div className="p-5 border-2 border-dashed border-gray-300 hover:border-green-600 rounded-xl bg-gray-50/70 hover:bg-green-50/40 transition-all text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="audio-file-input"
                      accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="audio-file-input" className="cursor-pointer block space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                        <FileAudio className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">Unggah File Audio dari HP / Komputer</p>
                        <p className="text-xs text-gray-500 mt-0.5">Format: MP3, M4A, WAV, OGG, WebM, AAC (Maks. 10 MB)</p>
                      </div>
                      <div className="pt-2">
                        <span className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-gray-300 text-gray-700 shadow-sm hover:bg-gray-50">
                          <Upload className="w-4 h-4 mr-1.5 text-green-600" /> Pilih File Rekaman
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Audio Preview after recording or file selection */}
              {audioBlob && audioURL && (
                <div className="w-full space-y-4">
                  <Alert className="bg-amber-50 border-amber-300">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <AlertDescription>
                      <p className="font-bold text-amber-900">⚠️ PERHATIAN!</p>
                      <p className="text-xs text-amber-800">Dengarkan rekaman minimal 3 kali untuk memastikan suara terdengar jelas sebelum dikirim.</p>
                    </AlertDescription>
                  </Alert>

                  <div className="text-xs text-gray-500 text-center font-medium">
                    Ukuran file: {(audioBlob.size / (1024 * 1024)).toFixed(2)} MB
                    {audioBlob instanceof File && audioBlob.name && ` (${audioBlob.name})`}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                    <p className="text-sm text-gray-700 font-semibold">Preview Rekaman:</p>
                    <div className="flex justify-center">
                      <Button onClick={togglePlayPause} size="lg" variant="outline" className="h-16 w-16 rounded-full p-0">
                        {isPlaying ? <Pause className="w-8 h-8 text-green-900" /> : <Play className="w-8 h-8 ml-1 text-green-900" />}
                      </Button>
                    </div>
                    <audio ref={audioPlayerRef} src={audioURL} controls className="w-full" onEnded={() => setIsPlaying(false)} />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setAudioBlob(null);
                        setAudioURL(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Ulangi
                    </Button>
                    <Button
                      onClick={uploadAudio}
                      disabled={isUploading}
                      className="flex-1 bg-green-700 hover:bg-green-800 text-white font-semibold"
                    >
                      {isUploading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengunggah...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" />Kirim Rekaman</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2 border border-blue-100">
                <p className="font-semibold text-blue-900">Petunjuk:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs sm:text-sm">
                  <li>Klik <strong>&quot;Mulai Merekam Langsung&quot;</strong> dan izinkan akses mikrofon di browser, ATAU gunakan <strong>&quot;Pilih File Rekaman&quot;</strong> jika menggunakan aplikasi perekam suara bawaan HP.</li>
                  <li>Bacakan <strong>QS. Al-Fath ayat 29</strong> dengan tartil dan jelas.</li>
                  <li>Dengarkan hasil rekaman minimal 3 kali sebelum mengirim.</li>
                  <li>Setelah yakin, klik <strong>&quot;Kirim Rekaman&quot;</strong>.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Back Button */}
          <Button onClick={() => router.push('/perjalanan-saya')} variant="outline" className="w-full">
            Kembali ke Perjalanan Saya
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RekamSuaraPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-900" />
      </div>
    }>
      <RekamSuaraContent />
    </Suspense>
  );
}
