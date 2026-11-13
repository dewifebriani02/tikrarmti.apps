'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2, Eye, BarChart3, AlertCircle, Trash2 } from 'lucide-react';
import { ExamQuestion, AdminQuestionEditForm, JuzNumber } from '@/types/exam';

interface QuestionModalsProps {
  // Delete Modal
  showDeleteModal: boolean;
  setShowDeleteModal: (val: boolean) => void;
  deletingQuestionId: string | null;
  onDelete: (id: string) => void;
  
  // Edit Modal
  showEditModal: boolean;
  setShowEditModal: (val: boolean) => void;
  editingQuestion: ExamQuestion | null;
  setEditingQuestion: (val: ExamQuestion | null) => void;
  juzOptions: any[];
  onUpdate: (data: AdminQuestionEditForm) => void;
  isSaving: boolean;
  
  // AI Modal
  showAIModal: boolean;
  setShowAIModal: (val: boolean) => void;
  aiForm: any;
  setAiForm: (val: any) => void;
  aiGenerating: boolean;
  onAIGenerate: (e: React.FormEvent) => void;
  sectionOptions: any[];
  
  // Preview Modal
  showPreviewModal: boolean;
  setShowPreviewModal: (val: boolean) => void;
  previewQuestion: ExamQuestion | null;
  setPreviewQuestion: (val: ExamQuestion | null) => void;
  
  // Analytics Modal
  showAnalytics: boolean;
  setShowAnalytics: (val: boolean) => void;
  analytics: any[];
  analyticsLoading: boolean;
  analyticsSummary: any;
}

