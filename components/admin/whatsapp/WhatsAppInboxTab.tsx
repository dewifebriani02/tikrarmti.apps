'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Search, RefreshCw, Check, CheckCheck, Clock,
  User, Phone, ExternalLink, CheckCircle2, AlertCircle, Sparkles,
  ArrowDownLeft, ArrowUpRight, Zap, Filter, Archive, CheckSquare
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

export interface WhatsAppConversation {
  id: string;
  phone_number: string;
  display_name: string;
  user_id?: string | null;
  batch_name?: string | null;
  student_id_number?: string | null;
  last_message?: string | null;
  last_message_at: string;
  last_message_direction: 'inbound' | 'outbound';
  unread_count: number;
  status: 'open' | 'resolved' | 'archived';
  profile_pic_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  message_body: string;
  status: 'received' | 'sent' | 'delivered' | 'failed';
  sender_name?: string | null;
  sender_id?: string | null;
  watzap_message_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

const QUICK_REPLIES = [
  {
    label: 'Salam & Sapaan',
    text: "Assalamu'alaikum Warahmatullahi Wabarakatuh Ukhti. Ada yang bisa kami bantu terkait program Markaz Tikrar Indonesia?",
  },
  {
    label: 'Konfirmasi Terima',
    text: "Wa'alaikumussalam Warahmatullahi Wabarakatuh. Baik Ukhti, pesan telah kami terima dan kami catat. Jazakillahu khairan.",
  },
  {
    label: 'Mohon Ditunggu',
    text: "Mohon ditunggu sebentar ya Ukhti, tim administrasi MTI sedang mengecek data akademik Ukhti pada sistem.",
  },
  {
    label: 'Link Dashboard',
    text: "Ukhti dapat mengakses seluruh informasi akademik, jadwal, dan muroja'ah langsung melalui dashboard resmi MTI:\nhttps://markaztikrar.id",
  },
  {
    label: 'Panduan Jurnal Harian',
    text: "Untuk pengisian Jurnal Harian MTI, silakan masuk ke menu Jurnal Harian di tautan berikut:\nhttps://markaztikrar.id/jurnal-harian\nPastikan untuk mengisi sebelum batas evaluasi harian.",
  },
  {
    label: 'Selesai & Doa',
    text: "Alhamdulillah, senang bisa membantu. Semoga Allah mudahkan seluruh ikhtiar muroja'ah dan hafalan Al-Qur'an Ukhti. Barakallahu feekum.",
  },
];

export function WhatsAppInboxTab() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'open' | 'resolved'>('all');
  const [webhookStatus, setWebhookStatus] = useState<{ configured: boolean; webhookUrl?: string | null } | null>(null);
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch Webhook Status
  const checkWebhookStatus = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/webhook-status');
      const data = await res.json();
      if (data.success) {
        setWebhookStatus(data.data);
      }
    } catch (err) {
      console.error('Error fetching webhook status:', err);
    }
  };

  // Connect Webhook
  const handleConnectWebhook = async () => {
    setIsConfiguringWebhook(true);
    try {
      const res = await fetch('/api/admin/whatsapp/webhook-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://markaztikrar.id/api/webhooks/whatsapp' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Webhook WatZap berhasil dihubungkan ke https://markaztikrar.id/api/webhooks/whatsapp');
        checkWebhookStatus();
      } else {
        toast.error(data.error?.message || 'Gagal menghubungkan webhook');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    } finally {
      setIsConfiguringWebhook(false);
    }
  };

  // Fetch Conversations
  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/whatsapp/conversations?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setConversations(data.data.conversations || []);
        setTotalUnread(data.data.totalUnread || 0);

        // If no conversation is selected and we have items, select the first one
        if (!selectedConvId && data.data.conversations?.length > 0) {
          setSelectedConvId(data.data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      if (!silent) toast.error('Gagal memuat percakapan WhatsApp');
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, [searchQuery, statusFilter, selectedConvId]);

  // Fetch Messages for active conversation
  const fetchMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${convId}`);
      const data = await res.json();

      if (data.success) {
        setMessages(data.data.messages || []);
        
        // Auto mark as read if has unread
        if (data.data.conversation?.unread_count > 0) {
          await fetch(`/api/admin/whatsapp/conversations/${convId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAsRead: true }),
          });

          // Optimistically update conversation in list
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
          );
          setTotalUnread((prev) => Math.max(0, prev - 1));
        }

        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      if (!silent) toast.error('Gagal memuat isi pesan');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  // Send Reply
  const handleSendReply = async () => {
    if (!selectedConvId) return;
    const text = replyText.trim();
    if (!text) {
      toast.warning('Tulis pesan balasan terlebih dahulu');
      return;
    }

    setSendingReply(true);
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selectedConvId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Balasan berhasil dikirim via WhatsApp');
        setReplyText('');

        // Append to messages
        if (data.data) {
          setMessages((prev) => [...prev, data.data]);
        }

        // Update conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConvId
              ? {
                  ...c,
                  last_message: text,
                  last_message_at: new Date().toISOString(),
                  last_message_direction: 'outbound',
                  unread_count: 0,
                }
              : c
          )
        );

        setTimeout(scrollToBottom, 100);
      } else {
        toast.error(data.error?.message || 'Gagal mengirim balasan WhatsApp');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat mengirim balasan');
    } finally {
      setSendingReply(false);
    }
  };

  // Toggle Conversation Status (open / resolved)
  const handleToggleStatus = async () => {
    if (!selectedConvId) return;
    const currentConv = conversations.find((c) => c.id === selectedConvId);
    if (!currentConv) return;

    const nextStatus = currentConv.status === 'resolved' ? 'open' : 'resolved';
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selectedConvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          nextStatus === 'resolved'
            ? 'Percakapan ditandai telah selesai'
            : 'Percakapan dibuka kembali'
        );
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, status: nextStatus } : c))
        );
      }
    } catch (err: any) {
      toast.error('Gagal memperbarui status');
    }
  };

  // Keyboard shortcut: Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // Initial load
  useEffect(() => {
    checkWebhookStatus();
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when conversation selection changes
  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
    }
  }, [selectedConvId, fetchMessages]);

  // Auto-poll messages and conversation list every 12 seconds
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      fetchConversations(true);
      if (selectedConvId) {
        fetchMessages(selectedConvId, true);
      }
    }, 12000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedConvId, fetchConversations, fetchMessages]);

  const activeConv = conversations.find((c) => c.id === selectedConvId);

  // Format timestamp helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (isToday) return timeStr;

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Kemarin ${timeStr}`;
    }

    return `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${timeStr}`;
  };

  return (
    <div className="flex flex-col h-[750px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Webhook Status Banner */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                webhookStatus?.configured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                webhookStatus?.configured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Status Webhook WatZap:
          </span>
          {webhookStatus?.configured ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Terhubung Aktif
              <span className="text-slate-400 font-normal">
                ({webhookStatus.webhookUrl || 'https://markaztikrar.id/api/webhooks/whatsapp'})
              </span>
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Belum Dihubungkan
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!webhookStatus?.configured && (
            <Button
              size="sm"
              variant="outline"
              disabled={isConfiguringWebhook}
              onClick={handleConnectWebhook}
              className="h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50"
            >
              <Zap className="h-3 w-3 mr-1" />
              {isConfiguringWebhook ? 'Menghubungkan...' : 'Hubungkan Webhook Sekarang'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              checkWebhookStatus();
              fetchConversations();
              if (selectedConvId) fetchMessages(selectedConvId);
            }}
            className="h-7 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main 2-Column Chat Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Conversation List */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nama, nomor WA, NIT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 h-9 bg-white dark:bg-slate-800 text-xs rounded-xl"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unread')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'unread'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                Belum Dibaca
                {totalUnread > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {totalUnread}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('open')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'open'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                Buka
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('resolved')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'resolved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                Selesai
              </button>
            </div>
          </div>

          {/* Conversations List Scrollable */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loadingList ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <RefreshCw className="h-5 w-5 animate-spin mb-2 text-emerald-600" />
                Memuat daftar percakapan...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-medium text-slate-600 dark:text-slate-400">Belum ada percakapan</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  {searchQuery ? 'Tidak ada hasil yang cocok dengan pencarian.' : 'Pesan masuk dari thalibah akan otomatis tampil di sini saat webhook aktif.'}
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const hasUnread = conv.unread_count > 0;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-sm">
                        {conv.display_name.charAt(0).toUpperCase()}
                      </div>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-600 border-2 border-white dark:border-slate-900 rounded-full" />
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-sm truncate ${
                            hasUnread
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'font-semibold text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {conv.display_name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>

                      {/* Thalibah Batch & NIT */}
                      {(conv.batch_name || conv.student_id_number) && (
                        <div className="flex items-center gap-1 mb-1">
                          {conv.batch_name && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                              {conv.batch_name}
                            </span>
                          )}
                          {conv.student_id_number && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              NIT: {conv.student_id_number}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Last Message Snippet */}
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            hasUnread
                              ? 'font-medium text-slate-800 dark:text-slate-200'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {conv.last_message_direction === 'outbound' && (
                            <span className="text-emerald-600 dark:text-emerald-400 mr-1 font-semibold">
                              Anda:
                            </span>
                          )}
                          {conv.last_message || 'Tidak ada pesan'}
                        </p>

                        {conv.unread_count > 0 && (
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 h-4 min-w-4 px-1 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat History & Reply Bar */}
        <div className="hidden md:flex flex-1 flex-col bg-slate-50/30 dark:bg-slate-900/30">
          {activeConv ? (
            <>
              {/* Active Conversation Top Bar */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {activeConv.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {activeConv.display_name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          activeConv.status === 'resolved'
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                            : 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40'
                        }`}
                      >
                        {activeConv.status === 'resolved' ? 'Selesai' : 'Buka'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3 text-slate-400" />
                        +{activeConv.phone_number}
                      </span>
                      {activeConv.student_id_number && (
                        <span>NIT: <strong className="text-slate-700 dark:text-slate-300">{activeConv.student_id_number}</strong></span>
                      )}
                      {activeConv.batch_name && (
                        <span>Batch: <strong className="text-slate-700 dark:text-slate-300">{activeConv.batch_name}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleStatus}
                    className="h-8 text-xs font-medium"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    {activeConv.status === 'resolved' ? 'Buka Kembali' : 'Tandai Selesai'}
                  </Button>

                  <a
                    href={`https://wa.me/${activeConv.phone_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                    title="Buka percakapan langsung di WhatsApp Web"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    WA Web
                  </a>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => fetchMessages(activeConv.id)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                    title="Refresh percakapan"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Message Bubbles Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                    <RefreshCw className="h-5 w-5 animate-spin mb-2 text-emerald-600" />
                    Memuat riwayat obrolan...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                    <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p>Belum ada riwayat pesan dalam percakapan ini.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-xs text-xs sm:text-sm ${
                            isOutbound
                              ? 'bg-emerald-600 text-white rounded-br-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-bl-xs'
                          }`}
                        >
                          {/* Sender name for admin or thalibah */}
                          <div
                            className={`text-[11px] font-semibold mb-1 flex items-center justify-between gap-3 ${
                              isOutbound ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            <span>{msg.sender_name || (isOutbound ? 'Admin MTI' : activeConv.display_name)}</span>
                          </div>

                          {/* Message Body */}
                          <p className="whitespace-pre-wrap leading-relaxed select-text">
                            {msg.message_body}
                          </p>

                          {/* Timestamp & Status */}
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1.5 ${
                              isOutbound ? 'text-emerald-100/80' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatTime(msg.created_at)}</span>
                            {isOutbound && (
                              <CheckCheck className="h-3 w-3 inline text-emerald-100" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Suggestions Bar */}
              <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 mr-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Balasan Cepat:
                </span>
                {QUICK_REPLIES.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(qr.text)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-[11px] transition-colors"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>

              {/* Reply Input Bar */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Ketik balasan untuk thalibah ini... (Enter untuk kirim, Shift+Enter untuk baris baru)"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sendingReply}
                    className="min-h-[50px] max-h-[140px] text-xs resize-none rounded-xl pr-3 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Pesan akan dikirim langsung via WhatsApp resmi MTI (0813-8884-240).
                  </span>
                </div>

                <Button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-[50px] px-4 rounded-xl flex items-center gap-2 shrink-0 font-semibold text-xs shadow-xs"
                >
                  {sendingReply ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Kirim
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-3">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-1">
                WhatsApp Inbox MTI
              </h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Pilih salah satu kontak thalibah di sebelah kiri untuk melihat riwayat percakapan dan membalas pesan secara langsung.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
