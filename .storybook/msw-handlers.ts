import { http, HttpResponse } from 'msw'

export default {
  getseed: [
    http.get('/api/v1/wallet/Satoshi.jmdat/getseed', () => {
      return HttpResponse.json({
        seedphrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      })
    }),
    http.get('/api/v1/wallet/Satoshi.jmdat/display', () => {
      return HttpResponse.error()
    }),
    http.get('/api/v1/wallet/Satoshi.jmdat/utxos', () => {
      return HttpResponse.error()
    }),
    http.get('/api/v1/session', () => {
      return HttpResponse.error()
    }),
  ],
}
