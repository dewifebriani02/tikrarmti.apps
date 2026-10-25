'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBatches } from '@/hooks/useBatches';
import { 
  Award, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  ExternalLink, 
  Trash2, 
  Search, 
  Filter, 
  QrCode, 
  Sliders, 
  Check, 
  Sparkles,
  Info,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface StudentCandidate {
  id: string;
  full_name: string;
  student_id_number: string | null;
  current_juz?: number;
}

interface ParsedItem {
  id: string;
  sessionId: string;
  fileIndex: number;
  fileName: string;
  tempFileName: string;
  pageIndex: number;
  pageNumber: number;
  textSnippet: string;
  detectedJuz: string | null;
  matchedUserId: string | null;
  matchedUserName: string | null;
  matchedNit: string | null;
  confidence: number;
  // Editable fields in UI:
  selectedUserId: string;
  juzNumber: string;
  predicate: string;
  include: boolean;
}

interface IssuedCertificate {
  id: string;
  certificate_number: string;
  user_id: string;
  batch_id: string;
  juz_number: string;
  predicate: string;
  issue_date: string;
  hijri_date: string;
  pdf_url: string;
  qr_code_url: string;
  status: string;
  student_name: string;
  student_nit: string;
  batch_name: string;
  created_at: string;
}

export default function AdminSertifikatPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'list'>('import');

  // Batches
  const { batches, isLoading: batchesLoading } = useBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');

  // Step 1: File Upload
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseSessionId, setParseSessionId] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [availableStudents, setAvailableStudents] = useState<StudentCandidate[]>([]);

  // QR Position Config
  const [qrPreset, setQrPreset] = useState<'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right'>('bottom-right');
  const [qrSize, setQrSize] = useState<number>(70);
  const [qrMargin, setQrMargin] = useState<number>(36);

  // Stamping Progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<any | null>(null);

  // Tab 2: Certificate List
  const [certificates, setCertificates] = useState<IssuedCertificate[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listBatchFilter, setListBatchFilter] = useState('all');

  // Load certificate list
  const fetchCertificates = async () => {
    try {
      setListLoading(true);
      const params = new URLSearchParams();
      if (listBatchFilter && listBatchFilter !== 'all') params.append('batch_id', listBatchFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/certificates?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCertificates(data.certificates || []);
      } else {
        toast.error(data.error || 'Gagal memuat daftar syahadah.');
      }
    } catch (err: any) {
      toast.error('Gagal mengambil data syahadah.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchCertificates();
    }
  }, [activeTab, listBatchFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCertificates();
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setParsedItems([]);
      setParseSessionId(null);
      setProcessResult(null);
    }
  };

  // Parse PDFs
  const handleParsePdf = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Pilih minimal satu file PDF hasil ekspor Canva terlebih dahulu.');
      return;
    }

    try {
      setIsParsing(true);
      const formData = new FormData();
      formData.append('batch_id', selectedBatchId);
      selectedFiles.forEach((file) => formData.append('files', file));

      const res = await fetch('/api/admin/certificates/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Gagal mengekstrak teks dari PDF.');
        return;
      }

      setParseSessionId(data.sessionId);
      setAvailableStudents(data.availableStudents || []);

      const items: ParsedItem[] = data.items.map((it: any) => ({
        ...it,
        selectedUserId: it.matchedUserId || '',
        juzNumber: it.detectedJuz ? `Juz ${it.detectedJuz}` : 'Juz 30',
        predicate: 'Mumtaz',
        include: !!it.matchedUserId, // include automatically if match found
      }));

      setParsedItems(items);
      toast.success(`Berhasil menganalisis ${items.length} lembar sertifikat.`);
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat memproses file PDF.');
    } finally {
      setIsParsing(false);
    }
  };

  // Process & Stamp QR Code
  const handleProcessStamp = async () => {
    const includedItems = parsedItems.filter(it => it.include);
    if (includedItems.length === 0) {
      toast.error('Pilih minimal satu lembar sertifikat untuk diterbitkan.');
      return;
    }

    const unassigned = includedItems.find(it => !it.selectedUserId);
    if (unassigned) {
      toast.error(`Lembar #${unassigned.pageNumber} (${unassigned.fileName}) belum dipasangkan ke santriwati.`);
      return;
    }

    try {
      setIsProcessing(true);
      const payload = {
        sessionId: parseSessionId,
        batchId: selectedBatchId !== 'all' ? selectedBatchId : undefined,
        qrPosition: {
          preset: qrPreset,
          size: qrSize,
          margin: qrMargin,
        },
        items: includedItems.map(it => ({
          tempFileName: it.tempFileName,
          pageIndex: it.pageIndex,
          userId: it.selectedUserId,
          juzNumber: it.juzNumber,
          predicate: it.predicate,
        })),
      };

      const res = await fetch('/api/admin/certificates/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Gagal menstempel sertifikat.');
        return;
      }

      setProcessResult(data);
      toast.success(`Alhamdulillah! Berhasil menstempel dan menerbitkan ${data.totalProcessed} syahadah.`);
      
      // Reset form on success
      setSelectedFiles([]);
      setParsedItems([]);
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat menstempel QR code.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete certificate
  const handleDeleteCertificate = async (id: string, certNumber: string) => {
    if (!confirm(`Yakin ingin mencabut dan menghapus syahadah ${certNumber}?`)) return;

    try {
      const res = await fetch(`/api/admin/certificates?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Sertifikat berhasil dihapus.');
        fetchCertificates();
      } else {
        toast.error(data.error || 'Gagal menghapus sertifikat.');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan koneksi.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 font-sans">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-6 h-6 text-emerald-800" />
            Manajemen Syahadah & Sertifikat Canva
          </h1>
          <p className="text-xs text-gray-700 font-semibold mt-1">
            Impor dokumen PDF hasil desain Canva, tempel dynamic QR Code verifikasi resmi, dan terbitkan langsung ke akun wisudawati.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Import PDF Canva
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'list'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Daftar Syahadah Terbit
          </button>
        </div>
      </div>

      {/* TAB 1: IMPORT & STAMP */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Step 1: Upload Card */}
          <Card className="rounded-2xl border-gray-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                  1
                </span>
                Unggah Berkas PDF Canva
              </CardTitle>
              <CardDescription className="text-xs text-gray-700 font-medium">
                Ekspor sertifikat dari Canva sebagai format "PDF Standar" atau "PDF Cetak". Dapat berupa satu multi-page PDF (seluruh santri) atau beberapa file terpisah.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <Label className="text-xs font-bold text-gray-700">Target Batch / Angkatan</Label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Semua Santri Aktif (Global)</option>
                    {batches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold text-gray-700">Pilih Berkas PDF (.pdf)</Label>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleFileChange}
                    className="mt-1.5 text-xs rounded-xl file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950">
                      {selectedFiles.length} berkas dipilih: {selectedFiles.map(f => f.name).join(', ')}
                    </span>
                  </div>
                  <Button
                    onClick={handleParsePdf}
                    disabled={isParsing}
                    className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold py-1.5 px-3 h-auto"
                  >
                    {isParsing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Mengekstrak Teks & Mencocokkan...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                        Analisis & Cocokkan Santri
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Konfigurasi QR Code & Posisi Stempel */}
          {parsedItems.length > 0 && (
            <Card className="rounded-2xl border-gray-200 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                    2
                  </span>
                  Atur Posisi & Ukuran Stempel QR Code
                </CardTitle>
                <CardDescription className="text-xs text-gray-700 font-medium">
                  Dynamic QR Code akan distempel di atas sertifikat Canva dan langsung menaut ke halaman verifikasi resmi Markaz Tikrar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-gray-700">Preset Posisi</Label>
                    <select
                      value={qrPreset}
                      onChange={(e) => setQrPreset(e.target.value as any)}
                      className="w-full mt-1.5 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="bottom-right">Bawah Kanan (Rekomendasi Standar)</option>
                      <option value="bottom-left">Bawah Kiri</option>
                      <option value="bottom-center">Bawah Tengah</option>
                      <option value="top-right">Atas Kanan</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-gray-700">Ukuran QR (Point / Pixel)</Label>
                    <Input
                      type="number"
                      min={40}
                      max={150}
                      value={qrSize}
                      onChange={(e) => setQrSize(parseInt(e.target.value, 10) || 70)}
                      className="mt-1.5 text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-gray-700">Margin Jarak dari Tepi (Point)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={120}
                      value={qrMargin}
                      onChange={(e) => setQrMargin(parseInt(e.target.value, 10) || 36)}
                      className="mt-1.5 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review Auto-Matched Candidates Table */}
          {parsedItems.length > 0 && (
            <Card className="rounded-2xl border-gray-200 shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                      3
                    </span>
                    Verifikasi Pasangan Lembar PDF & Santriwati ({parsedItems.length} Lembar)
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-700 font-medium">
                    Sistem mendeteksi nama/NIT secara otomatis dari teks Canva. Anda dapat mengoreksi atau mengubah santriwati yang dipasangkan jika diperlukan.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const allSelected = parsedItems.every(i => i.include);
                      setParsedItems(parsedItems.map(i => ({ ...i, include: !allSelected })));
                    }}
                    className="text-xs rounded-xl h-8 px-2.5"
                  >
                    Pilih Semua / Batal
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                        <th className="py-2.5 px-3 w-28">Berkas & Halaman</th>
                        <th className="py-2.5 px-3">Teks Terdireksi</th>
                        <th className="py-2.5 px-3">Santriwati Sasaran</th>
                        <th className="py-2.5 px-3 w-24">Juz</th>
                        <th className="py-2.5 px-3 w-32">Predikat</th>
                        <th className="py-2.5 px-3 w-24 text-center">Status Cocok</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedItems.map((item, idx) => (
                        <tr key={item.id} className={item.include ? 'bg-white' : 'bg-gray-50/60 opacity-60'}>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.include}
                              onChange={(e) => {
                                const newItems = [...parsedItems];
                                newItems[idx].include = e.target.checked;
                                setParsedItems(newItems);
                              }}
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-700">
                            <div className="truncate max-w-[120px] font-semibold text-gray-900" title={item.fileName}>
                              {item.fileName}
                            </div>
                            <span className="text-[10px] text-gray-500 block">
                              Halaman {item.pageNumber}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <p className="text-[11px] text-gray-600 line-clamp-2 italic bg-gray-50 p-1.5 rounded-lg border border-gray-100" title={item.textSnippet}>
                              "{item.textSnippet || '(Teks tidak terdeteksi / gambar utuh)'}"
                            </p>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={item.selectedUserId}
                              onChange={(e) => {
                                const newItems = [...parsedItems];
                                newItems[idx].selectedUserId = e.target.value;
                                setParsedItems(newItems);
                              }}
                              className="w-full text-xs font-medium px-2 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">-- Pilih Santriwati --</option>
                              {availableStudents.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.full_name} {s.student_id_number ? `(${s.student_id_number})` : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.juzNumber}
                              onChange={(e) => {
                                const newItems = [...parsedItems];
                                newItems[idx].juzNumber = e.target.value;
                                setParsedItems(newItems);
                              }}
                              className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-gray-200 bg-white"
                              placeholder="Juz 30"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={item.predicate}
                              onChange={(e) => {
                                const newItems = [...parsedItems];
                                newItems[idx].predicate = e.target.value;
                                setParsedItems(newItems);
                              }}
                              className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-emerald-800"
                            >
                              <option value="Mumtaz">Mumtaz</option>
                              <option value="Jayyid Jiddan">Jayyid Jiddan</option>
                              <option value="Jayyid">Jayyid</option>
                              <option value="Maqbul">Maqbul</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.confidence >= 0.7 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Cocok
                              </span>
                            ) : item.selectedUserId ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Manual
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                Belum Dipilih
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Submit Stamping Process */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-gray-500 font-medium">
                    Total yang akan diterbitkan: <span className="font-black text-gray-900">{parsedItems.filter(i => i.include && i.selectedUserId).length}</span> dari {parsedItems.length} lembar
                  </div>

                  <Button
                    onClick={handleProcessStamp}
                    disabled={isProcessing || parsedItems.filter(i => i.include && i.selectedUserId).length === 0}
                    className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sedang Menstempel & Menerbitkan...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 text-amber-300" />
                        Stempel QR Code & Terbitkan ke Akun Santri
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Process Result Summary */}
          {processResult && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-emerald-950">
                  Laporan Penerbitan Syahadah Selesai
                </h3>
              </div>
              <p className="text-xs text-emerald-800">
                Berhasil menerbitkan <strong>{processResult.totalProcessed}</strong> lembar syahadah resmi. Seluruh dokumen telah distempel dynamic QR Code dan tersimpan di database wisudawati.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => setActiveTab('list')}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold py-2 px-4 shadow-xs"
                >
                  Buka Daftar Syahadah Terbit
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CERTIFICATE LIST */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <Card className="rounded-2xl border-gray-200 shadow-xs">
            <CardContent className="p-4">
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Cari nama santriwati, nomor syahadah, atau NIT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs rounded-xl"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <select
                    value={listBatchFilter}
                    onChange={(e) => setListBatchFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Semua Batch</option>
                    {batches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Button type="submit" className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold py-2 px-4">
                  Cari
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Table Card */}
          <Card className="rounded-2xl border-gray-200 shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-5 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">
                  Daftar Syahadah Resmi Diterbitkan ({certificates.length})
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCertificates}
                disabled={listLoading}
                className="text-xs rounded-xl h-8 px-2.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${listLoading ? 'animate-spin' : ''}`} />
                Muat Ulang
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {listLoading ? (
                <div className="p-12 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                  Memuat data syahadah...
                </div>
              ) : certificates.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-500 space-y-2">
                  <Award className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-bold text-gray-700">Belum ada syahadah yang diterbitkan.</p>
                  <p className="text-[11px] text-gray-400">
                    Gunakan tab "Import PDF Canva" untuk mengimpor dan menstempel sertifikat kelulusan santri.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4">No. Syahadah</th>
                        <th className="py-3 px-4">Nama Santriwati & NIT</th>
                        <th className="py-3 px-4">Program / Batch</th>
                        <th className="py-3 px-4">Juz & Predikat</th>
                        <th className="py-3 px-4">Tanggal Terbit</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {certificates.map((cert) => (
                        <tr key={cert.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-emerald-900">
                            <a
                              href={`/verify/${cert.certificate_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center gap-1 text-emerald-800"
                            >
                              {cert.certificate_number}
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            </a>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-900 block">
                              {cert.student_name || 'Santriwati MTI'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              NIT: {cert.student_nit || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-medium">
                            {cert.batch_name || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-800 block">
                              {cert.juz_number}
                            </span>
                            <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              {cert.predicate}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-[11px]">
                            {cert.issue_date}
                            <span className="block text-[10px] text-gray-400">{cert.hijri_date}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {cert.pdf_url && (
                                <a
                                  href={cert.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 transition-colors"
                                  title="Lihat / Unduh Dokumen PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <a
                                href={`/verify/${cert.certificate_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 transition-colors"
                                title="Buka Halaman Verifikasi"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleDeleteCertificate(cert.id, cert.certificate_number)}
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 transition-colors"
                                title="Cabut / Hapus Syahadah"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
