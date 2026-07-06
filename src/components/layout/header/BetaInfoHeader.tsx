import { ArrowUpRightIcon } from 'lucide-react'

export default function BetaInfoHeader() {
  return (
    <header className="bg-brand-warning text-brand-warning-foreground border-brand-warning-foreground/15 w-full border-b">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3 py-1.5 text-center text-xs leading-tight">
        <span className="border-brand-warning-foreground/25 inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-bold tracking-wider uppercase">
          Beta
        </span>
        <span className="font-medium">Thanks for testing! Please report anything that looks off.</span>
        <a
          href="https://github.com/joinmarket-webui/jam/issues/new?labels=bug,beta&template=bug_report.md"
          target="_blank"
          rel="noopener noreferrer"
          className="group border-brand-warning-foreground/30 hover:bg-brand-warning-foreground/10 inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 font-semibold transition-colors"
        >
          Report a bug
          <ArrowUpRightIcon className="size-3 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
        </a>
      </div>
    </header>
  )
}
