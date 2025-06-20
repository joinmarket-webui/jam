type DisplayLogoProps = {
  displayMode: 'sats' | 'btc'
  size?: 'sm' | 'lg'
}

export function DisplayLogo({ displayMode, size = 'lg' }: DisplayLogoProps) {
  if (displayMode === 'btc') {
    return <span className={size === 'sm' ? 'ml-1 text-lg' : 'ml-1 text-4xl'}>₿</span>
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size === 'sm' ? '18px' : '40px'}
      height={size === 'sm' ? '18px' : '40px'}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        display: 'inline',
        verticalAlign: 'middle',
        marginLeft: 4,
      }}
    >
      <path d="M7 7.90906H17" stroke="currentColor" />
      <path d="M12 5.45454V3" stroke="currentColor" />
      <path d="M12 20.9999V18.5454" stroke="currentColor" />
      <path d="M7 12H17" stroke="currentColor" />
      <path d="M7 16.0909H17" stroke="currentColor" />
    </svg>
  )
}
