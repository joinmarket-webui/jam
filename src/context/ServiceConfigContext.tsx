import React, { createContext, useCallback, useContext, useReducer, useEffect, useState } from 'react'
// @ts-ignore
import { useCurrentWallet } from './WalletContext'

import * as Api from '../libs/JmWalletApi'
import { kMaxLength } from 'buffer'

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
const DEFAULT_CONFIG_KEYS: ConfigKey[] = [{ section: 'POLICY', field: 'minimum_makers' }]

interface ServiceConfigUpdate {
  key: ConfigKey
  value: string
}

type LoadConfigValueProps = {
  signal: AbortSignal
  key: ConfigKey
}

interface ServiceConfigContextEntry {
  serviceConfig: ServiceConfig | null
  loadConfigValueIfAbsent: (props: LoadConfigValueProps) => Promise<ServiceConfigUpdate>
}

const ServiceConfigContext = createContext<ServiceConfigContextEntry | undefined>(undefined)

const ServiceConfigProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const currentWallet = useCurrentWallet()

  const [serviceConfig, setServiceConfig] = useState<ServiceConfig | null>(null)

  const reloadServiceConfig = useCallback(
    async ({ signal, configKeys }: { signal: AbortSignal; configKeys: ConfigKey[] }) => {
      if (!currentWallet) {
        throw new Error('Cannot load config: Wallet not present')
      }

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

  const loadConfigValueIfAbsent = useCallback(
    async ({ signal, key }: LoadConfigValueProps) => {
      if (!currentWallet) {
        throw new Error('Cannot load config: Wallet not present')
      }
      if (serviceConfig && serviceConfig[key.section] && serviceConfig[key.section][key.field] !== undefined) {
        return {
          key,
          value: serviceConfig[key.section][key.field],
        } as ServiceConfigUpdate
      }
      return reloadServiceConfig({ signal, configKeys: [key] }).then((conf) => {
        return {
          key: key,
          value: conf[key.section][key.field],
        } as ServiceConfigUpdate
      })
    },
    [currentWallet, serviceConfig, reloadServiceConfig]
  )

  useEffect(() => {
    if (!currentWallet) return

    const abortCtrl = new AbortController()

    reloadServiceConfig({ signal: abortCtrl.signal, configKeys: DEFAULT_CONFIG_KEYS }).catch((err) =>
      console.error(err)
    )

    return () => {
      abortCtrl.abort()
    }
  }, [currentWallet, reloadServiceConfig])

  return (
    <ServiceConfigContext.Provider value={{ serviceConfig, loadConfigValueIfAbsent }}>
      {children}
    </ServiceConfigContext.Provider>
  )
}

const useServiceConfig = () => {
  const context = useContext(ServiceConfigContext)
  if (context === undefined) {
    throw new Error('useServiceConfig must be used within a ServiceConfigProvider')
  }
  return context.serviceConfig
}

const useLoadConfigValueIfAbsent = () => {
  const context = useContext(ServiceConfigContext)
  if (context === undefined) {
    throw new Error('useLoadConfigValueIfAbsent must be used within a ServiceConfigProvider')
  }
  return context.loadConfigValueIfAbsent
}

export { ServiceConfigContext, ServiceConfigProvider, useServiceConfig, useLoadConfigValueIfAbsent }
