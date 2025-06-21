import { File } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Footer() {
  return (
    <footer className="flex items-center justify-between bg-white p-4 text-xs text-black opacity-60 transition-colors duration-300 dark:bg-[#181b20] dark:text-white">
      <span className="flex-1">
        This is beta software. <br />
        <a href="#" className="underline">
          Read this before using.
        </a>
      </span>
      <div className="flex flex-1 items-center justify-center hover:underline">
        <Button variant="ghost" size="sm">
          <File />
          Cheatsheet
        </Button>
      </div>
      <span className="flex-1 text-right opacity-70">© 2025 Hodlers</span>
    </footer>
  )
}
