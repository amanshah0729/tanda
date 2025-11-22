import type { UIMessage } from "ai"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: UIMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-3 px-4 py-6 md:px-6", isUser ? "bg-background" : "bg-muted/30")}>
      <div className="flex-shrink-0">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg",
            isUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
          )}
        >
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {message.parts.map((part, index) => {
            if (part.type === "text") {
              return (
                <p key={index} className="whitespace-pre-wrap leading-relaxed">
                  {part.text}
                </p>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}
