import { createApiClient } from '@/lib/config'
import { useMemo } from 'react'

export const useApiClient = () => {
  const client = useMemo(() => createApiClient(), [])
  return client
}
