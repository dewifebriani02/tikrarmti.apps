'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, BookOpen, Save, X, Edit, AlertCircle, Info, ShieldCheck, Sparkles, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getMuallimahRegistrationQuestionsAdmin, updateMuallimahRegistrationQuestion, getJuzOptionsAdmin } from '@/app/(protected)/admin/actions';

interface Question {
  id: string;
  field_key: string;
  section: number;
  label: string;
  description: string | null;
  warning_text: string | null;
  is_active: boolean;
  is_required: boolean;
  sort_order: number;
  options: any;
  input_type?: string;
}

const SECTION_NAMES: Record<number, string> = {
  1: 'Section 1: Profil & Latar Belakang',
  2: 'Section 2: Pilihan Program & Akad',
  3: 'Section 3: Akad Komitmen & Etika',
};

export function AdminMuallimahFormBuilderTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [juzList, setJuzList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPreviewingAll, setIsPreviewingAll] = useState(false);

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'dirty' | 'error'>('idle');

  // Modal editing form state
  const [editFormData, setEditFormData] = useState({
    label: '',
    description: '',
    warning_text: '',
    is_active: true,
    is_required: true,
    sort_order: 0,
    options: [] as any[],
    input_type: 'text',
  });

  const isFormDirty = () => {
    if (!editingQuestion) return false;
    const labelChanged = editFormData.label !== editingQuestion.label;
    const descChanged = (editFormData.description || null) !== (editingQuestion.description || null);
    const warnChanged = (editFormData.warning_text || null) !== (editingQuestion.warning_text || null);
    const activeChanged = editFormData.is_active !== editingQuestion.is_active;
    const reqChanged = editFormData.is_required !== editingQuestion.is_required;
    const orderChanged = editFormData.sort_order !== editingQuestion.sort_order;
    const typeChanged = (editFormData.input_type || 'text') !== (editingQuestion.input_type || 'text');
    const optionsChanged = JSON.stringify(editFormData.options || []) !== JSON.stringify(Array.isArray(editingQuestion.options) ? editingQuestion.options : []);
    
    return labelChanged || descChanged || warnChanged || activeChanged || reqChanged || orderChanged || typeChanged || optionsChanged;
  };

  const autoSaveQuestion = async () => {
    if (!editingQuestion) return;
    
    setSaveStatus('saving');
    try {
      const updatedData = {
        label: editFormData.label,
        description: editFormData.description || null,
        warning_text: editFormData.warning_text || null,
        is_active: editFormData.is_active,
        is_required: editFormData.is_required,
        sort_order: editFormData.sort_order,
        options: ["radio_options", "select", "multi_select"].includes(editFormData.input_type) ? editFormData.options : (editingQuestion.options ?? editFormData.options),
        input_type: editFormData.input_type,
      };

      const result = await updateMuallimahRegistrationQuestion(editingQuestion.id, updatedData);

      if (result.success && result.data) {
        setSaveStatus('saved');
        const savedQ = result.data as Question;
        setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? savedQ : q));
        setEditingQuestion(savedQ);
      } else {
        setSaveStatus('error');
        console.error(result.error);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Autosave error:', error);
    }
  };

  // Debounced Autosave Hook
  useEffect(() => {
    if (!editingQuestion) {
      setSaveStatus('idle');
      return;
    }

    if (isFormDirty()) {
      setSaveStatus('dirty');
      const timer = setTimeout(() => {
        autoSaveQuestion();
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setSaveStatus('saved');
    }
  }, [editFormData, editingQuestion]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const [result, juzResult] = await Promise.all([
        getMuallimahRegistrationQuestionsAdmin(),
        getJuzOptionsAdmin(),
      ]);
      if (result.success && result.data) {
        setQuestions(result.data as Question[]);
      } else {
        toast.error(result.error || 'Gagal memuat pertanyaan pendaftaran Mu\'allimah');
      }
      if (juzResult?.success && juzResult.data) {
        setJuzList(juzResult.data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleToggleActive = async (id: string, code: string, currentStatus: boolean) => {
    const isCurrentlyActive = Boolean(currentStatus);
    const newStatus = !isCurrentlyActive;
    
    // Optimistic UI update
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, is_active: newStatus } : q))
    );

    try {
      const targetQuestion = questions.find(q => q.id === id);
      if (!targetQuestion) return;

      const result = await updateMuallimahRegistrationQuestion(id, {
        label: targetQuestion.label,
        description: targetQuestion.description,
        warning_text: targetQuestion.warning_text,
        is_required: Boolean(targetQuestion.is_required),
        sort_order: Number(targetQuestion.sort_order) || 0,
        is_active: newStatus,
        options: targetQuestion.options,
        input_type: targetQuestion.input_type,
      });

      if (result.success) {
        toast.success(`Pertanyaan "${code}" berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      } else {
        // Revert UI if failed
        setQuestions(prev =>
          prev.map(q => (q.id === id ? { ...q, is_active: currentStatus } : q))
        );
        toast.error(result.error || 'Gagal mengubah status pertanyaan');
      }
    } catch (error) {
      // Revert UI if error
      setQuestions(prev =>
        prev.map(q => (q.id === id ? { ...q, is_active: currentStatus } : q))
      );
      console.error('Error toggling active status:', error);
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  const handleOpenEditModal = (q: Question) => {
    setEditingQuestion(q);
    let opts = q.options;
    if (typeof opts === "string") {
      try { opts = JSON.parse(opts); } catch { opts = []; }
    }
    setEditFormData({
      label: q.label,
      description: q.description || "",
      warning_text: q.warning_text || "",
      is_active: Boolean(q.is_active),
      is_required: Boolean(q.is_required),
      sort_order: Number(q.sort_order) || 0,
      options: Array.isArray(opts) ? [...opts] : [],
      input_type: q.input_type || "text",
    });
  };

  const insertSymbol = (symbol: string) => {
    const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editFormData.description || '';
    const newText = text.substring(0, start) + symbol + text.substring(end);

    setEditFormData(prev => ({
      ...prev,
      description: newText
    }));

    // Refocus the textarea and set cursor position after the inserted symbol
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    
    setSaving(true);
    try {
      const result = await updateMuallimahRegistrationQuestion(editingQuestion.id, {
        label: editFormData.label,
        description: editFormData.description || null,
        warning_text: editFormData.warning_text || null,
        is_active: editFormData.is_active,
        is_required: editFormData.is_required,
        sort_order: editFormData.sort_order,
        options: ["radio_options", "select", "multi_select"].includes(editFormData.input_type) ? editFormData.options : (editingQuestion.options ?? editFormData.options),
        input_type: editFormData.input_type,
      });

      if (result.success) {
        toast.success(`Pertanyaan "${editingQuestion.field_key}" berhasil diperbarui!`);
        setEditingQuestion(null);
        fetchQuestions();
      } else {
        toast.error(result.error || 'Gagal memperbarui pertanyaan');
      }
    } catch (error: any) {
      console.error('Error updating question:', error);
      toast.error(error?.message || 'Terjadi kesalahan sistem');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alert Info */}
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-2xl text-sm flex items-start gap-3 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Form Builder Dinamis Pendaftaran Mu'allimah</p>
          <p className="opacity-90">
            Kelola seluruh teks pertanyaan pendaftaran Mu'allimah, petunjuk bantuan, warning alert, serta butir akad komitmen (Section 3) dari halaman ini. 
            Semua field dipetakan ke database. Switch status aktif/nonaktif akan langsung mengubah tampilan formulir pendaftaran Mu'allimah di halaman publik.
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          Total: <span className="font-bold text-gray-700">{questions.length} Butir</span> (
          <span className="font-bold text-green-700">{questions.filter(q => q.is_active).length} Aktif</span>,
          <span className="font-bold text-emerald-700">{questions.filter(q => q.is_required && q.is_active).length} Wajib</span>)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewingAll(true)}
            className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-all flex items-center gap-2 shadow-sm"
            title="Pratinjau Formulir Utuh"
          >
            <Eye className="h-4 w-4" />
            <span className="text-xs font-bold">Pratinjau Formulir</span>
          </button>
          <button
            onClick={fetchQuestions}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition-all flex items-center gap-2"
            title="Refresh Data"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            <span className="text-xs font-bold">Refresh</span>
          </button>
        </div>
      </div>

      {/* Sections and Questions */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
          <p className="text-sm text-gray-500 font-medium">Memuat konfigurasi formulir...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada data pendaftaran Mu'allimah di database.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[1, 2, 3].map((sectionNum) => {
            const sectionQuestions = questions.filter(q => Number(q.section) === sectionNum);
            if (sectionQuestions.length === 0) return null;

            return (
              <div key={sectionNum} className="space-y-4">
                <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  {SECTION_NAMES[sectionNum]}
                </h3>

                <div className="space-y-3">
                  {sectionQuestions.map((q) => {
                    const icon = q.options && typeof q.options === 'object' && !Array.isArray(q.options) ? q.options.icon : null;
                    return (
                      <div
                        key={q.id}
                        className={cn(
                          "bg-white border rounded-2xl p-5 transition-all duration-300 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 hover:shadow-md",
                          q.is_active ? "border-gray-100" : "border-gray-200 bg-gray-50/40 opacity-70"
                        )}
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
                              key: {q.field_key}
                            </span>
                            <span className="text-xs text-gray-400">Order: #{q.sort_order}</span>
                            {q.is_required && q.is_active && (
                              <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                                Wajib
                              </span>
                            )}
                            {!q.is_active && (
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-400 text-[10px] font-bold border border-gray-200">
                                Sembunyi
                              </span>
                            )}
                            {icon && (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                Icon: {icon}
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-gray-900 text-sm leading-snug flex items-center gap-2">
                              {icon && <span className="text-base">{icon}</span>}
                              {q.label}
                            </h4>
                            {q.description && (
                              <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                                <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span>Petunjuk: {q.description}</span>
                              </p>
                            )}
                            {q.warning_text && (
                              <p className="text-xs text-amber-700 mt-1 flex items-start gap-1 bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <span>Peringatan: {q.warning_text}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 flex-shrink-0 justify-between md:justify-end">
                          {/* Active Switch Toggle */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-semibold md:hidden">Aktif:</span>
                          <button
                            onClick={() => handleToggleActive(q.id, q.field_key, q.is_active)}
                            className={cn(
                              "relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:ring-offset-2 p-1",
                              q.is_active ? "bg-emerald-600" : "bg-gray-200"
                            )}
                            title={q.is_active ? "Nonaktifkan" : "Aktifkan"}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out",
                                q.is_active ? "translate-x-8" : "translate-x-0"
                              )}
                            />
                          </button>
                          </div>


                          {/* Preview Button */}
                          <button
                            onClick={() => setPreviewQuestion(q)}
                            className="p-2 rounded-xl border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 text-gray-600 hover:text-emerald-700 transition-all flex items-center gap-1.5 text-xs font-bold"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(q)}
                            className="p-2 rounded-xl border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 text-gray-600 hover:text-emerald-700 transition-all flex items-center gap-1.5 text-xs font-bold"
                          >
                            <Edit className="w-4 h-4" />
                            Edit Teks
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 flex items-center justify-between text-white relative">
              <button
                onClick={() => setEditingQuestion(null)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                  <Edit className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-yellow-300 uppercase tracking-[0.2em] mb-0.5">
                    Field: {editingQuestion.field_key}
                  </div>
                  <h2 className="text-xl font-bold">Edit Teks Pertanyaan</h2>
                </div>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleUpdateQuestion} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Teks Pertanyaan / Butir Akad</label>
                  <textarea
                    required
                    value={editFormData.label}
                    onChange={(e) => setEditFormData({ ...editFormData, label: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Format Jawaban (Tipe Input)</label>
                  <select
                    value={editFormData.input_type}
                    onChange={(e) => setEditFormData({ ...editFormData, input_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 text-sm bg-white"
                  >
                    <option value="text">Teks Pendek (Text)</option>
                    <option value="textarea">Teks Panjang (Textarea)</option>
                    <option value="radio">Radio (Ya/Tidak)</option>
                    <option value="radio_options">Radio Pilihan Ganda (Single Select)</option>
                    <option value="checkbox">Checkbox (Satu Pilihan)</option>
                    <option value="select">Dropdown Pilihan (Select)</option>
                    <option value="multi_select">Multi-Pilihan (Grid/Multiple Checkbox)</option>
                    <option value="file">Upload Berkas (File)</option>
                    <option value="number">Angka (Number)</option>
                    <option value="time">Waktu (Time)</option>
                    <option value="info">Informasi (Non-input/Keterangan saja)</option>
                  </select>
                </div>

                {editingQuestion.section !== 3 && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        {['radio', 'checkbox'].includes(editFormData.input_type) 
                          ? 'Teks Pilihan Jawaban (Radio/Checkbox)' 
                          : 'Deskripsi / Teks Bantuan (Opsional)'}
                      </label>
                      {['radio', 'checkbox'].includes(editFormData.input_type) && (
                        <p className="text-[10px] text-emerald-600 font-bold mb-1.5">
                          ℹ️ Teks ini adalah kalimat pilihan jawaban yang akan dicentang/diklik oleh user di formulir.
                        </p>
                      )}
                      
                      {/* Symbol Toolbar */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2 p-1.5 bg-gray-50 border border-gray-200 rounded-xl">
                        <span className="text-[10px] font-bold text-gray-400 px-1">Sisipkan Simbol:</span>
                        <button
                          type="button"
                          onClick={() => insertSymbol('• ')}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-bold text-gray-700 hover:text-emerald-700 transition-all shadow-sm"
                          title="Bullet point"
                        >
                          • Bullet
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSymbol('🤝 ')}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-bold text-gray-700 hover:text-emerald-700 transition-all shadow-sm"
                          title="Janji / Komitmen"
                        >
                          🤝 Janji
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSymbol('⚠️ ')}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-bold text-gray-700 hover:text-emerald-700 transition-all shadow-sm"
                          title="Peringatan"
                        >
                          ⚠️ Warning
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSymbol('✓ ')}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-bold text-gray-700 hover:text-emerald-700 transition-all shadow-sm"
                          title="Tanda Centang"
                        >
                          ✓ Check
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSymbol('📖 ')}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-bold text-gray-700 hover:text-emerald-700 transition-all shadow-sm"
                          title="Buku / Bacaan"
                        >
                          📖 Baca
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSymbol('🎯 ')}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-bold text-gray-700 hover:text-emerald-700 transition-all shadow-sm"
                          title="Target"
                        >
                          🎯 Target
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSymbol('⭐ ')}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-bold text-gray-700 hover:text-emerald-700 transition-all shadow-sm"
                          title="Bintang"
                        >
                          ⭐ Star
                        </button>
                      </div>

                      <textarea
                        id="description-textarea"
                        value={editFormData.description}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        rows={10}
                        placeholder="Teks petunjuk pengisian..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Teks Peringatan / Warning Alert (Opsional)</label>
                      <textarea
                        value={editFormData.warning_text}
                        onChange={(e) => setEditFormData({ ...editFormData, warning_text: e.target.value })}
                        rows={3}
                        placeholder="Akan ditampilkan sebagai kotak alert kuning..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 text-sm"
                      />
                    </div>
                  </>
                )}

                {editingQuestion.field_key === 'preferred_juz' ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-2.5">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Pilihan Dinamis Terhubung ke Pengaturan Pilihan Juz
                    </div>
                    <p className="text-emerald-800 leading-relaxed">
                      Pilihan juz yang bersedia diampu mu'allimah terhubung langsung secara dinamis dengan database (tabel <code className="bg-emerald-100/60 px-1 py-0.5 rounded font-mono text-[10px]">juz_options</code>). Pertanyaan ini otomatis menyajikan daftar juz yang diaktifkan di tab <strong>Pengaturan Pilihan Juz</strong> dan dicocokkan dengan hafalan masing-masing mu'allimah.
                    </p>
                    <div className="pt-2 border-t border-emerald-200/60 space-y-1.5">
                      <span className="font-semibold text-emerald-900 block">
                        Juz Aktif ({juzList.filter(j => j.is_active).length} bagian terbuka):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {juzList.filter(j => j.is_active).map(j => (
                          <span key={j.id} className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 font-mono text-[11px] font-bold text-emerald-700 shadow-xs">
                            {j.code}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-700/80 italic">
                      💡 Untuk mengaktifkan atau menonaktifkan juz yang dapat diampu, silakan beralih ke tab <strong>Pengaturan Pilihan Juz</strong>.
                    </p>
                  </div>
                ) : ['radio_options', 'select', 'multi_select'].includes(editFormData.input_type) && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Pilihan Jawaban (Options)</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                      {editFormData.options && editFormData.options.length > 0 ? (
                        editFormData.options.map((opt: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                            <div className="flex-1 space-y-1">
                              <input
                                type="text"
                                placeholder="Label Opsi (e.g. Ya, Saya Bersedia)"
                                value={opt.label || ''}
                                onChange={(e) => {
                                  const newOptions = [...editFormData.options];
                                  newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                                  setEditFormData({ ...editFormData, options: newOptions });
                                }}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-emerald-700"
                              />
                              <input
                                type="text"
                                placeholder="Value Opsi (e.g. yes, ready)"
                                value={opt.value || ''}
                                onChange={(e) => {
                                  const newOptions = [...editFormData.options];
                                  newOptions[idx] = { ...newOptions[idx], value: e.target.value };
                                  setEditFormData({ ...editFormData, options: newOptions });
                                }}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-[10px] font-mono focus:outline-none focus:border-emerald-700 bg-gray-50/50"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newOptions = editFormData.options.filter((_, i) => i !== idx);
                                setEditFormData({ ...editFormData, options: newOptions });
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="Hapus opsi"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 p-3 text-center">Belum ada pilihan jawaban. Tambahkan di bawah.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = [...(editFormData.options || []), { label: '', value: '' }];
                        setEditFormData({ ...editFormData, options: newOptions });
                      }}
                      className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-200 hover:border-emerald-300 rounded-xl text-xs font-bold text-emerald-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      + Tambah Pilihan Jawaban
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">No. Urut (Sort Order)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editFormData.sort_order}
                      onChange={(e) => setEditFormData({ ...editFormData, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Wajib Diisi (Required)</label>
                    <select
                      value={editFormData.is_required ? 'true' : 'false'}
                      onChange={(e) => setEditFormData({ ...editFormData, is_required: e.target.value === 'true' })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 text-sm bg-white"
                    >
                      <option value="true">Wajib</option>
                      <option value="false">Opsional</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active_modal"
                    checked={editFormData.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <label htmlFor="is_active_modal" className="text-xs font-bold text-gray-600 uppercase cursor-pointer selection:bg-transparent">
                    Aktif (Tampilkan di Formulir)
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
                <div className="flex-1 text-left">
                  {saveStatus === 'saving' && (
                    <span className="text-[11px] text-amber-600 flex items-center gap-1.5 font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                      Menyimpan otomatis...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-bold">
                      ✓ Tersimpan otomatis
                    </span>
                  )}
                  {saveStatus === 'dirty' && (
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      ● Ada perubahan belum disimpan...
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-[11px] text-red-600 flex items-center gap-1 font-bold">
                      ✗ Gagal menyimpan otomatis
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingQuestion(null)}
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all"
                  >
                    {saveStatus === 'saved' ? 'Tutup' : 'Batal'}
                  </button>
                  <button
                    type="submit"
                    disabled={saving || saveStatus === 'saved'}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Form Preview Modal */}
      {isPreviewingAll && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 flex items-center justify-between text-white relative">
              <button
                onClick={() => setIsPreviewingAll(false)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-yellow-300 uppercase tracking-[0.2em] mb-0.5">
                    Pratinjau Formulir Publik (Mu'allimah)
                  </div>
                  <h2 className="text-xl font-bold">Pratinjau Seluruh Formulir</h2>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">
              {[1, 2, 3].map((sectionNum) => {
                const activeSecQuestions = questions
                  .filter(q => Number(q.section) === sectionNum && Boolean(q.is_active))
                  .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

                if (activeSecQuestions.length === 0) return null;

                return (
                  <div key={sectionNum} className="space-y-4">
                    <div className="bg-emerald-100/50 text-emerald-950 border border-emerald-200/50 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider">
                      {SECTION_NAMES[sectionNum]}
                    </div>
                    <div className="space-y-4">
                      {activeSecQuestions.map((q) => (
                        <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
                          <label className="block text-sm font-bold text-gray-800 leading-snug">
                            {q.label}
                            {q.is_required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>

                          {q.description && (
                            <p className="text-xs text-gray-500 leading-normal whitespace-pre-line">
                              {q.description}
                            </p>
                          )}

                          {q.warning_text && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs leading-normal flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <span>{q.warning_text}</span>
                            </div>
                          )}

                          <MuallimahMockInputField q={q} juzList={juzList} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewingAll(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 flex items-center justify-between text-white relative">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-yellow-300 uppercase tracking-[0.2em] mb-0.5">
                    Pratinjau Formulir Publik
                  </div>
                  <h2 className="text-xl font-bold">Pratinjau Item</h2>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  TAMPILAN DI FORMULIR PENDAFTARAN:
                </div>

                {/* Simulated Form Container */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-md space-y-3 relative overflow-hidden">
                  {!previewQuestion.is_active && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                      Disembunyikan (Nonaktif)
                    </div>
                  )}

                  <label className="block text-sm font-bold text-gray-800 leading-snug">
                    {previewQuestion.label}
                    {previewQuestion.is_required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>

                  {previewQuestion.description && (
                    <p className="text-xs text-gray-500 leading-normal">
                      {previewQuestion.description}
                    </p>
                  )}

                  {previewQuestion.warning_text && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs leading-normal flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>{previewQuestion.warning_text}</span>
                    </div>
                  )}

                  {/* Render the mock field */}
                  <MuallimahMockInputField q={previewQuestion} juzList={juzList} />
                </div>

                {/* Info Metadata */}
                <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3.5 space-y-1.5 text-xs text-emerald-950">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-950">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    Detail Parameter Database:
                  </div>
                  <div><span className="font-semibold">Nama Field:</span> <code className="bg-emerald-100/60 px-1 py-0.5 rounded font-mono text-[11px] text-emerald-800">{previewQuestion.field_key}</code></div>
                  <div><span className="font-semibold">Seksi Formulir:</span> Seksi {previewQuestion.section}</div>
                  <div><span className="font-semibold">Status Wajib:</span> {previewQuestion.is_required ? 'Wajib diisi (Required)' : 'Opsional'}</div>
                  <div><span className="font-semibold">No. Urut (Sorting):</span> #{previewQuestion.sort_order}</div>
                  <div><span className="font-semibold">Format Jawaban:</span> <code className="bg-emerald-100/60 px-1 py-0.5 rounded font-mono text-[11px] text-emerald-800">{previewQuestion.input_type || 'text'}</code></div>
                  {previewQuestion.field_key === 'preferred_juz' && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60 text-emerald-900 font-medium">
                      ℹ️ <strong>Sumber Opsi:</strong> Terhubung otomatis ke tabel <code>juz_options</code> (Pengaturan Pilihan Juz). Pilihan juz yang dapat diampu mu'allimah mengikuti juz yang statusnya aktif pada batch berjalan ({juzList.filter(j => j.is_active).length} bagian aktif).
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white transition-all shadow-sm"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MuallimahMockInputField({ q, juzList = [] }: { q: any; juzList?: any[] }) {
  const isPreferredJuz = q.field_key === 'preferred_juz';
  const activeJuzList = juzList.filter((j: any) => j.is_active);
  const uniqueActiveJuzNumbers = Array.from(new Set(activeJuzList.map((j: any) => Number(j.juz_number)))).sort((a, b) => a - b);
  const inputType = q.input_type || 'text';
  const options = Array.isArray(q.options) ? q.options : [];
  const icon = q.options && typeof q.options === 'object' && !Array.isArray(q.options) ? q.options.icon : null;

  const INPUT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    'radio': { label: 'Radio (Ya/Tidak)', color: 'bg-blue-100 text-blue-800' },
    'radio_options': { label: 'Radio Pilihan Ganda', color: 'bg-indigo-100 text-indigo-800' },
    'checkbox': { label: 'Checkbox', color: 'bg-green-100 text-green-800' },
    'text': { label: 'Teks Pendek', color: 'bg-gray-100 text-gray-800' },
    'textarea': { label: 'Teks Panjang', color: 'bg-amber-100 text-amber-800' },
    'select': { label: 'Dropdown Pilihan', color: 'bg-purple-100 text-purple-800' },
    'multi_select': { label: 'Multi-Pilihan (Grid)', color: 'bg-pink-100 text-pink-800' },
    'file': { label: 'Upload Berkas', color: 'bg-orange-100 text-orange-800' },
    'number': { label: 'Angka', color: 'bg-teal-100 text-teal-800' },
    'time': { label: 'Waktu', color: 'bg-cyan-100 text-cyan-800' },
    'info': { label: 'Informasi (Non-input)', color: 'bg-slate-100 text-slate-800' },
  };

  const typeInfo = INPUT_TYPE_LABELS[inputType] || { label: inputType, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${typeInfo.color}`}>
          {typeInfo.label}
        </span>
      </div>
      {inputType === 'radio' && (
        <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
          <input type="radio" className="mt-0.5 w-5 h-5 text-emerald-600 focus:ring-emerald-500" disabled checked />
          <span className="text-xs text-gray-500 font-medium">{q.description || 'Ya, saya setuju'}</span>
        </div>
      )}
      {inputType === 'radio_options' && (
        <div className="space-y-2">
          {options.length > 0 ? options.map((opt: any, idx: number) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
              <input type="radio" name={`preview_${q.field_key}`} className="mt-0.5 w-5 h-5 text-emerald-600" disabled />
              <span className="text-xs text-gray-600 font-medium">{opt.label || opt.value || `Opsi ${idx + 1}`}</span>
            </div>
          )) : (
            <>
              <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <input type="radio" className="mt-0.5 w-5 h-5 text-emerald-600" disabled />
                <span className="text-xs text-gray-500 font-medium">Opsi A (contoh)</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <input type="radio" className="mt-0.5 w-5 h-5 text-emerald-600" disabled />
                <span className="text-xs text-gray-500 font-medium">Opsi B (contoh)</span>
              </div>
            </>
          )}
        </div>
      )}
      {inputType === 'checkbox' && (
        <div className="flex gap-3 items-start p-3 bg-gray-50 border border-gray-100 rounded-xl">
          <input type="checkbox" className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5 mt-0.5" disabled />
          <span className="text-xs text-gray-500 font-medium">
            {icon && <span className="mr-1">{icon}</span>}
            {q.description || 'Saya memahami dan bersedia berkomitmen dengan butir di atas.'}
          </span>
        </div>
      )}
      {inputType === 'text' && (
        <input
          type="text"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 text-gray-400 font-medium"
          placeholder={q.description || 'Ketik jawaban Ukhti di sini...'}
          disabled
        />
      )}
      {inputType === 'textarea' && (
        <textarea
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 text-gray-400 font-medium"
          rows={3}
          placeholder={q.description || 'Tuliskan jawaban Ukhti di sini...'}
          disabled
        />
      )}
      {inputType === 'select' && (
        <select className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-400 font-medium" disabled>
          <option>{q.description || 'Pilih salah satu opsi...'}</option>
          {options.map((opt: any, idx: number) => (
            <option key={idx}>{opt.label || opt.value || `Opsi ${idx + 1}`}</option>
          ))}
        </select>
      )}
      {isPreferredJuz ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Dinamis: Terhubung ke Pengaturan Pilihan Juz ({activeJuzList.length} bagian aktif)
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            {uniqueActiveJuzNumbers.length > 0 ? (
              uniqueActiveJuzNumbers.map((num) => {
                const parts = activeJuzList.filter((j: any) => Number(j.juz_number) === num).map((j: any) => j.part).join(' & ');
                return (
                  <div key={num} className="flex flex-col items-center justify-center p-2.5 bg-white border border-emerald-200 rounded-lg shadow-xs text-center">
                    <span className="text-xs font-bold text-emerald-800">Juz {num}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">Bagian {parts}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 p-2 text-center col-span-full">Tidak ada juz aktif di Pengaturan Pilihan Juz.</p>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            * Pada formulir pendaftaran, mu'allimah dapat mencentang juz aktif di atas yang sesuai dengan riwayat hafalan yang telah disetorkan.
          </p>
        </div>
      ) : inputType === 'multi_select' ? (
        <div className="grid grid-cols-5 gap-1.5">
          {[1,2,3,4,5,6].map(n => (
            <div key={n} className="flex items-center gap-1.5 p-1.5 bg-gray-50 border border-gray-100 rounded-lg">
              <input type="checkbox" className="rounded text-emerald-600 w-3.5 h-3.5" disabled />
              <span className="text-[10px] text-gray-400 font-medium">Juz {n}</span>
            </div>
          ))}
        </div>
      ) : null}
      {inputType === 'file' && (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center bg-gray-50">
          <div className="mx-auto w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          <span className="text-xs text-gray-500 font-bold block">Pilih berkas untuk diunggah</span>
          <span className="text-[10px] text-gray-400 block mt-1">PDF, JPG, PNG maks. 2MB</span>
        </div>
      )}
      {inputType === 'number' && (
        <input
          type="number"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 text-gray-400 font-medium"
          placeholder="0"
          disabled
        />
      )}
      {inputType === 'time' && (
        <input
          type="time"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 text-gray-400 font-medium"
          disabled
        />
      )}
      {inputType === 'info' && (
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 space-y-1.5 whitespace-pre-line font-medium">
          {q.description || 'ℹ️ Elemen informasi (bukan input). Tuliskan detail informasi di kolom deskripsi.'}
        </div>
      )}
    </div>
  );
}
