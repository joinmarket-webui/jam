import { useEffect, useRef } from 'react'

export const useInterval = (callback, delay, immediate = false) => {
  const savedCallback = useRef()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    function tick() {
      savedCallback.current()
    }
    if (delay !== null) {
      const id = setInterval(tick, delay)
      if (immediate) callback()
      return () => clearInterval(id)
    }
  }, [delay])
}

export const serialize = form =>
  Object.fromEntries(new FormData(form).entries())
