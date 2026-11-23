'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { autoCreateSimpleHalaqah } from '@/lib/admin/halaqah-client';

interface Batch {
  id: string;
  name: string;
  status: string;
}

interface AutoCreateHalaqahModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AutoCreateHalaqahModal({ onClose, onSuccess }: AutoCreateHalaqahModalProps) {
  console.log('[AutoCreateHalaqahModal] Component mounted - Version 2026-01-04');

  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    details: string[];
  } | null>(null);

  useEffect(() => {
    console.log('[AutoCreateHalaqahModal] useEffect triggered - calling loadBatches');
    loadBatches();
  }, []);

  const loadBatches = async () => {
    console.log('[AutoCreateHalaqahModal] Loading batches...');
    setLoading(true);
    try {
      // Try API endpoint first (for admins)
      const response = await fetch('/api/admin/batches');
      const apiResult = await response.json();

      console.log('[AutoCreateHalaqahModal] API response:', { ok: response.ok, data: apiResult.data?.length });

      if (response.ok && apiResult.data) {
        // Filter only open batches
        const openBatches = apiResult.data.filter((b: Batch) => b.status === 'open');
        console.log('[AutoCreateHalaqahModal] Open batches:', openBatches.length);
        setBatches(openBatches);
        if (openBatches.length > 0) {
          setSelectedBatch(openBatches[0].id);
          console.log('[AutoCreateHalaqahModal] Selected batch:', openBatches[0].id, openBatches[0].name);
        }
        return;
      }

      // If API fails, show error
      throw new Error(apiResult.error || 'Failed to load batches');
    } catch (error: any) {
      console.error('Error loading batches:', error);
      toast.error('Failed to load batches: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoCreate = async () => {
    console.log('[AutoCreateHalaqahModal] handleAutoCreate called');
    console.log('[AutoCreateHalaqahModal] selectedBatch:', selectedBatch);

    if (!selectedBatch) {
      console.log('[AutoCreateHalaqahModal] No batch selected');
      toast.error('Please select batch');
      return;
    }

    console.log('[AutoCreateHalaqahModal] Starting creation process...');
    setCreating(true);

    try {
      const result = await autoCreateSimpleHalaqah({
        batch_id: selectedBatch,
      });

      if (!result.success) {
        console.error('[AutoCreateHalaqahModal] Error:', result);
        throw new Error(result.error || 'Failed to auto-create halaqah');
      }

      console.log('[AutoCreateHalaqahModal] Result:', result);

      setResult({
        success: result.created || 0,
        failed: result.skipped || 0,
        details: result.details || [],
      });

      if (result.created && result.created > 0) {
        toast.success(result.message || `Successfully created ${result.created} halaqah`);
      }

      if (result.skipped && result.skipped > 0) {
        toast.error(`Skipped ${result.skipped} halaqah`);
      }
    } catch (error: any) {
      console.error('Error in auto create:', error);
      toast.error('Failed to auto create halaqah: ' + error.message);
      setResult({
        success: 0,
        failed: 1,
        details: [error.message]
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (result && result.success > 0) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Auto Create Halaqah</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!result ? (
            <>
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Fitur ini akan membuat halaqah secara otomatis untuk setiap muallimah yang sudah diapprove di batch yang dipilih.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Catatan:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Halaqah akan dibuat untuk setiap muallimah dengan status "approved"</li>
                        <li>Kuota maksimal thalibah diambil dari data muallimah (default: 20)</li>
                        <li>Waitlist max diset otomatis ke 5</li>
                        <li>Halaqah yang sudah ada tidak akan dibuat ulang</li>
                        <li>Program dan jadwal akan ditambahkan secara manual setelah halaqah dibuat</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Batch Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    disabled={loading || creating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-900"
                  >
                    <option value="">Select Batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  disabled={creating}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('[AutoCreateHalaqahModal] Button clicked');
                    handleAutoCreate();
                  }}
                  disabled={creating || !selectedBatch}
                  className="px-4 py-2 bg-green-900 text-white rounded-md hover:bg-green-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? 'Creating...' : 'Auto Create Halaqah'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Result Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-green-800 font-medium">Success</p>
                        <p className="text-2xl font-bold text-green-900">{result.success}</p>
                      </div>
                    </div>
                  </div>
                  {result.failed > 0 && (
                    <div className="flex-1 bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="text-sm text-red-800 font-medium">Failed</p>
                          <p className="text-2xl font-bold text-red-900">{result.failed}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Details:</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-64 overflow-y-auto">
                    <ul className="space-y-1 text-sm font-mono">
                      {result.details.map((detail, index) => (
                        <li key={index} className="text-gray-700">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-green-900 text-white rounded-md hover:bg-green-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
