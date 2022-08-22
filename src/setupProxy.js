const { createProxyMiddleware } = require('http-proxy-middleware')

const { PUBLIC_URL = '' } = process.env

const __TEST_LOG_FEATURE = true

const SECONDARY_CONTAINER_JAM_API_PORT = 29080

const PRIMARY_CONTAINER = {
  apiPort: 28183,
  websocketPort: 28283,
  obwatcherPort: 62601,
}
const SECONDARY_CONTAINER = {
  apiPort: 29183,
  websocketPort: 29283,
  obwatcherPort: 72601,
}

let target = PRIMARY_CONTAINER
if (__TEST_LOG_FEATURE) {
  target = SECONDARY_CONTAINER
}

module.exports = (app) => {
  app.use(
    createProxyMiddleware(`${PUBLIC_URL}/api/`, {
      target: `https://localhost:${target.apiPort}`,
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

  // https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/JSON-RPC-API-using-jmwalletd.md#websocket
  app.use(
    createProxyMiddleware(`${PUBLIC_URL}/jmws`, {
      target: `https://localhost:${target.websocketPort}`,
      pathRewrite: { [`^${PUBLIC_URL}/jmws`]: '' },
      changeOrigin: true,
      secure: false,
      ws: true,
    })
  )

  app.use(
    createProxyMiddleware(`${PUBLIC_URL}/obwatch/`, {
      target: `https://localhost:${target.obwatcherPort}`,
      pathRewrite: { [`^${PUBLIC_URL}/obwatch/`]: '' },
      changeOrigin: true,
      secure: false,
    })
  )

  if (__TEST_LOG_FEATURE) {
    app.use(
      createProxyMiddleware(`${PUBLIC_URL}/jam/api/v0/`, {
        target: `http://localhost:${SECONDARY_CONTAINER_JAM_API_PORT}`,
        changeOrigin: true,
        secure: false,
      })
    )
  }
}
