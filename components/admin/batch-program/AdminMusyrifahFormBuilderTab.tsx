'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Users, Save, X, Edit, AlertCircle, Info, Sparkles, Eye, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getMusyrifahRegistrationQuestionsAdmin,
  updateMusyrifahRegistrationQuestion,
} from '@/app/(protected)/admin/actions';

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
  1: 'Section 1: Data Personal & Kontak Musyrifah/Raisah',
  2: "Section 2: Pengalaman Kepemimpinan & Background Al-Qur'an",
  3: 'Section 3: Preferensi Jadwal & Kesiapan Khidmat',
  4: 'Section 4: Komitmen, Integritas & Akad Musyrifah',
};

export function AdminMusyrifahFormBuilderTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
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
        options: ['radio_options', 'select', 'multi_select', 'radio'].includes(editFormData.input_type)
          ? editFormData.options
          : (editingQuestion.options ?? editFormData.options),
        input_type: editFormData.input_type,
      };

      const result = await updateMusyrifahRegistrationQuestion(editingQuestion.id, updatedData);

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
      const result = await getMusyrifahRegistrationQuestionsAdmin();
      if (result.success && result.data) {
        setQuestions(result.data as Question[]);
      } else {
        toast.error(result.error || 'Gagal memuat pertanyaan Musyrifah/Raisah');
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

      const result = await updateMusyrifahRegistrationQuestion(id, {
        label: targetQuestion.label,
        description: targetQuestion.description,
        warning_text: targetQuestion.warning_text,
        is_active: newStatus,
        is_required: targetQuestion.is_required,
        sort_order: targetQuestion.sort_order,
        options: targetQuestion.options,
        input_type: targetQuestion.input_type,
      });

      if (result.success) {
        toast.success(`Status "${code}" diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}`);
      } else {
        setQuestions(prev =>
          prev.map(q => (q.id === id ? { ...q, is_active: isCurrentlyActive } : q))
        );
        toast.error(result.error || 'Gagal mengubah status');
      }
    } catch (error) {
      setQuestions(prev =>
        prev.map(q => (q.id === id ? { ...q, is_active: isCurrentlyActive } : q))
      );
      toast.error('Terjadi kesalahan sistem');
    }
  };

  const handleToggleRequired = async (id: string, code: string, currentStatus: boolean) => {
    const isCurrentlyRequired = Boolean(currentStatus);
    const newStatus = !isCurrentlyRequired;

    // Optimistic UI update
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, is_required: newStatus } : q))
    );

    try {
      const targetQuestion = questions.find(q => q.id === id);
      if (!targetQuestion) return;

      const result = await updateMusyrifahRegistrationQuestion(id, {
        label: targetQuestion.label,
        description: targetQuestion.description,
        warning_text: targetQuestion.warning_text,
        is_active: targetQuestion.is_active,
        is_required: newStatus,
        sort_order: targetQuestion.sort_order,
        options: targetQuestion.options,
        input_type: targetQuestion.input_type,
      });

      if (result.success) {
        toast.success(`Kewajiban "${code}" diubah menjadi ${newStatus ? 'Wajib' : 'Opsional'}`);
      } else {
        setQuestions(prev =>
          prev.map(q => (q.id === id ? { ...q, is_required: isCurrentlyRequired } : q))
        );
        toast.error(result.error || 'Gagal mengubah status wajib');
      }
    } catch (error) {
      setQuestions(prev =>
        prev.map(q => (q.id === id ? { ...q, is_required: isCurrentlyRequired } : q))
      );
      toast.error('Terjadi kesalahan sistem');
    }
  };

  const handleOpenEditModal = (q: Question) => {
    setEditingQuestion(q);
    setSaveStatus('idle');

    let opts = q.options;
    if (typeof opts === 'string') {
      try {
        opts = JSON.parse(opts);
      } catch (e) {
        opts = [];
      }
    }

    setEditFormData({
      label: q.label,
      description: q.description || '',
      warning_text: q.warning_text || '',
      is_active: q.is_active,
      is_required: q.is_required,
      sort_order: Number(q.sort_order) || 0,
      options: Array.isArray(opts) ? [...opts] : [],
      input_type: q.input_type || 'text',
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
      description: newText,
    }));

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
      const result = await updateMusyrifahRegistrationQuestion(editingQuestion.id, {
        label: editFormData.label,
        description: editFormData.description || null,
        warning_text: editFormData.warning_text || null,
        is_active: editFormData.is_active,
        is_required: editFormData.is_required,
        sort_order: editFormData.sort_order,
        options: ['radio_options', 'select', 'multi_select', 'radio'].includes(editFormData.input_type)
          ? editFormData.options
          : (editingQuestion.options ?? editFormData.options),
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
      <div className="bg-blue-50 border border-blue-200 text-blue-950 p-4 rounded-2xl text-sm flex items-start gap-3 shadow-sm">
        <Users className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Form Builder Dinamis Pendaftaran Musyrifah & Raisah</p>
          <p className="opacity-90">
            Kelola teks pertanyaan formulir calon Musyrifah dan Raisah Markaz Tikrar, termasuk kriteria kepemimpinan, komitmen khidmat, kesiapan jadwal setoran halaqah, dan akad amanah.
            Semua butir pertanyaan disinkronkan secara langsung dengan formulir pendaftaran Musyrifah publik.
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          Total: <span className="font-bold text-gray-700">{questions.length} Butir</span> (
          <span className="font-bold text-blue-700">{questions.filter(q => q.is_active).length} Aktif</span>,
          <span className="font-bold text-indigo-700">{questions.filter(q => q.is_required && q.is_active).length} Wajib</span>)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewingAll(true)}
            className="p-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition-all flex items-center gap-2 shadow-sm"
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

      {isLoading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {[1, 2, 3, 4].map(sectionNum => {
            const sectionQuestions = questions.filter(q => q.section === sectionNum);
            if (sectionQuestions.length === 0) return null;

            return (
              <div key={sectionNum} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="font-bold text-gray-900 text-base">
                    {SECTION_NAMES[sectionNum] || `Section ${sectionNum}`}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {sectionQuestions.length} Butir Pertanyaan
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
                  {sectionQuestions.map(q => (
                    <div
                      key={q.id}
                      className={cn(
                        'p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors',
                        !q.is_active && 'bg-gray-50/70 opacity-60'
                      )}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            {q.field_key}
                          </span>
                          <span className="text-xs font-bold text-gray-400">
                            Urutan: #{q.sort_order}
                          </span>
                          {q.is_required && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              Wajib
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-gray-500 uppercase px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200">
                            {q.input_type || 'text'}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-gray-900 leading-snug">
                          {q.label}
                        </p>

                        {q.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {q.description}
                          </p>
                        )}

                        {q.warning_text && (
                          <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="line-clamp-1">{q.warning_text}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                        {/* Wajib Switch */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-gray-500">Wajib:</span>
                          <button
                            type="button"
                            onClick={() => handleToggleRequired(q.id, q.field_key, q.is_required)}
                            className={cn(
                              'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                              q.is_required ? 'bg-amber-600' : 'bg-gray-200'
                            )}
                          >
                            <span
                              className={cn(
                                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                q.is_required ? 'translate-x-4' : 'translate-x-0'
                              )}
                            />
                          </button>
                        </div>

                        {/* Aktif Switch */}
                        <div className="flex items-center gap-1.5 border-l pl-3 border-gray-200">
                          <span className="text-xs font-medium text-gray-500">Aktif:</span>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(q.id, q.field_key, q.is_active)}
                            className={cn(
                              'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                              q.is_active ? 'bg-blue-600' : 'bg-gray-200'
                            )}
                          >
                            <span
                              className={cn(
                                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                q.is_active ? 'translate-x-4' : 'translate-x-0'
                              )}
                            />
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 border-l pl-3 border-gray-200">
                          <button
                            onClick={() => setPreviewQuestion(q)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Pratinjau Pertanyaan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(q)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Detail Pertanyaan"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL EDIT PERTANYAAN */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-lg">Edit Pertanyaan</h3>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {editingQuestion.field_key}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Perubahan akan otomatis tersimpan dalam hitungan detik (Autosave).
                </p>
              </div>

              {/* Autosave Status Pill */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {saveStatus === 'saving' && (
                    <span className="text-blue-600 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Tersimpan
                    </span>
                  )}
                  {saveStatus === 'dirty' && (
                    <span className="text-amber-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Ada perubahan
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Gagal simpan
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setEditingQuestion(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateQuestion} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {/* Label Pertanyaan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Label Pertanyaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.label}
                  onChange={e => setEditFormData(prev => ({ ...prev, label: e.target.value }))}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Masukkan teks pertanyaan..."
                />
              </div>

              {/* Tipe Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Tipe Input
                  </label>
                  <select
                    value={editFormData.input_type}
                    onChange={e => setEditFormData(prev => ({ ...prev, input_type: e.target.value }))}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="text">Teks Singkat (Text)</option>
                    <option value="textarea">Teks Panjang (Textarea)</option>
                    <option value="radio">Pilihan Tunggal (Radio)</option>
                    <option value="radio_options">Opsi Kartu (Radio Options)</option>
                    <option value="select">Dropdown (Select)</option>
                    <option value="multi_select">Pilihan Ganda (Multi Select)</option>
                    <option value="file">Unggah Berkas / Dokumen (File)</option>
                    <option value="checkbox">Centang / Persetujuan (Checkbox)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Nomor Urut Tampil
                  </label>
                  <input
                    type="number"
                    value={editFormData.sort_order}
                    onChange={e => setEditFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Tampil & Wajib */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active_modal"
                    checked={editFormData.is_active}
                    onChange={e => setEditFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="is_active_modal" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    Aktifkan Pertanyaan
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_required_modal"
                    checked={editFormData.is_required}
                    onChange={e => setEditFormData(prev => ({ ...prev, is_required: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="is_required_modal" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    Wajib Diisi Peserta
                  </label>
                </div>
              </div>

              {/* Opsi Pertanyaan jika Tipe Pilihan */}
              {['radio_options', 'select', 'multi_select', 'radio'].includes(editFormData.input_type) && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Daftar Pilihan Jawaban
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newOption = { value: '', label: '' };
                        setEditFormData(prev => ({
                          ...prev,
                          options: [...prev.options, newOption]
                        }));
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      + Tambah Pilihan
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                    {editFormData.options.map((opt: any, idx: number) => {
                      const isObj = typeof opt === 'object' && opt !== null;
                      const val = isObj ? opt.value : opt;
                      const lbl = isObj ? opt.label : opt;

                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Nilai (Value)"
                            value={val}
                            onChange={e => {
                              const newOpts = [...editFormData.options];
                              if (isObj) {
                                newOpts[idx] = { ...opt, value: e.target.value };
                              } else {
                                newOpts[idx] = e.target.value;
                              }
                              setEditFormData(prev => ({ ...prev, options: newOpts }));
                            }}
                            className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200"
                          />
                          <input
                            type="text"
                            placeholder="Label Tampilan"
                            value={lbl}
                            onChange={e => {
                              const newOpts = [...editFormData.options];
                              if (isObj) {
                                newOpts[idx] = { ...opt, label: e.target.value };
                              } else {
                                newOpts[idx] = e.target.value;
                              }
                              setEditFormData(prev => ({ ...prev, options: newOpts }));
                            }}
                            className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditFormData(prev => ({
                                ...prev,
                                options: prev.options.filter((_: any, i: number) => i !== idx)
                              }));
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-500 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Deskripsi & Tombol Simbol */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Deskripsi / Petunjuk Pengisian
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 mr-1">Simbol:</span>
                    <button
                      type="button"
                      onClick={() => insertSymbol('★')}
                      className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded font-bold text-gray-700"
                      title="Bintang"
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSymbol('•')}
                      className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded font-bold text-gray-700"
                      title="Bullet"
                    >
                      •
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSymbol('✔')}
                      className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded font-bold text-gray-700"
                      title="Centang"
                    >
                      ✔
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSymbol('—')}
                      className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded font-bold text-gray-700"
                      title="Dash"
                    >
                      —
                    </button>
                  </div>
                </div>
                <textarea
                  id="description-textarea"
                  rows={3}
                  value={editFormData.description}
                  onChange={e => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Tambahkan petunjuk opsional atau keterangan teknis..."
                />
              </div>

              {/* Peringatan / Warning Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Peringatan / Catatan Kritis (Opsional)
                </label>
                <input
                  type="text"
                  value={editFormData.warning_text}
                  onChange={e => setEditFormData(prev => ({ ...prev, warning_text: e.target.value }))}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-900 bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  placeholder="Contoh: Amanah ini membutuhkan integritas tinggi dan komitmen waktu harian..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU SATU PERTANYAAN */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">Pratinjau Tampilan Pertanyaan</h3>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  {previewQuestion.label}
                  {previewQuestion.is_required && <span className="text-rose-500">*</span>}
                </label>
                {previewQuestion.description && (
                  <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">
                    {previewQuestion.description}
                  </p>
                )}
                {previewQuestion.warning_text && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5 mt-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{previewQuestion.warning_text}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                {previewQuestion.input_type === 'textarea' ? (
                  <textarea
                    disabled
                    placeholder="Kolom teks panjang jawaban pendaftar..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-400"
                    rows={3}
                  />
                ) : ['radio', 'radio_options'].includes(previewQuestion.input_type || '') ? (
                  <div className="space-y-1.5">
                    {Array.isArray(previewQuestion.options) && previewQuestion.options.map((opt: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-600 flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-300 bg-white" />
                        <span>{typeof opt === 'object' ? opt.label : opt}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <input
                    disabled
                    type="text"
                    placeholder="Kolom isian pendaftar..."
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-400"
                  />
                )}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU SELURUH FORMULIR */}
      {isPreviewingAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="space-y-0.5">
                <h3 className="font-bold text-gray-900 text-lg">Pratinjau Formulir Musyrifah / Raisah</h3>
                <p className="text-xs text-gray-500">
                  Simulasi tampilan seluruh pertanyaan aktif yang akan diisi oleh calon Musyrifah/Raisah.
                </p>
              </div>
              <button
                onClick={() => setIsPreviewingAll(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {[1, 2, 3, 4].map(sectionNum => {
                const sectionQuestions = questions.filter(q => q.section === sectionNum && q.is_active);
                if (sectionQuestions.length === 0) return null;

                return (
                  <div key={sectionNum} className="space-y-4 border-b pb-6 last:border-b-0">
                    <div className="border-l-4 border-blue-600 pl-3">
                      <h4 className="font-bold text-gray-900 text-base">
                        {SECTION_NAMES[sectionNum] || `Bagian ${sectionNum}`}
                      </h4>
                    </div>

                    <div className="space-y-4">
                      {sectionQuestions.map(q => (
                        <div key={q.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                          <label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                            {q.label}
                            {q.is_required && <span className="text-rose-500">*</span>}
                          </label>

                          {q.description && (
                            <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                              {q.description}
                            </p>
                          )}

                          {q.warning_text && (
                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                              <span>{q.warning_text}</span>
                            </div>
                          )}

                          <div className="pt-1">
                            {q.input_type === 'textarea' ? (
                              <textarea
                                disabled
                                placeholder="Jawaban teks panjang..."
                                className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-white text-gray-400"
                                rows={2}
                              />
                            ) : ['radio', 'radio_options'].includes(q.input_type || '') ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Array.isArray(q.options) && q.options.map((opt: any, idx: number) => (
                                  <div key={idx} className="p-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-gray-300" />
                                    <span>{typeof opt === 'object' ? opt.label : opt}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <input
                                disabled
                                type="text"
                                placeholder="Isian pendaftar..."
                                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-400"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsPreviewingAll(false)}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
              >
                Selesai Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
