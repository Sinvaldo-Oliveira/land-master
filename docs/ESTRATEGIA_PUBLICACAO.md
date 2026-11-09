# Estratégia de Publicação — Home e Landing Pages

> Versão 0.1 · 2026-11-09 · Status: **proposta para aprovação** (decisão arquitetural ADR-001)

## 1. Restrições do ambiente

| Restrição | Consequência |
|---|---|
| Hostinger compartilhada, apenas arquivos estáticos de `dist/` servidos por Apache/LiteSpeed. | Sem Node residente, sem `npm run build` no servidor. |
| A dashboard roda no navegador. | **Não pode** gravar em `public_html` nem disparar build local. |
| O cliente não usa terminal nem FTP. | Publicar precisa ser um clique na dashboard. |
| Supabase Edge Functions servem JSON normalmente, mas no domínio padrão `*.supabase.co` respostas `text/html` a `GET` são reescritas como texto (comportamento documentado pelo Supabase; reconfirmar na Fase 5). | Edge Function **não serve** a página HTML ao visitante. |
| Hostinger compartilhada executa PHP sob demanda (não é processo residente). | PHP pode ser usado como camada **opcional** de SEO, sem ser requisito. |

## 2. Alternativas avaliadas

### A — Renderização dinâmica a partir de JSON publicado no Supabase
A SPA (em `dist/`) tem uma rota `/:slug`. O navegador busca a versão publicada via RPC pública (`get_published_page(slug)`, RLS permite ler só o que está publicado) e renderiza com o mesmo conjunto controlado de componentes React do editor.

### B — Geração de HTML estático com build e deploy automatizados
Publicar dispara uma Edge Function → `repository_dispatch` no GitHub → GitHub Actions faz build/prerender → envia por FTP/SFTP para a Hostinger.

### C — Híbrida (A + camada de SEO opcional em PHP)
Igual à A para renderização. Um `index.php` de ~100 linhas, acionado por `.htaccess` apenas para rotas públicas, busca os metadados e o JSON publicados no Supabase (chave anon, só dados públicos), injeta `<title>`, meta description, Open Graph, canônica e JSON-LD no HTML do `dist/index.html`, embute o JSON em `<script type="application/json" id="__PAGE__">` e mantém cache em arquivo por alguns minutos. Sem PHP, o site continua funcionando como na opção A.

## 3. Comparação

| Critério | A — Dinâmica | B — Build/deploy | C — Híbrida |
|---|---|---|---|
| Tempo até publicar | Imediato | 2–6 min (fila de CI) | Imediato (cache ≤ 5 min nos metadados, invalidável) |
| SEO (Google renderiza JS) | Bom | Excelente | Excelente |
| Prévia em WhatsApp/Facebook/LinkedIn (não executam JS) | **Ruim** — mostra metadados genéricos | Excelente | Excelente |
| Performance (LCP) | 2 requisições antes do conteúdo | Melhor | ~Igual à B (JSON embutido no HTML) |
| Simplicidade | Alta | Baixa (GitHub, segredos FTP, Actions por cliente) | Média-alta (1 arquivo PHP + regra `.htaccess`) |
| Custo | Zero adicional | Minutos de CI + manutenção | Zero adicional |
| Segurança | Só leitura pública via RLS | Credenciais FTP guardadas em CI — maior superfície | Só leitura pública; PHP sem segredos (chave anon é pública por definição) |
| Pontos de falha | Supabase indisponível → página em branco (mitigável) | CI/FTP falham silenciosamente; site fica desatualizado | Igual à A; PHP falhando cai para SPA pura |
| Compatível com hospedagem compartilhada | Sim | Sim | Sim (PHP é padrão nos planos Hostinger) |
| Replicação por cliente | Trivial | Configurar repositório/segredos por cliente | Trivial (arquivo vai junto no `dist/`) |

## 4. Decisão

**Adotar C — Híbrida**, implementada em duas etapas:

1. **Fase 5:** opção A completa (rota dinâmica, RPC pública, renderizador compartilhado com o editor, cache via TanStack Query + `Cache-Control` adequado).
2. **Fase 8:** camada PHP de SEO (`public/index.php` + regras `.htaccess`), `sitemap.xml` dinâmico e `robots.txt`.

A opção B fica registrada como evolução para clientes que exijam HTML estático puro.

**Por quê:** publicação instantânea com um clique, zero infraestrutura extra por cliente, nenhuma credencial de escrita fora do Supabase, e a camada PHP resolve a única desvantagem real da opção A (prévia em redes sociais e no WhatsApp — canal central para pequenos negócios) sem se tornar dependência obrigatória.

