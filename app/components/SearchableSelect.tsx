'use client'

import React, { useState, useRef, useEffect } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'

type Option = { id: string; name: string; color?: string }

type SearchableSelectProps = {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  icon?: React.ReactNode
  className?: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Cari...',
  required = false,
  icon,
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.id === value)
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          {icon}
        </div>
      )}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-8 py-2 border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white truncate`}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            {selected.color && (
              <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
            )}
            {selected.name}
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); setSearch('') }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <FiX size={16} />
        </button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <FiSearch className="text-gray-400 flex-shrink-0" size={14} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm outline-none"
              placeholder="Cari kategori..."
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">Tidak ditemukan</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id)
                  setOpen(false)
                  setSearch('')
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 ${opt.id === value ? 'bg-blue-50 font-medium' : ''}`}
              >
                {opt.color && (
                  <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                )}
                {opt.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Hidden input for form validation */}
      {required && <input type="text" value={value} required tabIndex={-1} className="sr-only" onChange={() => {}} />}
    </div>
  )
}
