import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AppRole } from '@/types/database'
import { AuthContext, type AuthContextValue, type AuthStatus, type RoleStatus } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(!supabase)
  const [recoveryMode, setRecoveryMode] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setInitialized(true)
    })
    // O callback não deve aguardar outras chamadas do Supabase (risco de deadlock):
    // só atualiza o estado; o perfil de acesso é buscado pelo React Query.
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      if (event === 'SIGNED_OUT') setRecoveryMode(false)
      setSession(nextSession)
      setInitialized(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id
  const roleQuery = useQuery({
    queryKey: ['auth', 'role', userId],
    enabled: Boolean(supabase && userId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<AppRole | null> => {
      const { data, error } = await supabase!.rpc('current_app_role')
      if (error) throw error
      return data ?? null
    },
  })
  const { refetch: refetchRole } = roleQuery

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase não configurado.')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    // Nenhum dado em cache pode sobreviver à troca de usuário.
    queryClient.clear()
  }, [queryClient])

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase não configurado.')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/redefinir-senha`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Supabase não configurado.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setRecoveryMode(false)
  }, [])

  const refreshRole = useCallback(() => refetchRole(), [refetchRole])

  const value = useMemo<AuthContextValue>(() => {
    let status: AuthStatus
    if (!supabase) status = 'unconfigured'
    else if (!initialized) status = 'loading'
    else status = session ? 'signed-in' : 'signed-out'

    let roleStatus: RoleStatus = 'idle'
    if (session) {
      if (roleQuery.isPending) roleStatus = 'loading'
      else if (roleQuery.isError) roleStatus = 'error'
      else roleStatus = 'ready'
    }

    return {
      status,
      session,
      user: session?.user ?? null,
      role: roleQuery.data ?? null,
      roleStatus,
      recoveryMode,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshRole,
    }
  }, [
    initialized,
    session,
    roleQuery.data,
    roleQuery.isPending,
    roleQuery.isError,
    recoveryMode,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    refreshRole,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
