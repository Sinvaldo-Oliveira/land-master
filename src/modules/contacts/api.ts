import { requireSupabase } from '@/lib/supabase'
import { supabaseErrorMessage } from '@/lib/supabase-errors'
import { emptyToNull } from '@/lib/format'
import type { ActivityRow, ContactLifecycle, ContactRow, DealRow } from '@/types/database'
import type { ActivityFormValues, ContactFormValues } from './schemas'
import { sanitizeSearchTerm } from './schemas'

export const PAGE_SIZE = 25

export type ContactListFilters = {
  search: string
  lifecycle: ContactLifecycle | 'all'
  page: number
}

export type ContactListItem = Pick<ContactRow, 'id' | 'name' | 'email' | 'phone' | 'company' | 'lifecycle' | 'owner_id' | 'created_at'>

export async function fetchContacts(filters: ContactListFilters): Promise<{ rows: ContactListItem[]; total: number }> {
  const sb = requireSupabase()
  const from = filters.page * PAGE_SIZE
  let query = sb
    .from('contacts')
    .select('id, name, email, phone, company, lifecycle, owner_id, created_at', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (filters.lifecycle !== 'all') query = query.eq('lifecycle', filters.lifecycle)

  const term = sanitizeSearchTerm(filters.search)
  if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%`)

  const { data, error, count } = await query
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível carregar os contatos.'))
  return { rows: data ?? [], total: count ?? 0 }
}

export async function fetchContact(id: string): Promise<ContactRow> {
  const { data, error } = await requireSupabase().from('contacts').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível carregar o contato.'))
  if (!data) throw new Error('Contato não encontrado ou sem acesso.')
  return data
}

export async function fetchContactDeals(contactId: string): Promise<DealRow[]> {
  const { data, error } = await requireSupabase()
    .from('deals')
    .select('*')
    .eq('contact_id', contactId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível carregar as oportunidades.'))
  return data ?? []
}

export async function fetchContactActivities(contactId: string): Promise<ActivityRow[]> {
  const { data, error } = await requireSupabase()
    .from('activities')
    .select('*')
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível carregar a linha do tempo.'))
  return data ?? []
}

export async function findDuplicateContacts(email: string, phone: string) {
  const { data, error } = await requireSupabase().rpc('find_duplicate_contacts', {
    p_email: emptyToNull(email),
    p_phone: emptyToNull(phone),
  })
  if (error) throw new Error(supabaseErrorMessage(error))
  return data ?? []
}

export async function createContact(values: ContactFormValues, ownerId: string): Promise<ContactRow> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('contacts')
    .insert({
      name: values.name.trim(),
      email: emptyToNull(values.email),
      phone: emptyToNull(values.phone),
      company: emptyToNull(values.company),
      notes: emptyToNull(values.notes),
      lifecycle: values.lifecycle,
      owner_id: ownerId,
      created_by: ownerId,
    })
    .select('*')
    .single()
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível salvar o contato.'))
  return data
}

export async function updateContact(id: string, values: ContactFormValues): Promise<ContactRow> {
  const { data, error } = await requireSupabase()
    .from('contacts')
    .update({
      name: values.name.trim(),
      email: emptyToNull(values.email),
      phone: emptyToNull(values.phone),
      company: emptyToNull(values.company),
      notes: emptyToNull(values.notes),
      lifecycle: values.lifecycle,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível salvar as alterações.'))
  return data
}

export async function addActivity(contactId: string, values: ActivityFormValues, actorId: string): Promise<void> {
  const { error } = await requireSupabase().from('activities').insert({
    contact_id: contactId,
    type: 'note',
    body: values.body.trim(),
    created_by: actorId,
  })
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível registrar a anotação.'))
}

export async function convertContactToCustomer(contactId: string): Promise<ContactRow> {
  const { data, error } = await requireSupabase().rpc('convert_contact_to_customer', { p_contact_id: contactId })
  if (error) throw new Error(supabaseErrorMessage(error))
  return data
}
