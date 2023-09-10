const { createProxyMiddleware } = require('http-proxy-middleware')

const BACKEND_NATIVE = 'native'
const BACKEND_STANDALONE = 'jam-standalone'
const SUPPORTED_BACKENDS = [BACKEND_NATIVE, BACKEND_STANDALONE]

const {
  PUBLIC_URL = '',
  JAM_BACKEND = BACKEND_NATIVE,
  JMWALLETD_API_PORT = '28183',
  JMWALLETD_WEBSOCKET_PORT = '28283',
  JMOBWATCH_PORT = '62601',
  JAM_API_PORT = undefined,
} = process.env

module.exports = (app) => {
  if (!SUPPORTED_BACKENDS.includes(JAM_BACKEND)) {
    throw new Error(`Unsupported backend: Use one of ${SUPPORTED_BACKENDS}`)
  }

  if (JAM_BACKEND === BACKEND_STANDALONE && JAM_API_PORT === undefined) {
    throw new Error('Unsupported port: Please specify a valid JAM_API_PORT')
  }

  if (JAM_BACKEND === BACKEND_NATIVE) {
    /**
     * The "native" installation *does not run* a webserver!
     * Requests must be adapted:
     * - remove path prefix "PUBLIC_URL" (if present)
     * - proxy API requests to correct target service
     * - rewrite paths to match target service paths
     * - translate header "x-jm-authorization" to "Authorization"
     */
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/jmws`, {
        target: `https://127.0.0.1:${JMWALLETD_WEBSOCKET_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}/jmws`]: '' },
        changeOrigin: true,
        secure: false,
        ws: true,
      }),
    )
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/api/`, {
        target: `https://127.0.0.1:${JMWALLETD_API_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}`]: '' },
        changeOrigin: true,
        secure: false,
        onProxyReq: (proxyReq, req, res) => {
          if (req.headers['x-jm-authorization']) {
            proxyReq.setHeader('Authorization', req.headers['x-jm-authorization'])
          }
        },
      }),
    )
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/obwatch/`, {
        target: `http://127.0.0.1:${JMOBWATCH_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}/obwatch/`]: '' },
        changeOrigin: true,
        secure: false,
      }),
    )
  } else if (JAM_BACKEND === BACKEND_STANDALONE) {
    /**
     * `standalone` backend has a webserver ("Jam API") running!
     * Requests must be adapted:
     * - remove path prefix "PUBLIC_URL" (if present)
     * - proxy all API requests to "Jam API"
     */
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/jmws`, {
        target: `http://127.0.0.1:${JAM_API_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}`]: '' },
        changeOrigin: true,
        secure: false,
        ws: true,
      }),
    )
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/api/`, {
        target: `http://127.0.0.1:${JAM_API_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}`]: '' },
        changeOrigin: true,
        secure: false,
      }),
    )
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/obwatch/`, {
        target: `http://127.0.0.1:${JAM_API_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}`]: '' },
        changeOrigin: true,
        secure: false,
      }),
    )
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/jam/`, {
        target: `http://127.0.0.1:${JAM_API_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}`]: '' },
        changeOrigin: true,
        secure: false,
      }),
    )
  }
}
