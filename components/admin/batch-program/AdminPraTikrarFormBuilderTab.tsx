'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, BookOpen, Save, X, Edit, AlertCircle, Info, Sparkles, Eye, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getPraTikrarRegistrationQuestionsAdmin,
  updatePraTikrarRegistrationQuestion,
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
  1: 'Section 1: Komitmen & Simulasi',
  2: 'Section 2: Izin & Pilihan Program',
  3: 'Section 3: Waktu Setoran',
  4: 'Section 4: Pemahaman Program & Pertanyaan',
};

export function AdminPraTikrarFormBuilderTab() {
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

      const result = await updatePraTikrarRegistrationQuestion(editingQuestion.id, updatedData);

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
      const result = await getPraTikrarRegistrationQuestionsAdmin();
      if (result.success && result.data) {
        setQuestions(result.data as Question[]);
      } else {
        toast.error(result.error || 'Gagal memuat pertanyaan Pra-Tikrar');
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

      const result = await updatePraTikrarRegistrationQuestion(id, {
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

      const result = await updatePraTikrarRegistrationQuestion(id, {
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
      const result = await updatePraTikrarRegistrationQuestion(editingQuestion.id, {
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
      <div className="bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-950 p-4 rounded-2xl text-sm flex items-start gap-3 shadow-sm">
        <Sparkles className="w-5 h-5 text-fuchsia-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Form Builder Dinamis Pendaftaran Pra-Tikrar (Tahsin Dasar)</p>
          <p className="opacity-90">
            Kelola teks pertanyaan formulir Pra-Tikrar, simulasi bacaan Surah An-Naba, akad komitmen, jadwal setoran, dan batas izin wali dari panel ini.
            Semua butir pertanyaan dipetakan langsung ke formulir pendaftaran Pra-Tikrar publik.
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          Total: <span className="font-bold text-gray-700">{questions.length} Butir</span> (
          <span className="font-bold text-fuchsia-700">{questions.filter(q => q.is_active).length} Aktif</span>,
          <span className="font-bold text-purple-700">{questions.filter(q => q.is_required && q.is_active).length} Wajib</span>)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewingAll(true)}
            className="p-2.5 rounded-xl bg-fuchsia-700 hover:bg-fuchsia-800 text-white transition-all flex items-center gap-2 shadow-sm"
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
          <RefreshCw className="h-8 w-8 text-fuchsia-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {[1, 2, 3, 4].map(sectionNum => {
            const sectionQuestions = questions.filter(q => q.section === sectionNum);
            if (sectionQuestions.length === 0) return null;

            return (
              <div key={sectionNum} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-600" />
                  <h3 className="font-bold text-gray-900 text-base">
                    {SECTION_NAMES[sectionNum] || `Section ${sectionNum}`}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-800">
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
                          <span className="text-xs font-mono font-bold text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200 px-2 py-0.5 rounded-md">
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
                              q.is_active ? 'bg-fuchsia-600' : 'bg-gray-200'
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

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(q)}
                          className="p-2 rounded-xl text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 transition-all font-bold text-xs flex items-center gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-fuchsia-900 to-purple-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-fuchsia-200">
                  Pra-Tikrar Field: {editingQuestion.field_key}
                </span>
                <h3 className="text-lg font-black text-white">Edit Butir Pertanyaan</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateQuestion} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Label / Pertanyaan Utama *</label>
                <input
                  type="text"
                  required
                  value={editFormData.label}
                  onChange={e => setEditFormData(prev => ({ ...prev, label: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-600 outline-none text-sm transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase">Petunjuk Tambahan / Deskripsi</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertSymbol('✅')}
                      className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-xs text-gray-700"
                    >
                      + ✅
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSymbol('•')}
                      className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-xs text-gray-700"
                    >
                      + •
                    </button>
                  </div>
                </div>
                <textarea
                  id="description-textarea"
                  rows={4}
                  value={editFormData.description}
                  onChange={e => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-600 outline-none text-sm transition-all"
                  placeholder="Informasi detail, bullet point penjelasan, atau komitmen..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Teks Peringatan / Warning Alert</label>
                <input
                  type="text"
                  value={editFormData.warning_text}
                  onChange={e => setEditFormData(prev => ({ ...prev, warning_text: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-600 outline-none text-sm transition-all"
                  placeholder="Muncul sebagai alert box merah jika diisi..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">Tipe Input Form</label>
                  <select
                    value={editFormData.input_type}
                    onChange={e => setEditFormData(prev => ({ ...prev, input_type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-600 outline-none text-sm transition-all bg-white"
                  >
                    <option value="text">Text (Singkat)</option>
                    <option value="textarea">Textarea (Panjang)</option>
                    <option value="select">Dropdown Select</option>
                    <option value="radio">Radio Buttons</option>
                    <option value="checkbox">Checkbox Persetujuan</option>
                    <option value="info">Informasi Statis</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">Urutan Tampil (#)</label>
                  <input
                    type="number"
                    value={editFormData.sort_order}
                    onChange={e => setEditFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-600 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                <span className="text-xs text-gray-400 font-medium">
                  {saveStatus === 'saving' && 'Menyimpan perubahan...'}
                  {saveStatus === 'saved' && 'Tersimpan otomatis'}
                  {saveStatus === 'dirty' && 'Perubahan belum disimpan'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingQuestion(null)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-all"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-fuchsia-700 hover:bg-fuchsia-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan & Terapkan'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPraTikrarFormBuilderTab;
