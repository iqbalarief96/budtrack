'use client'

import React, { useEffect, useRef, useState } from 'react'
import { FiX, FiZap, FiCornerDownLeft } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'

type QuickTextModalProps = {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void | Promise<void>
}

type Feedback = {
  kind: 'success' | 'error'
  text: string
}

/**
 * One-line transaction capture, mirroring the iOS Shortcut flow:
 * type "DESKRIPSI-KATEGORI-DOMPET-JUMLAH", submit, done.
 *
 * Posts to /api/transactions/quick-text, which authenticates via session —
 * no API key is exposed to the browser.
 */
const QuickTextModal = ({ isOpen, onClose, onSaved }: QuickTextModalProps) => {
  const { wallets } = useWallet()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setText('')
      setFeedback(null)
      setLoading(false)
      return
    }
    // Focus the field right away so it behaves like the Shortcut prompt.
    const id = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(id)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || loading) return

    setLoading(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/transactions/quick-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Gagal menyimpan transaksi.')
      }

      setFeedback({ kind: 'success', text: data.message })
      setText('')
      inputRef.current?.focus()

      if (onSaved) await onSaved()
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Terjadi kesalahan.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const walletNames = wallets?.map(w => w.name) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 pt-20 sm:items-center sm:pt-4">
      <div className="relative w-full max-w-lg rounded-lg bg-white p-5 shadow-xl sm:p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Tutup"
        >
          <FiX size={22} />
        </button>

        <div className="mb-4 flex items-center gap-2 pr-8">
          <FiZap className="text-amber-500" size={20} />
          <h2 className="text-lg font-bold">Input Cepat</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kopi Kenangan-Makanan-Dompet Utama-28000"
            className="w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={loading}
            autoComplete="off"
          />

          <p className="mt-2 text-xs text-gray-500">
            Format: <span className="font-medium">DESKRIPSI-KATEGORI-DOMPET-JUMLAH</span>
          </p>

          <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <div className="mb-1">
              Nominal: <span className="font-medium">28000</span>,{' '}
              <span className="font-medium">28rb</span>, <span className="font-medium">28k</span>,{' '}
              atau <span className="font-medium">1.5jt</span>.
            </div>
            <div className="mb-1">
              Tanggal opsional di depan/belakang: <span className="font-medium">5 senin</span>,{' '}
              <span className="font-medium">5 9</span>, <span className="font-medium">5 sep</span>,{' '}
              <span className="font-medium">5/9</span>, atau <span className="font-medium">kemarin</span>.
            </div>
            {walletNames.length > 0 && (
              <div className="truncate text-gray-500">
                Dompet: {walletNames.slice(0, 4).join(', ')}
                {walletNames.length > 4 ? `, +${walletNames.length - 4} lagi` : ''}
              </div>
            )}
          </div>

          {feedback && (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                feedback.kind === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="hidden items-center gap-1 text-xs text-gray-400 sm:flex">
              <FiCornerDownLeft size={12} />
              Enter untuk simpan
            </span>
            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 sm:flex-none"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60 sm:flex-none"
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default QuickTextModal
