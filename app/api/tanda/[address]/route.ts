import { NextRequest, NextResponse } from "next/server"
import { createPublicClient, http } from "viem"
import TandaABI from "@/abi/Tanda.json"

// World Chain configuration
const WORLD_CHAIN_ID = 480

export const GET = async (
  req: NextRequest,
  { params }: { params: { address: string } }
) => {
  try {
    const tandaAddress = params.address as `0x${string}`
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

    // Fetch on-chain data
    const [vaultBalance, cycleStartTime, paymentFrequency, currentRecipient, allHavePaid] = await Promise.all([
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
        functionName: "allHavePaid",
      }),
    ])

    // Calculate dates
    const cycleStartTimestamp = Number(cycleStartTime) * 1000 // Convert to milliseconds
    const frequencySeconds = Number(paymentFrequency)
    const cycleEndTimestamp = cycleStartTimestamp + (frequencySeconds * 1000)
    
    // Next payment due: cycle end date (payments are due before cycle ends)
    const nextPaymentDue = new Date(cycleEndTimestamp)
    
    // Claim date: when current recipient can claim (cycle end or when all have paid)
    const claimDate = allHavePaid ? new Date() : new Date(cycleEndTimestamp)

    return NextResponse.json({
      success: true,
      data: {
        vaultBalance: vaultBalance.toString(),
        cycleStartTime: cycleStartTime.toString(),
        paymentFrequency: paymentFrequency.toString(),
        currentRecipient: currentRecipient as string,
        allHavePaid,
        nextPaymentDue: nextPaymentDue.toISOString(),
        claimDate: claimDate.toISOString(),
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

