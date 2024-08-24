import classNames from 'classnames'
import { UtxoTag } from '../utxo/utils'
import styles from './UtxoTags.module.css'

interface UtxoTagsProps {
  value: UtxoTag[]
}

export default function UtxoTags({ value }: UtxoTagsProps) {
  return (
    <div className={styles.utxoTagList}>
      {value.map((tag: UtxoTag, index: number) => (
        <div key={index} className={classNames(styles.utxoTag, styles[`utxoTag-${tag.color}`])}>
          {tag.displayValue}
        </div>
      ))}
    </div>
  )
}
