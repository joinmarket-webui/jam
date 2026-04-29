import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

const isMobileView = () => {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(isMobileView())

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const abortCtrl = new AbortController()
    mql.addEventListener(
      'change',
      () => {
        setIsMobile(isMobileView())
      },
      { signal: abortCtrl.signal },
    )
    return () => abortCtrl.abort()
  }, [])

  return isMobile
}
