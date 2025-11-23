"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MiniKit } from '@worldcoin/minikit-js'
import { CreateGroupModal } from "@/components/create-group-modal"
import TandaArtifact from "@/abi/Tanda.json"
import Permit2ABI from "@/abi/Permit2.json"

// Extract ABI from artifact
const TandaABI = TandaArtifact.abi

// Constants
const PERMIT2_ADDRESS = "0xF0882554ee924278806d708396F1a7975b732522" as `0x${string}` // Standard Permit2 address
const USDC_ADDRESS = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1" as `0x${string}` // USDC on World Chain

interface TandaData {
  name: string
  tandaAddress: string
  transactionHash: string
  blockNumber: string
  participants: string[]
  paymentAmount: string
  paymentFrequency: string
  createdAt: string
  isPublic?: boolean
  creditRequirement?: string
  averageCredit?: string
}

interface TandaOnChainData {
  vaultBalance: string
  nextPaymentDue: string
  claimDate: string
  hasPaid: boolean | null
}

export default function HomePage() {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [tandas, setTandas] = useState<TandaData[]>([])
  const [tandaOnChainData, setTandaOnChainData] = useState<Record<string, TandaOnChainData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [payingTanda, setPayingTanda] = useState<string | null>(null)
  const [username, setUsername] = useState<string>("")

  // Fetch Tandas from API (filtered by user)
  const fetchTandas = async () => {
    try {
      // Get user's wallet address
      const userAddress = localStorage.getItem('wallet-address')
      
      // Fetch tandas for this specific user
      const url = userAddress 
        ? `/api/tandas?userAddress=${userAddress}`
        : '/api/tandas'
      
      const response = await fetch(url)
      const result = await response.json()
      if (result.success) {
        const tandasList = result.tandas || []
        setTandas(tandasList)
        
        // Get user's wallet address
        const userAddress = localStorage.getItem('wallet-address')
        
        // Fetch on-chain data for each Tanda
        const onChainData: Record<string, TandaOnChainData> = {}
        await Promise.all(
          tandasList.map(async (tanda: TandaData) => {
            try {
              const url = userAddress 
                ? `/api/tanda/${tanda.tandaAddress}?userAddress=${userAddress}`
                : `/api/tanda/${tanda.tandaAddress}`
              const tandaResponse = await fetch(url)
              const tandaResult = await tandaResponse.json()
              if (tandaResult.success) {
                onChainData[tanda.tandaAddress] = {
                  vaultBalance: tandaResult.data.vaultBalance,
                  nextPaymentDue: tandaResult.data.nextPaymentDue,
                  claimDate: tandaResult.data.claimDate,
                  hasPaid: tandaResult.data.hasPaid,
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

  // Load username and tandas on mount
  useEffect(() => {
    // First try to get username from localStorage (set during auth)
    const storedUsername = localStorage.getItem('username')
    if (storedUsername) {
      setUsername(storedUsername)
    } else {
      // Fallback to shortened address if no username found
      const userAddress = localStorage.getItem('wallet-address')
      if (userAddress) {
        setUsername(`${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`)
      }
    }
    
    fetchTandas()
  }, [])

  const handleCreateGroup = async (data: {
    name: string
    participants: string[]
    paymentAmount: string
    paymentFrequency: string
    isPublic: boolean
    creditRequirement: string
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

      // Validate that at least one participant is provided
      if (!data.participants || data.participants.length === 0) {
        alert('Please add at least one participant (including yourself if you want to join).')
        setIsCreating(false)
        return
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
          participants: data.participants,
          paymentAmount: data.paymentAmount,
          paymentFrequency: data.paymentFrequency,
          isPublic: data.isPublic,
          creditRequirement: data.creditRequirement,
          creatorAddress: creatorAddress,
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

  const handlePay = async (tandaAddress: string) => {
    if (!MiniKit.isInstalled()) {
      alert("World ID MiniKit is not installed. Please install the World App.")
      return
    }

    const userAddress = localStorage.getItem('wallet-address')
    if (!userAddress) {
      alert("Please sign in first")
      return
    }

    // Get Tanda data
    const tanda = tandas.find(t => t.tandaAddress.toLowerCase() === tandaAddress.toLowerCase())
    if (!tanda) return

    const onChainData = tandaOnChainData[tandaAddress]
    if (!onChainData) {
      alert("Loading Tanda data...")
      return
    }

    // Check if already paid
    if (onChainData.hasPaid === true) {
      alert("You have already paid for this cycle!")
      return
    }

    setPayingTanda(tandaAddress)

    try {
      // Payment amount in wei (6 decimals for USDC) - keep as string for consistency
      const paymentAmount = String(tanda.paymentAmount)
      
      // Capture timestamp once to ensure consistency between nonce and deadline
      const now = Date.now()

      
      // Permit2 permit data - values must match exactly between permit2 array and args
      const permitTransfer = {
        permitted: {
          token: USDC_ADDRESS,
          amount: paymentAmount,
        },
        nonce: Date.now().toString(),
        deadline: Math.floor((Date.now() + 30 * 60 * 1000) / 1000).toString(),
      }

      const transferDetails = {
        to: tandaAddress as `0x${string}`,
        requestedAmount: paymentAmount,
      }

      // Call Permit2 signatureTransfer + Tanda payAfterPermit2
      // Using nested array format that matches Permit2 ABI structure exactly
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            // First transaction: Permit2 signatureTransfer (transfers USDC)
            address: '0xF0882554ee924278806d708396F1a7975b732522',
            abi: Permit2ABI as any,
            functionName: 'signatureTransfer',
            args: [
              // PermitTransferFrom struct: [permitted (TokenPermissions), nonce, deadline]
              [
                // TokenPermissions struct: [token, amount]
                [
                  permitTransfer.permitted.token,
                  permitTransfer.permitted.amount,
                ],
                permitTransfer.nonce,
                permitTransfer.deadline,
              ],
              // SignatureTransferDetails struct: [to, requestedAmount]
              [
                transferDetails.to,
                transferDetails.requestedAmount,
              ],
              'PERMIT2_SIGNATURE_PLACEHOLDER_0', // Placeholder will be replaced with correct signature
            ],
          },

        ],
        permit2: [
          {
            ...permitTransfer,
            spender: tandaAddress as `0x${string}`,
          },
        ],
        formatPayload: false, // Re-enable formatting - let MiniKit handle proper encoding
      })

      if (finalPayload.status === 'error') {
        const errorMsg = (finalPayload as any).error || (finalPayload as any).message || 'Transaction failed'
        throw new Error(errorMsg)
      }

      // Success!
      alert(
        `✅ Payment successful!\n\n` +
        `Transaction ID: ${finalPayload.transaction_id}\n\n` +
        `Your payment has been recorded.`
      )

      // Refresh Tanda data
      await fetchTandas()
    } catch (error: any) {
      console.error('Error paying:', error)
      alert(`Error making payment: ${error.message || 'Unknown error'}`)
    } finally {
      setPayingTanda(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <header className="w-full border-b border-gray-800 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {username || "Dashboard"}
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 bg-[#ff1493] text-white rounded-lg hover:opacity-90 transition-opacity"
                title="Start Group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <button
                onClick={() => router.push('/join')}
                className="p-2 bg-[#ff1493] text-white rounded-lg hover:opacity-90 transition-opacity"
                title="Join Group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
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
                        <button
                          onClick={() => {
                            window.open(`https://worldscan.org/address/${tanda.tandaAddress}`, '_blank')
                          }}
                          className="text-xs text-gray-400 hover:text-gray-300 font-mono transition-colors"
                        >
                          {tanda.tandaAddress.slice(0, 10)}...{tanda.tandaAddress.slice(-8)}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                      
                      {/* Average Credit Score */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Avg Credit Score</p>
                        <p className="text-lg font-semibold text-blue-400">
                          {tanda.averageCredit ? parseFloat(tanda.averageCredit).toFixed(1) : 'N/A'}
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
                    
                    {/* Members count and Pay button */}
                    <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                      <p className="text-sm text-gray-400">
                        <span className="font-semibold text-white">{tanda.participants.length}</span> members
                      </p>
                      {onChainData?.hasPaid === true ? (
                        <span className="py-2 px-6 bg-gray-700 text-gray-300 font-semibold text-sm rounded-lg">
                          Paid
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePay(tanda.tandaAddress)}
                          disabled={payingTanda === tanda.tandaAddress}
                          className={`py-2 px-6 font-semibold text-sm rounded-lg transition-opacity ${
                            payingTanda === tanda.tandaAddress
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-[#ff1493] text-white hover:opacity-90'
                          }`}
                        >
                          {payingTanda === tanda.tandaAddress ? 'Paying...' : 'Pay'}
                        </button>
                      )}
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

