'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Upload, CheckCircle, AlertCircle, Loader2, Play, Pause } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UserProfileCard } from '@/components/UserProfileCard';

export const dynamic = 'force-dynamic';

export default function RekamSuaraPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const [isClient, setIsClient] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<{
    url: string;
    fileName: string;
    submittedAt: string;
    assessmentStatus?: string;
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

  // Client-side mount
  useEffect(() => {
    setIsClient(true);

    // Cleanup on unmount
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

  // Check for existing submission
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
        const dataArray = result.data || [];
        const data = Array.isArray(dataArray) ? dataArray.find(reg => reg.registration_type === 'thalibah') : null;

        if (data) {
          setHasRegistration(true);

          if (data.oral_submission_url) {
            setExistingSubmission({
              url: data.oral_submission_url,
              fileName: data.oral_submission_file_name || 'audio.webm',
              submittedAt: data.oral_submitted_at || new Date().toISOString(),
              assessmentStatus: data.oral_assessment_status || 'pending',
              registrationId: data.id,
            });
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
  }, [user?.id]);

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
        setError('Browser tidak mendukung perekaman audio. Gunakan Chrome, Firefox, atau Safari terbaru.');
        return;
      }

      // Get stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId ? { deviceId: { ideal: selectedDeviceId } } : true
      });

      streamRef.current = stream;

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
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

      if (err.name === 'NotAllowedError') {
        setPermissionDenied(true);
        setError('Akses mikrofon ditolak. Silakan izinkan akses mikrofon.');
      } else if (err.name === 'NotFoundError') {
        setError('Mikrofon tidak ditemukan.');
      } else {
        setError('Tidak dapat mengakses mikrofon: ' + err.message);
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

  const uploadAudio = async () => {
    if (!audioBlob || !user?.id) return;

    if (existingSubmission) {
      setError('Ukhti sudah mengirimkan rekaman sebelumnya.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Check file size
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (audioBlob.size > maxSize) {
        setError(`Ukuran file terlalu besar. Maksimal 10 MB.`);
        return;
      }

      const timestamp = new Date().getTime();
      const fileExtension = audioBlob.type.split('/')[1].split(';')[0];
      const fileName = `${user.id}_alfath29_${timestamp}.${fileExtension}`;

      setUploadProgress(20);

      // Upload via server API
      const formData = new FormData();
      formData.append('audio', audioBlob, fileName);
      formData.append('fileName', fileName);

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
      const publicUrl = uploadResult.data?.audio_url || uploadResult.submission?.oral_submission_url;

      setUploadProgress(60);

      // Get registration ID
      const myRegistrationResponse = await fetch('/api/pendaftaran/my', {
        method: 'GET',
        credentials: 'include',
      });

      if (!myRegistrationResponse.ok) {
        throw new Error('Gagal mendapatkan data pendaftaran');
      }

      const myRegistration = await myRegistrationResponse.json();
      const dataArray = myRegistration.data || [];
      const tikrarReg = Array.isArray(dataArray) ? dataArray.find(reg => reg.registration_type === 'thalibah') : null;
      const registrationId = tikrarReg?.id;

      if (!registrationId) {
        throw new Error('ID pendaftaran tidak ditemukan.');
      }

      setUploadProgress(80);

      // Update database
      const updateResponse = await fetch('/api/pendaftaran/tikrar/' + registrationId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          oral_submission_url: publicUrl,
          oral_submission_file_name: fileName,
          oral_submitted_at: new Date().toISOString(),
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Unknown error');
      }

      setUploadProgress(100);
      setUploadSuccess(true);
      setExistingSubmission({
        url: publicUrl,
        fileName,
        submittedAt: new Date().toISOString(),
        assessmentStatus: 'pending',
        registrationId: registrationId,
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
    if (!existingSubmission?.registrationId) return;

    if (!window.confirm('Apakah Ukhti yakin ingin menghapus rekaman ini?')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
        // Note: Local file cleanup is handled server-side.
        // File stored at /uploads/audio/<filename> will be cleaned up by admin if needed.

      // Reset database
      const response = await fetch(`/api/pendaftaran/tikrar/${existingSubmission.registrationId}`, {
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
        throw new Error('Gagal menghapus rekaman');
      }

      setExistingSubmission(null);
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
            <p className="text-2xl leading-loose text-right" dir="rtl">
              مُّحَمَّدٌ رَّسُولُ ٱللَّهِ ۚ وَٱلَّذِينَ مَعَهُۥٓ أَشِدَّآءُ عَلَى ٱلْكُفَّارِ رُحَمَآءُ بَيْنَهُمْ ۖ تَرَىٰهُمْ رُكَّعًا سُجَّدًا يَبْتَغُونَ فَضْلًا مِّنَ ٱللَّهِ وَرِضْوَٰنًا ۖ سِيمَاهُمْ فِى وُجُوهِهِم مِّنْ أَثَرِ ٱلسُّجُودِ ۚ ذَٰلِكَ مَثَلُهُمْ فِى ٱلتَّوْرَىٰةِ ۚ وَمَثَلُهُمْ فِى ٱلْإِنجِيلِ كَزَرْعٍ أَخْرَجَ شَطْـَٔهُۥ فَـَٔازَرَهُۥ فَٱسْتَغْلَظَ فَٱسْتَوَىٰ عَلَىٰ سُوقِهِۦ يُعْجِبُ ٱلزُّرَّاعَ لِيَغِيظَ بِهِمُ ٱلْكُفَّارَ ۗ وَعَدَ ٱللَّهُ ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ مِنْهُم مَّغْفِرَةً وَأَجْرًا عَظِيمًۢا
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
                        {isPlaying ? <Pause className="w-8 h-8 text-green-900" /> : <Play className="w-8 h-8 text-green-900" />}
                      </Button>
                    </div>
                    <audio id="existing-audio" src={existingAudioUrl || undefined} className="w-full" onEnded={() => setIsPlaying(false)} />
                  </div>

                  {existingSubmission.assessmentStatus === 'pending' ? (
                    <div className="space-y-3">
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription>
                          <p className="text-sm text-blue-800">Ukhti bisa menghapus rekaman ini dan merekam ulang.</p>
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
                    <Button onClick={() => router.push('/perjalanan-saya')} className="w-full bg-green-700">Kembali</Button>
                  )}
                </div>
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
                  <Button onClick={() => router.push('/perjalanan-saya')} className="w-full bg-green-700">Kembali</Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Recording Controls */}
          {!existingSubmission && !uploadSuccess && hasRegistration === true && (
            <div className="space-y-4">
              {/* Microphone Selection */}
              {audioDevices.length > 0 && (
                <div className="w-full space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Pilih Mikrofon:</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                      <span className="font-bold text-red-700">SEDANG MEREKAM</span>
                    </div>
                    <div className="text-4xl font-mono text-red-600 animate-pulse">{formatTime(recordingTime)}</div>
                  </div>
                  <Button onClick={stopRecording} variant="destructive" className="w-full">
                    <Mic className="w-5 h-5 mr-2" />Hentikan Rekaman
                  </Button>
                </div>
              )}

              {/* Start recording button */}
              {!isRecording && !audioBlob && (
                <Button onClick={startRecording} className="w-full bg-green-600 hover:bg-green-700">
                  <Mic className="w-5 h-5 mr-2" />Mulai Merekam
                </Button>
              )}

              {/* Audio Preview */}
              {audioBlob && audioURL && (
                <div className="w-full space-y-4">
                  <Alert className="bg-red-50 border-2 border-red-500">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription>
                      <p className="font-bold text-red-900">⚠️ PERHATIAN!</p>
                      <p className="text-sm text-red-800">Dengarkan rekaman minimal 3 kali sebelum mengirim.</p>
                    </AlertDescription>
                  </Alert>

                  <div className="text-sm text-gray-600 text-center">
                    Ukuran file: {(audioBlob.size / (1024 * 1024)).toFixed(2)} MB
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <p className="text-sm text-gray-700 mb-2 font-medium">Preview Rekaman:</p>
                    <div className="flex justify-center">
                      <Button onClick={togglePlayPause} size="lg" variant="outline" className="h-16 w-16 rounded-full p-0">
                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                      </Button>
                    </div>
                    <audio ref={audioPlayerRef} src={audioURL} controls className="w-full" />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => { setAudioBlob(null); setAudioURL(null); }} variant="outline" className="flex-1">Rekam Ulang</Button>
                    <Button onClick={uploadAudio} disabled={isUploading} className="flex-1">
                      {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengunggah...</> : <><Upload className="w-4 h-4 mr-2" />Kirim</>}
                    </Button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2">
                <p className="font-semibold text-blue-900">Petunjuk:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Klik "Mulai Merekam" dan izinkan akses mikrofon</li>
                  <li>Bacakan QS. Al-Fath ayat 29 dengan tartil</li>
                  <li>Klik "Hentikan Rekaman" setelah selesai</li>
                  <li className="font-bold text-red-700">Dengarkan hasil rekaman minimal 3 kali</li>
                  <li>Setelah yakin, klik "Kirim"</li>
                </ul>
              </div>
            </div>
          )}

          {/* Back Button */}
          <Button onClick={() => router.push('/perjalanan-saya')} variant="outline" className="w-full">Kembali</Button>
        </CardContent>
      </Card>
    </div>
  );
}
