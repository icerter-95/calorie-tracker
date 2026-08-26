/**
 * Ingredient tag editor: chips, add/remove, optional AI "Suggest" button.
 */
import { useState } from 'react'
import { normalizeIngredientTag, normalizeIngredientTags } from '../lib/ingredients'

interface IngredientChipsProps {
  value: string[]
  onChange: (tags: string[]) => void
  onSuggest?: () => void | Promise<void>
  suggesting?: boolean
  disabled?: boolean
  /** Hide the "Tags" section label; keep actions + placeholders. */
  hideLabel?: boolean
}

export default function IngredientChips({
  value,
  onChange,
  onSuggest,
  suggesting,
  disabled,
  hideLabel,
}: IngredientChipsProps) {
  const [draft, setDraft] = useState('')

  // Normalize + dedupe tags as the user adds them.
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
      {(onSuggest || !hideLabel) && (
        <div className="flex items-center justify-between gap-2">
          {!hideLabel ? (
            <span className="text-sm font-medium text-content-muted">Tags</span>
          ) : (
            <span className="sr-only">Tags</span>
          )}
          {onSuggest && (
            <button
              type="button"
              onClick={() => void onSuggest()}
              disabled={disabled || suggesting}
              className={`text-sm font-medium text-accent-ink hover:text-accent-hover disabled:opacity-60 ${
                hideLabel ? 'ml-auto' : ''
              }`}
            >
              {suggesting ? 'Suggesting…' : 'Suggest'}
            </button>
          )}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-content-muted"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={disabled}
                className="text-content-faint hover:text-content disabled:opacity-50"
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
          placeholder="Add tag"
          className="min-w-0 flex-1 rounded-lg border border-line-strong bg-field px-3 py-2 text-sm text-content"
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          disabled={disabled || !draft.trim()}
          className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-content-muted hover:bg-hover disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}
