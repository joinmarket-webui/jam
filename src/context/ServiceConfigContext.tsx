import React, { createContext, useCallback, useContext, useReducer, useEffect, useState } from 'react'
// @ts-ignore
import { useCurrentWallet } from './WalletContext'

import * as Api from '../libs/JmWalletApi'

interface JmConfigData {
  configvalue: string
}

type SectionKey = string

interface ServiceConfig {
  [key: SectionKey]: Record<string, string | null>
}

interface ConfigKey {
  section: SectionKey
  field: string
}

interface ServiceConfigUpdate {
  key: ConfigKey
  value: string
}

interface ServiceConfigContextEntry {
  serviceConfig: ServiceConfig | null
}

const ServiceConfigContext = createContext<ServiceConfigContextEntry | undefined>(undefined)

const ServiceConfigProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const currentWallet = useCurrentWallet()

  const [serviceConfig, setServiceConfig] = useState<ServiceConfig | null>(null)
  const [serviceConfig2, dispatchServiceConfig] = useReducer(
    (state: ServiceConfig | null, obj: ServiceConfigUpdate) => {
      const data = { ...state }
      if (data && data[obj.key.section]) {
        data[obj.key.section] = { ...data[obj.key.section], [obj.key.field]: obj.value }
      } else {
        data[obj.key.section] = { [obj.key.field]: obj.value }
      }
      return data as ServiceConfig | null
    },
    null
  )

  const reloadServiceConfig = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      if (!currentWallet) {
        throw new Error('Cannot load config: Wallet not present')
      }

      const configKeys: ConfigKey[] = [{ section: 'POLICY', field: 'minimum_makers' }]

      const { name: walletName, token } = currentWallet
      const fetches: Promise<ServiceConfigUpdate>[] = configKeys.map((configKey) => {
        return Api.postConfigGet(
          { walletName, token, signal },
          { section: configKey.section.toString(), field: configKey.field }
        )
          .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res)))
          .then((data: JmConfigData) => {
            return {
              key: configKey,
              value: data.configvalue,
            } as ServiceConfigUpdate
          })
      })

      return Promise.all(fetches)
        .then((data) => {
          return data.reduce((state: ServiceConfig, obj: ServiceConfigUpdate) => {
            const data = { ...state }
            if (data && data[obj.key.section]) {
              data[obj.key.section] = { ...data[obj.key.section], [obj.key.field]: obj.value }
            } else {
              data[obj.key.section] = { [obj.key.field]: obj.value }
            }
            return data as ServiceConfig
          }, {} as ServiceConfig)
        })
        .then((result) => {
          if (!signal.aborted) {
            setServiceConfig(result)
          }
          return result
        })
    },
    [currentWallet]
  )

  useEffect(() => {
    if (!currentWallet) return

    const abortCtrl = new AbortController()

    reloadServiceConfig({ signal: abortCtrl.signal }).catch((err) => console.error(err))

    return () => {
      abortCtrl.abort()
    }
  }, [currentWallet, reloadServiceConfig])

  return <ServiceConfigContext.Provider value={{ serviceConfig }}>{children}</ServiceConfigContext.Provider>
}

const useServiceConfig = () => {
  const context = useContext(ServiceConfigContext)
  if (context === undefined) {
    throw new Error('useServiceConfig must be used within a ServiceConfigProvider')
  }
  return context.serviceConfig
}

export { ServiceConfigContext, ServiceConfigProvider, useServiceConfig }
