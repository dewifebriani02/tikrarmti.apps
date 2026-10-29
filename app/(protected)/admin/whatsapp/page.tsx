'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, Send, CheckCircle2, AlertCircle, RefreshCw, 
  ArrowLeft, Shield, Phone, Search, Clock, Sparkles, Check, Zap,
  Users, Play, Pause, AlertTriangle, Layers, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WhatsAppStatus {
  configured: boolean;
  provider: 'watzap';
  watzap: {
    configured: boolean;
    apiKeyConfigured: boolean;
    numberKeyConfigured: boolean;
    senderNumber?: string;
    displayPhoneNumber?: string;
    accountName?: string;
    plan?: string;
    isConnected?: boolean;
    expiresOn?: string;
    type?: string;
  };
}

interface MessageLog {
  id: string;
  timestamp: string;
  recipient: string;
  message: string;
  status: 'sent' | 'failed';
  provider: string;
  messageId?: string;
  error?: string;
}

interface BatchInfo {
  id: string;
  name: string;
  active_count: number | string;
}

interface ActiveThalibah {
  userId: string;
  fullName: string;
  namaKunyah?: string | null;
  whatsapp: string;
  email?: string | null;
  studentIdNumber?: string | null;
  submissionId: string;
  batchId: string;
  confirmedChosenJuz?: string | null;
  submissionStatus: string;
  halaqahId?: string | null;
  halaqahName?: string | null;
}

const INDIVIDUAL_TEMPLATES = [
  {
    id: 'test',
    label: 'Uji Coba Integrasi',
    body: (name: string) => 
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nYkh. Ukhti ${name || 'Thalibah'},\n\nIni adalah pesan konfirmasi bahwa nomor WhatsApp resmi Markaz Tikrar Indonesia (MTI) telah terhubung aktif.\n\nMohon simpan (*save*) nomor ini di kontak handphone Ukhti agar seluruh informasi penting dan notifikasi dari sistem MTI dapat diterima dengan lancar.\n\n*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*\n\nJazakillahu khairan.\nWassalamu'alaikum Warahmatullahi Wabarakatuh.\n━━━━━━━━━━━━━━\nTim Administrasi Markaz Tikrar Indonesia\n🌐 https://markaztikrar.id`,
  },
  {
    id: 'kelulusan_cbt',
    label: 'Kelulusan Ujian CBT & Daftar Ulang',
    body: (name: string) => 
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nYkh. Ukhti ${name || 'Thalibah'},\n\nAlhamdulillah, selamat atas kelulusan seleksi Ujian CBT Markaz Tikrar Indonesia (MTI)!\n\nSilakan segera mengakses dashboard MTI untuk menyelesaikan proses Akad & Daftar Ulang:\n🔗 https://markaztikrar.id/daftar-ulang\n\n*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*\n\nJazakillahu khairan.\nWassalamu'alaikum Warahmatullahi Wabarakatuh.\n━━━━━━━━━━━━━━\nTim Administrasi Markaz Tikrar Indonesia\n🌐 https://markaztikrar.id`,
  },
  {
    id: 'reminder_halaqah',
    label: 'Pengingat Jadwal Halaqah',
    body: (name: string) => 
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nYkh. Ukhti ${name || 'Thalibah'},\n\nPengingat Halaqah Tikrar:\nHalaqah bimbingan akan dimulai dalam 30 menit. Mohon mempersiapkan mushaf dan hadir tepat waktu di ruang temu halaqah:\n🔗 https://markaztikrar.id/halaqah\n\nSemoga Allah memudahkan muroja'ah kita hari ini. Aamiin.\n\n*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*\n\nJazakillahu khairan.\nWassalamu'alaikum Warahmatullahi Wabarakatuh.\n━━━━━━━━━━━━━━\nTim Akademik Markaz Tikrar Indonesia\n🌐 https://markaztikrar.id`,
  },
  {
    id: 'sp_jurnal',
    label: 'Peringatan Evaluasi Jurnal Harian',
    body: (name: string) => 
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nYkh. Ukhti ${name || 'Thalibah'},\n\nPemberitahuan Administrasi Akademik MTI:\nBerdasarkan evaluasi sistem, tercatat Ukhti belum melengkapi pengisian Jurnal Harian Tikrar. Mohon segera mengisi jurnal dan konfirmasi ke Musyrifah pendamping sebelum batas waktu evaluasi berakhir.\n\nTautan Jurnal:\n🔗 https://markaztikrar.id/jurnal-harian\n\n*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*\n\nJazakillahu khairan.\nWassalamu'alaikum Warahmatullahi Wabarakatuh.\n━━━━━━━━━━━━━━\nTim Akademik Markaz Tikrar Indonesia\n🌐 https://markaztikrar.id`,
  },
];

