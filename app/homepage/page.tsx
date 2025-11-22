"use client"

import { useState } from "react"
import { MiniKit } from '@worldcoin/minikit-js'
import { GroupTableRow } from "@/components/group-table-row"
import { CreateGroupModal } from "@/components/create-group-modal"
import TandaFactoryABI from "@/abi/TandaFactory.json"

// TandaFactory contract address on World Chain
const FACTORY_ADDRESS = "0x1d8abc392e739eb267667fb5c715e90f35c90233"

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Sample data - replace with actual data from your backend
  const groups = [
    { id: 1, name: "Family Savings", numberOfPeople: 5 },
    { id: 2, name: "Vacation Fund", numberOfPeople: 8 },
    { id: 3, name: "Emergency Fund", numberOfPeople: 3 },
  ]

  const handleCreateGroup = async (data: {
    participants: string[]
    paymentAmount: string
    paymentFrequency: string
  }) => {
    if (!MiniKit.isInstalled()) {
      alert("World ID MiniKit is not installed. Please install the World App.")
      return
    }

    setIsCreating(true)

    try {
      // Call factory.createTanda via MiniKit
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: FACTORY_ADDRESS,
            abi: TandaFactoryABI,
            functionName: 'createTanda',
            args: [
              data.participants,
              data.paymentAmount,
              data.paymentFrequency,
            ],
          },
        ],
      })

      if (finalPayload.status === 'error') {
        alert(`Transaction failed: ${finalPayload.error || 'Unknown error'}`)
        return
      }

      // Transaction sent successfully
      console.log('Transaction ID:', finalPayload.transaction_id)
      alert(`Tanda creation transaction sent!\nTransaction ID: ${finalPayload.transaction_id}\n\nCheck World App for confirmation.`)
      
      // Close modal on success
      setIsModalOpen(false)
    } catch (error: any) {
      console.error('Error creating Tanda:', error)
      alert(`Error creating Tanda: ${error.message || 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <header className="w-full border-b border-gray-800 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="py-2 px-4 bg-[#ff1493] text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
              >
                Start Group
              </button>
              <button
                onClick={() => {
                  // Handle Join Group
                  console.log('Join Group clicked')
                }}
                className="py-2 px-4 bg-[#ff1493] text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
              >
                Join Group
              </button>
            </div>
          </div>
        </header>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-white/70 font-semibold text-sm">Group Name</th>
                <th className="text-left py-3 px-4 text-white/70 font-semibold text-sm">Members</th>
                <th className="text-right py-3 px-4 text-white/70 font-semibold text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <GroupTableRow
                  key={group.id}
                  groupName={group.name}
                  numberOfPeople={group.numberOfPeople}
                  onButtonClick={() => {
                    console.log(`View group: ${group.name}`)
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateGroup}
      />
      
      {/* Loading overlay when creating */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <p className="text-white text-lg">Creating Tanda...</p>
            <p className="text-gray-400 text-sm mt-2">Please confirm in World App</p>
          </div>
        </div>
      )}
    </div>
  )
}

