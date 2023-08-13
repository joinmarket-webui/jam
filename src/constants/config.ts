import { ConfigKey } from '../context/ServiceConfigContext'

export const JM_GAPLIMIT_DEFAULT = 6

export const JM_GAPLIMIT_CONFIGKEY: ConfigKey = {
  section: 'POLICY',
  field: 'gaplimit',
}

export const JM_TAKER_UTXO_AGE_DEFAULT = 5
