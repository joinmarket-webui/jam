import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { CurrentWallet, useCurrentWallet } from './WalletContext'

import * as Api from '../libs/JmWalletApi'

interface JmConfigData {
  configvalue: string
}

export type SectionKey = string

export interface ServiceConfig {
  [key: SectionKey]: Record<string, string | null>
}

export interface ConfigKey {
  section: SectionKey
  field: string
}

export interface ServiceConfigUpdate {
  key: ConfigKey
  value: string
}

type LoadConfigValueProps = {
  signal?: AbortSignal
  key: ConfigKey
}

type RefreshConfigValuesProps = {
  signal?: AbortSignal
  keys: ConfigKey[]
  wallet?: CurrentWallet
}

type UpdateConfigValuesProps = {
  signal?: AbortSignal
  updates: ServiceConfigUpdate[]
  wallet?: CurrentWallet
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
  signal?: AbortSignal
  wallet: CurrentWallet
  configKeys: ConfigKey[]
}) => {
  const { name: walletName, token } = wallet
  const fetches: Promise<ServiceConfigUpdate>[] = configKeys.map((configKey) => {
    return Api.postConfigGet({ walletName, token, signal }, { section: configKey.section, field: configKey.field })
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

const pushConfigValues = async ({
  signal,
  wallet,
  updates,
}: {
  signal?: AbortSignal
  wallet: CurrentWallet
  updates: ServiceConfigUpdate[]
}) => {
  const { name: walletName, token } = wallet
  const fetches: Promise<ServiceConfigUpdate>[] = updates.map((update) => {
    return Api.postConfigSet(
      { walletName, token, signal },
      {
        section: update.key.section,
        field: update.key.field,
        value: update.value,
      },
    )
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res)))
      .then((_) => update)
  })

  return Promise.all(fetches)
}

export interface ServiceConfigContextEntry {
  loadConfigValueIfAbsent: (props: LoadConfigValueProps) => Promise<ServiceConfigUpdate>
  refreshConfigValues: (props: RefreshConfigValuesProps) => Promise<ServiceConfig>
  updateConfigValues: (props: UpdateConfigValuesProps) => Promise<ServiceConfig>
}

const ServiceConfigContext = createContext<ServiceConfigContextEntry | undefined>(undefined)

const ServiceConfigProvider = ({ children }: PropsWithChildren<{}>) => {
  const currentWallet = useCurrentWallet()
  const serviceConfig = useRef<ServiceConfig | null>(null)

  const refreshConfigValues = useCallback(
    async ({ signal, keys, wallet }: RefreshConfigValuesProps) => {
      const activeWallet = wallet || currentWallet
      if (!activeWallet) {
        throw new Error('Cannot refresh config: Wallet not present')
      }

      return fetchConfigValues({ signal, wallet: activeWallet, configKeys: keys })
        .then((updates) => updates.reduce(configReducer, serviceConfig.current || {}))
        .then((result) => {
          if (!signal || !signal.aborted) {
            serviceConfig.current = result
            if (process.env.NODE_ENV === 'development') {
              console.debug('service config updated', serviceConfig.current)
            }
          }
          return result
        })
    },
    [currentWallet],
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

      return refreshConfigValues({ signal, keys: [key] }).then((conf) => {
        return {
          key,
          value: conf[key.section][key.field],
        } as ServiceConfigUpdate
      })
    },
    [refreshConfigValues],
  )

  const updateConfigValues = useCallback(
    async ({ signal, updates, wallet }: UpdateConfigValuesProps) => {
      const activeWallet = wallet || currentWallet
      if (!activeWallet) {
        throw new Error('Cannot update config: Wallet not present')
      }

      return pushConfigValues({ signal, wallet: activeWallet, updates })
        .then((updates) => updates.reduce(configReducer, serviceConfig.current || {}))
        .then((result) => {
          if (!signal || !signal.aborted) {
            serviceConfig.current = result
            if (process.env.NODE_ENV === 'development') {
              console.debug('service config updated', serviceConfig.current)
            }
          }
          return result
        })
    },
    [currentWallet],
  )

  useEffect(() => {
    if (!currentWallet) {
      // reset service config if wallet changed
      serviceConfig.current = null
    }
  }, [currentWallet])

  return (
    <ServiceConfigContext.Provider
      value={{
        loadConfigValueIfAbsent,
        refreshConfigValues,
        updateConfigValues,
      }}
    >
      {children}
    </ServiceConfigContext.Provider>
  )
}

const useLoadConfigValue = () => {
  const context = useContext(ServiceConfigContext)
  if (context === undefined) {
    throw new Error('useLoadConfigValue must be used within a ServiceConfigProvider')
  }
  return context.loadConfigValueIfAbsent
}

const useRefreshConfigValues = () => {
  const context = useContext(ServiceConfigContext)
  if (context === undefined) {
    throw new Error('useRefreshConfigValues must be used within a ServiceConfigProvider')
  }
  return context.refreshConfigValues
}

const useUpdateConfigValues = () => {
  const context = useContext(ServiceConfigContext)
  if (context === undefined) {
    throw new Error('useUpdateConfigValues must be used within a ServiceConfigProvider')
  }
  return context.updateConfigValues
}

export {
  ServiceConfigContext,
  ServiceConfigProvider,
  useLoadConfigValue,
  useRefreshConfigValues,
  useUpdateConfigValues,
}
