import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const

export function createIdleTracker(onLock: () => void, timeoutMs: number, win: Window) {
  let timer: ReturnType<typeof setTimeout> | undefined

  const resetTimer = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onLock, timeoutMs)
  }

  return {
    start() {
      resetTimer()
      for (const event of ACTIVITY_EVENTS) {
        win.addEventListener(event, resetTimer, { passive: true })
      }
    },
    stop() {
      if (timer) clearTimeout(timer)
      timer = undefined
      for (const event of ACTIVITY_EVENTS) {
        win.removeEventListener(event, resetTimer)
      }
    },
  }
}

export function useIdleAutoLock(onLock: () => void, timeoutMinutes: number) {
  const onLockRef = useRef(onLock)

  useEffect(() => {
    onLockRef.current = onLock
  })

  useEffect(() => {
    if (timeoutMinutes <= 0) return

    const tracker = createIdleTracker(() => onLockRef.current(), timeoutMinutes * 60 * 1_000, window)
    tracker.start()

    return () => tracker.stop()
  }, [timeoutMinutes])
}