const BROADCAST_TEMPLATES = [
  {
    id: 'klarifikasi_pekan_murojaah',
    label: 'Klarifikasi Jurnal Pekan Murajaah vs 40x',
    body: `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. Ukhti *{nama}*,

Semoga hafalan dan muroja'ah Juz *{juz}* Ukhti senantiasa diberkahi dan dimudahkan oleh Allah Ta'ala.

Sehubungan dengan berjalannya agenda Pekan Muraja'ah Angkatan saat ini, kami dari Tim Akademik MTI ingin menginformasikan perihal pencatatan setoran:

📌 *PEMBERITAHUAN PENTING:*
Banyak thalibah yang keliru mengisi laporan harian Pekan Muraja'ah di modul "Muraja'ah 40x". Mohon perhatikan perbedaan kedua menu berikut:

1️⃣ *PEKAN MURAJA'AH WAJIB BATCH 3 (M1 s.d. M7):*
• Diisi melalui menu: *Jurnal Harian* (Pekan ke-11)
• Tautan: 🔗 https://markaztikrar.id/jurnal-harian
• Ini adalah kewajiban angkatan berjalan (Senin s.d. Ahad) sebagai syarat kelulusan dan syarat mengikuti Ujian Akhir Batch 3.

2️⃣ *PROGRAM MURAJA'AH 40X (PASCA-KELULUSAN):*
• Terletak di menu terpisah: *Muraja'ah 40x*
• Program ini khusus penguatan hafalan pasca-kelulusan dan baru dapat dibuka setelah seluruh Muroja'ah Wajib Pekan 11 (M1–M7) tuntas disetor.

Bagi Ukhti yang kemarin sempat mengisi di modul Muraja'ah 40x, mohon untuk segera menginputkan kembali setoran hariannya di lembar *Jurnal Harian (Pekan Muraja'ah)* pada tautan di atas.

*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*

Jazakillahu khairan.
Wassalamu'alaikum Warahmatullahi Wabarakatuh.
━━━━━━━━━━━━━━
Tim Akademik Markaz Tikrar Indonesia
🌐 https://markaztikrar.id`,
  },
  {
    id: 'save_number',
    label: 'Pengumuman Nomor Resmi WhatsApp MTI',
    body: `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. Ukhti *{nama}*,

Semoga Ukhti senantiasa dalam limpahan taufik dan lindungan Allah Ta'ala.

Melalui pesan ini, kami menginformasikan bahwa *nomor resmi layanan notifikasi WhatsApp Markaz Tikrar Indonesia (MTI)* kini aktif melalui:

📱 *0813-3000-0784* (Nomor Resmi MTI)

Nomor ini akan digunakan untuk menyampaikan informasi penting kegiatan thalibah, antara lain:
1. Notifikasi dan tautan halaqah bimbingan.
2. Pengingat pengisian Jurnal Harian Tikrar.
3. Informasi pengumuman ujian, kelulusan, dan administrasi akademik MTI.

📌 *Mohon bantuannya untuk menyimpan (save) nomor ini di kontak handphone Ukhti* dengan nama:
*Markaz Tikrar Indonesia*
(Agar tautan dan notifikasi penting tidak tertandai sebagai spam dan dapat Ukhti terima dengan lancar).

*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*

Terima kasih atas perhatian dan kerja samanya. Semoga Allah memudahkan ikhtiar muroja'ah serta hafalan Al-Qur'an kita. Aamiin.

Jazakillahu khairan.
Wassalamu'alaikum Warahmatullahi Wabarakatuh.
━━━━━━━━━━━━━━
Tim Akademik & Administrasi Markaz Tikrar Indonesia
🌐 https://markaztikrar.id`,
  },
  {
    id: 'reminder_jurnal_batch',
    label: 'Pengingat Pengisian Jurnal Sepekan',
    body: `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. Ukhti *{nama}*,

Semoga hafalan dan muroja'ah Juz *{juz}* Ukhti senantiasa dimudahkan oleh Allah Ta'ala.

Mengingatkan kembali seluruh thalibah aktif MTI untuk melengkapi pengisian Jurnal Harian Tikrar pekan ini sebelum evaluasi mingguan ditutup oleh Musyrifah:
🔗 https://markaztikrar.id/jurnal-harian

*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*

Jazakillahu khairan atas kedisiplinan dan semangat Ukhti dalam menjaga Al-Qur'an.
Wassalamu'alaikum Warahmatullahi Wabarakatuh.
━━━━━━━━━━━━━━
Tim Akademik Markaz Tikrar Indonesia
🌐 https://markaztikrar.id`,
  },
];

