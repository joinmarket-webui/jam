import { createApiClient } from '@/lib/config'

const client = createApiClient()

export const useApiClient = () => client
