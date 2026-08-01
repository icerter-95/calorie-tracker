import { useState } from 'react'
import { normalizeIngredientTag, normalizeIngredientTags } from '../lib/ingredients'

interface IngredientChipsProps {
  value: string[]
  onChange: (tags: string[]) => void
  onSuggest?: () => void | Promise<void>
  suggesting?: boolean
  disabled?: boolean
}

export default function IngredientChips({
  value,
  onChange,
  onSuggest,
  suggesting,
  disabled,
}: IngredientChipsProps) {
  const [draft, setDraft] = useState('')

  function addTag(raw: string) {
    const tag = normalizeIngredientTag(raw)
    if (!tag) return
    if (value.includes(tag)) {
      setDraft('')
      return
    }
    onChange(normalizeIngredientTags([...value, tag]))
    setDraft('')
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-200">Tags</span>
        {onSuggest && (
          <button
            type="button"
            onClick={() => void onSuggest()}
            disabled={disabled || suggesting}
            className="text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-60 dark:text-teal-400"
          >
            {suggesting ? 'Suggesting…' : 'Suggest tags'}
          </button>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={disabled}
                className="text-stone-400 hover:text-stone-700 disabled:opacity-50 dark:hover:text-stone-100"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag(draft)
            }
          }}
          placeholder="Add tag (e.g. chicken)"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          disabled={disabled || !draft.trim()}
          className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-50 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
        >
          Add
        </button>
      </div>
    </div>
  )
}
