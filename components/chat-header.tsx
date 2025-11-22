"use client"

import { Menu, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatHeaderProps {
  onNewChat: () => void
}

export function ChatHeader({ onNewChat }: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">ChatGPT</h1>
        </div>
        <Button onClick={onNewChat} variant="outline" size="sm" className="gap-2 bg-transparent">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New chat</span>
        </Button>
      </div>
    </header>
  )
}
