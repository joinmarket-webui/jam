import { useCallback } from 'react'
import { configgetMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { useStore } from 'zustand'
import type { ConfigKey, ConfigValue } from '@/constants/jm'
import { useApiClient } from '@/hooks/useApiClient'
import type { WalletFileName } from '@/lib/utils'
import { jmConfigStore } from '@/store/jmConfigStore'

interface UseJmConfigProps {
  walletFileName: WalletFileName
}

export const useJmConfig = ({ walletFileName }: UseJmConfigProps) => {
  const client = useApiClient()
  const { get: getConfig, set: setConfig, state } = useStore(jmConfigStore)

  const { mutateAsync: fetchConfigAsync } = useMutation({
    ...configgetMutation({
      client,
      path: { walletname: encodeURIComponent(walletFileName) },
    }),
    retry: 3,
  })

  const refetch = useCallback(
    async (key: ConfigKey): Promise<ConfigValue> => {
      const { configvalue } = await fetchConfigAsync({
        path: { walletname: encodeURIComponent(walletFileName) },
        body: {
          section: key.section,
          field: key.field,
        },
      })
      const result: ConfigValue = {
        key,
        value: configvalue || null,
      }
      setConfig(result)
      return result
    },
    [walletFileName, setConfig, fetchConfigAsync],
  )

  const fetchIfMissing = useCallback(
    async (key: ConfigKey): Promise<ConfigValue> => {
      const value = getConfig(key)
      return value !== null ? value : refetch(key)
    },
    [getConfig, refetch],
  )

  return {
    state,
    get: getConfig,
    refetch,
    fetchIfMissing,
  }
}
