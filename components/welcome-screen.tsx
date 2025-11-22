"use client"

import { MessageSquare, Lightbulb, Code, Globe } from "lucide-react"

interface WelcomeScreenProps {
  onExampleClick: (example: string) => void
}

export function WelcomeScreen({ onExampleClick }: WelcomeScreenProps) {
  const examples = [
    {
      icon: MessageSquare,
      text: "Explain quantum computing in simple terms",
    },
    {
      icon: Lightbulb,
      text: "Give me creative ideas for a team building event",
    },
    {
      icon: Code,
      text: "Help me debug this JavaScript code",
    },
    {
      icon: Globe,
      text: "What's the latest news in AI technology?",
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 pb-32">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-balance">How can I help you today?</h2>
          <p className="text-muted-foreground">Choose an example below or start typing your question</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => onExampleClick(example.text)}
              className="flex items-start gap-3 p-4 text-left rounded-xl border bg-card hover:bg-accent transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                <example.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm leading-relaxed">{example.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
