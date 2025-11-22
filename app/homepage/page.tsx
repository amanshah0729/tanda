"use client"

import { useState, useEffect } from "react"
import { CreateGroupModal } from "@/components/create-group-modal"

interface TandaData {
  name: string
  tandaAddress: string
  transactionHash: string
  blockNumber: string
  participants: string[]
  paymentAmount: string
  paymentFrequency: string
  createdAt: string
}

interface TandaOnChainData {
  vaultBalance: string
  nextPaymentDue: string
  claimDate: string
}

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [tandas, setTandas] = useState<TandaData[]>([])
  const [tandaOnChainData, setTandaOnChainData] = useState<Record<string, TandaOnChainData>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Fetch Tandas from API
  const fetchTandas = async () => {
    try {
      const response = await fetch('/api/tandas')
      const result = await response.json()
      if (result.success) {
        const tandasList = result.tandas || []
        setTandas(tandasList)
        
        // Fetch on-chain data for each Tanda
        const onChainData: Record<string, TandaOnChainData> = {}
        await Promise.all(
          tandasList.map(async (tanda: TandaData) => {
            try {
              const tandaResponse = await fetch(`/api/tanda/${tanda.tandaAddress}`)
              const tandaResult = await tandaResponse.json()
              if (tandaResult.success) {
                onChainData[tanda.tandaAddress] = {
                  vaultBalance: tandaResult.data.vaultBalance,
                  nextPaymentDue: tandaResult.data.nextPaymentDue,
                  claimDate: tandaResult.data.claimDate,
                }
              }
            } catch (error) {
              console.error(`Error fetching data for ${tanda.tandaAddress}:`, error)
            }
          })
        )
        setTandaOnChainData(onChainData)
      }
    } catch (error) {
      console.error('Error fetching Tandas:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // Format frequency helper
  const formatFrequency = (frequencySeconds: string) => {
    const days = Math.floor(Number(frequencySeconds) / (24 * 60 * 60))
    if (days === 7) return 'week'
    if (days === 30 || days === 31) return 'month'
    if (days >= 28 && days <= 31) return 'month' // Approximate month
    return `${days} days`
  }

  // Load Tandas on mount
  useEffect(() => {
    fetchTandas()
  }, [])

  const handleCreateGroup = async (data: {
    name: string
    participants: string[]
    paymentAmount: string
    paymentFrequency: string
  }) => {
    setIsCreating(true)

    try {
      // Get creator's wallet address from localStorage (stored during auth)
      const creatorAddress = localStorage.getItem('wallet-address')
      
      if (!creatorAddress) {
        alert('Wallet address not found. Please sign in again.')
        setIsCreating(false)
        return
      }

      // Add creator to participants if not already included
      const participantsWithCreator = [...data.participants]
      const creatorLower = creatorAddress.toLowerCase()
      const isCreatorIncluded = participantsWithCreator.some(
        addr => addr.toLowerCase() === creatorLower
      )
      
      if (!isCreatorIncluded) {
        participantsWithCreator.push(creatorAddress)
      }

      // Call backend API to create Tanda (backend pays gas)
      console.log('Creating Tanda...')
      const response = await fetch('/api/create-tanda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          participants: participantsWithCreator,
          paymentAmount: data.paymentAmount,
          paymentFrequency: data.paymentFrequency,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create Tanda')
      }

      // Success!
      console.log('Tanda created:', result.tandaAddress)
      console.log('Transaction:', result.transactionHash)
      
      // Refresh the Tandas list
      await fetchTandas()
      
      alert(
        `✅ Tanda created successfully!\n\n` +
        `Contract Address: ${result.tandaAddress}\n` +
        `Transaction: ${result.transactionHash}\n\n` +
        `View on Worldscan: https://worldscan.org/tx/${result.transactionHash}`
      )
      
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
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-white/70">Loading Tandas...</p>
            </div>
          ) : tandas.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-white/70">No Tandas yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tandas.map((tanda) => {
                const onChainData = tandaOnChainData[tanda.tandaAddress]
                const paymentAmount = (Number(tanda.paymentAmount) / 1e6).toFixed(2)
                const frequency = formatFrequency(tanda.paymentFrequency)
                const vaultBalance = onChainData ? (Number(onChainData.vaultBalance) / 1e6).toFixed(2) : '0.00'
                
                return (
                  <div
                    key={tanda.tandaAddress}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{tanda.name}</h3>
                        <p className="text-sm text-gray-400 font-mono">
                          {tanda.tandaAddress.slice(0, 10)}...{tanda.tandaAddress.slice(-8)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          window.open(`https://worldscan.org/address/${tanda.tandaAddress}`, '_blank')
                        }}
                        className="py-2 px-4 bg-[#ff1493] text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
                      >
                        View Contract
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Payment Info */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Payment</p>
                        <p className="text-lg font-semibold text-white">
                          ${paymentAmount}/{frequency}
                        </p>
                      </div>
                      
                      {/* Vault Balance */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Vault Balance</p>
                        <p className="text-lg font-semibold text-green-400">
                          {vaultBalance} USDC
                        </p>
                      </div>
                      
                      {/* Next Payment Due */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Next Payment Due</p>
                        <p className="text-sm font-medium text-white">
                          {onChainData ? formatDate(onChainData.nextPaymentDue) : 'Loading...'}
                        </p>
                      </div>
                      
                      {/* Claim Date */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Can Claim On</p>
                        <p className="text-sm font-medium text-yellow-400">
                          {onChainData ? formatDate(onChainData.claimDate) : 'Loading...'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Members count */}
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <p className="text-sm text-gray-400">
                        <span className="font-semibold text-white">{tanda.participants.length}</span> members
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
            <p className="text-gray-400 text-sm mt-2">Deploying contract on World Chain...</p>
          </div>
        </div>
      )}
    </div>
  )
}

