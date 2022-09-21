declare module '*.module.css'

type JmGlobal = {
    SETTINGS_STORE_KEY: string,
    THEMES: string[],
    THEME_ROOT_ATTR: string,
    PUBLIC_PATH: string,
}

declare var JM: JmGlobal

declare var __DEV__: any
