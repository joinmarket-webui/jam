export const routes = {
  home: '/',
  login: '/login',
  createWallet: '/create-wallet',
  importWallet: '/import-wallet',
  switchWallet: '/switch-wallet',
  receive: '/receive',
  send: '/send',
  rescan: '/settings/rescan',
  earn: '/earn',
  earnReport: '/earn/report',
  sweep: '/sweep',
  settings: '/settings',
  orderbook: '/orderbook',
  logs: '/logs',
  walletJarsDetails: '/wallet/jars',
  /* walletList: '/', wallet: '/wallet' */
  __dev: '/dev',
  __devErrorExample: '/dev/error-example',
  __devSetup: '/dev/setup',
}

export type Route = keyof typeof routes
