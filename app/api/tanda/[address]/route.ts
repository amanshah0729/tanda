import { NextRequest, NextResponse } from "next/server"
import { createPublicClient, http } from "viem"
import TandaArtifact from "@/abi/Tanda.json"

// Extract ABI from artifact
const TandaABI = TandaArtifact.abi

// World Chain configuration
const WORLD_CHAIN_ID = 480

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) => {
  try {
    const { address } = await params
    const tandaAddress = address as `0x${string}`
    const rpcUrl = process.env.WLD_RPC_URL

    if (!rpcUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: Missing WLD_RPC_URL",
        },
        { status: 500 }
      )
    }

    // Create public client
    const publicClient = createPublicClient({
      chain: {
        id: WORLD_CHAIN_ID,
        name: "World Chain",
        network: "worldchain",
        nativeCurrency: {
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [rpcUrl],
          },
        },
      },
      transport: http(rpcUrl),
    })

    // Get user address from query params (optional - for checking payment status)
    const userAddress = req.nextUrl.searchParams.get('userAddress') as `0x${string}` | null

    // Fetch on-chain data
    const [vaultBalance, cycleStartTime, paymentFrequency, currentRecipient, currentRecipientIndex, allHavePaid, paymentAmount, participants] = await Promise.all([
      publicClient.readContract({
        address: tandaAddress,
        abi: TandaABI,
        functionName: "getVaultBalance",
      }),
      publicClient.readContract({
        address: tandaAddress,
        abi: TandaABI,
        functionName: "cycleStartTime",
      }),
      publicClient.readContract({
        address: tandaAddress,
        abi: TandaABI,
        functionName: "paymentFrequency",
      }),
      publicClient.readContract({
        address: tandaAddress,
        abi: TandaABI,
        functionName: "getCurrentRecipient",
      }),
      publicClient.readContract({
        address: tandaAddress,
        abi: TandaABI,
        functionName: "currentRecipientIndex",
      }),
      publicClient.readContract({
        address: tandaAddress,
        abi: TandaABI,
        functionName: "allHavePaid",
      }),
      publicClient.readContract({
        address: tandaAddress,
        abi: TandaABI,
        functionName: "paymentAmount",
      }),
      publicClient.readContract({
        address: tandaAddress,
        abi: TandaABI,
        functionName: "getParticipants",
      }),
    ])

    // Check if user has paid (if userAddress provided)
    let hasPaid = false
    if (userAddress) {
      hasPaid = await publicClient.readContract({
        address: tandaAddress,
        abi: TandaABI,
        functionName: "hasPaidThisCycle",
        args: [userAddress],
      }) as boolean
    }

    // Calculate dates
    const cycleStartTimestamp = Number(cycleStartTime) * 1000 // Convert to milliseconds
    const frequencySeconds = Number(paymentFrequency)
    const cycleEndTimestamp = cycleStartTimestamp + (frequencySeconds * 1000)
    const now = Date.now()
    
    // Next payment due: cycle end date (payments are due before cycle ends)
    // If cycle has already ended, calculate next cycle's payment due date
    // This should NEVER be in the past
    let nextPaymentDue = new Date(cycleEndTimestamp)
    if (nextPaymentDue.getTime() < now) {
      // Cycle has ended, calculate next cycle's payment due
      const cyclesPassed = Math.floor((now - cycleStartTimestamp) / (frequencySeconds * 1000))
      const nextCycleStart = cycleStartTimestamp + (frequencySeconds * (cyclesPassed + 1) * 1000)
      nextPaymentDue = new Date(nextCycleStart + (frequencySeconds * 1000))
    }
    
    // Calculate user-specific claim date based on their position relative to current recipient
    // After a claim, cycleStartTime resets, so we need to calculate based on:
    // - Current cycle start time
    // - User's position relative to current recipient
    // - Payment frequency intervals
    // NOTE: Claim date CAN be in the past - this is intentional (user can still claim)
    let claimDate: Date
    if (userAddress) {
      const participantsArray = participants as string[]
      const userIndex = participantsArray.findIndex(
        (addr: string) => addr.toLowerCase() === userAddress.toLowerCase()
      )
      
      if (userIndex >= 0) {
        // Get current recipient index from contract
        const currentRecipientIdx = Number(currentRecipientIndex)
        
        // Calculate how many positions ahead the user is from current recipient
        let positionsAhead: number
        if (userIndex >= currentRecipientIdx) {
          // User is after current recipient in the array
          positionsAhead = userIndex - currentRecipientIdx
        } else {
          // User is before current recipient (wrapped around)
          positionsAhead = (participantsArray.length - currentRecipientIdx) + userIndex
        }
        
        // Claim date = cycleStartTime + (paymentFrequency * (positionsAhead + 1))
        // +1 because current recipient claims first, then next person, etc.
        // This can be in the past - that's fine, user can still claim
        const userClaimTimestamp = cycleStartTimestamp + (frequencySeconds * (positionsAhead + 1) * 1000)
        claimDate = new Date(userClaimTimestamp)
      } else {
        // User not found in participants, use default (shouldn't happen)
        claimDate = allHavePaid ? new Date() : new Date(cycleEndTimestamp)
      }
    } else {
      // No user address provided, use default claim date (for current recipient)
      claimDate = allHavePaid ? new Date() : new Date(cycleEndTimestamp)
    }

    return NextResponse.json({
      success: true,
      data: {
        vaultBalance: vaultBalance.toString(),
        cycleStartTime: cycleStartTime.toString(),
        paymentFrequency: paymentFrequency.toString(),
        paymentAmount: paymentAmount.toString(),
        currentRecipient: currentRecipient as string,
        allHavePaid,
        nextPaymentDue: nextPaymentDue.toISOString(),
        claimDate: claimDate.toISOString(),
        hasPaid: userAddress ? hasPaid : null,
      },
    })
  } catch (error: any) {
    console.error("Error fetching Tanda data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch Tanda data",
      },
      { status: 500 }
    )
  }
}

