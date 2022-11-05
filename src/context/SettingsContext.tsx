import React, { createContext, useReducer, useEffect, useContext } from 'react'
const localStorageKey = window.JM.SETTINGS_STORE_KEY

interface Settings {
  showBalance: boolean
  unit: Unit
  showOnboarding: boolean
  showCheatsheet: boolean
  theme?: string
}

const initialSettings: Settings = {
  showBalance: false,
  unit: 'BTC',
  showOnboarding: true,
  showCheatsheet: true,
}

interface SettingsContextEntry {
  settings: Settings
  dispatch: React.Dispatch<Partial<Settings>>
}

const SettingsContext = createContext<SettingsContextEntry>({
  settings: initialSettings,
  dispatch: (_: Partial<Settings>) => {},
})

const settingsReducer = (oldSettings: Settings, action: Partial<Settings>) => {
  const { ...newSettings } = action

  return {
    ...oldSettings,
    ...newSettings,
  }
}

const SettingsProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [settings, dispatch] = useReducer(
    settingsReducer,
    Object.assign({}, initialSettings, JSON.parse(window.localStorage.getItem(localStorageKey) || '{}')) as Settings
  )

  useEffect(() => {
    window.localStorage.setItem(localStorageKey, JSON.stringify(settings))
  }, [settings])

  return <SettingsContext.Provider value={{ settings, dispatch }}>{children}</SettingsContext.Provider>
}

const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context.settings
}

const useSettingsDispatch = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettingsDispatch must be used within a SettingsProvider')
  }
  return context.dispatch
}

export { SettingsProvider, useSettings, useSettingsDispatch }
