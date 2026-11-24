'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Upload, CheckCircle, AlertCircle, Loader2, Play, Pause, FileAudio, RefreshCw, Trash2 } from 'lucide-react';
import { UserProfileCard } from '@/components/UserProfileCard';
import { SafeAudioPlayer } from '@/components/SafeAudioPlayer';

export const dynamic = 'force-dynamic';

function RekamSuaraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();
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
  const [revisionBanner, setRevisionBanner] = useState<{ needsRevision: boolean; notes?: string } | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<{
    url: string;
    fileName: string;
    submittedAt: string;
    assessmentStatus?: string;
    selectionStatus?: string;
    needsRevision?: boolean;
    notes?: string;
    registrationId?: string;
  } | null>(null);
  const [hasRegistration, setHasRegistration] = useState<boolean | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
  const audioURLRef = useRef<string | null>(null);

  const updateAudioURL = (nextUrl: string | null) => {
    if (audioURLRef.current && audioURLRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(audioURLRef.current);
    }
    audioURLRef.current = nextUrl;
    setAudioURL(nextUrl);
  };

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

      if (audioURLRef.current && audioURLRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(audioURLRef.current);
        audioURLRef.current = null;
      }
    };
  }, []);

  // Redirect unauthenticated users cleanly outside render
  useEffect(() => {
    if (isClient && !authLoading && !user) {
      router.push('/login');
    }
  }, [isClient, authLoading, user, router]);

  // Check for existing registration & submission
  useEffect(() => {
    if (!user?.id) return;

    const checkExistingSubmission = async () => {
      try {
        const response = await fetch(`/api/pendaftaran/my`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          setHasRegistration(false);
          return;
        }

        const result = await response.json();
        const dataArray: any[] = result.data || [];
        const thalibahList = Array.isArray(dataArray)
          ? dataArray.filter(reg => reg.registration_type === 'thalibah' && reg.status !== 'withdrawn')
          : [];

        const isRegRevision = (reg: any) =>
          reg?.needs_revision === true ||
          reg?.oral_assessment_status === 'needs_revision' ||
          reg?.oral_assessment_notes === 'NEEDS_REVISION';

        let currentReg = null;
        if (queryRegistrationId) {
          currentReg = thalibahList.find(reg => reg.id === queryRegistrationId);
        }
        if (!currentReg && queryBatchId) {
          const batchRegs = thalibahList.filter(reg => reg.batch_id === queryBatchId || reg.batch?.id === queryBatchId);
          currentReg =
            batchRegs.find(reg => reg.selection_status === 'selected') ||
            batchRegs.find(isRegRevision) ||
            batchRegs.find(reg => !!reg.oral_submission_url) ||
            batchRegs[0] ||
            null;
        }
        if (!currentReg && thalibahList.length > 0) {
          // Prefer active/open batch or registration needing oral submission or revision
          const openRegs = thalibahList.filter(reg => reg.batch?.status === 'open');
          currentReg =
            openRegs.find(reg => reg.selection_status === 'selected') ||
            openRegs.find(isRegRevision) ||
            openRegs.find(reg => !!reg.oral_submission_url) ||
            openRegs[0] ||
            thalibahList.find(isRegRevision) ||
            thalibahList.find(reg => reg.oral_assessment_status !== 'pass') ||
            thalibahList[0];
        }

        if (currentReg) {
          setHasRegistration(true);
          setActiveRegistrationId(currentReg.id);
          setActiveBatchId(currentReg.batch_id);
          const needsRev = isRegRevision(currentReg);
          setRevisionBanner(needsRev ? { needsRevision: true, notes: currentReg.oral_assessment_notes || '' } : null);

          if (currentReg.oral_submission_url) {
            setExistingSubmission({
              url: currentReg.oral_submission_url,
              fileName: currentReg.oral_submission_file_name || 'audio.webm',
              submittedAt: currentReg.oral_submitted_at || new Date().toISOString(),
              assessmentStatus: currentReg.oral_assessment_status || 'pending',
              selectionStatus: currentReg.selection_status || 'pending',
              needsRevision: needsRev,
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

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
        setError('Browser tidak mendukung perekaman langsung. Silakan rekam dengan perekam suara bawaan HP/laptop dan gunakan tombol "Pilih File Rekaman" di bawah.');
        return;
      }

      // Get stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId ? { deviceId: { ideal: selectedDeviceId } } : true
      });

      streamRef.current = stream;

      // Determine supported mimeType safely (iOS Safari crashes if passed unsupported mimeType)
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/aac',
      ];
      let supportedMimeType = '';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        supportedMimeType = candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
      }

      const mediaRecorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        setIsRecording(false);
        setError('Terjadi gangguan saat merekam di browser ini. Silakan coba lagi atau gunakan opsi "Pilih File Rekaman".');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onstop = () => {
        const resolvedMime = supportedMimeType || mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: resolvedMime });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (blob.size === 0) {
          setError('Rekaman suara kosong atau terlalu pendek. Pastikan mikrofon aktif dan rekam minimal 2 detik, atau unggah file audio dari HP.');
          setAudioBlob(null);
          updateAudioURL(null);
          return;
        }

        setAudioBlob(blob);
        updateAudioURL(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (err: any) {
      console.error('Error starting recording:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Akses mikrofon ditolak oleh browser. Ukhti bisa memberikan izin mikrofon di pengaturan browser ATAU menggunakan opsi "Pilih File Rekaman" di bawah.');
      } else if (err.name === 'NotFoundError') {
        setError('Mikrofon tidak ditemukan. Silakan unggah file rekaman dari perangkat Ukhti.');
      } else {
        setError('Kendala akses mikrofon: ' + (err?.message || 'Tidak didukung') + '. Silakan gunakan opsi "Pilih File Rekaman" di bawah.');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (file.size === 0) {
      setError('File audio kosong (0 byte). Pilih file rekaman lain.');
      return;
    }

    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      setError('Ukuran file terlalu besar. Maksimal 15 MB.');
      return;
    }

    // Read the File into an in-memory Blob immediately while the Android content:// URI permission is still valid.
    // Otherwise, listening to the preview 3 times (~5 minutes) causes Android to revoke the temporary file handle,
    // which makes fetch/FormData throw "TypeError: Failed to fetch" (ERR_UPLOAD_FILE_CHANGED / ERR_ACCESS_DENIED).
    try {
      const arrayBuffer = await file.arrayBuffer();
      const safeName = file.name || `recording-${Date.now()}.mp3`;
      const safeType = file.type || 'audio/mpeg';
      const inMemoryFile = new File([arrayBuffer], safeName, {
        type: safeType,
        lastModified: file.lastModified || Date.now(),
      });
      setAudioBlob(inMemoryFile);
      updateAudioURL(URL.createObjectURL(inMemoryFile));
    } catch (readErr) {
      console.warn('[FILE READ] Fallback to raw File reference:', readErr);
      setAudioBlob(file);
      updateAudioURL(URL.createObjectURL(file));
    }
  };

  const sendAudioViaXhr = (
    formData: FormData,
    onProgress: (percent: number) => void
  ): Promise<{ ok: boolean; status: number; data: any }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/seleksi/submit', true);
      xhr.withCredentials = true;
      xhr.timeout = 180000; // 3 minutes for slow mobile networks

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const pct = Math.min(95, Math.max(5, Math.round((event.loaded / event.total) * 95)));
          onProgress(pct);
        }
      };

      xhr.onload = () => {
        let parsed: any = {};
        try {
          parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch {
          parsed = {};
        }
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          data: parsed,
        });
      };

      xhr.onerror = () => {
        reject(new Error('NETWORK_ERROR'));
      };

      xhr.ontimeout = () => {
        reject(new Error('UPLOAD_TIMEOUT'));
      };

      xhr.onabort = () => {
        reject(new Error('UPLOAD_ABORTED'));
      };

      xhr.send(formData);
    });
  };

  const uploadAudio = async () => {
    const regId = activeRegistrationId || existingSubmission?.registrationId;
    if (!audioBlob || !user?.id) return;

    if (
      existingSubmission &&
      (existingSubmission.assessmentStatus === 'pass' ||
        existingSubmission.assessmentStatus === 'fail' ||
        (existingSubmission.selectionStatus && existingSubmission.selectionStatus !== 'pending')) &&
      !existingSubmission.needsRevision
    ) {
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
      const maxSize = 15 * 1024 * 1024; // 15MB
      if (audioBlob.size > maxSize) {
        setError('Ukuran file terlalu besar. Maksimal 15 MB.');
        return;
      }

      const timestamp = new Date().getTime();
      let fileExtension = 'webm';
      if (audioBlob instanceof File && audioBlob.name) {
        const ext = audioBlob.name.split('.').pop()?.toLowerCase();
        if (ext) fileExtension = ext;
      } else if (audioBlob.type) {
        const ext = audioBlob.type.split('/')[1]?.split(';')[0];
        if (ext) fileExtension = ext === 'mp4' ? 'm4a' : ext === 'mpeg' ? 'mp3' : ext;
      }

      const fileName = `${user.id}_alfath29_${timestamp}.${fileExtension}`;

      setUploadProgress(5);

      // Ensure payload is backed by an in-memory Blob so mobile browsers never fail reading a stale file descriptor
      let uploadPayload: Blob = audioBlob;
      try {
        const buf = await audioBlob.arrayBuffer();
        uploadPayload = new Blob([buf], { type: audioBlob.type || 'audio/mpeg' });
      } catch (bufErr) {
        // If the original Android content:// URI expired before buffering, inform the user clearly
        throw new Error('FILE_HANDLE_EXPIRED');
      }

      const buildFormData = () => {
        const fd = new FormData();
        fd.append('audio', uploadPayload, fileName);
        fd.append('fileName', fileName);
        fd.append('registration_id', regId);
        if (activeBatchId) {
          fd.append('batch_id', activeBatchId);
        }
        return fd;
      };

      // Upload with automatic retry (up to 2 attempts) for transient mobile network drops
      let lastResponse: { ok: boolean; status: number; data: any } | null = null;
      let lastErr: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          lastResponse = await sendAudioViaXhr(buildFormData(), (pct) => setUploadProgress(pct));
          lastErr = null;
          break;
        } catch (xhrErr: any) {
          lastErr = xhrErr;
          if (attempt < 2) {
            setUploadProgress(10);
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }

      if (lastErr) {
        throw lastErr;
      }

      if (!lastResponse || !lastResponse.ok) {
        if (lastResponse?.status === 413) {
          throw new Error('Ukuran file rekaman terlalu besar untuk dikirim. Silakan gunakan file audio di bawah 10 MB.');
        }
        if (lastResponse?.status === 401) {
          throw new Error('Sesi login Ukhti telah berakhir. Silakan muat ulang halaman dan login kembali.');
        }
        throw new Error(lastResponse?.data?.error || `Gagal mengunggah audio seleksi (Kode ${lastResponse?.status || 'Jaringan'})`);
      }

      const uploadResult = lastResponse.data;
      const savedData = uploadResult.data || uploadResult.submission || {};
      const publicUrl = savedData.oral_submission_url || savedData.audio_url;
      const savedFileName = savedData.oral_submission_file_name || fileName;

      setUploadProgress(100);
      setUploadSuccess(true);
      setConfirmingDelete(false);
      setRevisionBanner(null);
      setExistingSubmission({
        url: publicUrl,
        fileName: savedFileName,
        submittedAt: savedData.oral_submitted_at || new Date().toISOString(),
        assessmentStatus: 'pending',
        selectionStatus: savedData.selection_status || 'pending',
        needsRevision: false,
        registrationId: regId,
      });

      // Keep /perjalanan-saya SWR cache fresh when user returns
      await Promise.all([
        mutate('/api/pendaftaran/all'),
        mutate('/api/pendaftaran/my'),
      ]).catch(() => {});

    } catch (err: any) {
      console.error('Upload error:', err);
      const rawMsg = String(err?.message || '');
      if (rawMsg === 'FILE_HANDLE_EXPIRED') {
        setError('Akses ke file rekaman di HP telah kedaluwarsa setelah didengarkan. Silakan klik tombol "Ulangi", pilih kembali file rekaman yang sama, lalu langsung klik "Kirim Rekaman".');
      } else if (rawMsg === 'UPLOAD_TIMEOUT') {
        setError('Waktu unggah habis karena koneksi internet lambat. Pastikan sinyal stabil lalu klik "Kirim Rekaman" sekali lagi.');
      } else if (rawMsg === 'NETWORK_ERROR' || rawMsg.toLowerCase().includes('failed to fetch') || rawMsg.toLowerCase().includes('networkerror')) {
        setError('Koneksi terputus atau izin baca file di HP habis saat mengirim rekaman. Silakan klik "Ulangi", pilih kembali file rekaman, lalu langsung klik "Kirim Rekaman".');
      } else {
        setError(rawMsg || 'Gagal mengunggah rekaman.');
      }
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteRecording = async () => {
    const regId = existingSubmission?.registrationId || activeRegistrationId;
    if (!regId) {
      setError('Data pendaftaran tidak ditemukan. Silakan muat ulang halaman.');
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
      updateAudioURL(null);
      setError(null);
      setUploadSuccess(false);
      setUploadProgress(0);
      setConfirmingDelete(false);
      setIsPlaying(false);
      setRevisionBanner(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Invalidate SWR caches so /perjalanan-saya reflects deletion immediately
      await Promise.all([
        mutate('/api/pendaftaran/all'),
        mutate('/api/pendaftaran/my'),
      ]).catch(() => {});

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
      audioPlayerRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isClient || authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-900" />
      </div>
    );
  }

  const isGraded =
    (existingSubmission?.assessmentStatus === 'pass' ||
      existingSubmission?.assessmentStatus === 'fail' ||
      (existingSubmission?.selectionStatus && existingSubmission.selectionStatus !== 'pending')) &&
    !existingSubmission?.needsRevision;

  const renderDeleteControl = () => {
    if (confirmingDelete) {
      return (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-3">
          <p className="text-xs sm:text-sm font-semibold text-red-900">
            Yakin ingin menghapus rekaman ini agar Ukhti bisa merekam atau mengunggah ulang?
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              onClick={deleteRecording}
              disabled={isDeleting}
              variant="destructive"
              className="flex-1"
            >
              {isDeleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menghapus...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" />Ya, Hapus Rekaman</>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={isDeleting}
              variant="outline"
              className="flex-1 bg-white"
            >
              Batal
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          onClick={() => {
            setError(null);
            setConfirmingDelete(true);
          }}
          disabled={isDeleting}
          variant="destructive"
          className="flex-1"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Hapus & Rekam Ulang
        </Button>
        <Button type="button" onClick={() => router.push('/perjalanan-saya')} variant="outline" className="flex-1">
          Kembali ke Perjalanan Saya
        </Button>
      </div>
    );
  };

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

          {/* Revision Notice when previous recording was already deleted */}
          {!existingSubmission && !uploadSuccess && revisionBanner?.needsRevision && (
            <Alert className="bg-amber-50 border-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <p className="text-sm font-semibold text-amber-900">Perlu Rekam Ulang / Revisi</p>
                <p className="text-xs text-amber-800 mt-1">
                  Silakan rekam ulang bacaan QS. Al-Fath ayat 29 atau unggah file rekaman baru di bawah ini.
                </p>
                {revisionBanner.notes && revisionBanner.notes !== 'NEEDS_REVISION' && (
                  <p className="text-xs text-amber-900 mt-1 font-medium">Catatan Penguji: {revisionBanner.notes}</p>
                )}
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
                        {existingSubmission.notes && existingSubmission.notes !== 'NEEDS_REVISION' && (
                          <p className="text-xs text-amber-800 mt-1">Catatan Penguji: {existingSubmission.notes}</p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Resilient Audio Player */}
                  <div className="bg-white p-3 rounded border border-green-200 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Rekaman Ukhti:</p>
                    <SafeAudioPlayer src={existingSubmission.url} />
                  </div>

                  {!isGraded ? (
                    <div className="space-y-3">
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription>
                          <p className="text-sm text-blue-800">Ukhti bisa menghapus rekaman ini dan merekam ulang / mengunggah file baru sebelum dinilai.</p>
                        </AlertDescription>
                      </Alert>
                      {renderDeleteControl()}
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
                  💡 Solusi Mudah: Rekam suara Ukhti menggunakan aplikasi Perekam Suara bawaan HP (Voice Recorder), lalu klik tombol <strong>&quot;Pilih File Rekaman&quot;</strong> di bawah ini untuk mengunggah.
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
                  {renderDeleteControl()}
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
                      accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac,.3gp,.amr,.opus"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="audio-file-input" className="cursor-pointer block space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                        <FileAudio className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">Unggah File Audio dari HP / Komputer</p>
                        <p className="text-xs text-gray-500 mt-0.5">Format: MP3, M4A, WAV, OGG, WebM, AAC, OPUS (Maks. 15 MB)</p>
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
                        updateAudioURL(null);
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
