import { useEffect } from 'react'

const PreventLeavingPageByMistake = () => {
  // prompt users before refreshing or closing the page when this component is present.
  // Firefox will show: "This page is asking you to confirm that you want to leave [...]"
  // Chrome: "Leave site? Changes you made may not be saved."
  useEffect(() => {
    const abortCtrl = new AbortController()

    window.addEventListener(
      'beforeunload',
      (event) => {
        // cancel the event as stated by the standard.
        event.preventDefault()

        // Chrome requires returnValue to be set.
        event.returnValue = ''

        // return something to trigger a dialog
        return ''
      },
      { signal: abortCtrl.signal },
    )

    return () => abortCtrl.abort()
  }, [])

  return <></>
}

export default PreventLeavingPageByMistake
