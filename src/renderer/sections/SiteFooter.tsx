import { SiteThemeContext } from '../context'
import { useContext } from 'react'
import { BrandMark, Container } from '../primitives'
import { safeHref } from '../safe-href'
import { mergeStyles, surfaceStyle, textVars } from '../surface'
import { colorVars } from '../theme'
import type { FooterSection } from '../types'

export function SiteFooter({ section }: { section: FooterSection }) {
  const theme = useContext(SiteThemeContext)
  const year = new Date().getFullYear()
  return (
    <footer
      // Fundo personalizado (cor/degradê) ou, por padrão, as cores escuras do tema.
      style={mergeStyles(theme ? (surfaceStyle(theme, section.background) ?? colorVars(theme.darkColors)) : undefined, textVars(section.text))}
      className="bg-site-background pt-16 text-site-foreground"
    >
      <Container className="grid gap-12 pb-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          {section.logoUrl?.trim() ? (
            // Logo enviado: altura vem do editor; largura acompanha a proporção da imagem.
            <img
              src={section.logoUrl.trim()}
              alt={section.brand.name}
              loading="lazy"
              decoding="async"
              style={{ height: section.logoHeight ?? 40 }}
              className="block w-auto max-w-[220px] object-contain"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <BrandMark name={section.brand.name} />
              <span className="font-site-heading text-lg font-semibold">{section.brand.name}</span>
            </div>
          )}
          <p className="mt-4 text-site-muted-foreground">{section.description}</p>
        </div>
        {section.columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-semibold tracking-[0.12em] text-site-foreground uppercase">{column.title}</h2>
            <ul className="mt-4 grid gap-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a href={safeHref(link.href)} className="break-words text-site-muted-foreground transition-colors hover:text-site-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-t border-site-border">
        <Container className="flex flex-col gap-2 py-6 text-sm text-site-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {section.brand.name}. {section.legal}
          </p>
          <a href="#inicio" className="hover:text-site-foreground">
            Voltar ao topo <span aria-hidden="true">↑</span>
          </a>
        </Container>
      </div>
    </footer>
  )
}
