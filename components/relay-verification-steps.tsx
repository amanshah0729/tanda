"use client"

import { useState, useEffect } from "react"

interface RelayVerificationStepsProps {
  isActive: boolean
  participantCount?: number
  onComplete?: () => void
}

export function RelayVerificationSteps({ 
  isActive, 
  participantCount = 0,
  onComplete 
}: RelayVerificationStepsProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      label: "Fetching off-chain credit scores from Symbiotic Relay...",
      icon: "⏳",
    },
    {
      label: `Relay produced attestations for ${participantCount} participant${participantCount !== 1 ? 's' : ''} ✓`,
      icon: "✓",
    },
    {
      label: "Verifying Relay proofs...",
      icon: "⏳",
    },
    {
      label: "All proofs verified ✓",
      icon: "✓",
    },
  ]

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0)
      return
    }

    // Simulate step progression
    const stepIntervals = [1000, 1500, 800, 500] // milliseconds for each step
    
    let timeoutId: NodeJS.Timeout
    let stepIndex = 0

    const progressSteps = () => {
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex)
        timeoutId = setTimeout(() => {
          stepIndex++
          progressSteps()
        }, stepIntervals[stepIndex])
      } else if (onComplete) {
        onComplete()
      }
    }

    progressSteps()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isActive, participantCount])

  if (!isActive) return null

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-white/90 mb-3">
        Symbiotic Relay Verification
      </h4>
      {steps.map((step, index) => (
        <div
          key={index}
          className={`flex items-center gap-3 text-sm transition-opacity ${
            index < currentStep
              ? "text-green-400 opacity-100"
              : index === currentStep
              ? "text-white opacity-100"
              : "text-gray-500 opacity-50"
          }`}
        >
          <span className="text-lg">{step.icon}</span>
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  )
}


