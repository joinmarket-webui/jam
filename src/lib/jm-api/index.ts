import { createClient as __createClient, createConfig } from '@hey-api/client-fetch'
import type { ClientOptions } from '@/lib/jm-api/generated/client'

export const createClient = (options: ClientOptions) => __createClient(createConfig<ClientOptions>(options))
