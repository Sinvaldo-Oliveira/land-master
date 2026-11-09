import { requireSupabase } from '@/lib/supabase'
import { supabaseErrorMessage } from '@/lib/supabase-errors'
import type { DealRow, PipelineRow, StageRow } from '@/types/database'
import { parseAmount, type DealFormValues } from './schemas'

export type Board = {
  pipeline: PipelineRow
  stages: StageRow[]
  deals: DealRow[]
  contacts: Record<string, { id: string; name: string; company: string | null }>
  owners: Record<string, string>
}

export async function fetchDefaultPipeline(): Promise<PipelineRow | null> {
  const { data, error } = await requireSupabase()
    .from('pipelines')
    .select('*')
    .is('archived_at', null)
    .order('is_default', { ascending: false })
    .order('position')
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível carregar o funil.'))
  return data
}

/** Carrega etapas, oportunidades e os nomes ligados a elas (contato e responsável) em poucas consultas. */
export async function fetchBoard(pipeline: PipelineRow): Promise<Board> {
  const sb = requireSupabase()
  const [stagesRes, dealsRes] = await Promise.all([
    sb.from('pipeline_stages').select('*').eq('pipeline_id', pipeline.id).is('archived_at', null).order('position'),
    sb
      .from('deals')
      .select('*')
      .eq('pipeline_id', pipeline.id)
      .is('deleted_at', null)
      .order('position', { ascending: true, nullsFirst: false })
      .limit(500),
  ])
  if (stagesRes.error) throw new Error(supabaseErrorMessage(stagesRes.error, 'Não foi possível carregar as etapas.'))
  if (dealsRes.error) throw new Error(supabaseErrorMessage(dealsRes.error, 'Não foi possível carregar as oportunidades.'))

  const deals = dealsRes.data ?? []
  const contactIds = [...new Set(deals.map((d) => d.contact_id))]
  const ownerIds = [...new Set(deals.map((d) => d.owner_id).filter((id): id is string => Boolean(id)))]

  const [contactsRes, ownersRes] = await Promise.all([
    contactIds.length > 0
      ? sb.from('contacts').select('id, name, company').in('id', contactIds)
      : Promise.resolve({ data: [], error: null }),
    ownerIds.length > 0
      ? sb.from('profiles').select('id, full_name').in('id', ownerIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (contactsRes.error) throw new Error(supabaseErrorMessage(contactsRes.error, 'Não foi possível carregar os contatos.'))

  return {
    pipeline,
    stages: stagesRes.data ?? [],
    deals,
    contacts: Object.fromEntries((contactsRes.data ?? []).map((c) => [c.id, c])),
    owners: Object.fromEntries((ownersRes.data ?? []).map((p) => [p.id, p.full_name ?? 'Sem nome'])),
  }
}

export async function moveDeal(dealId: string, stageId: string, beforeId: string | null = null, afterId: string | null = null) {
  const { data, error } = await requireSupabase().rpc('move_deal', {
    p_deal_id: dealId,
    p_stage_id: stageId,
    p_before_id: beforeId,
    p_after_id: afterId,
  })
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível mover a oportunidade.'))
  return data
}

export async function closeDealWon(dealId: string) {
  const { data, error } = await requireSupabase().rpc('close_deal_won', { p_deal_id: dealId })
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível registrar a venda.'))
  return data
}

export async function closeDealLost(dealId: string, reasonId: string, note: string) {
  const { data, error } = await requireSupabase().rpc('close_deal_lost', {
    p_deal_id: dealId,
    p_reason_id: reasonId,
    p_note: note.trim() === '' ? null : note.trim(),
  })
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível registrar a perda.'))
  return data
}

export async function reopenDeal(dealId: string) {
  const { data, error } = await requireSupabase().rpc('reopen_deal', { p_deal_id: dealId })
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível reabrir a oportunidade.'))
  return data
}

export async function createDeal(values: DealFormValues, pipelineId: string, ownerId: string) {
  const { data, error } = await requireSupabase()
    .from('deals')
    .insert({
      title: values.title.trim(),
      contact_id: values.contactId,
      pipeline_id: pipelineId,
      stage_id: values.stageId,
      owner_id: ownerId,
      amount: parseAmount(values.amount),
      created_by: ownerId,
    })
    .select('*')
    .single()
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível criar a oportunidade.'))
  return data
}

export async function fetchContactOptions() {
  const { data, error } = await requireSupabase()
    .from('contacts')
    .select('id, name, company')
    .is('deleted_at', null)
    .order('name')
    .limit(200)
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível carregar os contatos.'))
  return data ?? []
}
