import { useEffect, useRef } from 'react'
import { readPendingChatQuery, clearPendingChatQuery } from './pendingChatQuery'

export function useResumePendingChat({ isLoggedIn, isReady, onResume }) {
  const resumedRef = useRef(false)

  useEffect(() => {
    if (!isLoggedIn || !isReady || resumedRef.current) return

    const pending = readPendingChatQuery()
    if (!pending?.query) return

    resumedRef.current = true
    clearPendingChatQuery()
    onResume(pending.query)
  }, [isLoggedIn, isReady, onResume])
}
