import React from 'react'
import { Users, XCircle } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  data: {
    userId: string
    userName: string
    mainTimeSlot: string
    chosenJuz: string
  } | null
  pairings: Array<{
    id: string
    user_1_name: string
    user_2_name: string
    user_1_time: string | undefined
    user_2_time: string | undefined
    user_1_juz: string
    user_2_juz: string
  }>
  onConfirm: (pairingId: string, userId: string) => void
}

export function AddToPairModal({ isOpen, onClose, data, pairings, onConfirm }: Props) {
  if (!isOpen || !data) return null

  // Sort pairings: time match first, then juz match
  const processedPairings = [...pairings]
    .map(pairing => {
      const timeMatch = pairing.user_1_time === data.mainTimeSlot || pairing.user_2_time === data.mainTimeSlot
      const juzMatch = pairing.user_1_juz === data.chosenJuz || pairing.user_2_juz === data.chosenJuz
      return { ...pairing, timeMatch, juzMatch }
    })
    .sort((a, b) => {
      if (a.timeMatch && !b.timeMatch) return -1
      if (!a.timeMatch && b.timeMatch) return 1
      if (a.juzMatch && !b.juzMatch) return -1
      if (!a.juzMatch && b.juzMatch) return 1
      return 0
    })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tambah ke Pasangan</h3>
              <p className="text-sm text-gray-600 mt-1">
                Menambahkan <span className="font-medium">{data.userName}</span> ke pasangan existing
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Waktu utama: {data.mainTimeSlot}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {processedPairings.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Tidak ada pasangan yang tersedia</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">Pilih pasangan untuk dijadikan kelompok 3 orang:</p>
              {processedPairings.map((pairing) => (
                <button
                  key={pairing.id}
                  onClick={() => onConfirm(pairing.id, data.userId)}
                  className={`w-full p-3 border rounded-lg transition-colors text-left ${
                    pairing.timeMatch
                      ? 'border-green-300 bg-green-50 hover:bg-green-100'
                      : pairing.juzMatch
                        ? 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                        : 'border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {pairing.user_1_name} & {pairing.user_2_name}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          Waktu: {pairing.user_1_time || '-'} / {pairing.user_2_time || '-'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Juz: {pairing.user_1_juz || '-'} / {pairing.user_2_juz || '-'}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        {pairing.timeMatch && (
                          <span className="text-xs text-green-600 font-medium">✓ Waktu cocok</span>
                        )}
                        {pairing.juzMatch && (
                          <span className="text-xs text-blue-600 font-medium">✓ Juz cocok</span>
                        )}
                      </div>
                    </div>
                    <Users className={`w-5 h-5 ${
                      pairing.timeMatch ? 'text-green-600' : pairing.juzMatch ? 'text-blue-600' : 'text-purple-600'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}
