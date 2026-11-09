import { clsx } from 'clsx'
import { Menu, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { ActionLink, BrandMark, Container } from '../primitives'
import { safeHref } from '../safe-href'
import type { HeaderSection } from '../types'

export function SiteHeader({ section }: { section: HeaderSection }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuId = useId()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header
      className={clsx(
        'sticky top-0 z-40 border-b transition-colors duration-300',
        scrolled || open
          ? 'border-site-border bg-[color-mix(in_srgb,var(--site-background)_88%,transparent)] backdrop-blur-md'
          : 'border-transparent bg-transparent',
      )}
    >
      <Container className="flex h-[4.5rem] items-center justify-between gap-6">
        <a href="#inicio" className="flex items-center gap-2.5 rounded-site" aria-label={`${section.brand.name} — início`}>
          <BrandMark name={section.brand.name} />
          <span className="font-site-heading text-lg font-semibold tracking-tight whitespace-nowrap">{section.brand.name}</span>
        </a>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {section.links.map((link) => (
              <li key={link.href + link.label}>
                <a
                  href={safeHref(link.href)}
                  className="rounded-full px-3.5 py-2 text-[0.95rem] font-medium text-site-muted-foreground transition-colors hover:text-site-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {/* wrapper: "hidden" no próprio link conflitaria com o inline-flex base (sem tailwind-merge) */}
          {section.cta ? (
            <span className="hidden sm:block">
              <ActionLink link={section.cta} />
            </span>
          ) : null}
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border border-site-border bg-site-card lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            <span className="sr-only">{open ? 'Fechar menu' : 'Abrir menu'}</span>
          </button>
        </div>
      </Container>

      <div id={menuId} hidden={!open} className="border-t border-site-border lg:hidden">
        <Container className="py-4">
          <nav aria-label="Principal (celular)">
            <ul className="grid gap-1">
              {section.links.map((link) => (
                <li key={link.href + link.label}>
                  <a
                    href={safeHref(link.href)}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center rounded-site px-3 text-base font-medium hover:bg-site-muted"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {section.cta ? (
            <div className="mt-3 sm:hidden" onClickCapture={() => setOpen(false)}>
              <ActionLink link={section.cta} className="w-full" />
            </div>
          ) : null}
        </Container>
      </div>
    </header>
  )
}
