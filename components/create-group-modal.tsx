"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    participants: string[]
    paymentAmount: string
    paymentFrequency: string
  }) => void
}

export function CreateGroupModal({ isOpen, onClose, onSubmit }: CreateGroupModalProps) {
  const [participants, setParticipants] = useState<string>("")
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [paymentFrequency, setPaymentFrequency] = useState<string>("")
  const [frequencyUnit, setFrequencyUnit] = useState<"days" | "weeks" | "months">("days")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Parse participants (comma or newline separated addresses)
    const participantList = participants
      .split(/[,\n]/)
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0)

    // Validate addresses (basic check)
    const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr)
    const invalidAddresses = participantList.filter((addr) => !isValidAddress(addr))

    if (invalidAddresses.length > 0) {
      alert(`Invalid addresses: ${invalidAddresses.join(", ")}`)
      return
    }

    if (participantList.length === 0) {
      alert("Please add at least one participant")
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

    // Convert frequency to seconds based on unit
    let frequencyInSeconds: number
    const frequencyValue = parseFloat(paymentFrequency)

    switch (frequencyUnit) {
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
      participants: participantList,
      paymentAmount: paymentAmountInWei,
      paymentFrequency: frequencyInSeconds.toString(),
    })

    // Reset form
    setParticipants("")
    setPaymentAmount("")
    setPaymentFrequency("")
    onClose()
  }

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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Participants */}
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Participants (Addresses)
            </label>
            <Textarea
              placeholder="Enter addresses separated by commas or new lines&#10;Example: 0x1234..., 0x5678..., 0x9abc..."
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              className="min-h-24 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Enter Ethereum addresses (0x...) separated by commas or new lines
            </p>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Payment Amount (USDC)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="10"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Amount each participant pays per cycle (in USDC)
            </p>
          </div>

          {/* Payment Frequency */}
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Payment Frequency
            </label>
            <div className="flex gap-3">
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
                onChange={(e) => setFrequencyUnit(e.target.value as "days" | "weeks" | "months")}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#ff1493]"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              How often participants need to make payments
            </p>
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
              className="flex-1 bg-[#ff1493] text-white hover:opacity-90"
            >
              Create Group
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

