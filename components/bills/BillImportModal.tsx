'use client'

import { useState, useEffect } from 'react'
import { FiX, FiCheck, FiRepeat } from 'react-icons/fi'

interface RecurringTransaction {
  id: string
  name: string
  amount: number
  frequency: string
  nextPaymentDate: string
}

interface BillImportModalProps {
  onClose: () => void
  onImportComplete: () => void
}

export default function BillImportModal({ onClose, onImportComplete }: BillImportModalProps) {
  const [candidates, setCandidates] = useState<RecurringTransaction[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number } | null>(null)

  useEffect(() => {
    fetchCandidates()
  }, [])

  const fetchCandidates = async () => {
    try {
      const response = await fetch('/api/bills/import')
      const data = await response.json()
      if (response.ok) {
        setCandidates(data.candidates || [])
      }
    } catch (error) {
      console.error('Error fetching candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const selectAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(candidates.map(c => c.id)))
    }
  }

  const handleImport = async () => {
    if (selected.size === 0) return

    setImporting(true)
    try {
      const response = await fetch('/api/bills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurringIds: Array.from(selected) }),
      })

      const data = await response.json()
      if (response.ok) {
        setResult({ imported: data.imported })
        setTimeout(() => {
          onImportComplete()
        }, 1500)
      }
    } catch (error) {
      console.error('Error importing bills:', error)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Import from Recurring Transactions</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : result ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheck className="text-green-600" size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete!</h3>
              <p className="text-gray-600">
                Successfully imported {result.imported} bill{result.imported !== 1 ? 's' : ''}
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8">
              <FiRepeat className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Candidates Found</h3>
              <p className="text-gray-600">
                All your recurring transactions are already linked to bills, or you don't have any recurring transactions yet.
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">
                  Select recurring transactions to create bill reminders
                </p>
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {selected.size === candidates.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2">
                {candidates.map((candidate) => (
                  <label
                    key={candidate.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.has(candidate.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(candidate.id)}
                      onChange={() => toggleSelect(candidate.id)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{candidate.name}</div>
                      <div className="text-sm text-gray-500">
                        Rp {candidate.amount.toLocaleString('id-ID')} • {candidate.frequency}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Next: {new Date(candidate.nextPaymentDate).toLocaleDateString('id-ID')}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {!loading && !result && candidates.length > 0 && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${selected.size} Bill${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
