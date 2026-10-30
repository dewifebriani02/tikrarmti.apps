'use client';

import React, { useState } from 'react';
import { FileUp, Plus, Sparkles, BarChart3, CopyMinus } from 'lucide-react';
import { useAdminExamQuestions } from '@/hooks/useAdminExamQuestions';
import { QuestionStats } from './exam/QuestionStats';
import { QuestionFilters } from './exam/QuestionFilters';
import { QuestionTable } from './exam/QuestionTable';
import { QuestionModals } from './exam/QuestionModals';
import { ExamDeduplicateModal } from './admin/exam-deduplicate/ExamDeduplicateModal';

interface AdminExamQuestionsProps {
  onImportClick: () => void;
  onAddManualClick: () => void;
  onSuccess?: () => void;
}

const SECTION_OPTIONS = [
  { value: 1, label: '1 - Tebak Nama Surat' },
  { value: 2, label: '2 - Tebak Ayat' },
  { value: 3, label: '3 - Sambung Surat' },
  { value: 4, label: '4 - Tebak Awal Ayat' },
  { value: 5, label: '5 - Ayat Mutasyabihat' },
  { value: 6, label: '6 - Pengenalan Surat' },
  { value: 7, label: '7 - Tebak Halaman' },
];

const ITEMS_PER_PAGE = 20;

export function AdminExamQuestions({ onImportClick, onAddManualClick, onSuccess }: AdminExamQuestionsProps) {
  const [showDeduplicateModal, setShowDeduplicateModal] = useState(false);

  const {
    questions, loading, selectedJuz, setSelectedJuz, selectedSection, setSelectedSection,
    currentPage, setCurrentPage, showEditModal, setShowEditModal, editingQuestion, setEditingQuestion,
    showDeleteModal, setShowDeleteModal, deletingQuestionId, setDeletingQuestionId, isSaving, juzOptions, searchQuery,
    setSearchQuery, sortField, sortOrder, handleSort, filterType, setFilterType,
    filterActive, setFilterActive, filterPackage, setFilterPackage, showPreviewModal, setShowPreviewModal, previewQuestion,
    setPreviewQuestion, showAnalytics, setShowAnalytics, analytics, analyticsLoading,
    analyticsSummary, loadAnalytics, showAIModal, setShowAIModal, aiGenerating, aiForm,
    setAiForm, handleDelete, handleUpdate, handleAIGenerate, statistics, handleToggleArchivePackage, loadQuestions
  } = useAdminExamQuestions(onSuccess);

  // Pagination calculations
  const totalPages = Math.ceil(questions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedQuestions = questions.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Exam Questions</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Manage multiple-choice exam questions for Juz 28, 29, and 30
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowDeduplicateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all font-bold text-sm shadow-md shadow-amber-600/10 active:scale-95 duration-200"
            title="Deteksi dan bersihkan duplikasi soal antar paket A, B, atau semua paket"
          >
            <CopyMinus className="w-4 h-4" />
            Deteksi Duplikasi
          </button>
          <button
            onClick={loadAnalytics}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-md shadow-indigo-600/10 active:scale-95 duration-200"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-bold text-sm shadow-md shadow-purple-600/10 active:scale-95 duration-200"
          >
            <Sparkles className="w-4 h-4" />
            AI Generate
          </button>
          <button
            onClick={onAddManualClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-bold text-sm shadow-md shadow-green-600/10 active:scale-95 duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Manual
          </button>
          <button
            onClick={onImportClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-md shadow-blue-600/10 active:scale-95 duration-200"
          >
            <FileUp className="w-4 h-4" />
            Bulk Import
          </button>
        </div>
      </div>

      {/* Statistics Table */}
      <QuestionStats 
        statistics={statistics} 
        onToggleArchive={handleToggleArchivePackage}
        onStatClick={(juz, pkg, active, section) => {
          setSelectedJuz(juz as any);
          setFilterPackage(pkg as any);
          setFilterActive(active ? 'active' : 'inactive');
          setSelectedSection(section ?? 'all');
          
          // Scroll to the table
          window.scrollTo({
            top: document.getElementById('filters-section')?.offsetTop || 500,
            behavior: 'smooth'
          });
        }}
      />

      {/* Filters */}
      <div id="filters-section">
        <QuestionFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedJuz={selectedJuz}
          setSelectedJuz={setSelectedJuz}
          selectedSection={selectedSection}
          setSelectedSection={setSelectedSection}
          filterType={filterType}
          setFilterType={setFilterType}
          filterActive={filterActive}
          setFilterActive={setFilterActive}
          filterPackage={filterPackage}
          setFilterPackage={setFilterPackage}
          juzOptions={juzOptions}
          sections={Array.from(new Set(questions.map(q => q.section_number).filter((n): n is number => n !== undefined))).sort()}
          totalQuestions={questions.length}
        />
      </div>

      {/* Table */}
      <QuestionTable
        questions={questions}
        paginatedQuestions={paginatedQuestions}
        startIndex={startIndex}
        endIndex={endIndex}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        sortField={sortField}
        sortOrder={sortOrder}
        handleSort={handleSort}
        onPreview={(q) => { setPreviewQuestion(q); setShowPreviewModal(true); }}
        onEdit={(q) => { setEditingQuestion(q); setShowEditModal(true); }}
        onDelete={(id) => { setDeletingQuestionId(id); setShowDeleteModal(true); }}
      />

      {/* Modals */}
      <QuestionModals
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        deletingQuestionId={deletingQuestionId}
        onDelete={handleDelete}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editingQuestion={editingQuestion}
        setEditingQuestion={setEditingQuestion}
        juzOptions={juzOptions}
        onUpdate={handleUpdate}
        isSaving={isSaving}
        showAIModal={showAIModal}
        setShowAIModal={setShowAIModal}
        aiForm={aiForm}
        setAiForm={setAiForm}
        aiGenerating={aiGenerating}
        onAIGenerate={handleAIGenerate}
        sectionOptions={SECTION_OPTIONS}
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        previewQuestion={previewQuestion}
        setPreviewQuestion={setPreviewQuestion}
        showAnalytics={showAnalytics}
        setShowAnalytics={setShowAnalytics}
        analytics={analytics}
        analyticsLoading={analyticsLoading}
        analyticsSummary={analyticsSummary}
      />

      {/* Deduplication Modal */}
      <ExamDeduplicateModal
        isOpen={showDeduplicateModal}
        onClose={() => setShowDeduplicateModal(false)}
        onSuccess={() => {
          loadQuestions();
          if (onSuccess) onSuccess();
        }}
      />
    </div>
  );
}
