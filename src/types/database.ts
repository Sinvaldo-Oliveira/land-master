/**
 * Tipos do banco. ARQUIVO GERADO — substituir com `npm run db:types`
 * assim que o projeto Supabase estiver vinculado (`supabase link`).
 * Versão inicial escrita à mão a partir de supabase/migrations (Fase 2).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
        Row: { user_id: string; role: Database['public']['Enums']['app_role']; granted_by: string | null; created_at: string; updated_at: string }
        Insert: { user_id: string; role: Database['public']['Enums']['app_role']; granted_by?: string | null }
        Update: { role?: Database['public']['Enums']['app_role'] }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      current_app_role: { Args: Record<PropertyKey, never>; Returns: Database['public']['Enums']['app_role'] | null }
      has_role: { Args: { required: Database['public']['Enums']['app_role'][] }; Returns: boolean }
    }
    Enums: { app_role: 'admin' | 'manager' | 'sales' }
    CompositeTypes: { [_ in never]: never }
  }
}

export type AppRole = Database['public']['Enums']['app_role']
