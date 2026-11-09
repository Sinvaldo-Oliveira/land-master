/** Classes compartilhadas entre controles do admin. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent'

export const controlBase = [
  'w-full rounded-admin border border-admin-rule-strong bg-admin-card px-3',
  'font-admin-body text-admin-base text-admin-ink placeholder:text-admin-ink-3',
  'transition-colors duration-[120ms] ease-admin hover:border-admin-ink-3 focus-visible:border-admin-accent',
  'disabled:cursor-not-allowed disabled:bg-admin-sunken disabled:opacity-60',
  'aria-invalid:border-admin-danger',
  focusRing,
].join(' ')
