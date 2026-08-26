/**
 * App-wide button. Variants map to action-bar slots: one `primary` per screen,
 * `ghost` for low-weight actions, `destructive` for delete.
 *
 * `buttonClass` exists for the file-picker labels, which must stay <label> so
 * iOS opens the native camera sheet from the user gesture.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:pointer-events-none disabled:opacity-60'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-field text-content ring-1 ring-line hover:bg-hover',
  ghost: 'text-content-muted hover:bg-hover',
  destructive: 'text-danger hover:bg-danger-soft',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-2.5 py-1.5 text-xs',
  md: 'rounded-xl px-4 py-2.5 text-sm',
}

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`.trim()
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Replaces the label and disables the button while an action is in flight. */
  busy?: boolean
  busyLabel?: string
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  busy = false,
  busyLabel,
  disabled,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || busy}
      className={buttonClass(variant, size, className)}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  )
}
