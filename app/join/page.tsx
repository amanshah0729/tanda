"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

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
}

export default function JoinPage() {
  const router = useRouter()
  const [tandas, setTandas] = useState<TandaData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [joiningTanda, setJoiningTanda] = useState<string | null>(null)

  // Fetch public Tandas from API (iterates through all users)
  const fetchTandas = async () => {
    try {
      // Get user's wallet address
      const userAddress = localStorage.getItem('wallet-address')
      
      // Fetch only public tandas (this iterates through all users internally)
      const response = await fetch('/api/tandas?public=true')
      const result = await response.json()
      if (result.success) {
        let tandasList = result.tandas || []
        
        // Filter out tandas where user is already a participant
        if (userAddress) {
          const userAddressLower = userAddress.toLowerCase()
          tandasList = tandasList.filter((tanda: TandaData) => {
            // Check if user is already a participant
            const isParticipant = tanda.participants?.some(
              (addr: string) => addr.toLowerCase() === userAddressLower
            )
            return !isParticipant
          })
        }
        
        setTandas(tandasList)
      }
    } catch (error) {
      console.error('Error fetching Tandas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTandas()
  }, [])

  // Format frequency helper
  const formatFrequency = (frequencySeconds: string) => {
    const days = Math.floor(Number(frequencySeconds) / (24 * 60 * 60))
    if (days === 7) return 'week'
    if (days === 30 || days === 31) return 'month'
    if (days >= 28 && days <= 31) return 'month'
    return `${days} days`
  }

  const handleJoin = async (tandaAddress: string) => {
    setJoiningTanda(tandaAddress)
    
    try {
      // Get user's wallet address
      const userAddress = localStorage.getItem('wallet-address')
      
      if (!userAddress) {
        alert('Please sign in first')
        setJoiningTanda(null)
        return
      }

      // Get the tanda data to check credit requirement
      const tanda = tandas.find(t => t.tandaAddress.toLowerCase() === tandaAddress.toLowerCase())
      if (!tanda) {
        alert('Tanda not found')
        setJoiningTanda(null)
        return
      }

      // Call join API endpoint
      const response = await fetch('/api/join-tanda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tandaAddress,
          userAddress,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to join group')
      }

      // Success!
      alert(
        `✅ Successfully joined ${tanda.name}!\n\n` +
        `Transaction: ${result.transactionHash}\n\n` +
        `View on Worldscan: https://worldscan.org/tx/${result.transactionHash}`
      )

      // Refresh the tandas list
      await fetchTandas()
    } catch (error: any) {
      console.error('Error joining Tanda:', error)
      alert(`Error joining group: ${error.message || 'Unknown error'}`)
    } finally {
      setJoiningTanda(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="relative w-full h-full flex flex-col">
        {/* Header with different style */}
        <header className="w-full border-b border-gray-700/50 px-6 py-5 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/homepage')}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                ← Back to Dashboard
              </button>
              <div className="h-6 w-px bg-gray-700"></div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#ff1493] to-pink-400 bg-clip-text text-transparent">
                Join a Group
              </h1>
            </div>
            <div className="text-sm text-gray-400">
              {tandas.length} {tandas.length === 1 ? 'group' : 'groups'} available
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#ff1493] border-r-transparent"></div>
                  <p className="text-gray-400 mt-4">Loading groups...</p>
                </div>
              </div>
            ) : tandas.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-400 text-lg">No groups available to join yet.</p>
                  <button
                    onClick={() => router.push('/homepage')}
                    className="mt-4 text-[#ff1493] hover:text-pink-400 transition-colors"
                  >
                    Create your own group →
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tandas.map((tanda) => {
                  const paymentAmount = (Number(tanda.paymentAmount) / 1e6).toFixed(2)
                  const frequency = formatFrequency(tanda.paymentFrequency)
                  const isPublic = tanda.isPublic ?? true
                  const creditRequirement = tanda.creditRequirement || "0"
                  const creditScore = parseFloat(creditRequirement)

                  return (
                    <div
                      key={tanda.tandaAddress}
                      className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-[#ff1493]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#ff1493]/10"
                    >
                      {/* Badge */}
                      <div className="absolute top-4 right-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            isPublic
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {isPublic ? 'Public' : 'Private'}
                        </span>
                      </div>

                      {/* Group Name */}
                      <h3 className="text-xl font-bold text-white mb-2 pr-16 group-hover:text-[#ff1493] transition-colors">
                        {tanda.name}
                      </h3>

                      {/* Payment Info */}
                      <div className="mb-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-white">
                            ${paymentAmount}
                          </span>
                          <span className="text-sm text-gray-400">per {frequency}</span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Members</span>
                          <span className="text-white font-medium">{tanda.participants?.length || 0}</span>
                        </div>
                        {creditScore > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Min Credit Score</span>
                            <span className="text-yellow-400 font-medium">{creditScore}</span>
                          </div>
                        )}
                        {creditScore === 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Credit Requirement</span>
                            <span className="text-gray-500 text-xs">None</span>
                          </div>
                        )}
                      </div>

                      {/* Join Button */}
                      <Button
                        onClick={() => handleJoin(tanda.tandaAddress)}
                        disabled={joiningTanda === tanda.tandaAddress || !isPublic}
                        className={`w-full ${
                          joiningTanda === tanda.tandaAddress
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : !isPublic
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#ff1493] to-pink-500 text-white hover:from-[#ff1493]/90 hover:to-pink-500/90'
                        }`}
                      >
                        {joiningTanda === tanda.tandaAddress
                          ? 'Joining...'
                          : !isPublic
                          ? 'Private Group'
                          : 'Join Group'}
                      </Button>

                      {/* Contract Address */}
                      <button
                        onClick={() => {
                          if (tanda.tandaAddress) {
                            window.open(`https://worldscan.org/address/${tanda.tandaAddress}`, '_blank')
                          }
                        }}
                        className="mt-3 text-xs text-gray-500 hover:text-gray-400 font-mono transition-colors w-full text-left truncate"
                      >
                        {tanda.tandaAddress ? `${tanda.tandaAddress.slice(0, 8)}...${tanda.tandaAddress.slice(-6)}` : 'N/A'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

