import { Utxo } from '../../context/WalletContext'

const isEqual = ({ lhs, rhs }: { lhs: Utxo; rhs: Utxo }) => lhs.utxo === rhs.utxo

const utxoIsInList = ({ utxo, list }: { utxo: Utxo; list: Array<Utxo> }) =>
  list.findIndex((it) => isEqual({ lhs: it, rhs: utxo })) !== -1

const utxosToFreeze = ({
  allUtxos,
  selectedUtxosForFidelityBond,
}: {
  allUtxos: Array<Utxo>
  selectedUtxosForFidelityBond: Array<Utxo>
}) => allUtxos.filter((utxo) => !utxoIsInList({ utxo, list: selectedUtxosForFidelityBond }))

const allUtxosAreFrozen = ({ utxos }: { utxos: Array<Utxo> }) => utxos.every((utxo) => utxo.frozen)

export { utxosToFreeze, utxoIsInList, allUtxosAreFrozen }
