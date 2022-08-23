const { createProxyMiddleware } = require('http-proxy-middleware')

const { PUBLIC_URL = '' } = process.env

const PRIMARY_CONTAINER = {
  apiPort: 28183,
  websocketPort: 28283,
  obwatcherPort: 62601,
}

const SECONDARY_CONTAINER_JAM_API_PORT = 29080

const __TEST_LOG_FEATURE = false

let target = 'PRIMARY'
if (__TEST_LOG_FEATURE) {
  target = 'SECONDARY'
}

module.exports = (app) => {
  if (target === 'PRIMARY') {
    /**
     * The primary container *does not run* nginx!
     * Requests must be adapted:
     * - remove path prefix "PUBLIC_URL" (if present)
     * - proxy API requests to correct target service
     * - rewrite paths to match target service paths
     * - translate header "x-jm-authorization" to "Authorization"
     */
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/jmws`, {
        target: `https://localhost:${PRIMARY_CONTAINER.websocketPort}`,
        pathRewrite: { [`^${PUBLIC_URL}/jmws`]: '' },
        changeOrigin: true,
        secure: false,
        ws: true,
      })
    )
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/api/`, {
        target: `https://localhost:${PRIMARY_CONTAINER.apiPort}`,
        pathRewrite: { [`^${PUBLIC_URL}`]: '' },
        changeOrigin: true,
        secure: false,
        onProxyReq: (proxyReq, req, res) => {
          if (req.headers['x-jm-authorization']) {
            proxyReq.setHeader('Authorization', req.headers['x-jm-authorization'])
          }
        },
      })
    )
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/obwatch/`, {
        target: `https://localhost:${PRIMARY_CONTAINER.obwatcherPort}`,
        pathRewrite: { [`^${PUBLIC_URL}/obwatch/`]: '' },
        changeOrigin: true,
        secure: false,
      })
    )
  } else if (target === 'SECONDARY') {
    /**
     * The secondary container has the nginx ("Jam API") running!
     * Requests must be adapted:
     * - remove path prefix "PUBLIC_URL" (if present)
     * - proxy all API requests to "Jam API"
     */
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/jmws`, {
        target: `http://localhost:${SECONDARY_CONTAINER_JAM_API_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}`]: '' },
        changeOrigin: true,
        secure: false,
        ws: true,
      })
    )
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/api/`, {
        target: `http://localhost:${SECONDARY_CONTAINER_JAM_API_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}`]: '' },
        changeOrigin: true,
        secure: false,
      })
    )
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/obwatch/`, {
        target: `http://localhost:${SECONDARY_CONTAINER_JAM_API_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}`]: '' },
        changeOrigin: true,
        secure: false,
      })
    )
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/jam/`, {
        target: `http://localhost:${SECONDARY_CONTAINER_JAM_API_PORT}`,
        pathRewrite: { [`^${PUBLIC_URL}`]: '' },
        changeOrigin: true,
        secure: false,
      })
    )
  }
}
