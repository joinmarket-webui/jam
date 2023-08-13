import { ConfigKey } from '../context/ServiceConfigContext'

export const JM_GAPLIMIT_DEFAULT = 6

export const JM_GAPLIMIT_CONFIGKEY: ConfigKey = {
  section: 'POLICY',
  field: 'gaplimit',
}

export const JM_TAKER_UTXO_AGE_DEFAULT = 5

// possible values for property `coinjoin_state` in websocket messages
export const CJ_STATE_TAKER_RUNNING = 0
export const CJ_STATE_MAKER_RUNNING = 1
export const CJ_STATE_NONE_RUNNING = 2
