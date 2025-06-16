import { File } from "lucide-react";
import { Button } from "./ui/button";

export function Footer() {
  return (
    <footer className="flex justify-between items-center p-4 bg-white text-xs opacity-60 text-black dark:bg-[#181b20] dark:text-white transition-colors duration-300">
      <span className="flex-1">
        This is beta software. <br />
        <a href="#" className="underline">
          Read this before using.
        </a>
      </span>
      <div className="flex-1 flex items-center hover:underline justify-center">
        <Button variant="ghost" size="sm">
          <File />
          Cheatsheet
        </Button>
      </div>
      <span className="flex-1 text-right opacity-70">© 2025 Hodlers</span>
    </footer>
  );
}
