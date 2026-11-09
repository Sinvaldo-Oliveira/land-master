/**
 * Tipos do banco. Versão escrita à mão a partir de supabase/migrations (Fases 2 e 3).
 * Substituir por `npm run db:types` assim que o projeto Supabase estiver vinculado.
 * Enquanto isso, qualquer divergência com as migrações deve ser corrigida aqui.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type AppRoleName = 'admin' | 'manager' | 'sales'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id: string; full_name?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { full_name?: string | null }
        Relationships: []
      }
      user_roles: {
        Row: { user_id: string; role: AppRoleName; granted_by: string | null; created_at: string; updated_at: string }
        Insert: { user_id: string; role: AppRoleName; granted_by?: string | null }
        Update: { role?: AppRoleName }
        Relationships: []
      }
      lead_sources: {
        Row: { id: string; key: string; label: string; is_system: boolean; active: boolean; position: number; created_at: string; updated_at: string }
        Insert: { key: string; label: string; is_system?: boolean; active?: boolean; position?: number }
        Update: { label?: string; active?: boolean; position?: number }
        Relationships: []
      }
      lost_reasons: {
        Row: { id: string; label: string; active: boolean; position: number; created_at: string; updated_at: string }
        Insert: { label: string; active?: boolean; position?: number }
        Update: { label?: string; active?: boolean; position?: number }
        Relationships: []
      }
      pipelines: {
        Row: { id: string; name: string; position: number; is_default: boolean; archived_at: string | null; created_at: string; updated_at: string }
        Insert: { name: string; position?: number; is_default?: boolean }
        Update: { name?: string; position?: number; is_default?: boolean; archived_at?: string | null }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          id: string; pipeline_id: string; name: string; color: string; position: number
          probability: number; is_won: boolean; archived_at: string | null; created_at: string; updated_at: string
        }
        Insert: { pipeline_id: string; name: string; color?: string; position?: number; probability?: number; is_won?: boolean }
        Update: { name?: string; color?: string; position?: number; probability?: number; archived_at?: string | null }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string; name: string; email: string | null; email_normalized: string | null
          phone: string | null; phone_normalized: string | null; whatsapp: string | null; company: string | null
          notes: string | null; lifecycle: ContactLifecycle; source_id: string | null; source_detail: string | null
          utm: Json; owner_id: string | null; legal_basis: string | null; consent_at: string | null
          customer_since: string | null; created_by: string | null; created_at: string; updated_at: string
          deleted_at: string | null; anonymized_at: string | null
        }
        Insert: {
          name: string; email?: string | null; phone?: string | null; whatsapp?: string | null; company?: string | null
          notes?: string | null; lifecycle?: ContactLifecycle; source_id?: string | null; source_detail?: string | null
          owner_id?: string | null; legal_basis?: string | null; consent_at?: string | null; created_by?: string | null
        }
        Update: {
          name?: string; email?: string | null; phone?: string | null; whatsapp?: string | null; company?: string | null
          notes?: string | null; lifecycle?: ContactLifecycle; source_id?: string | null; source_detail?: string | null
          owner_id?: string | null; legal_basis?: string | null; consent_at?: string | null; deleted_at?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          id: string; title: string; contact_id: string; pipeline_id: string; stage_id: string; owner_id: string | null
          amount: number; currency: string; status: DealStatus; position: number | null
          expected_close_date: string | null; next_action: string | null; next_action_at: string | null
          lost_reason_id: string | null; lost_note: string | null; closed_at: string | null
          source_submission_id: string | null; created_by: string | null; created_at: string; updated_at: string; deleted_at: string | null
        }
        Insert: {
          title: string; contact_id: string; pipeline_id: string; stage_id: string; owner_id?: string | null
          amount?: number; currency?: string; expected_close_date?: string | null; next_action?: string | null
          next_action_at?: string | null; created_by?: string | null
        }
        Update: {
          title?: string; owner_id?: string | null; amount?: number; currency?: string
          expected_close_date?: string | null; next_action?: string | null; next_action_at?: string | null; deleted_at?: string | null
        }
        Relationships: []
      }
      deal_events: {
        Row: { id: string; deal_id: string; actor_id: string | null; type: string; from_value: Json; to_value: Json; created_at: string }
        Insert: never
        Update: never
        Relationships: []
      }
      activities: {
        Row: { id: string; contact_id: string; deal_id: string | null; type: ActivityType; body: string | null; occurred_at: string; created_by: string | null; created_at: string }
        Insert: { contact_id: string; type: ActivityType; body?: string | null; deal_id?: string | null; occurred_at?: string; created_by?: string | null }
        Update: { body?: string | null; type?: ActivityType; occurred_at?: string }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string; title: string; description: string | null; due_at: string | null; completed_at: string | null
          assignee_id: string | null; contact_id: string | null; deal_id: string | null; created_by: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          title: string; description?: string | null; due_at?: string | null; assignee_id?: string | null
          contact_id?: string | null; deal_id?: string | null; created_by?: string | null
        }
        Update: { title?: string; description?: string | null; due_at?: string | null; completed_at?: string | null; assignee_id?: string | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      current_app_role: { Args: Record<PropertyKey, never>; Returns: AppRoleName | null }
      has_role: { Args: { required: AppRoleName[] }; Returns: boolean }
      move_deal: {
        Args: { p_deal_id: string; p_stage_id: string; p_before_id?: string | null; p_after_id?: string | null }
        Returns: DealRow
      }
      close_deal_won: { Args: { p_deal_id: string }; Returns: DealRow }
      close_deal_lost: { Args: { p_deal_id: string; p_reason_id: string; p_note?: string | null }; Returns: DealRow }
      reopen_deal: { Args: { p_deal_id: string }; Returns: DealRow }
      convert_contact_to_customer: { Args: { p_contact_id: string }; Returns: ContactRow }
      find_duplicate_contacts: {
        Args: { p_email?: string | null; p_phone?: string | null }
        Returns: { id: string; name: string; email: string | null; phone: string | null; lifecycle: ContactLifecycle; owner_id: string | null }[]
      }
    }
    Enums: { app_role: AppRoleName }
    CompositeTypes: { [_ in never]: never }
  }
}

export type AppRole = Database['public']['Enums']['app_role']
export type ContactLifecycle = 'lead' | 'prospect' | 'customer' | 'inactive'
export type DealStatus = 'open' | 'won' | 'lost'
export type ActivityType = 'note' | 'call' | 'whatsapp' | 'email' | 'meeting' | 'form_submission' | 'system'

export type ContactRow = Database['public']['Tables']['contacts']['Row']
export type DealRow = Database['public']['Tables']['deals']['Row']
export type StageRow = Database['public']['Tables']['pipeline_stages']['Row']
export type PipelineRow = Database['public']['Tables']['pipelines']['Row']
export type ActivityRow = Database['public']['Tables']['activities']['Row']
export type LostReasonRow = Database['public']['Tables']['lost_reasons']['Row']
export type LeadSourceRow = Database['public']['Tables']['lead_sources']['Row']
