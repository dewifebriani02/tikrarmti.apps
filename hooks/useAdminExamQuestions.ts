'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { ExamQuestion, AdminQuestionEditForm, QuestionAnalytics, JuzNumber } from '@/types/exam';

interface JuzOption {
  id: string;
  code: string;
  name: string;
  juz_number: number;
  part: string;
  start_page: number;
  end_page: number;
  total_pages: number;
  is_active: boolean;
  sort_order: number;
}

export function useAdminExamQuestions(onSuccess?: () => void) {
  const [allQuestions, setAllQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJuz, setSelectedJuz] = useState<JuzNumber | 'all'>('all');
  const [selectedSection, setSelectedSection] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [juzOptions, setJuzOptions] = useState<JuzOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'juz_number' | 'section_number' | 'question_number' | 'created_at' | 'updated_at'>('juz_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<'all' | 'multiple_choice' | 'introduction'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [filterPackage, setFilterPackage] = useState<'all' | 'A' | 'B'>('all');

  // Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<ExamQuestion | null>(null);

  // Analytics state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<QuestionAnalytics[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsSummary, setAnalyticsSummary] = useState<any>(null);

  // AI Generate states
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiForm, setAiForm] = useState({
    juz_code: '',
    section_number: 1,
    question_count: 5,
    hizb_part: 'full', // 'full', 'hizb1', 'hizb2'
  });

  const loadJuzOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/juz', { cache: 'no-store' });
      const result = await response.json();
      if (response.ok) {
        setJuzOptions(result.data || []);
      }
    } catch (error) {
      console.error('Error loading juz options:', error);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const url = '/api/exam/questions';
      const params = new URLSearchParams();

      if (selectedJuz !== 'all') {
        params.append('juz', selectedJuz.toString());
      }

      if (selectedSection !== 'all') {
        params.append('section', selectedSection.toString());
      }

      const queryString = params.toString();
      const response = await fetch(queryString ? `${url}?${queryString}` : url, {
        cache: 'no-store',
      });
      const result = await response.json();

      if (response.ok) {
        setAllQuestions(result.data || []);
      } else {
        toast.error(result.error || 'Failed to load questions');
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [selectedJuz, selectedSection]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    loadJuzOptions();
  }, [loadJuzOptions]);

  const questions = useMemo(() => {
    let filteredQuestions = allQuestions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredQuestions = filteredQuestions.filter((q: ExamQuestion) =>
        q.question_text.toLowerCase().includes(query) ||
        q.section_title?.toLowerCase().includes(query) ||
        q.options?.some((opt: any) => (opt.text || opt.option_text || '').toLowerCase().includes(query))
      );
    }

    if (filterType !== 'all') {
      filteredQuestions = filteredQuestions.filter((q: ExamQuestion) => q.question_type === filterType);
    }

    if (filterPackage !== 'all') {
      filteredQuestions = filteredQuestions.filter((q: ExamQuestion) => (q.question_package || 'B') === filterPackage);
    }

    if (filterActive === 'active') {
      filteredQuestions = filteredQuestions.filter((q: ExamQuestion) => q.is_active !== false);
    } else if (filterActive === 'inactive') {
      filteredQuestions = filteredQuestions.filter((q: ExamQuestion) => q.is_active === false);
    }

    return [...filteredQuestions].sort((a: any, b: any) => {
      if (sortField === 'juz_number') {
        if (a.juz_number !== b.juz_number) {
          return sortOrder === 'asc' ? a.juz_number - b.juz_number : b.juz_number - a.juz_number;
        }
        const pkgA = a.question_package || 'A';
        const pkgB = b.question_package || 'A';
        if (pkgA !== pkgB) return pkgA.localeCompare(pkgB);
        if ((a.section_number || 1) !== (b.section_number || 1)) {
          return (a.section_number || 1) - (b.section_number || 1);
        }
        return (a.question_number || 0) - (b.question_number || 0);
      }

      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? -1 : 1;

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allQuestions, searchQuery, filterType, filterPackage, filterActive, sortField, sortOrder]);

  useEffect(() => {
    if (juzOptions.length > 0 && !aiForm.juz_code) {
      setAiForm(prev => ({ ...prev, juz_code: juzOptions[0].code }));
    }
  }, [juzOptions, aiForm.juz_code]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedJuz, selectedSection, searchQuery, filterType, filterActive, filterPackage]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setShowAnalytics(true);
    try {
      const params = new URLSearchParams();
      if (selectedJuz !== 'all') params.append('juz', selectedJuz.toString());
      if (selectedSection !== 'all') params.append('section', selectedSection.toString());

      const response = await fetch(`/api/exam/questions/analytics?${params.toString()}`, {
        cache: 'no-store',
      });
      const result = await response.json();

      if (response.ok) {
        setAnalytics(result.data || []);
        setAnalyticsSummary(result.summary);
      } else {
        toast.error(result.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    try {
      const response = await fetch(`/api/exam/questions?id=${questionId}`, {
        method: 'DELETE',
        cache: 'no-store',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Question deleted successfully');
        setAllQuestions(prev => prev.filter(q => q.id !== questionId));
        setShowDeleteModal(false);
        setDeletingQuestionId(null);
        await loadQuestions();
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || 'Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleUpdate = async (formData: AdminQuestionEditForm) => {
    if (!editingQuestion?.id) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/exam/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ ...formData, id: editingQuestion.id }),
      });

      const result = await response.json();

      if (response.ok) {
        const updatedRow: ExamQuestion | undefined = result.data;
        if (updatedRow) {
          setAllQuestions(prev => prev.map(q => (q.id === updatedRow.id ? updatedRow : q)));
          setPreviewQuestion(prev => (prev && prev.id === updatedRow.id ? updatedRow : prev));
        }
        await loadQuestions();
        toast.success('Question updated successfully');
        setShowEditModal(false);
        setEditingQuestion(null);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || 'Failed to update question');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to update question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickUpdateOptions = async (
    question: ExamQuestion,
    newOptions: Array<{ text: string; isCorrect: boolean }>
  ) => {
    try {
      const response = await fetch('/api/exam/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          id: question.id,
          options: newOptions,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const updatedRow: ExamQuestion | undefined = result.data;
        if (updatedRow) {
          setAllQuestions((prev) => prev.map((q) => (q.id === updatedRow.id ? updatedRow : q)));
          setPreviewQuestion((prev) => (prev && prev.id === updatedRow.id ? updatedRow : prev));
        } else {
          await loadQuestions();
        }
        toast.success('Opsi & kunci jawaban berhasil diperbarui');
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || 'Gagal memperbarui opsi jawaban');
      }
    } catch (error) {
      console.error('Error quick-updating options:', error);
      toast.error('Gagal memperbarui opsi jawaban');
    }
  };

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiGenerating(true);

    try {
      const response = await fetch('/api/exam/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Successfully generated ${result.data?.length || 0} questions`);
        await loadQuestions();
        setShowAIModal(false);
        setAiForm({
          juz_code: juzOptions.length > 0 ? juzOptions[0].code : '',
          section_number: 1,
          question_count: 5,
          hizb_part: 'full',
        });
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || 'Failed to generate questions');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to generate questions');
    } finally {
      setAiGenerating(false);
    }
  };

  const statistics = useMemo(() => {
    const stats: Record<string, any> = {};
    allQuestions.forEach(q => {
      const pkg = q.question_package || 'B';
      const activeState = q.is_active !== false;
      const key = `${q.juz_number}-${pkg}-${activeState}`;
      
      if (!stats[key]) {
        stats[key] = {
          juz_number: q.juz_number,
          question_package: pkg,
          is_active: activeState,
          total: 0,
          sections: {} // e.g. { "1": { title: "Tebak Nama Surat", count: 10 } }
        };
      }
      stats[key].total++;
      
      if (q.section_number) {
        if (!stats[key].sections[q.section_number]) {
          stats[key].sections[q.section_number] = {
            title: q.section_title || `Section ${q.section_number}`,
            count: 0
          };
        }
        stats[key].sections[q.section_number].count++;
      }
    });
    
    return Object.values(stats).sort((a: any, b: any) => {
      if (a.juz_number !== b.juz_number) return a.juz_number - b.juz_number;
      if (a.question_package !== b.question_package) return a.question_package.localeCompare(b.question_package);
      return a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
    });
  }, [allQuestions]);

  const handleToggleArchivePackage = async (juz_number: number, question_package: string, current_active: boolean) => {
    try {
      setLoading(true);
      const newActiveState = !current_active;
      
      const response = await fetch('/api/exam/questions/bulk-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          juz_number,
          question_package,
          is_active: newActiveState
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Berhasil ${newActiveState ? 'mengaktifkan' : 'mengarsipkan'} soal Juz ${juz_number} Paket ${question_package}`);
        await loadQuestions();
      } else {
        toast.error(result.error || 'Failed to update questions');
      }
    } catch (error) {
      console.error('Error toggling package archive status:', error);
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return {
    questions,
    loading,
    selectedJuz,
    setSelectedJuz,
    selectedSection,
    setSelectedSection,
    currentPage,
    setCurrentPage,
    showEditModal,
    setShowEditModal,
    editingQuestion,
    setEditingQuestion,
    showDeleteModal,
    setShowDeleteModal,
    deletingQuestionId,
    setDeletingQuestionId,
    isSaving,
    juzOptions,
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    handleSort,
    filterType,
    setFilterType,
    filterActive,
    setFilterActive,
    filterPackage,
    setFilterPackage,
    showPreviewModal,
    setShowPreviewModal,
    previewQuestion,
    setPreviewQuestion,
    showAnalytics,
    setShowAnalytics,
    analytics,
    analyticsLoading,
    analyticsSummary,
    loadAnalytics,
    showAIModal,
    setShowAIModal,
    aiGenerating,
    aiForm,
    setAiForm,
    handleDelete,
    handleUpdate,
    handleQuickUpdateOptions,
    handleAIGenerate,
    handleToggleArchivePackage,
    statistics,
    loadQuestions,
  };
}