export function QuestionModals({
  showDeleteModal, setShowDeleteModal, deletingQuestionId, onDelete,
  showEditModal, setShowEditModal, editingQuestion, setEditingQuestion, juzOptions, onUpdate, isSaving,
  showAIModal, setShowAIModal, aiForm, setAiForm, aiGenerating, onAIGenerate, sectionOptions,
  showPreviewModal, setShowPreviewModal, previewQuestion, setPreviewQuestion,
  showAnalytics, setShowAnalytics, analytics, analyticsLoading, analyticsSummary
}: QuestionModalsProps) {
  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Question
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deletingQuestionId && onDelete(deletingQuestionId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {showEditModal && editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Question</h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingQuestion(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <EditQuestionForm
              key={editingQuestion.id}
              question={editingQuestion}
              juzOptions={juzOptions}
              onSave={onUpdate}
              onCancel={() => { setShowEditModal(false); setEditingQuestion(null); }}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      {/* AI Generate Questions Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Generate Questions
              </h2>
              <button onClick={() => setShowAIModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={onAIGenerate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilihan Juz *</label>
                  <select
                    value={aiForm.juz_code}
                    onChange={(e) => setAiForm({ ...aiForm, juz_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Pilih juz</option>
                    {juzOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name} (halaman {option.start_page} - {option.end_page})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bagian Juz (Hizb) *</label>
                  <select
                    value={aiForm.hizb_part}
                    onChange={(e) => setAiForm({ ...aiForm, hizb_part: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="full">Satu Juz Penuh</option>
                    <option value="hizb1">Setengah Juz Pertama (Hizb 1)</option>
                    <option value="hizb2">Setengah Juz Kedua (Hizb 2)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Type / Section *</label>
                <select
                  value={aiForm.section_number}
                  onChange={(e) => setAiForm({ ...aiForm, section_number: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {sectionOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions *</label>
                <input
                  type="number" min="1" max="20"
                  value={aiForm.question_count}
                  onChange={(e) => setAiForm({ ...aiForm, question_count: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs text-purple-800">Soal akan disimpan otomatis ke database setelah generate selesai.</p>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowAIModal(false)} disabled={aiGenerating} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Batal</button>
                <button type="submit" disabled={aiGenerating} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                  {aiGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Questions</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Question Modal */}
      {showPreviewModal && previewQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto font-sans">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-gray-600" /> Question Preview
              </h2>
              <button onClick={() => { setShowPreviewModal(false); setPreviewQuestion(null); }} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">{previewQuestion.juz_code || `Juz ${previewQuestion.juz_number}`}</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">Sec {previewQuestion.section_number}</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">Q#{previewQuestion.question_number}</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">{previewQuestion.points} pts</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 font-normal">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Question:</h4>
                <p className="text-gray-900">{previewQuestion.question_text}</p>
              </div>
              {previewQuestion.options && previewQuestion.options.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Options:</h4>
                  <div className="space-y-2">
                    {previewQuestion.options.map((option: any, idx: number) => {
                      const text = option.option_text || option.text;
                      const isCorrect = option.is_correct || option.isCorrect;
                      
                      return (
                        <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className={`flex-1 ${isCorrect ? 'text-green-900 font-medium' : 'text-gray-700'}`}>{text}</span>
                          {isCorrect && <span className="text-xs font-semibold text-green-700 bg-green-200 px-2 py-1 rounded">Correct Answer</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col font-sans">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" /> Question Analytics</h2>
              <button onClick={() => setShowAnalytics(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {analyticsLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> : analyticsSummary ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-xs text-blue-700 uppercase font-bold tracking-wider mb-1">Total Questions</div>
                      <div className="text-2xl font-black text-blue-900">{analyticsSummary.totalQuestions}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-xs text-green-700 uppercase font-bold tracking-wider mb-1">Correct Rate</div>
                      <div className="text-2xl font-black text-green-900">{analyticsSummary.overallCorrectRate.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Question</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-700">Attempts</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-700">Correct %</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-700">Difficulty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {analytics.map((q) => (
                          <tr key={q.questionId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="text-gray-900 font-medium line-clamp-1">{q.question.question_text}</p>
                              <p className="text-xs text-gray-500">Juz {q.question.juz_number} • Q{q.question.question_number}</p>
                            </td>
                            <td className="px-4 py-3 text-center">{q.totalAttempts}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${q.correctRate >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {q.correctRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center capitalize">{q.difficulty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : <div className="text-center py-12"><AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No analytics data available.</p></div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditQuestionForm({ question, juzOptions, onSave, onCancel, isSaving }: {
  question: ExamQuestion;
  juzOptions: any[];
  onSave: (data: AdminQuestionEditForm) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<AdminQuestionEditForm>(() => {
    let rawOptions = question.options;
    if (typeof rawOptions === 'string') {
      try {
        rawOptions = JSON.parse(rawOptions);
      } catch {
        rawOptions = [];
      }
    }
    if (!Array.isArray(rawOptions)) rawOptions = [];

    const hasAnyCorrect = rawOptions.some((o: any) => o.isCorrect === true || o.is_correct === true);
    const parsedOptions = rawOptions.map((opt: any) => {
      const text = opt.option_text || opt.text || '';
      const isCorrect = hasAnyCorrect
        ? (opt.is_correct === true || opt.isCorrect === true)
        : (question.correct_answer ? text.trim() === question.correct_answer.trim() : false);
      return { text, isCorrect };
    });

    return {
      juz_number: question.juz_number,
      section_number: question.section_number || 1,
      section_title: question.section_title || '',
      question_number: question.question_number,
      question_text: question.question_text,
      question_type: question.question_type || 'multiple_choice',
      options: parsedOptions,
      points: question.points || 1,
      is_active: question.is_active !== false,
      question_package: question.question_package || 'A',
    };
  });

  const [juzCode, setJuzCode] = useState(juzOptions.find(opt => opt.juz_number === question.juz_number)?.code || '');

  const handleJuzChange = (code: string) => {
    setJuzCode(code);
    const sel = juzOptions.find(o => o.code === code);
    if (sel) setFormData({ ...formData, juz_number: sel.juz_number as JuzNumber });
  };

  const handleSetCorrectOption = (idx: number) => {
    const next = formData.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === idx,
    }));
    setFormData({ ...formData, options: next });
  };

  const handleOptionTextChange = (idx: number, text: string) => {
    const next = [...formData.options];
    next[idx] = { ...next[idx], text };
    setFormData({ ...formData, options: next });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.options.length > 0 && !formData.options.some(o => o.isCorrect)) {
      alert('Pilih salah satu opsi sebagai Kunci Jawaban yang benar.');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Pilihan Juz</label>
          <select value={juzCode} onChange={(e) => handleJuzChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white" required>
            {juzOptions.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Paket Soal</label>
          <select
            value={formData.question_package || 'A'}
            onChange={(e) => setFormData({ ...formData, question_package: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-white font-medium"
          >
            <option value="A">Paket A</option>
            <option value="B">Paket B</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Section</label>
          <select value={formData.section_number} onChange={(e) => setFormData({ ...formData, section_number: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg bg-white">
            {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>Section {n}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Prolog / Judul Bagian (Section Title)</label>
        <textarea value={formData.section_title} onChange={(e) => setFormData({ ...formData, section_title: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Misal: JUZ 30A - 20 SOAL PILIHAN GANDA..." />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Question Text</label>
        <textarea value={formData.question_text} onChange={(e) => setFormData({ ...formData, question_text: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} required />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-gray-700 uppercase">Pilihan Jawaban & Kunci Jawaban</label>
          <span className="text-xs text-gray-500 italic">Klik radio button untuk memilih kunci jawaban</span>
        </div>
        <div className="space-y-2.5 mt-2">
          {formData.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                  opt.isCorrect
                    ? 'border-green-400 bg-green-50/60 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name={`correct-answer-${question.id}`}
                    checked={opt.isCorrect}
                    onChange={() => handleSetCorrectOption(i)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                  />
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      opt.isCorrect ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    {letter}
                  </span>
                </label>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleOptionTextChange(i, e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder={`Teks pilihan ${letter}`}
                  required
                />
                {opt.isCorrect && (
                  <span className="text-xs font-bold text-green-700 bg-green-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                    ✓ Kunci Jawaban
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Changes'}</button>
      </div>
    </form>
  );
}
