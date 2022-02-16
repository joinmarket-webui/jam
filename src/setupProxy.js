const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = (app) => {
  app.use(
    '/api/',
    createProxyMiddleware({
      target: 'https://localhost:28183',
      changeOrigin: true,
      secure: false,
      ws: false,
      onProxyReq: (proxyReq, req, res) => {
        if (req.headers['x-jm-authorization']) {
          proxyReq.setHeader('authorization', req.headers['x-jm-authorization'])
        }
      },
    })
  )
  app.use(
    '/ws/',
    createProxyMiddleware({
      target: 'wss://localhost:28183',
      changeOrigin: true,
      secure: false,
      ws: true,
    })
  )
}
