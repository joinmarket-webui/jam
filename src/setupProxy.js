const { createProxyMiddleware } = require('http-proxy-middleware')

const { PUBLIC_URL = '' } = process.env

module.exports = (app) => {
  app.use(
    createProxyMiddleware(`${PUBLIC_URL}/api/`, {
      target: 'https://localhost:28183',
      pathRewrite: { [`^${PUBLIC_URL}`]: '' },
      changeOrigin: true,
      secure: false,
      ws: false,
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
      target: 'https://localhost:28283',
      pathRewrite: { [`^${PUBLIC_URL}/jmws`]: '' },
      changeOrigin: true,
      secure: false,
      ws: true,
    })
  )

  app.use(
    createProxyMiddleware(`${PUBLIC_URL}/obwatch/`, {
      target: 'http://localhost:62601',
      pathRewrite: { [`^${PUBLIC_URL}/obwatch/`]: '' },
      changeOrigin: true,
      secure: false,
    })
  )
}
