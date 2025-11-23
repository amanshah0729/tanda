import { NextRequest, NextResponse } from "next/server"
import { createWalletClient, createPublicClient, http, decodeEventLog } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import TandaFactoryABI from "@/abi/TandaFactory.json"
import { addTanda } from "@/lib/tanda-storage"

// TandaFactory contract address on World Chain
const FACTORY_ADDRESS = "0x2aef2dadd6d888c58fdf57d20721d49ea25d9583" as `0x${string}`

// World Chain configuration
const WORLD_CHAIN_ID = 480

interface CreateTandaRequest {
  name: string
  participants: string[]
  paymentAmount: string // Already in wei (6 decimals for USDC)
  paymentFrequency: string // Already in seconds
  isPublic?: boolean // Optional, defaults to true
  creditRequirement?: string // Optional, defaults to "0"
  creatorAddress: string // Address of the user creating the tanda
}

export const POST = async (req: NextRequest) => {
  console.log("backend tanda event creation started...")
  try {
    
    // Validate environment variables
    const privateKey = process.env.WLD_PRIVATE_KEY
    const rpcUrl = process.env.WLD_RPC_URL

    if (!privateKey || !rpcUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: Missing WLD_PRIVATE_KEY or WLD_RPC_URL",
        },
        { status: 500 }
      )
    }

    // Validate private key format
    if (!privateKey.startsWith("0x")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid private key format",
        },
        { status: 500 }
      )
    }

    // Parse request body
    const body = (await req.json()) as CreateTandaRequest

    // Validate addresses regex
    const addressRegex = /^0x[a-fA-F0-9]{40}$/

    // Validate request body
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid name: must be a non-empty string",
        },
        { status: 400 }
      )
    }

    if (!body.participants || !Array.isArray(body.participants) || body.participants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid participants: must be a non-empty array",
        },
        { status: 400 }
      )
    }

    if (!body.paymentAmount || !body.paymentFrequency) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing paymentAmount or paymentFrequency",
        },
        { status: 400 }
      )
    }

    if (!body.creatorAddress || !addressRegex.test(body.creatorAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or missing creatorAddress",
        },
        { status: 400 }
      )
    }

    // Validate addresses
    for (const participant of body.participants) {
      if (!addressRegex.test(participant)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid participant address: ${participant}`,
          },
          { status: 400 }
        )
      }
    }

    // Create account from private key
    const account = privateKeyToAccount(privateKey as `0x${string}`)

    // Create clients
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

    const walletClient = createWalletClient({
      account,
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

    // Validate credit scores BEFORE creating transaction
    const creditRequirement = parseFloat(body.creditRequirement || "0")
    if (creditRequirement > 0) {
      const participantCreditScores: Array<{ address: string; score: number }> = []
      const failedParticipants: Array<{ address: string; score: number | null }> = []

      // Fetch credit scores for all participants
      for (const participant of body.participants) {
        try {
          const creditResponse = await fetch(
            `https://credit.cash/api/borrower/${participant}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            }
          )
          
          let creditScore: number | null = null
          if (creditResponse.ok) {
            const creditData = await creditResponse.json()
            const rawScore = creditData.creditScore || 
                            creditData.score || 
                            creditData.credit_score || 
                            creditData.data?.creditScore ||
                            creditData.data?.score ||
                            null
            
            // Handle "N/A" or null values - treat as 0 for validation
            if (rawScore === null || rawScore === undefined || rawScore === "N/A" || rawScore === "n/a") {
              creditScore = 0
            } else {
              const parsedScore = typeof rawScore === 'string' ? parseFloat(rawScore) : rawScore
              creditScore = isNaN(parsedScore) ? 0 : parsedScore
            }
          }

          // If credit score is 0 (N/A) or below requirement, fail validation
          if (creditScore === null || creditScore < creditRequirement) {
            failedParticipants.push({ address: participant, score: creditScore })
          } else {
            participantCreditScores.push({ address: participant, score: creditScore })
          }
        } catch (error) {
          console.log(`Could not fetch credit score for ${participant}:`, error)
          // If we can't fetch credit score and requirement > 0, fail validation
          failedParticipants.push({ address: participant, score: null })
        }
      }

      // If any participants failed validation, return error
      if (failedParticipants.length > 0) {
        const failedAddresses = failedParticipants.map(p => p.address).join(', ')
        const failedScores = failedParticipants.map(p => 
          p.score === null ? 'N/A' : p.score.toFixed(2)
        ).join(', ')
        
        return NextResponse.json(
          {
            success: false,
            error: "Credit score validation failed",
            details: {
              creditRequirement,
              failedParticipants: failedParticipants.map(p => ({
                address: p.address,
                score: p.score,
              })),
            },
            message: `The following participants do not meet the minimum credit requirement of ${creditRequirement}: ${failedAddresses} (scores: ${failedScores})`,
          },
          { status: 400 }
        )
      }
    }

    // Convert strings to BigInt
    const paymentAmount = BigInt(body.paymentAmount)
    const paymentFrequency = BigInt(body.paymentFrequency)

    // Simulate transaction to get predicted Tanda address
    const simulateResult = await publicClient.simulateContract({
      address: FACTORY_ADDRESS,
      abi: TandaFactoryABI,
      functionName: "createTanda",
      args: [body.participants, paymentAmount, paymentFrequency],
      account: account.address,
    })

    const predictedTandaAddress = simulateResult.result as `0x${string}`

    // Execute the transaction
    const txHash = await walletClient.writeContract({
      address: FACTORY_ADDRESS,
      abi: TandaFactoryABI,
      functionName: "createTanda",
      args: [body.participants, paymentAmount, paymentFrequency],
    })

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    if (receipt.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction failed",
          transactionHash: txHash,
        },
        { status: 500 }
      )
    }

    // Try to get Tanda address from event
    let tandaAddress: `0x${string}` = predictedTandaAddress

    try {
      // Find TandaCreated event in receipt logs
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== FACTORY_ADDRESS.toLowerCase()) {
          continue
        }
        
        try {
          const decoded = decodeEventLog({
            abi: TandaFactoryABI,
            data: log.data,
            topics: log.topics,
          })
          
          if (decoded.eventName === "TandaCreated") {
            tandaAddress = (decoded.args as any).tandaAddress as `0x${string}`
            break
          }
        } catch {
          // Not our event, continue
          continue
        }
      }
    } catch (error) {
      // If event reading fails, use predicted address (should match due to CREATE determinism)
      console.warn("Could not read TandaCreated event, using predicted address:", error)
    }

    // Calculate average credit score for all participants
    let averageCredit = "0"
    try {
      const creditScores: number[] = []
      for (const participant of body.participants) {
        try {
          const creditResponse = await fetch(
            `https://credit.cash/api/borrower/${participant}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            }
          )
          
          let creditScore = 0
          if (creditResponse.ok) {
            const creditData = await creditResponse.json()
            const rawScore = creditData.creditScore || 
                            creditData.score || 
                            creditData.credit_score || 
                            creditData.data?.creditScore ||
                            creditData.data?.score ||
                            null
            
            // Handle "N/A" or null values - treat as 0
            if (rawScore === null || rawScore === undefined || rawScore === "N/A" || rawScore === "n/a") {
              creditScore = 0
            } else {
              const parsedScore = typeof rawScore === 'string' ? parseFloat(rawScore) : rawScore
              creditScore = isNaN(parsedScore) ? 0 : parsedScore
            }
          }
          // Always add the score (including 0) to the array for average calculation
          creditScores.push(creditScore)
        } catch (error) {
          console.log(`Could not fetch credit score for ${participant}:`, error)
          // If we can't fetch, count as 0
          creditScores.push(0)
        }
      }
      
      if (creditScores.length > 0) {
        const sum = creditScores.reduce((a, b) => a + b, 0)
        averageCredit = (sum / creditScores.length).toFixed(2)
      }
    } catch (error) {
      console.log('Error calculating average credit score:', error)
    }

    // Save Tanda data to JSON file
    const tandaData = {
      name: body.name.trim(),
      tandaAddress,
      transactionHash: txHash,
      blockNumber: receipt.blockNumber.toString(),
      participants: body.participants,
      paymentAmount: body.paymentAmount,
      paymentFrequency: body.paymentFrequency,
      createdAt: new Date().toISOString(),
      isPublic: body.isPublic ?? true,
      creditRequirement: body.creditRequirement || "0",
      averageCredit,
    }

    await addTanda(tandaData, body.creatorAddress)

    // Return success response
    return NextResponse.json({
      success: true,
      tandaAddress,
      transactionHash: txHash,
      blockNumber: receipt.blockNumber.toString(),
    })
  } catch (error: any) {
    console.error("Error creating Tanda:", error)

    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create Tanda contract",
      },
      { status: 500 }
    )
  }
}

