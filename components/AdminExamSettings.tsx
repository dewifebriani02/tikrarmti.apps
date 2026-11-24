'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Clock, Shuffle, CheckCircle, XCircle, Save, Loader2 } from 'lucide-react';
import { ExamConfiguration, ExamConfigurationForm } from '@/types/exam';

// Helper function to format datetime in WIB (UTC+7)
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  // Format: 30/12/2025, 19:00 (WIB)
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${minutes} (WIB)`;
}

// Helper function to convert datetime-local input value to ISO string
function toLocalISOString(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString();
}

// Helper function to convert ISO string to datetime-local input value
function fromLocalISOString(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface AdminExamSettingsProps {
  onSuccess?: () => void;
}

export function AdminExamSettings({ onSuccess }: AdminExamSettingsProps) {
  const [configurations, setConfigurations] = useState<ExamConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ExamConfiguration | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingConfigId, setDeletingConfigId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/exam/configurations');
      const result = await response.json();

      if (response.ok) {
        setConfigurations(result.data || []);
      } else {
        toast.error(result.error || 'Failed to load configurations');
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast.error('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: ExamConfigurationForm) => {
    setIsSaving(true);
    try {
      const url = '/api/exam/configurations';
      const method = editingConfig ? 'PUT' : 'POST';
      const body = editingConfig
        ? { ...formData, id: editingConfig.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(editingConfig ? 'Configuration updated successfully' : 'Configuration created successfully');
        loadConfigurations();
        setShowModal(false);
        setEditingConfig(null);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (configId: string) => {
    try {
      const response = await fetch(`/api/exam/configurations?id=${configId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Configuration deleted successfully');
        loadConfigurations();
        setShowDeleteModal(false);
        setDeletingConfigId(null);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || 'Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const handleSetActive = async (configId: string) => {
    try {
      const config = configurations.find(c => c.id === configId);
      if (!config) return;

      const response = await fetch('/api/exam/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, id: configId, is_active: true }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Active configuration updated');
        loadConfigurations();
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error setting active configuration:', error);
      toast.error('Failed to update configuration');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Exam Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Pengaturan ujian - durasi, percobaan, kuota Paket A &amp; Paket B, penilaian, dll.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingConfig(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Configuration
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Info:</strong> Konfigurasi yang aktif akan digunakan untuk ujian. Hanya satu konfigurasi yang bisa aktif dalam satu waktu.
        </p>
      </div>

      {/* Configurations List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading configurations...</p>
          </div>
        ) : configurations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600 mb-4">No configurations found</p>
            <button
              onClick={() => {
                setEditingConfig(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Configuration
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {configurations.map((config) => (
              <div key={config.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {config.name}
                      </h3>
                      {config.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-600 mb-4">{config.description}</p>
                    )}

                    {/* Settings Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <SettingItem
                        icon={<Clock className="w-4 h-4" />}
                        label="Duration"
                        value={`${config.duration_minutes} min`}
                      />
                      <SettingItem
                        icon={<Shuffle className="w-4 h-4" />}
                        label="Shuffle"
                        value={config.shuffle_questions ? 'Yes' : 'No'}
                      />
                      <SettingItem
                        icon={<CheckCircle className="w-4 h-4" />}
                        label="Passing Score"
                        value={`${config.passing_score}%`}
                      />
                      <SettingItem
                        label="Max Attempts"
                        value={config.max_attempts ?? 'Unlimited'}
                      />
                      <SettingItem
                        label="Kuota Paket A"
                        value={`${config.package_a_questions ?? 50} soal`}
                      />
                      <SettingItem
                        label="Kuota Paket B"
                        value={`${config.package_b_questions ?? 50} soal`}
                      />
                      <SettingItem
                        label="Maks. Juz Penuh (A+B)"
                        value={`${(config.package_a_questions ?? 50) + (config.package_b_questions ?? 50)} soal`}
                      />
                      <SettingItem
                        label="Score Mode"
                        value={config.score_calculation_mode === 'highest' ? 'Highest' : 'Average'}
                      />
                      <SettingItem
                        label="Auto Submit"
                        value={config.auto_submit_on_timeout ? 'Yes' : 'No'}
                      />
                      {config.start_time && (
                        <SettingItem
                          label="Start Time"
                          value={formatDateTime(config.start_time)}
                        />
                      )}
                      {config.end_time && (
                        <SettingItem
                          label="End Time"
                          value={formatDateTime(config.end_time)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {!config.is_active && (
                      <button
                        onClick={() => handleSetActive(config.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Set as active"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingConfig(config);
                        setShowModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit configuration"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingConfigId(config.id);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete configuration"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingConfig ? 'Edit Configuration' : 'New Configuration'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingConfig(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <ConfigForm
              config={editingConfig}
              onSave={handleSave}
              onCancel={() => {
                setShowModal(false);
                setEditingConfig(null);
              }}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Configuration
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this configuration? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingConfigId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deletingConfigId && handleDelete(deletingConfigId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Setting Item Component
function SettingItem({
  icon,
  label,
  value
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

// Config Form Component
function ConfigForm({
  config,
  onSave,
  onCancel,
  isSaving
}: {
  config: ExamConfiguration | null;
  onSave: (data: ExamConfigurationForm) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const initialPkgA = config?.package_a_questions ?? 50;
  const initialPkgB = config?.package_b_questions ?? 50;

  const [formData, setFormData] = useState<ExamConfigurationForm>({
    name: config?.name || '',
    description: config?.description || '',
    duration_minutes: config?.duration_minutes || 300,
    start_time: config?.start_time || '',
    end_time: config?.end_time || '',
    max_attempts: config?.max_attempts ?? 3,
    shuffle_questions: config?.shuffle_questions ?? true,
    randomize_order: config?.randomize_order ?? false,
    show_questions_all: config?.show_questions_all ?? true,
    package_a_questions: initialPkgA,
    package_b_questions: initialPkgB,
    questions_per_attempt: initialPkgA + initialPkgB,
    passing_score: config?.passing_score || 80,
    auto_grade: config?.auto_grade ?? true,
    score_calculation_mode: config?.score_calculation_mode || 'highest',
    allow_review: config?.allow_review ?? false,
    show_results: config?.show_results ?? true,
    auto_submit_on_timeout: config?.auto_submit_on_timeout ?? true,
    is_active: config?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pkgA = Number(formData.package_a_questions ?? 50);
    const pkgB = Number(formData.package_b_questions ?? 50);
    onSave({
      ...formData,
      package_a_questions: pkgA,
      package_b_questions: pkgB,
      questions_per_attempt: pkgA + pkgB,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Basic Information</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>
      </div>

      {/* Timing */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Timing</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <input
              type="number"
              min="1"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Attempts
            </label>
            <input
              type="number"
              min="1"
              value={formData.max_attempts ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                max_attempts: e.target.value ? parseInt(e.target.value) : undefined
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time (WIB)
            </label>
            <input
              type="datetime-local"
              value={formData.start_time ? fromLocalISOString(formData.start_time) : ''}
              onChange={(e) => setFormData({
                ...formData,
                start_time: e.target.value ? toLocalISOString(e.target.value) : undefined
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {formData.start_time && (
              <p className="text-xs text-gray-500 mt-1">
                {formatDateTime(formData.start_time)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time (WIB)
            </label>
            <input
              type="datetime-local"
              value={formData.end_time ? fromLocalISOString(formData.end_time) : ''}
              onChange={(e) => setFormData({
                ...formData,
                end_time: e.target.value ? toLocalISOString(e.target.value) : undefined
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {formData.end_time && (
              <p className="text-xs text-gray-500 mt-1">
                {formatDateTime(formData.end_time)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Kuota Paket Soal &amp; Nilai Kelulusan</h4>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kuota Paket A (1/2 Juz Awal)
            </label>
            <input
              type="number"
              min="0"
              value={formData.package_a_questions ?? 50}
              onChange={(e) => {
                const pkgA = e.target.value ? parseInt(e.target.value) : 0;
                const pkgB = Number(formData.package_b_questions ?? 50);
                setFormData({
                  ...formData,
                  package_a_questions: pkgA,
                  questions_per_attempt: pkgA + pkgB
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kuota Paket B (1/2 Juz Akhir)
            </label>
            <input
              type="number"
              min="0"
              value={formData.package_b_questions ?? 50}
              onChange={(e) => {
                const pkgB = e.target.value ? parseInt(e.target.value) : 0;
                const pkgA = Number(formData.package_a_questions ?? 50);
                setFormData({
                  ...formData,
                  package_b_questions: pkgB,
                  questions_per_attempt: pkgA + pkgB
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passing Score * (0-100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.passing_score}
              onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <p className="text-xs text-gray-600">
          Total maksimal untuk ujian 1 Juz penuh (Ujian Seleksi &amp; Ujian Akhir Paket B):{' '}
          <strong>{(formData.package_a_questions ?? 50) + (formData.package_b_questions ?? 50)} soal</strong>.
          Untuk Ujian Akhir setengah juz (Paket A): <strong>{formData.package_a_questions ?? 50} soal Paket A</strong>.
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.shuffle_questions}
              onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Shuffle question order</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.randomize_order}
              onChange={(e) => setFormData({ ...formData, randomize_order: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Randomize option order</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.show_questions_all}
              onChange={(e) => setFormData({ ...formData, show_questions_all: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Show all questions at once</span>
          </label>
        </div>
      </div>

      {/* Behavior */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Behavior</h4>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.auto_grade}
              onChange={(e) => setFormData({ ...formData, auto_grade: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Auto grade exam</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.show_results}
              onChange={(e) => setFormData({ ...formData, show_results: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Show results immediately</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.allow_review}
              onChange={(e) => setFormData({ ...formData, allow_review: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Allow reviewing answers after submit</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Score Calculation Mode (if max_attempts &gt; 1)
            </label>
            <select
              value={formData.score_calculation_mode}
              onChange={(e) => setFormData({ ...formData, score_calculation_mode: e.target.value as 'highest' | 'average' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="highest">Highest Score (ambil nilai tertinggi)</option>
              <option value="average">Average Score (ambil rata-rata)</option>
            </select>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.auto_submit_on_timeout}
              onChange={(e) => setFormData({ ...formData, auto_submit_on_timeout: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Auto submit when time runs out</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Active (will be used for exam)</span>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Configuration
            </>
          )}
        </button>
      </div>
    </form>
  );
}
