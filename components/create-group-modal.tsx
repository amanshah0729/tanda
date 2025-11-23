"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    participants: string[]
    paymentAmount: string
    paymentFrequency: string
    isPublic: boolean
    creditRequirement: string
  }) => void
}

interface ReviewData {
  averageCreditScore: number
  expectedYield: number
  underwriterFee: number
  netAPY: number
  netYearlyGain: number
}

export function CreateGroupModal({ isOpen, onClose, onSubmit }: CreateGroupModalProps) {
  const [name, setName] = useState<string>("")
  const [participants, setParticipants] = useState<string>("")
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [paymentFrequency, setPaymentFrequency] = useState<string>("")
  const [frequencyUnit, setFrequencyUnit] = useState<"days" | "weeks" | "months" | "seconds">("days")
  const [isPublic, setIsPublic] = useState<boolean>(true)
  const [creditRequirement, setCreditRequirement] = useState<string>("")
  const [currentScreen, setCurrentScreen] = useState<"form" | "review">("form")
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const [isCalculatingReview, setIsCalculatingReview] = useState(false)

  if (!isOpen) return null

  // Calculate underwriter fee based on average credit score
  const calculateUnderwriterFee = (averageCreditScore: number): number => {
    // If credit score is 10 or greater, underwriter fee is 2
    // If score is less than 10, linearly go from 10 (at score 0) to 2 (at score 10)
    if (averageCreditScore >= 10) {
      return 2
    }
    // For score < 10, interpolate linearly:
    // fee = 10 - (averageCreditScore / 10) * 8
    // At 0 => 10, at 10 => 2
    const fee = 10 - (averageCreditScore / 10) * 8
    return Math.round(fee * 100) / 100 // Round to 2 decimal places
  }

  // Calculate net yearly gain based on payment amount and frequency
  const calculateYearlyGain = (
    paymentAmount: number,
    frequencyInSeconds: number,
    netAPY: number
  ): number => {
    // Calculate how many payments per year
    const secondsPerYear = 365 * 24 * 60 * 60
    const paymentsPerYear = secondsPerYear / frequencyInSeconds
    
    // Total amount contributed per year
    const totalContributedPerYear = paymentAmount * paymentsPerYear
    
    // Net gain = total contributed * (net APY / 100)
    return (totalContributedPerYear * netAPY) / 100
  }

  const handleReviewPool = async (e: React.FormEvent) => {
    e.preventDefault()

    // Parse participants
    const participantList = participants
      .split(/[,\n]/)
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0)

    // Validate addresses
    const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr)
    const invalidAddresses = participantList.filter((addr) => !isValidAddress(addr))

    if (invalidAddresses.length > 0) {
      alert(`Invalid addresses: ${invalidAddresses.join(", ")}`)
      return
    }

    if (!name || name.trim().length === 0) {
      alert("Please enter a group name")
      return
    }

    if (participantList.length === 0) {
      alert("Please add at least one participant. Include your own address if you want to join the group.")
      return
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert("Please enter a valid payment amount")
      return
    }

    if (!paymentFrequency || parseFloat(paymentFrequency) <= 0) {
      alert("Please enter a valid payment frequency")
      return
    }

    setIsCalculatingReview(true)

    try {
      // Call backend API to fetch credit scores (avoids CORS issues)
      console.log(`Fetching credit scores for ${participantList.length} participants...`)
      
      const creditResponse = await fetch('/api/calculate-credit-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participants: participantList,
        }),
      })

      if (!creditResponse.ok) {
        const errorData = await creditResponse.json()
        throw new Error(errorData.error || 'Failed to fetch credit scores')
      }

      const creditData = await creditResponse.json()
      console.log('Credit scores response:', creditData)

      if (!creditData.success) {
        throw new Error(creditData.error || 'Failed to calculate credit scores')
      }

      const averageCreditScore = creditData.averageCreditScore || 0
      console.log(`Average credit score: ${averageCreditScore}`)

      // Calculate metrics
      const expectedYield = 10 // Fixed at 10%
      const underwriterFee = calculateUnderwriterFee(averageCreditScore)
      const netAPY = expectedYield - underwriterFee

      // Convert frequency to seconds
      const frequencyValue = parseFloat(paymentFrequency)
      let frequencyInSeconds: number
      switch (frequencyUnit) {
        case "seconds":
          frequencyInSeconds = frequencyValue
          break
        case "days":
          frequencyInSeconds = frequencyValue * 24 * 60 * 60
          break
        case "weeks":
          frequencyInSeconds = frequencyValue * 7 * 24 * 60 * 60
          break
        case "months":
          frequencyInSeconds = frequencyValue * 30 * 24 * 60 * 60
          break
      }

      const paymentAmountNum = parseFloat(paymentAmount)
      const netYearlyGain = calculateYearlyGain(paymentAmountNum, frequencyInSeconds, netAPY)

      setReviewData({
        averageCreditScore: Math.round(averageCreditScore * 100) / 100,
        expectedYield,
        underwriterFee,
        netAPY,
        netYearlyGain: Math.round(netYearlyGain * 100) / 100,
      })

      setCurrentScreen("review")
    } catch (error) {
      console.error("Error calculating review data:", error)
      alert("Error calculating pool metrics. Please try again.")
    } finally {
      setIsCalculatingReview(false)
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    // Parse participants (comma or newline separated addresses)
    const participantList = participants
      .split(/[,\n]/)
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0)

    // Convert frequency to seconds based on unit
    let frequencyInSeconds: number
    const frequencyValue = parseFloat(paymentFrequency)

    switch (frequencyUnit) {
      case "seconds":
        frequencyInSeconds = frequencyValue
        break
      case "days":
        frequencyInSeconds = frequencyValue * 24 * 60 * 60
        break
      case "weeks":
        frequencyInSeconds = frequencyValue * 7 * 24 * 60 * 60
        break
      case "months":
        frequencyInSeconds = frequencyValue * 30 * 24 * 60 * 60 // Approximate
        break
    }

    // Convert payment amount to USDC (6 decimals)
    // User enters amount like "10" for 10 USDC
    const paymentAmountInWei = (parseFloat(paymentAmount) * 1e6).toString()

    onSubmit({
      name: name.trim(),
      participants: participantList,
      paymentAmount: paymentAmountInWei,
      paymentFrequency: frequencyInSeconds.toString(),
      isPublic,
      creditRequirement: creditRequirement.trim() || "0",
    })

    // Reset form
    setName("")
    setParticipants("")
    setPaymentAmount("")
    setPaymentFrequency("")
    setIsPublic(true)
    setCreditRequirement("")
    setCurrentScreen("form")
    setReviewData(null)
    onClose()
  }

  const handleBackToForm = () => {
    setCurrentScreen("form")
    setReviewData(null)
  }

  // Loading Screen (while calculating review data)
  if (isCalculatingReview) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-2xl mx-4 bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-2xl font-bold text-white">Calculating Pool Metrics</h2>
          </div>

          {/* Loading Content */}
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff1493]"></div>
            <p className="text-white/80 text-center">
              Fetching credit scores and calculating pool metrics...
            </p>
            <p className="text-gray-500 text-sm text-center">
              This may take a few seconds
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Review Screen
  if (currentScreen === "review" && reviewData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-2xl mx-4 bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-2xl font-bold text-white">Review Pool</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Review Content */}
          <div className="p-6 space-y-6">
            {/* Pool Metrics */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Average Credit Score</span>
                <span className="text-white font-semibold">{reviewData.averageCreditScore.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/80">Expected Yield</span>
                <span className="text-white font-semibold">{reviewData.expectedYield}%</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/80">Expected Underwriter Fee</span>
                <span className="text-white font-semibold">{reviewData.underwriterFee}%</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700"></div>

            {/* Net Metrics */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Net APY</span>
                <span className="text-green-400 font-semibold text-lg">{reviewData.netAPY.toFixed(2)}%</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/80">Net Yearly Gain</span>
                <span className="text-green-400 font-semibold text-lg">${reviewData.netYearlyGain.toFixed(2)}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackToForm}
                className="flex-1 border-gray-700 text-white hover:bg-gray-800"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                className="flex-1 bg-[#ff1493] text-white hover:opacity-90"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Form Screen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">Create New Group</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleReviewPool} className="p-6 space-y-4">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Group Name
            </label>
            <Input
              type="text"
              placeholder="e.g., Family Savings, Vacation Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              required
            />
          </div>

          {/* Payment Amount & Frequency - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Payment Amount
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="10"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-12"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">USDC</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Frequency
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="30"
                  value={paymentFrequency}
                  onChange={(e) => setPaymentFrequency(e.target.value)}
                  className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  required
                />
                <select
                  value={frequencyUnit}
                  onChange={(e) => setFrequencyUnit(e.target.value as "days" | "weeks" | "months" | "seconds")}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff1493]"
                >
                  <option value="seconds">Seconds</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Participants <span className="text-gray-500 font-normal">(Required)</span>
            </label>
            <Textarea
              placeholder="0x1234..., 0x5678... (comma or newline separated)&#10;Include your own address if you want to join"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              className="min-h-20 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-sm"
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Add participant addresses. Include your own address if you want to be part of this group.
            </p>
          </div>

          {/* Credit Requirement */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Min Credit Score <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={creditRequirement}
              onChange={(e) => setCreditRequirement(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCalculatingReview}
              className="flex-1 bg-[#ff1493] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculatingReview ? "Calculating..." : "Review Pool"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