export default function AdminWhatsAppPage() {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'individual'>('broadcast');

  // Status state
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Broadcast state
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [recipients, setRecipients] = useState<ActiveThalibah[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [broadcastTemplate, setBroadcastTemplate] = useState(BROADCAST_TEMPLATES[0].body);
  const [selectedBroadcastTmpl, setSelectedBroadcastTmpl] = useState('save_number');

  // Broadcast Runner state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [broadcastIndex, setBroadcastIndex] = useState(0);
  const [broadcastSuccessCount, setBroadcastSuccessCount] = useState(0);
  const [broadcastFailCount, setBroadcastFailCount] = useState(0);
  const [broadcastLogs, setBroadcastLogs] = useState<Array<{
    name: string;
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>>([]);
  const abortBroadcastRef = useRef(false);

  // Individual Form state
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [messageBody, setMessageBody] = useState(INDIVIDUAL_TEMPLATES[0].body(''));
  const [selectedTemplate, setSelectedTemplate] = useState('test');
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: string;
  } | null>(null);

  // User search state (for individual)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    full_name: string;
    whatsapp?: string;
    email?: string;
  }>>([]);

  // Local message logs
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);

  // Fetch status on load
  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/admin/whatsapp/status');
      const json = await res.json();
      if (json.success && json.data) {
        setStatus(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Fetch batches & recipients from v_active_thalibah
  const fetchRecipients = async (batchId?: string) => {
    setIsLoadingRecipients(true);
    try {
      const url = batchId 
        ? `/api/admin/whatsapp/recipients?batchId=${encodeURIComponent(batchId)}`
        : '/api/admin/whatsapp/recipients';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.batches && json.data.batches.length > 0) {
          setBatches(json.data.batches);
          if (!batchId && !selectedBatchId) {
            // Default to batch with highest active count or Batch 3
            const b3 = json.data.batches.find((b: BatchInfo) => b.name.includes('Batch 3'));
            const initialBatchId = b3 ? b3.id : json.data.batches[0].id;
            setSelectedBatchId(initialBatchId);
            // Fetch for this initial batch
            fetchRecipients(initialBatchId);
            return;
          }
        }
        setRecipients(json.data.recipients || []);
      }
    } catch (err) {
      console.error('Failed to fetch recipients from v_active_thalibah:', err);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchRecipients();
    try {
      const saved = localStorage.getItem('mti_wa_logs');
      if (saved) setMessageLogs(JSON.parse(saved));
    } catch {}
  }, []);

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    fetchRecipients(batchId);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = INDIVIDUAL_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setMessageBody(tmpl.body(recipientName));
    }
  };

  const handleBroadcastTmplChange = (tmplId: string) => {
    setSelectedBroadcastTmpl(tmplId);
    const tmpl = BROADCAST_TEMPLATES.find(t => t.id === tmplId);
    if (tmpl) {
      setBroadcastTemplate(tmpl.body);
    }
  };

  const handleRecipientNameChange = (name: string) => {
    setRecipientName(name);
    const tmpl = INDIVIDUAL_TEMPLATES.find(t => t.id === selectedTemplate);
    if (tmpl) {
      setMessageBody(tmpl.body(name));
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}&pageSize=5`);
      const json = await res.json();
      if (json.success && json.data) {
        setSearchResults(json.data);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const selectUser = (u: { full_name: string; whatsapp?: string }) => {
    handleRecipientNameChange(u.full_name);
    if (u.whatsapp) {
      setRecipientPhone(u.whatsapp);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  // Run broadcast runner directly with real-time feedback
  const startBroadcast = async () => {
    if (recipients.length === 0 || !broadcastTemplate.trim()) return;
    
    setIsBroadcasting(true);
    setIsPaused(false);
    abortBroadcastRef.current = false;
    setBroadcastIndex(0);
    setBroadcastSuccessCount(0);
    setBroadcastFailCount(0);
    setBroadcastLogs([]);

    for (let i = 0; i < recipients.length; i++) {
      if (abortBroadcastRef.current) {
        break;
      }

      setBroadcastIndex(i + 1);
      const recipient = recipients[i];

      try {
        const res = await fetch('/api/admin/whatsapp/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageTemplate: broadcastTemplate,
            singleRecipient: recipient,
          }),
        });

        const json = await res.json();
        if (json.success && json.data?.success) {
          setBroadcastSuccessCount(prev => prev + 1);
          setBroadcastLogs(prev => [
            { name: recipient.fullName, phone: recipient.whatsapp, success: true, messageId: json.data?.messageId },
            ...prev
          ]);
        } else {
          setBroadcastFailCount(prev => prev + 1);
          setBroadcastLogs(prev => [
            { name: recipient.fullName, phone: recipient.whatsapp, success: false, error: json.data?.error || json.message },
            ...prev
          ]);
        }
      } catch (err) {
        setBroadcastFailCount(prev => prev + 1);
        setBroadcastLogs(prev => [
          { name: recipient.fullName, phone: recipient.whatsapp, success: false, error: (err as Error).message },
          ...prev
        ]);
      }

      // Safe delay 2.5 detik per pesan agar tidak terkena anti-spam
      if (i < recipients.length - 1 && !abortBroadcastRef.current) {
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    setIsBroadcasting(false);
  };

  const stopBroadcast = () => {
    abortBroadcastRef.current = true;
    setIsBroadcasting(false);
  };

  // Kirim Pesan Satuan
  const handleSendSingleMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim() || !messageBody.trim()) return;

    setIsSending(true);
    setSendFeedback(null);

    try {
      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone.trim(),
          message: messageBody.trim(),
        }),
      });

      const json = await res.json();

      if (json.success) {
        const newLog: MessageLog = {
          id: json.data?.messageId || Date.now().toString(),
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          recipient: recipientPhone,
          message: messageBody,
          status: 'sent',
          provider: json.data?.provider || 'watzap',
          messageId: json.data?.messageId,
        };

        const updatedLogs = [newLog, ...messageLogs.slice(0, 19)];
        setMessageLogs(updatedLogs);
        try {
          localStorage.setItem('mti_wa_logs', JSON.stringify(updatedLogs));
        } catch {}

        setSendFeedback({
          type: 'success',
          text: `Pesan WhatsApp berhasil dikirim ke ${recipientPhone}!`,
          details: json.data?.messageId ? `Message ID: ${json.data.messageId}` : undefined,
        });
      } else {
        const errorMsg = json.error?.message || json.message || 'Gagal mengirim pesan WhatsApp.';
        setSendFeedback({
          type: 'error',
          text: errorMsg,
          details: json.data?.details ? JSON.stringify(json.data.details) : undefined,
        });
      }
    } catch (err) {
      setSendFeedback({
        type: 'error',
        text: (err as Error).message || 'Terjadi kesalahan jaringan saat mengirim pesan.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Preview teks terpersonalisasi untuk thalibah pertama
  const sampleThalibah = recipients[0] || { fullName: 'Fulanah binti Fulan', namaKunyah: 'Ummu Fulan', confirmedChosenJuz: '30', halaqahName: 'Halaqah 01' };
  const personalizedPreview = broadcastTemplate
    .replace(/\{nama\}/gi, sampleThalibah.fullName)
    .replace(/\{kunyah\}/gi, sampleThalibah.namaKunyah || sampleThalibah.fullName)
    .replace(/\{juz\}/gi, sampleThalibah.confirmedChosenJuz || '-')
    .replace(/\{halaqah\}/gi, sampleThalibah.halaqahName || 'Halaqah Tikrar');

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
                title="Kembali ke Dashboard Admin"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-0.5">
                  <Shield className="h-3 w-3" />
                  <span>Authority Communication Console</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  Broadcast & Notifikasi WhatsApp
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    Layanan Resmi MTI
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { fetchStatus(); fetchRecipients(selectedBatchId); }}
                disabled={isLoadingStatus || isLoadingRecipients}
                className="rounded-xl border-gray-200 text-xs font-semibold gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStatus || isLoadingRecipients ? 'animate-spin' : ''}`} />
                Segarkan Data
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'broadcast'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              <Users className="h-4 w-4" />
              Broadcast Thalibah Aktif (v_active_thalibah)
            </button>
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'individual'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Kirim Pesan Perorangan
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Status Card */}
        <Card className="border-gray-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={`p-3.5 rounded-2xl ${
                  status?.watzap?.isConnected 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-base">
                      Layanan WhatsApp Gateway Resmi
                    </h3>
                    {status?.watzap?.isConnected ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-xs">
                        Aktif & Terhubung
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-xs">
                        Memeriksa Koneksi
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Nomor Pengirim:{' '}
                    <span className="font-semibold text-gray-700 font-mono">
                      {status?.watzap?.displayPhoneNumber || '0813-3000-0784'}
                    </span>
                    {status?.watzap?.accountName && ` (${status.watzap.accountName})`}
                    {status?.watzap?.plan && ` • Paket ${status.watzap.plan}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100">
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Sumber Data Thalibah
                  </div>
                  <div className="text-xs font-bold text-emerald-700 flex items-center justify-end gap-1.5 mt-0.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    v_active_thalibah (Strict Filter)
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TAB 1: BROADCAST PER BATCH (MENGGUNAKAN v_active_thalibah) */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form Broadcast (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-gray-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="border-b border-gray-100 px-6 py-5">
                  <CardTitle className="text-base font-bold text-gray-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-emerald-600" />
                      Broadcast Pesan ke Thalibah Aktif
                    </div>
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      Single Source of Truth
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Batch Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Pilih Angkatan (Batch) *</span>
                      <span className="text-xs text-emerald-600 font-semibold lowercase">
                        {recipients.length} thalibah siap dikirim
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {batches.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleBatchChange(b.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            selectedBatchId === b.id
                              ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-sm font-bold ring-1 ring-emerald-500'
                              : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="text-xs truncate">{b.name}</div>
                          <div className="text-[11px] text-gray-500 font-normal mt-1 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="font-bold text-emerald-700">{b.active_count}</span> thalibah aktif (approved & non-blacklist)
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template Broadcast Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Template Pesan Resmi
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {BROADCAST_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => handleBroadcastTmplChange(tmpl.id)}
                          className={`px-3 py-2 rounded-xl text-xs transition-all border ${
                            selectedBroadcastTmpl === tmpl.id
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                              : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          {tmpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template Variable Guide */}
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <Sparkles className="h-4 w-4" /> Variabel Personalisasi Otomatis:
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">{"{nama}"} = Nama Lengkap</span>
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">{"{kunyah}"} = Nama Kunyah</span>
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">{"{juz}"} = Juz Pilihan</span>
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">{"{halaqah}"} = Nama Halaqah</span>
                    </div>
                  </div>

                  {/* Textarea Template */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Isi Pesan Broadcast *
                    </label>
                    <Textarea
                      rows={10}
                      value={broadcastTemplate}
                      onChange={(e) => setBroadcastTemplate(e.target.value)}
                      className="rounded-2xl border-gray-200 text-sm leading-relaxed"
                      required
                    />
                  </div>

                  {/* Action Controls */}
                  <div className="space-y-3 pt-2">
                    {isBroadcasting ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                          <span>Mengirim Broadcast: {broadcastIndex} / {recipients.length} thalibah</span>
                          <span className="text-emerald-600 font-mono">
                            {Math.round((broadcastIndex / Math.max(recipients.length, 1)) * 100)}%
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-600 h-full transition-all duration-300"
                            style={{ width: `${(broadcastIndex / Math.max(recipients.length, 1)) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-700 font-semibold">Berhasil: {broadcastSuccessCount}</span>
                          <span className="text-red-600 font-semibold">Gagal: {broadcastFailCount}</span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={stopBroadcast}
                            className="rounded-xl text-xs gap-1.5"
                          >
                            Hentikan Broadcast
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={startBroadcast}
                        disabled={isBroadcasting || recipients.length === 0 || !broadcastTemplate.trim()}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-6 font-bold text-base shadow-lg shadow-emerald-600/20 gap-2"
                      >
                        <Send className="h-5 w-5" />
                        Kirim Broadcast ke {recipients.length} Thalibah Aktif
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Live Personalized Preview & List (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Preview Chat */}
              <Card className="border-gray-200/80 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-gray-100 border-b border-gray-200 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                        MTI
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-800">
                          Markaz Tikrar Indonesia (0813-3000-0784)
                        </div>
                        <div className="text-[10px] text-gray-500">Pratinjau Pesan Terpersonalisasi</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-white text-emerald-600 border-emerald-200">
                      Sample: {sampleThalibah.fullName}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 bg-[#ECE5DD] min-h-[300px] flex flex-col justify-end">
                  <div className="bg-[#DCF8C6] p-3.5 rounded-2xl rounded-tr-none max-w-[95%] ml-auto shadow-sm border border-emerald-100 text-sm text-gray-800 space-y-2">
                    <div className="whitespace-pre-line leading-relaxed text-xs">
                      {personalizedPreview}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 pt-1 font-mono">
                      <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Verified Recipients List */}
              <Card className="border-gray-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="px-5 py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    Daftar Penerima Terverifikasi (v_active_thalibah)
                  </CardTitle>
                  <span className="text-xs text-gray-400 font-mono">
                    {recipients.length} thalibah
                  </span>
                </CardHeader>
                <CardContent className="p-4">
                  {isLoadingRecipients ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      Memuat data dari database view...
                    </div>
                  ) : recipients.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      Tidak ada thalibah aktif pada batch yang dipilih.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {recipients.map((r, idx) => (
                        <div
                          key={r.userId}
                          className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-gray-800">
                              {idx + 1}. {r.fullName}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">
                              {r.whatsapp} • {r.confirmedChosenJuz || 'Juz -'}
                            </div>
                          </div>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Approved
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: KIRIM PESAN PERORANGAN */}
        {activeTab === 'individual' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form Satuan (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-gray-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="border-b border-gray-100 px-6 py-5">
                  <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                    Kirim Pesan Notifikasi Perorangan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSendSingleMessage} className="space-y-6">
                    {/* User Search */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Cari Data Pengguna (Opsional)
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Cari nama atau email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSearchUsers();
                              }
                            }}
                            className="pl-10 rounded-2xl border-gray-200 text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSearchUsers}
                          disabled={isSearchingUsers || !searchQuery.trim()}
                          className="rounded-2xl border-gray-200 text-xs font-semibold px-4"
                        >
                          {isSearchingUsers ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Cari'}
                        </Button>
                      </div>

                      {searchResults.length > 0 && (
                        <div className="p-2 bg-gray-50 rounded-2xl border border-gray-200 space-y-1 mt-2">
                          {searchResults.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => selectUser(u)}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-white text-xs flex items-center justify-between transition-colors border border-transparent hover:border-gray-200"
                            >
                              <div>
                                <div className="font-bold text-gray-800">{u.full_name}</div>
                                <div className="text-gray-400 font-mono text-[11px]">{u.email}</div>
                              </div>
                              <span className="font-mono text-emerald-600 font-semibold">{u.whatsapp || 'Tidak ada WA'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recipient Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Nama Penerima (Sapaan)
                        </label>
                        <Input
                          placeholder="Contoh: Fatimah"
                          value={recipientName}
                          onChange={(e) => handleRecipientNameChange(e.target.value)}
                          className="rounded-2xl border-gray-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Nomor WhatsApp *
                        </label>
                        <Input
                          placeholder="Contoh: 08123456789 atau 628123456789"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          className="rounded-2xl border-gray-200 text-sm font-mono"
                          required
                        />
                      </div>
                    </div>

                    {/* Template Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Template Pesan Siap Pakai
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {INDIVIDUAL_TEMPLATES.map((tmpl) => (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => handleTemplateChange(tmpl.id)}
                            className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                              selectedTemplate === tmpl.id
                                ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-sm font-bold'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <div className="truncate">{tmpl.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Isi Pesan WhatsApp *
                        </label>
                        <span className="text-xs text-gray-400 font-mono">
                          {messageBody.length} karakter
                        </span>
                      </div>
                      <Textarea
                        rows={8}
                        placeholder="Tulis pesan WhatsApp di sini..."
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        className="rounded-2xl border-gray-200 text-sm leading-relaxed"
                        required
                      />
                    </div>

                    {/* Feedback Alert */}
                    {sendFeedback && (
                      <Alert className={`rounded-2xl ${
                        sendFeedback.type === 'success' 
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900' 
                          : 'border-red-200 bg-red-50 text-red-900'
                      }`}>
                        <div className="flex items-start gap-3">
                          {sendFeedback.type === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <AlertDescription className="text-sm font-semibold">
                              {sendFeedback.text}
                            </AlertDescription>
                            {sendFeedback.details && (
                              <div className="text-xs font-mono opacity-80 break-all">
                                {sendFeedback.details}
                              </div>
                            )}
                          </div>
                        </div>
                      </Alert>
                    )}

                    {/* Send Button */}
                    <Button
                      type="submit"
                      disabled={isSending || !recipientPhone.trim() || !messageBody.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-6 font-bold text-base shadow-lg shadow-emerald-600/20 gap-2"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Mengirim Pesan...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Kirim Pesan WhatsApp Sekarang
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Preview & Logs (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Live Preview Card */}
              <Card className="border-gray-200/80 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-gray-100 border-b border-gray-200 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                        MTI
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-800">
                          Markaz Tikrar Indonesia (0813-3000-0784)
                        </div>
                        <div className="text-[10px] text-gray-500">Pratinjau Tampilan Chat</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-white text-emerald-600 border-emerald-200">
                      Live Preview
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 bg-[#ECE5DD] min-h-[300px] flex flex-col justify-end">
                  <div className="bg-[#DCF8C6] p-3.5 rounded-2xl rounded-tr-none max-w-[90%] ml-auto shadow-sm border border-emerald-100 text-sm text-gray-800 space-y-2">
                    <div className="whitespace-pre-line leading-relaxed text-xs">
                      {messageBody || 'Pesan Anda akan tampil di sini...'}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 pt-1 font-mono">
                      <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Logs */}
              <Card className="border-gray-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="px-5 py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    Riwayat Pengiriman Sesi Ini
                  </CardTitle>
                  <span className="text-xs text-gray-400 font-mono">
                    {messageLogs.length} terkirim
                  </span>
                </CardHeader>
                <CardContent className="p-4">
                  {messageLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      Belum ada pesan yang dikirim pada sesi ini.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {messageLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-900 font-mono">{log.recipient}</span>
                            <span className="text-[11px] text-gray-400">{log.timestamp}</span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                            {log.message}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">
                              Layanan MTI
                            </span>
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                              Terkirim
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
