import { ConfigKey } from '../context/ServiceConfigContext'

export const JM_GAPLIMIT_DEFAULT = 6

export const JM_GAPLIMIT_CONFIGKEY: ConfigKey = {
  section: 'POLICY',
  field: 'gaplimit',
}

// initial value for `taker_utxo_age` from the default joinmarket.cfg (last check on 2023-08-13 of v0.9.9)
export const JM_TAKER_UTXO_AGE_DEFAULT = 5

// initial value for `minimum_makers` from the default joinmarket.cfg (last check on 2022-02-20 of v0.9.5)
export const JM_MINIMUM_MAKERS_DEFAULT = 4

// possible values for property `coinjoin_state` in websocket messages
export const CJ_STATE_TAKER_RUNNING = 0
export const CJ_STATE_MAKER_RUNNING = 1
export const CJ_STATE_NONE_RUNNING = 2

export const JM_API_AUTH_TOKEN_EXPIRY: Milliseconds = Math.round(0.5 * 60 * 60 * 1_000)

// cap of dusty offer minsizes ("has dusty minsize, capping at 27300")
// See: https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/v0.9.11/src/jmclient/configure.py#L70 (last check on 2024-04-22 of v0.9.11)
export const JM_DUST_THRESHOLD = 27_300
