import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < MOBILE_BREAKPOINT)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const abortCtrl = new AbortController()
    mql.addEventListener(
      'change',
      () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      },
      { signal: abortCtrl.signal },
    )
    return () => abortCtrl.abort()
  }, [])

  return isMobile
}
