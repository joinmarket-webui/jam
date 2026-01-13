import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme = 'dark' } = useTheme()

  return <Sonner theme={resolvedTheme as ToasterProps['theme']} className="toaster group" {...props} />
}

export { Toaster }
