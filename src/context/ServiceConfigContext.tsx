import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react'
// @ts-ignore
import { CurrentWallet, useCurrentWallet } from './WalletContext'

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

type LoadConfigValueProps = {
  signal: AbortSignal
  key: ConfigKey
}

const configReducer = (state: ServiceConfig, obj: ServiceConfigUpdate): ServiceConfig => {
  const data = { ...state }
  data[obj.key.section] = { ...data[obj.key.section], [obj.key.field]: obj.value }
  return data
}

const fetchConfigValues = async ({
  signal,
  wallet,
  configKeys,
}: {
  signal: AbortSignal
  wallet: CurrentWallet
  configKeys: ConfigKey[]
}) => {
  const { name: walletName, token } = wallet
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
}

interface ServiceConfigContextEntry {
  loadConfigValue: (props: LoadConfigValueProps) => Promise<ServiceConfigUpdate>
}

const ServiceConfigContext = createContext<ServiceConfigContextEntry | undefined>(undefined)

const ServiceConfigProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const currentWallet = useCurrentWallet()
  const serviceConfig = useRef<ServiceConfig | null>(null)

  const updateServiceConfig = useCallback(
    async ({ signal, configKeys }: { signal: AbortSignal; configKeys: ConfigKey[] }) => {
      if (!currentWallet) {
        throw new Error('Cannot load config: Wallet not present')
      }

      const configUpdates = fetchConfigValues({ signal, wallet: currentWallet, configKeys })
      return configUpdates
        .then((updates) => updates.reduce(configReducer, serviceConfig.current || {}))
        .then((result) => {
          if (!signal.aborted) {
            serviceConfig.current = result
            if (process.env.NODE_ENV === 'development') {
              console.debug('service config updated', serviceConfig.current)
            }
          }
          return result
        })
    },
    [currentWallet]
  )

  const loadConfigValueIfAbsent = useCallback(
    async ({ signal, key }: LoadConfigValueProps) => {
      if (serviceConfig.current) {
        const valueAlreadyPresent =
          serviceConfig.current[key.section] && serviceConfig.current[key.section][key.field] !== undefined

        if (valueAlreadyPresent) {
          return {
            key,
            value: serviceConfig.current[key.section][key.field],
          } as ServiceConfigUpdate
        }
      }

      return updateServiceConfig({ signal, configKeys: [key] }).then((conf) => {
        return {
          key,
          value: conf[key.section][key.field],
        } as ServiceConfigUpdate
      })
    },
    [updateServiceConfig]
  )

  useEffect(() => {
    if (!currentWallet) {
      // reset service config if wallet changed
      serviceConfig.current = null
    }
  }, [currentWallet])

  return (
    <ServiceConfigContext.Provider value={{ loadConfigValue: loadConfigValueIfAbsent }}>
      {children}
    </ServiceConfigContext.Provider>
  )
}

const useLoadConfigValue = () => {
  const context = useContext(ServiceConfigContext)
  if (context === undefined) {
    throw new Error('useLoadConfigValue must be used within a ServiceConfigProvider')
  }
  return context.loadConfigValue
}

export { ServiceConfigContext, ServiceConfigProvider, useLoadConfigValue }
