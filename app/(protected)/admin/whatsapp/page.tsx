'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, Send, CheckCircle2, AlertCircle, RefreshCw, 
  ArrowLeft, Shield, Phone, User, Search, Clock, Sparkles, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WhatsAppStatus {
  configured: boolean;
  metaCloudApi: {
    configured: boolean;
    phoneNumberId?: string;
    wabaId?: string;
    verifiedName?: string;
    displayPhoneNumber?: string;
    status?: string;
  };
  watzap: {
    configured: boolean;
    apiKeyConfigured: boolean;
    numberKeyConfigured: boolean;
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

const QUICK_TEMPLATES = [
  {
    id: 'test',
    label: 'Uji Coba Integrasi',
    body: (name: string) => 
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nHai ${name || 'Ukhti'},\n\nIni adalah pesan konfirmasi bahwa nomor WhatsApp resmi Markaz Tikrar Indonesia (MTI) telah terhubung aktif.\n\nTerima kasih atas partisipasi Ukhti.\nBarakallahu fiikum.`,
  },
  {
    id: 'kelulusan_cbt',
    label: 'Kelulusan Ujian CBT & Daftar Ulang',
    body: (name: string) => 
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nAlhamdulillah, selamat kepada ${name || 'Ukhti'}!\n\nUkhti dinyatakan *LULUS* seleksi Ujian CBT Markaz Tikrar Indonesia (MTI).\n\nSilakan segera mengakses dashboard MTI untuk menyelesaikan proses Akad & Daftar Ulang:\n🔗 https://markaztikrar.id/daftar-ulang\n\nBatas waktu daftar ulang adalah 2x24 jam sejak pengumuman ini.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`,
  },
  {
    id: 'reminder_halaqah',
    label: 'Pengingat Jadwal Halaqah',
    body: (name: string) => 
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nPengingat Halaqah Tikrar untuk ${name || 'Ukhti'}:\n\nHalaqah bimbingan akan dimulai dalam 30 menit. Mohon mempersiapkan mushaf dan hadir tepat waktu di ruang Zoom:\n🔗 https://markaztikrar.id/halaqah\n\nSemoga Allah memudahkan muroja'ah kita hari ini. Aamiin.`,
  },
  {
    id: 'sp_jurnal',
    label: 'Peringatan Surat Peringatan (SP) Jurnal',
    body: (name: string) => 
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nPemberitahuan Administrasi MTI untuk ${name || 'Ukhti'}:\n\nBerdasarkan evaluasi mingguan, tercatat Ukhti belum melengkapi Jurnal Harian Tikrar. Mohon segera mengisi jurnal dan konfirmasi ke Musyrifah pendamping sebelum batas waktu evaluasi berakhir.\n\nDashboard Jurnal: https://markaztikrar.id/jurnal-harian\n\nJazakillahu khairan katsiran.`,
  },
];

export default function AdminWhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Form state
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [messageBody, setMessageBody] = useState(QUICK_TEMPLATES[0].body(''));
  const [selectedTemplate, setSelectedTemplate] = useState('test');
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: string;
  } | null>(null);

  // User search state
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

  useEffect(() => {
    fetchStatus();
    // Load local logs if exists
    try {
      const saved = localStorage.getItem('mti_wa_logs');
      if (saved) setMessageLogs(JSON.parse(saved));
    } catch {}
  }, []);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = QUICK_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setMessageBody(tmpl.body(recipientName));
    }
  };

  const handleRecipientNameChange = (name: string) => {
    setRecipientName(name);
    const tmpl = QUICK_TEMPLATES.find(t => t.id === selectedTemplate);
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
      console.error('User search failed:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleSelectUser = (user: { full_name: string; whatsapp?: string }) => {
    setRecipientName(user.full_name);
    if (user.whatsapp) {
      setRecipientPhone(user.whatsapp);
    }
    const tmpl = QUICK_TEMPLATES.find(t => t.id === selectedTemplate);
    if (tmpl) {
      setMessageBody(tmpl.body(user.full_name));
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim() || !messageBody.trim()) {
      setSendFeedback({
        type: 'error',
        text: 'Nomor WhatsApp dan isi pesan tidak boleh kosong.',
      });
      return;
    }

    setIsSending(true);
    setSendFeedback(null);

    try {
      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone,
          message: messageBody,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        const newLog: MessageLog = {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          recipient: recipientPhone,
          message: messageBody,
          status: 'sent',
          provider: json.data?.provider || 'meta_cloud_api',
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
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                    Official Cloud API
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                disabled={isLoadingStatus}
                className="rounded-xl border-gray-200 text-xs font-semibold gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                Periksa Status
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Connection Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-gray-200/80 shadow-sm rounded-2xl bg-gradient-to-br from-emerald-50/50 via-white to-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Phone className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Nomor Pengirim Resmi</div>
                <div className="text-lg font-bold text-gray-900 truncate">
                  {status?.metaCloudApi?.displayPhoneNumber || '+1 711-990-1067'}
                </div>
                <div className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Verified: {status?.metaCloudApi?.verifiedName || 'Hi AQLI'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200/80 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Shield className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Platform & API</div>
                <div className="text-sm font-bold text-gray-900 truncate">
                  Meta WhatsApp Cloud API
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Phone ID: <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded font-mono">{status?.metaCloudApi?.phoneNumberId || '1309978788874615'}</code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200/80 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Kapasitas Pengiriman</div>
                <div className="text-sm font-bold text-gray-900">
                  250 Pesan / Hari (Tier 1)
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  WatZap Gateway: {status?.watzap?.configured ? 'Tersedia (Backup)' : 'Aktif'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form: Compose Message (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-gray-200/80 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-100 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-emerald-600" />
                      Kirim Pesan WhatsApp
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      Kirim pesan langsung ke santri, musyrifah, atau pendaftar baru MTI.
                    </p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                    Direct Send
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                {/* Search / Pick Student */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Cari Santri / Penerima dari Database</span>
                    <span className="text-[11px] text-gray-400 font-normal">Opsional</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Ketik nama atau email santri..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchUsers())}
                        className="pl-9 rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleSearchUsers}
                      disabled={isSearchingUsers || !searchQuery.trim()}
                      variant="outline"
                      className="rounded-xl border-gray-200 text-xs font-semibold px-4"
                    >
                      {isSearchingUsers ? 'Mencari...' : 'Cari'}
                    </Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="p-2 border border-gray-200 rounded-2xl bg-white shadow-lg space-y-1 mt-1">
                      <div className="text-[11px] font-bold text-gray-400 px-2 py-1 uppercase">Pilih Santri:</div>
                      {searchResults.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleSelectUser(u)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{u.full_name}</div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                          </div>
                          <Badge variant="outline" className="text-xs font-mono bg-white">
                            {u.whatsapp || 'Tanpa WA'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Recipient Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Nomor WhatsApp Tujuan *
                      </label>
                      <Input
                        type="text"
                        placeholder="Contoh: 08567712914"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        className="rounded-xl border-gray-200 font-mono text-sm"
                        required
                      />
                      <span className="text-[11px] text-gray-400">
                        Format dapat dimulai dengan 08... atau 628...
                      </span>
                    </div>

                    {/* Recipient Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Nama Penerima
                      </label>
                      <Input
                        type="text"
                        placeholder="Nama Santri"
                        value={recipientName}
                        onChange={(e) => handleRecipientNameChange(e.target.value)}
                        className="rounded-xl border-gray-200 text-sm"
                      />
                      <span className="text-[11px] text-gray-400">
                        Akan disisipkan ke dalam pesan template
                      </span>
                    </div>
                  </div>

                  {/* Template Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Pilihan Template Cepat
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {QUICK_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => handleTemplateChange(tmpl.id)}
                          className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
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

          {/* Right Column: Live WA Preview & Logs (5 cols) */}
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
                      <div className="text-xs font-bold text-gray-800">Hi AQLI • MTI Official</div>
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
                            {log.provider}
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
      </div>
    </div>
  );
}
