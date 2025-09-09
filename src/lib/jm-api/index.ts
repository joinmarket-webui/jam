import { createClient as __createClient, createConfig } from './generated/client/client'

import type { ClientOptions } from '@/lib/jm-api/generated/client'

export const createClient = (options: ClientOptions) => __createClient(createConfig<ClientOptions>(options))
