const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = (app) => {
  app.use(
    createProxyMiddleware('/api/', {
      target: 'https://localhost:28183',
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
    createProxyMiddleware('/jmws', {
      target: 'https://localhost:28283',
      pathRewrite: { '^/jmws': '' },
      changeOrigin: true,
      secure: false,
      ws: true,
    })
  )
}
