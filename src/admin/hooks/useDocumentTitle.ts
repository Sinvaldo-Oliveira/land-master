import { useEffect } from 'react'
import { env } from '@/lib/env'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${env.appName}`
  }, [title])
}
