import { useEffect } from 'react'

export default function DevErrorThrowingComponent() {
  useEffect(() => {
    throw new Error('This error is thrown on purpose. Only to be used for testing.')
  }, [])
  return <></>
}
