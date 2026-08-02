import { getInitials } from '../lib/userProfile'

type UserAvatarProps = {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  tone?: 'primary' | 'muted'
  className?: string
}

const SIZE_CLASS = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
} as const

const TONE_CLASS = {
  primary: 'bg-teal-700',
  muted: 'bg-stone-400',
} as const

export default function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  tone = 'primary',
  className = '',
}: UserAvatarProps) {
  const initials = getInitials(name)

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${SIZE_CLASS[size]} shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${TONE_CLASS[tone]} ${SIZE_CLASS[size]} ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  )
}
