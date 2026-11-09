import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { AppRole } from '@/types/database'

export type AuthStatus = 'unconfigured' | 'loading' | 'signed-out' | 'signed-in'
export type RoleStatus = 'idle' | 'loading' | 'ready' | 'error'

export type AuthContextValue = {
  status: AuthStatus
  session: Session | null
  user: User | null
  role: AppRole | null
  roleStatus: RoleStatus
  /** true quando a sessão veio de um link de recuperação de senha */
  recoveryMode: boolean
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  sendPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  refreshRole(): Promise<unknown>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.')
  return value
}