## 5. Modelo de publicação (Home e landing pages)

Ambas são registros em `pages` (`kind = 'home' | 'landing'`), com documentos em `page_versions`.

```
pages ─┬─ draft_version_id     → page_versions (editável, autosave)
       └─ published_version_id → page_versions (imutável)
```

- **Salvar** atualiza a versão de rascunho.
- **Publicar** = RPC `publish_page(page_id)`: valida o documento, copia o rascunho para uma nova versão imutável, aponta `published_version_id`, define `status='published'` e `published_at`, grava `audit_logs`. Transacional.
- **Despublicar** = `status='unpublished'`; a rota pública responde 404 (PHP envia status 404 real).
- **Restaurar** = copiar uma versão anterior para o rascunho.
- **Pré-visualização** = a dashboard renderiza o rascunho com o mesmo renderizador público, em moldura desktop/tablet/mobile. Não existe URL pública de rascunho (evita vazamento); se necessário no futuro, usar token assinado de curta duração.

## 6. Rotas públicas

| Rota | Conteúdo |
|---|---|
| `/` | Home publicada |
| `/:slug` | Landing page publicada |
| `/:slug/obrigado` | Página de agradecimento padrão do formulário (opcional por formulário) |
| `/privacidade` | Política de privacidade (conteúdo de `business_settings`) |
| `/admin/*` | Dashboard (lazy, nunca carregada no bundle público) |

Slugs: `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–80 caracteres, únicos, e uma **lista reservada** validada no banco (`admin`, `api`, `assets`, `privacidade`, `obrigado`, `login`, `sitemap.xml`, `robots.txt`, `index.php`, …). Alterar o slug de uma página publicada cria um redirecionamento 301 (`page_redirects`, P1).

## 7. Renderizador

- Um único pacote `src/renderer/` consome o JSON validado (`PageDocument`) e mapeia `block.type` → componente React de uma **lista fechada**. Tipo desconhecido → ignorado e logado.
- O bundle público importa só o renderizador (nunca o editor, dnd-kit, zustand, Recharts).
- Texto rico restrito a marcas (`bold`, `italic`, `link`) em estrutura JSON; links validados (`https:`, `mailto:`, `tel:`, `https://wa.me/`, rotas internas). Nada de `dangerouslySetInnerHTML`.
- Imagens: URLs do bucket público `site-media` (ou CDN de transformação do Supabase quando disponível no plano), com `width/height`, `loading="lazy"` abaixo da dobra e `fetchpriority="high"` no hero.

## 8. Resiliência

| Situação | Comportamento |
|---|---|
| Supabase lento/indisponível na Home | Fallback: snapshot da última Home publicada gerado no build (`dist/home.snapshot.json`) + mensagem discreta; formulários mostram erro e o link de WhatsApp. |
| Página não encontrada | 404 com layout do site (PHP envia HTTP 404; SPA mostra a página 404). |
| Documento com `schemaVersion` antigo | Migrações de documento (`migrateDocument(v→v+1)`) executadas no carregamento e ao salvar. |
| Documento inválido | Não publica (validação no RPC); o renderizador ignora blocos inválidos em vez de quebrar a página. |

## 9. Configuração Hostinger (Fase 8)

```apache
# public/.htaccess (copiado para dist/)
Options -Indexes
RewriteEngine On

# HTTPS
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Arquivos reais são servidos diretamente
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Dashboard: sempre SPA pura
RewriteRule ^admin(/.*)?$ index.html [L]

# Rotas públicas: camada de SEO (se index.php existir), senão SPA
RewriteCond %{DOCUMENT_ROOT}/index.php -f
RewriteRule ^ index.php [L]
RewriteRule ^ index.html [L]
```

Mais cabeçalhos: cache longo e imutável para `/assets/*` (com hash), `no-cache` para `index.html`, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Detalhes em [ARQUITETURA_TECNICA §Segurança](ARQUITETURA_TECNICA.md#9-segurança).

## 10. Riscos

| Risco | Mitigação |
|---|---|
| PHP desativado/diferente no plano contratado | Camada é opcional; validar `php -v` no hPanel antes da Fase 8. |
| Cache do PHP mostrar metadados antigos | TTL curto (5 min) + `?purge=` assinado chamado pelo RPC de publicação via Edge Function (P1). |
| Limites da API Supabase no plano gratuito | Páginas públicas leem 1 RPC; cache HTTP e cache em arquivo do PHP reduzem chamadas. |
| Projeto Supabase gratuito pausa após inatividade | Recomendar plano pago em produção ou rotina de keep-alive documentada; decisão do cliente. |
