declare module '*.module.css'

type JamGlobal = {
    SETTINGS_STORE_KEY: string,
    THEMES: string[],
    THEME_ROOT_ATTR: string,
    PUBLIC_PATH: string,
}

declare var JM: JamGlobal

declare var __DEV__: any
