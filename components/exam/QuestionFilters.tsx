'use client';

import { Search, X } from 'lucide-react';
import { JuzNumber } from '@/types/exam';

interface QuestionFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedJuz: JuzNumber | 'all';
  setSelectedJuz: (val: JuzNumber | 'all') => void;
  selectedSection: number | 'all';
  setSelectedSection: (val: number | 'all') => void;
  filterType: 'all' | 'multiple_choice' | 'introduction';
  setFilterType: (val: 'all' | 'multiple_choice' | 'introduction') => void;
  filterActive: 'all' | 'active' | 'inactive';
  setFilterActive: (val: 'all' | 'active' | 'inactive') => void;
  filterPackage: 'all' | 'A' | 'B';
  setFilterPackage: (val: 'all' | 'A' | 'B') => void;
  juzOptions: any[];
  sections: number[];
  totalQuestions: number;
}

export function QuestionFilters({
  searchQuery,
  setSearchQuery,
  selectedJuz,
  setSelectedJuz,
  selectedSection,
  setSelectedSection,
  filterType,
  setFilterType,
  filterActive,
  setFilterActive,
  filterPackage,
  setFilterPackage,
  juzOptions,
  sections,
  totalQuestions,
}: QuestionFiltersProps) {
  const hasFilters = searchQuery || filterType !== 'all' || filterActive !== 'all' || selectedJuz !== 'all' || selectedSection !== 'all' || filterPackage !== 'all';

  // Extract unique numeric Juz (1..30)
  const uniqueJuzNumbers = Array.from(
    new Set(
      juzOptions
        .map((opt) => opt.juz_number || (opt.code ? parseInt(opt.code) : null))
        .filter((n): n is number => typeof n === 'number' && !isNaN(n) && n >= 1 && n <= 30)
    )
  ).sort((a, b) => a - b);

  const displayJuzList = uniqueJuzNumbers.length > 0
    ? uniqueJuzNumbers
    : Array.from({ length: 30 }, (_, i) => i + 1);

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterActive('all');
    setFilterPackage('all');
    setSelectedJuz('all');
    setSelectedSection('all');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question text..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Juz Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Juz
          </label>
          <select
            value={selectedJuz}
            onChange={(e) => {
              setSelectedJuz(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as JuzNumber);
              setSelectedSection('all');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Semua Juz</option>
            {displayJuzList.map((juz) => (
              <option key={juz} value={juz}>
                Juz {juz}
              </option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Section
          </label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            disabled={selectedJuz === 'all'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="all">All Sections</option>
            {sections.map(section => (
              <option key={section} value={section}>
                Section {section}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="introduction">Introduction</option>
          </select>
        </div>

        {/* Package Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paket Soal
          </label>
          <select
            value={filterPackage}
            onChange={(e) => setFilterPackage(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Semua Paket</option>
            <option value="A">Paket A</option>
            <option value="B">Paket B</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Result count */}
      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{totalQuestions}</span> questions
        </span>
        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
