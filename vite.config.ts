import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs/promises'
import path from 'node:path'
import { type ServerOptions, type UserConfig, defineConfig } from 'vite'

const BACKEND_JOINMARKET_CLIENTSERVER_NATIVE = 'joinmarket-clientserver'
const BACKEND_JOINMARKET_NG_NATIVE = 'joinmarket-ng'
const BACKEND_JAM_STANDALONE = 'jam-standalone'

type SupportedBackend =
  typeof BACKEND_JOINMARKET_CLIENTSERVER_NATIVE | typeof BACKEND_JOINMARKET_NG_NATIVE | typeof BACKEND_JAM_STANDALONE

const SUPPORTED_BACKENDS: SupportedBackend[] = [
  BACKEND_JOINMARKET_CLIENTSERVER_NATIVE,
  BACKEND_JOINMARKET_NG_NATIVE,
  BACKEND_JAM_STANDALONE,
]

function isSupportedBackend(val: unknown): val is SupportedBackend {
  return SUPPORTED_BACKENDS.includes(val as SupportedBackend) === true
}

type BackendConfigEnvironmentVariables = {
  JMWALLETD_API_PORT: number
  JMWALLETD_WEBSOCKET_PORT: number
  JMOBWATCH_PORT: number
  JAM_API_PORT?: number // (optioal) Jam specific API endpoint (only present in jam-standalone)
}

const {
  //PUBLIC_URL = '', // TODO: support serving from non-root?
  JAM_BACKEND = BACKEND_JOINMARKET_CLIENTSERVER_NATIVE,
  JAM_API_PORT = undefined,
} = process.env

const BACKEND_ENV_JOINMARKET_CLIENTSERVER_DEFAULT: BackendConfigEnvironmentVariables = {
  JMWALLETD_API_PORT: 28183,
  JMWALLETD_WEBSOCKET_PORT: 28283,
  JMOBWATCH_PORT: 62601,
}

const BACKEND_ENV_JOINMARKET_NG_DEFAULT: BackendConfigEnvironmentVariables = {
  JMWALLETD_API_PORT: 28183,
  JMWALLETD_WEBSOCKET_PORT: 28183,
  JMOBWATCH_PORT: 8000,
}

const createJamStandloneConfigEnvironmentVariables = (jamApiPort: number): BackendConfigEnvironmentVariables => ({
  JMWALLETD_API_PORT: jamApiPort,
  JMWALLETD_WEBSOCKET_PORT: jamApiPort,
  JMOBWATCH_PORT: jamApiPort,
  JAM_API_PORT: jamApiPort,
})

// https://vite.dev/config/
export default defineConfig((config): UserConfig => {
  if (!isSupportedBackend(JAM_BACKEND)) {
    throw new Error(`Unsupported backend: Use one of [${SUPPORTED_BACKENDS.join(', ')}]`)
  }

  const server = createServer(JAM_BACKEND)
  const buildOrPreview = config.command === 'build' || config.isPreview === true

  return {
    plugins: [
      react(),
      tailwindcss({ optimize: buildOrPreview }),
      {
        name: 'delete-service-worker',
        async writeBundle() {
          await fs.rm('dist/mockServiceWorker.js', { force: true })
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      ...server,
      open: true,
    },
  }
})

const createServer = (backend: SupportedBackend): ServerOptions => {
  switch (backend) {
    case BACKEND_JOINMARKET_CLIENTSERVER_NATIVE: {
      return createServerConfigJoinmarketClientServerNative({
        ...BACKEND_ENV_JOINMARKET_CLIENTSERVER_DEFAULT,
        ...process.env,
      })
    }
    case BACKEND_JOINMARKET_NG_NATIVE: {
      return createServerConfigJoinmarketNgNative({
        ...BACKEND_ENV_JOINMARKET_NG_DEFAULT,
        ...process.env,
      })
    }
    case BACKEND_JAM_STANDALONE: {
      if (JAM_API_PORT === undefined) {
        throw new Error('Unsupported port: Please specify a valid JAM_API_PORT')
      }
      return createServerConfigJamStandalone({
        ...createJamStandloneConfigEnvironmentVariables(Number(JAM_API_PORT)),
        ...process.env,
      })
    }
    // No default
  }

  throw new Error(`Unsupported backend: Use one of [${SUPPORTED_BACKENDS.join(', ')}]`)
}
/**
 * Server config for "joinmarket-clientserver".
 * The "native" installation *does not run* a webserver!
 * Requests must be adapted:
 * - proxy API requests to correct target service
 * - rewrite paths to match target service paths
 * - translate header "x-jm-authorization" to "Authorization"
 */
const createServerConfigJoinmarketClientServerNative = (config: BackendConfigEnvironmentVariables): ServerOptions => {
  return {
    proxy: {
      '/api': {
        target: `https://127.0.0.1:${config.JMWALLETD_API_PORT}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyRequest, request, _response) => {
            if (request.headers['x-jm-authorization']) {
              proxyRequest.setHeader('Authorization', request.headers['x-jm-authorization'])
            }
          })
        },
      },
      '/obwatch': {
        target: `http://127.0.0.1:${config.JMOBWATCH_PORT}`,
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/obwatch/, ''),
      },
      '/jmws': {
        target: `https://127.0.0.1:${config.JMWALLETD_WEBSOCKET_PORT}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (p) => p.replace(/^\/jmws/, ''),
      },
    },
  }
}

/**
 * Server config for "joinmarket-ng".
 * Similar to `createServerConfigJoinmarketClientServerNative`, but own function to keep concerns seperated:
 * Changes are expected as joinmarket-ng keeps maturing.
 */
const createServerConfigJoinmarketNgNative = (config: BackendConfigEnvironmentVariables): ServerOptions => {
  return {
    proxy: {
      '/api': {
        target: `https://127.0.0.1:${config.JMWALLETD_API_PORT}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyRequest, request, _response) => {
            if (request.headers['x-jm-authorization']) {
              proxyRequest.setHeader('Authorization', request.headers['x-jm-authorization'])
            }
          })
        },
      },
      '/obwatch': {
        target: `http://127.0.0.1:${config.JMOBWATCH_PORT}`,
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/obwatch/, ''),
      },
      '/jmws': {
        target: `https://127.0.0.1:${config.JMWALLETD_WEBSOCKET_PORT}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (p) => p.replace(/^\/jmws/, '/api/v1/ws'),
      },
    },
  }
}

/**
 * Server config for "jam-standalone" (Jam Docker image).
 * `standalone` backend has a webserver ("Jam API") running and provides a normalized API for the underlying backend.
 * Requests must be adapted:
 * - proxy all API requests to "Jam API"
 */
const createServerConfigJamStandalone = (config: BackendConfigEnvironmentVariables): ServerOptions => {
  if (config.JAM_API_PORT === undefined) {
    throw new Error('Unsupported port: Please specify a valid JAM_API_PORT')
  }

  return {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${config.JMWALLETD_API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      '/obwatch': {
        target: `http://127.0.0.1:${config.JMOBWATCH_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      '/jmws': {
        target: `http://127.0.0.1:${config.JMWALLETD_WEBSOCKET_PORT}`,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/jam': {
        target: `http://127.0.0.1:${config.JAM_API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
    },
  }
}
