type DisplayLogoProps = {
  displayMode: 'sats' | 'btc'
  size?: 'sm' | 'lg'
}

export function DisplayLogo({ displayMode, size = 'lg' }: DisplayLogoProps) {
  if (displayMode === 'btc') {
    return <span className={`px-1 ${size === 'sm' ? 'text-md' : 'text-4xl'}`}>₿</span>
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size === 'sm' ? '18px' : '30px'}
      height={size === 'sm' ? '20px' : '40px'}
      viewBox="0 0 24 28"
      fill="none"
      style={{
        display: 'inline',
      }}
    >
      <path d="M7 7.90906H17" stroke="currentColor" strokeWidth={2} />
      <path d="M12 5.45454V3" stroke="currentColor" strokeWidth={2} />
      <path d="M12 20.9999V18.5454" stroke="currentColor" strokeWidth={2} />
      <path d="M7 12H17" stroke="currentColor" strokeWidth={2} />
      <path d="M7 16.0909H17" stroke="currentColor" strokeWidth={2} />
    </svg>
  )
}
