'use client'

import { useEffect, useRef, useState } from 'react'

type Category = { id: string; name: string; type: string }

export default function CategoryCombobox({
  categories,
  value,
  onChange,
  placeholder = 'Cari kategori...',
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const selected = categories.find(category => category.id === value)
  const filtered = categories.filter(category =>
    category.name.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        className="w-full px-4 py-2 border rounded-lg"
        placeholder={placeholder}
        value={open ? query : selected?.name ?? ''}
        onFocus={() => setOpen(true)}
        onChange={event => setQuery(event.target.value)}
      />

      {open && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg">
          {filtered.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-500">Kategori nggak ketemu</li>
          )}

          {filtered.map(category => (
            <li
              key={category.id}
              className={`cursor-pointer px-4 py-2 hover:bg-gray-100 ${
                category.id === value ? 'bg-gray-50 font-medium' : ''
              }`}
              onMouseDown={() => {
                onChange(category.id)
                setOpen(false)
                setQuery('')
              }}
            >
              {category.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
