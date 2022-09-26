import styles from './Seedphrase.module.css'

interface SeedphraseProps {
  seedphrase: string
  isBlurred?: boolean
  centered?: boolean
}

export default function Seedphrase({ seedphrase, isBlurred = true, centered = false }: SeedphraseProps) {
  return (
    <div
      className={`${styles.container} slashed-zeroes d-flex flex-wrap ${
        centered ? 'justify-content-center align-items-center' : ''
      }`}
    >
      {seedphrase.split(' ').map((seedWord, index) => (
        <div key={index} className={`${styles.item} d-flex py-2 ps-2 pe-3`}>
          <span className={`${styles['item-index']} text-secondary text-end`}>{index + 1}</span>
          <span className="text-secondary">.&nbsp;</span>
          <span className={isBlurred ? 'blurred-text' : ''}>{isBlurred ? 'abcdef' : seedWord}</span>
        </div>
      ))}
    </div>
  )
}
