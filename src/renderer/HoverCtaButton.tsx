import { ArrowRight } from 'lucide-react'
import { clsx as cn } from 'clsx'
import { isExternal, safeHref } from './safe-href'
import type { LinkItem } from './types'

/**
 * Botão de CTA com animação ao passar o mouse: o texto sai, uma seta entra e uma bolha
 * preenche o botão. Mesmo mecanismo do botão de referência (InteractiveHoverButton), refeito
 * com os tokens do site (cores, borda, raio) e sem dependências novas.
 * O href passa SEMPRE por safeHref: o texto e o link vêm do documento editável.
 * A camada de trás é aria-hidden: o rótulo é lido uma vez só.
 */
export function HoverCtaButton({ link, className }: { link: LinkItem; className?: string }) {
  const href = safeHref(link.href)
  const external = isExternal(href)
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(
        'group relative inline-flex min-h-12 min-w-44 max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-full border border-site-primary/50 bg-site-card px-6 text-center text-[0.95rem] font-semibold text-site-foreground',
        className,
      )}
    >
      <span className="inline-block whitespace-nowrap transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">{link.label}</span>
      <span
        aria-hidden="true"
        className="absolute inset-0 z-10 flex items-center justify-center gap-2 whitespace-nowrap text-site-primary-foreground opacity-0 transition-all duration-300 translate-x-12 group-hover:-translate-x-1 group-hover:opacity-100"
      >
        {link.label}
        <ArrowRight className="size-4" />
      </span>
      <span
        aria-hidden="true"
        className="absolute left-[20%] top-[40%] h-2 w-2 scale-100 rounded-lg bg-site-primary transition-all duration-300 group-hover:left-0 group-hover:top-0 group-hover:h-full group-hover:w-full group-hover:scale-[1.8]"
      />
      {external ? <span className="sr-only"> (abre em nova aba)</span> : null}
    </a>
  )
}
