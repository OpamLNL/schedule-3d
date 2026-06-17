import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { filterTextOptions } from '../utils/filterTerms'
import { filterTeacherOptions } from '../utils/teacherOptions'

type TeacherComboboxProps = {
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  emptyHint?: string
  searchMode?: 'teacher' | 'text'
}

type ListPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
}

function computeListPosition(input: HTMLInputElement): ListPosition {
  const rect = input.getBoundingClientRect()
  const gap = 4
  const padding = 8
  const minWidth = Math.max(rect.width, 320)
  const left = Math.min(Math.max(padding, rect.left), window.innerWidth - minWidth - padding)
  const desiredMax = 320
  const spaceBelow = window.innerHeight - rect.bottom - gap - padding
  const spaceAbove = rect.top - gap - padding
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow
  const maxHeight = Math.max(140, Math.min(desiredMax, openUp ? spaceAbove : spaceBelow))
  const top = openUp ? Math.max(padding, rect.top - gap - maxHeight) : rect.bottom + gap

  return { top, left, width: minWidth, maxHeight }
}

export function TeacherCombobox({
  value,
  options,
  onChange,
  placeholder,
  className,
  emptyHint = 'Завантажте навплан на сторінці «Навплан» — тоді з’явиться список викладачів',
  searchMode = 'teacher',
}: TeacherComboboxProps) {
  const [open, setOpen] = useState(false)
  const [listPosition, setListPosition] = useState<ListPosition | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const inputId = useId()

  const suggestions = useMemo(() => {
    const filter = searchMode === 'text' ? filterTextOptions : filterTeacherOptions
    return filter(options, value, 40)
  }, [options, value, searchMode])
  const query = value.trim()

  const updateListPosition = () => {
    if (!inputRef.current) return
    setListPosition(computeListPosition(inputRef.current))
  }

  useLayoutEffect(() => {
    if (!open) {
      setListPosition(null)
      return
    }
    updateListPosition()
  }, [open, value, suggestions.length, options.length])

  useEffect(() => {
    if (!open) return

    const onViewportChange = () => updateListPosition()
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [open, value, suggestions.length, options.length])

  useEffect(() => {
    if (!open) return

    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const showEmptyHint = open && options.length === 0
  const showNoMatches = open && query.length > 0 && options.length > 0 && suggestions.length === 0
  const showSuggestions = open && suggestions.length > 0
  const showList = showEmptyHint || showNoMatches || showSuggestions

  const list = showList && listPosition ? (
    <ul
      ref={listRef}
      className="teacher-combobox-list teacher-combobox-list-portal"
      role="listbox"
      aria-labelledby={inputId}
      style={{
        top: listPosition.top,
        left: listPosition.left,
        width: listPosition.width,
        maxHeight: listPosition.maxHeight,
      }}
    >
      {showSuggestions ? (
        <li className="teacher-combobox-head">
          {query ? `Знайдено: ${suggestions.length}` : `У списку: ${suggestions.length}`}
        </li>
      ) : null}
      {showEmptyHint ? <li className="teacher-combobox-empty">{emptyHint}</li> : null}
      {showNoMatches ? <li className="teacher-combobox-empty">Немає збігів для «{query}»</li> : null}
      {suggestions.map((opt) => (
        <li key={opt}>
          <button
            type="button"
            role="option"
            aria-selected={opt === value}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange(opt)
              setOpen(false)
            }}
          >
            {opt}
          </button>
        </li>
      ))}
    </ul>
  ) : null

  return (
    <div className={`teacher-combobox ${className ?? ''}`.trim()} ref={rootRef}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-lpignore="true"
        data-form-type="other"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'ArrowDown') setOpen(true)
        }}
      />
      {list ? createPortal(list, document.body) : null}
    </div>
  )
}
