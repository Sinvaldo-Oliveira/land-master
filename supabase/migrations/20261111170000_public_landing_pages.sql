-- Landing Page Builder — Etapa 7: leitura pública da versão publicada.
-- Nunca retorna draft_document: visitantes recebem somente a versão imutável apontada pela página no ar.

create or replace function public.get_public_landing(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', p.title,
    'slug', p.slug,
    'document', v.document
  )
  from public.pages p
  join public.page_versions v on v.id = p.published_version_id
  where p.kind = 'landing'
    and p.status = 'published'
    and p.slug = p_slug
$$;

revoke execute on function public.get_public_landing(text) from public;
grant execute on function public.get_public_landing(text) to anon, authenticated;
