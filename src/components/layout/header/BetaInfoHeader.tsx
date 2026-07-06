import { AlertCircleIcon } from 'lucide-react'

export default function BetaInfoHeader() {
  return (
    <header className="bg-brand-warning text-brand-warning-foreground w-full bg-yellow-300 p-0.5">
      <span className="flex items-center justify-center gap-1 text-xs">
        <AlertCircleIcon className="size-4" />
        This is beta software!
        <a
          href="https://github.com/joinmarket-webui/jam/issues/new?labels=bug,beta&template=bug_report.md"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline hover:no-underline"
        >
          Please report any errors you find.
        </a>
        <strong>Thank you for testing!</strong>
      </span>
    </header>
  )
}
