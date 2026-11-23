'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getHalaqahs, assignThalibahToHalaqah } from '@/lib/admin/halaqah-client';

interface Thalibah {
  id: string;
  user_id: string;
  full_name: string;
  chosen_juz: string;
  selection_status: string;
}

interface Halaqah {
  id: string;
  name: string;
  class_type: string;
  preferred_juz?: string;
  muallimah?: {
    full_name?: string;
  };
  _count?: {
    students: number;
  };
  max_students?: number;
}

interface AssignThalibahModalProps {
  batchId: string;
  batchName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignThalibahModal({ batchId, batchName, onClose, onSuccess }: AssignThalibahModalProps) {
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [thalibahs, setThalibahs] = useState<Thalibah[]>([]);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [selectedThalibahs, setSelectedThalibahs] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [showHalaqahList, setShowHalaqahList] = useState(true);

  useEffect(() => {
    loadData();
  }, [batchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadThalibahs(), loadHalaqahs()]);
    } finally {
      setLoading(false);
    }
  };

  const loadThalibahs = async () => {
    try {
      const response = await fetch(`/api/admin/tikrar?batch_id=${batchId}&status=selected`);
      const result = await response.json();

      if (response.ok && result.data) {
        // Filter only selected thalibah
        const selectedThalibah = result.data.filter((t: Thalibah) => t.selection_status === 'selected');
        setThalibahs(selectedThalibah);
      }
    } catch (error) {
      console.error('Error loading thalibahs:', error);
      toast.error('Failed to load thalibahs');
    }
  };

  const loadHalaqahs = async () => {
    try {
      const result = await getHalaqahs({
        batch_id: batchId,
        status: 'active'
      });

      if (result.success && result.data) {
        setHalaqahs(result.data);
      } else {
        throw new Error(result.error || 'Failed to load halaqahs');
      }
    } catch (error) {
      console.error('Error loading halaqahs:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load halaqahs');
    }
  };

  const handleToggleAll = () => {
    if (selectedThalibahs.size === thalibahs.length) {
      setSelectedThalibahs(new Set());
    } else {
      setSelectedThalibahs(new Set(thalibahs.map(t => t.id)));
    }
  };

  const handleToggleThalibah = (id: string) => {
    const newSet = new Set(selectedThalibahs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedThalibahs(newSet);
  };

  const handleAssign = async () => {
    if (selectedThalibahs.size === 0) {
      toast.error('Please select at least one thalibah');
      return;
    }

    setAssigning(true);
    try {
      const result = await assignThalibahToHalaqah({
        thalibah_ids: Array.from(selectedThalibahs),
        batch_id: batchId
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Assignment failed');
      }

      setResults(result.data);
      setShowResults(true);

      // Show summary toast
      const { success, partial, failed, skipped } = result.data;
      toast.success(
        `Assignment complete: ${success.length} successful, ${partial.length} partial, ${failed.length} failed, ${skipped.length} skipped`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign thalibahs');
    } finally {
      setAssigning(false);
    }
  };

  const getDayName = (dayNum?: number) => {
    if (!dayNum) return '-';
    const days = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
    return days[dayNum] || '-';
  };

  const formatClassType = (classType?: string) => {
    if (!classType) return '-';
    const classTypeMap: Record<string, string> = {
      'tashih_ujian': 'Kelas Tashih + Ujian',
      'tashih_only': 'Kelas Tashih Saja',
      'ujian_only': 'Kelas Ujian Saja'
    };
    return classTypeMap[classType] || classType;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 flex items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-green-900" />
          <span className="text-lg">Loading data...</span>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-green-900 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">Assignment Results</h3>
                <p className="text-green-100 mt-1">Batch: {batchName}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">{results.success.length}</span>
                </div>
                <p className="text-sm text-green-700 mt-1">Successful</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-900">{results.partial.length}</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">Partial</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-900">{results.failed.length}</span>
                </div>
                <p className="text-sm text-red-700 mt-1">Failed</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">{results.skipped.length}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">Skipped</p>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {results.success.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Successfully Assigned ({results.success.length})
                </h4>
                <div className="space-y-2">
                  {results.success.map((item: any, idx: number) => (
                    <div key={idx} className="bg-green-50 p-3 rounded-lg">
                      <p className="font-medium text-green-900">{item.name}</p>
                      <div className="text-sm text-green-700 mt-1">
                        {item.assignments?.map((a: any, i: number) => (
                          <span key={i} className="inline-block mr-3">
                            {formatClassType(a.class_type)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.partial.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Partially Assigned ({results.partial.length})
                </h4>
                <div className="space-y-2">
                  {results.partial.map((item: any, idx: number) => (
                    <div key={idx} className="bg-yellow-50 p-3 rounded-lg">
                      <p className="font-medium text-yellow-900">{item.name}</p>
                      <p className="text-sm text-yellow-700 mt-1">{item.reason}</p>
                      {item.assignments && item.assignments.length > 0 && (
                        <div className="text-sm text-yellow-700 mt-1">
                          Assigned to: {item.assignments.map((a: any) => formatClassType(a.class_type)).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.failed.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Failed to Assign ({results.failed.length})
                </h4>
                <div className="space-y-2">
                  {results.failed.map((item: any, idx: number) => (
                    <div key={idx} className="bg-red-50 p-3 rounded-lg">
                      <p className="font-medium text-red-900">{item.name}</p>
                      <p className="text-sm text-red-700 mt-1">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.skipped.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Skipped ({results.skipped.length})
                </h4>
                <div className="space-y-2">
                  {results.skipped.map((item: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-700 mt-1">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowResults(false);
                setSelectedThalibahs(new Set());
                onSuccess();
              }}
              className="px-4 py-2 bg-green-900 text-white rounded-md hover:bg-green-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-green-900 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold">Assign Selected Thalibah to Halaqah</h3>
              <p className="text-green-100 mt-1">Batch: {batchName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Thalibah Selection Panel */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Selected Thalibah ({thalibahs.length})
                  </h4>
                  <button
                    onClick={handleToggleAll}
                    className="text-sm text-green-900 hover:text-green-700"
                  >
                    {selectedThalibahs.size === thalibahs.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedThalibahs.size} of {thalibahs.length} selected
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 scrollbar-track-gray-100">
                {thalibahs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No selected thalibah found in this batch</p>
                    <p className="text-sm mt-1">Only thalibah with selection_status='selected' will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {thalibahs.map((thalibah) => (
                      <label
                        key={thalibah.id}
                        className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedThalibahs.has(thalibah.id)}
                          onChange={() => handleToggleThalibah(thalibah.id)}
                          className="mt-1 w-4 h-4 text-green-900 rounded focus:ring-green-900"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{thalibah.full_name}</p>
                          <p className="text-sm text-gray-500">Juz: {thalibah.chosen_juz}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Halaqah Info Panel */}
            <div className="w-1/2 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowHalaqahList(!showHalaqahList)}
                  className="flex items-center justify-between w-full font-semibold text-gray-900"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Available Halaqah ({halaqahs.length})
                  </span>
                  {showHalaqahList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Thalibah will be automatically assigned to appropriate halaqah based on their chosen juz.
                </p>
              </div>

              {showHalaqahList && (
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 scrollbar-track-gray-100">
                  {halaqahs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No active halaqahs found for this batch</p>
                      <p className="text-sm mt-1">Please create halaqahs first using "Auto Create Halaqah"</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {halaqahs.map((halaqah) => (
                        <div key={halaqah.id} className="border border-gray-200 rounded-lg p-3">
                          <p className="font-medium text-gray-900">{halaqah.name}</p>
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="text-gray-600">
                              <span className="font-medium">Type:</span> {formatClassType(halaqah.class_type)}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Muallimah:</span> {halaqah.muallimah?.full_name || 'Not assigned'}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Capacity:</span> {halaqah._count?.students || 0}/{halaqah.max_students || 20}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <Info className="w-4 h-4 inline mr-1" />
            Smart assign will match thalibah juz with muallimah preferred juz
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={assigning || selectedThalibahs.size === 0}
              className="px-4 py-2 bg-green-900 text-white rounded-md hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Assign {selectedThalibahs.size} Thalibah
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
