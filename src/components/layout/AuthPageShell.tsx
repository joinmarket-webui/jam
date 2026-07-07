import type { PropsWithChildren } from 'react'

export const AuthPageShell = ({ children }: PropsWithChildren) => {
  return (
    <div className="from-background to-muted flex flex-1 items-start justify-center bg-gradient-to-br p-4 sm:items-center">
      {children}
    </div>
  )
}
