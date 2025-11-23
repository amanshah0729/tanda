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

export function CreateGroupModal({ isOpen, onClose, onSubmit }: CreateGroupModalProps) {
  const [name, setName] = useState<string>("")
  const [participants, setParticipants] = useState<string>("")
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [paymentFrequency, setPaymentFrequency] = useState<string>("")
  const [frequencyUnit, setFrequencyUnit] = useState<"days" | "weeks" | "months">("days")
  const [isPublic, setIsPublic] = useState<boolean>(true)
  const [creditRequirement, setCreditRequirement] = useState<string>("")

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

    if (!name || name.trim().length === 0) {
      alert("Please enter a group name")
      return
    }

    // Require at least one participant (user must add themselves if they want to join)
    if (participantList.length === 0) {
      alert("Please add at least one participant. Include your own address if you want to join the group.")
      return
    }

    // Validate credit requirement if provided
    if (creditRequirement && parseFloat(creditRequirement) < 0) {
      alert("Credit requirement must be a positive number")
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  onChange={(e) => setFrequencyUnit(e.target.value as "days" | "weeks" | "months")}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff1493]"
                >
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

          {/* Visibility Toggle & Credit Requirement - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Visibility
              </label>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff1493] focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    isPublic ? 'bg-[#ff1493]' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-white/90">
                  {isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
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

