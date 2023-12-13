import * as rb from 'react-bootstrap'
import Sprite from './Sprite'

const checkIsWebShareAPISupported = () => {
  return !!navigator.share
}

type ShareButtonProps = Omit<rb.ButtonProps, 'value' | 'onClick' | 'type'> & {
  value: string
}

const ShareButton = ({ value, ...buttonProps }: ShareButtonProps) => {
  const handleShare = async () => {
    if (!checkIsWebShareAPISupported()) {
      console.error('Sharing failed: Web Share API not supported.')
      return
    }

    try {
      await navigator.share({
        text: value,
      })
    } catch (error) {
      console.error(`Sharing failed: ${error}`)
    }
  }

  return (
    <rb.Button type="button" variant="outline-dark" onClick={handleShare} {...buttonProps}>
      <div className="d-flex align-items-center justify-content-center">
        <Sprite symbol="share" className="me-1" width="20" height="20" />
        Share
      </div>
    </rb.Button>
  )
}

export { ShareButton, checkIsWebShareAPISupported }
