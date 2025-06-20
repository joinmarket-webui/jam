import { Button } from '@/components/ui/button'

export function Navigation() {
  return (
    <nav className="border-border flex justify-around border-b py-4">
      <Button variant="ghost" className="text-foreground">
        Receive
      </Button>
      <span className="text-muted-foreground">»</span>
      <Button variant="ghost" className="text-foreground">
        Earn
      </Button>
      <span className="text-muted-foreground">»</span>
      <Button variant="ghost" className="text-foreground">
        Send
      </Button>
      <span className="text-muted-foreground">|</span>
      <Button variant="ghost" className="text-foreground">
        Sweep
      </Button>
    </nav>
  )
}
