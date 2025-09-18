import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useStore } from 'zustand'
import type { ConfigKey, ConfigValue } from '@/constants/jm'
import { useApiClient } from '@/hooks/useApiClient'
import { configgetMutation } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import type { WalletFileName } from '@/lib/utils'
import { jmConfigStore } from '@/store/jmConfigStore'

interface UseJmConfigProps {
  walletFileName: WalletFileName
}

export const useJmConfig = ({ walletFileName }: UseJmConfigProps) => {
  const client = useApiClient()
  const jmConfigStoreState = useStore(jmConfigStore)

  const { mutateAsync: fetchConfigAsync } = useMutation({
    ...configgetMutation({
      client,
      path: { walletname: walletFileName },
    }),
    retry: 3,
  })

  const get = useCallback(
    (key: ConfigKey): ConfigValue | null => {
      return jmConfigStoreState.get(key)
    },
    [jmConfigStoreState],
  )

  const refetch = useCallback(
    async (key: ConfigKey): Promise<ConfigValue> => {
      const { configvalue } = await fetchConfigAsync({
        path: { walletname: walletFileName },
        body: {
          section: key.section,
          field: key.field,
        },
      })
      const result: ConfigValue = {
        key,
        value: configvalue ?? null,
      }
      jmConfigStoreState.set(result)
      return result
    },
    [walletFileName, jmConfigStoreState, fetchConfigAsync],
  )

  const fetchIfMissing = useCallback(
    async (key: ConfigKey): Promise<ConfigValue> => {
      const value = get(key)
      return value !== null ? value : refetch(key)
    },
    [get, refetch],
  )

  return {
    get,
    refetch,
    fetchIfMissing,
  }
}
