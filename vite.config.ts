import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type ServerOptions } from "vite";

const BACKEND_NATIVE = 'native'
const BACKEND_STANDALONE = 'jam-standalone'
const SUPPORTED_BACKENDS = [BACKEND_NATIVE, BACKEND_STANDALONE]

const {
  //PUBLIC_URL = '', // TODO: support serving from non-root?
  JAM_BACKEND = BACKEND_NATIVE,
  JMWALLETD_API_PORT = '28183',
  JMWALLETD_WEBSOCKET_PORT = '28283',
  JMOBWATCH_PORT = '62601',
  JAM_API_PORT = undefined,
} = process.env

// https://vite.dev/config/
export default defineConfig(() => {
  if (!SUPPORTED_BACKENDS.includes(JAM_BACKEND)) {
    throw new Error(`Unsupported backend: Use one of ${SUPPORTED_BACKENDS}`)
  }

  if (JAM_BACKEND === BACKEND_STANDALONE && JAM_API_PORT === undefined) {
    throw new Error('Unsupported port: Please specify a valid JAM_API_PORT')
  }

  const server = JAM_BACKEND === BACKEND_NATIVE ? serverConfigNative() : serverConfigStandalone()
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server,
  }  
})

/**
 * The "native" installation *does not run* a webserver!
 * Requests must be adapted:
 * - proxy API requests to correct target service
 * - rewrite paths to match target service paths
 * - translate header "x-jm-authorization" to "Authorization"
 */
const serverConfigNative = (): ServerOptions => {
  return {
    proxy: {
      "/api": {
        target: `https://127.0.0.1:${JMWALLETD_API_PORT}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (_proxyReq, req, _res) => {
            if (req.headers['x-jm-authorization']) {
              _proxyReq.setHeader('Authorization', req.headers['x-jm-authorization'])
            }
          });
        },
      },
      "/obwatch": {
        target: `https://127.0.0.1:${JMOBWATCH_PORT}`,
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/obwatch/, ""),
      },
      "/jmws": {
        target: `https://127.0.0.1:${JMWALLETD_WEBSOCKET_PORT}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (p) => p.replace(/^\/jmws/, ""),
      },
    },
  }
}

/**
 * `standalone` backend has a webserver ("Jam API") running!
 * Requests must be adapted:
 * - proxy all API requests to "Jam API"
 */
const serverConfigStandalone = (): ServerOptions => {
  return {
    proxy: {
      "/api": {
        target: `https://127.0.0.1:${JAM_API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      "/obwatch": {
        target: `https://127.0.0.1:${JAM_API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      "/jmws": {
        target: `https://127.0.0.1:${JAM_API_PORT}`,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/jam": {
        target: `https://127.0.0.1:${JAM_API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
    },
  }
}

