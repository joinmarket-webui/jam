import React, { createContext, useReducer, useEffect, useContext } from 'react'
import { BTC } from '../utils'

const localStorageKey = window.JM.SETTINGS_STORE_KEY

const initialSettings = {
  showBalance: false,
  unit: BTC,
  showOnboarding: true,
  showCheatsheet: true,
  useAdvancedWalletMode: false,
}

const SettingsContext = createContext()

const settingsReducer = (oldSettings, action) => {
  const { ...newSettings } = action

  return {
    ...oldSettings,
    ...newSettings,
  }
}

const SettingsProvider = ({ children }) => {
  const [settings, dispatch] = useReducer(
    settingsReducer,
    Object.assign({}, initialSettings, JSON.parse(window.localStorage.getItem(localStorageKey)))
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
