import { NextRequest, NextResponse } from "next/server"
import { createWalletClient, createPublicClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import TandaArtifact from "@/abi/Tanda.json"
import { getTandaByAddress, addParticipantToTanda, updateTandaAverageCredit } from "@/lib/tanda-storage"

// Extract ABI from artifact
const TandaABI = TandaArtifact.abi

// World Chain configuration
const WORLD_CHAIN_ID = 480

interface JoinTandaRequest {
  tandaAddress: string
  userAddress: string
}

export const POST = async (req: NextRequest) => {
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

    // Parse request body
    const body = (await req.json()) as JoinTandaRequest

    if (!body.tandaAddress || !body.userAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing tandaAddress or userAddress",
        },
        { status: 400 }
      )
    }

    // Validate addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/
    if (!addressRegex.test(body.tandaAddress) || !addressRegex.test(body.userAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid address format",
        },
        { status: 400 }
      )
    }

    // Get tanda data from storage
    const tanda = await getTandaByAddress(body.tandaAddress)
    if (!tanda) {
      return NextResponse.json(
        {
          success: false,
          error: "Tanda not found",
        },
        { status: 404 }
      )
    }

    // Check if tanda is public
    if (tanda.isPublic === false) {
      return NextResponse.json(
        {
          success: false,
          error: "This is a private group. You cannot join.",
        },
        { status: 403 }
      )
    }

    // Check if user is already a participant
    const isAlreadyParticipant = tanda.participants.some(
      (addr) => addr.toLowerCase() === body.userAddress.toLowerCase()
    )
    if (isAlreadyParticipant) {
      return NextResponse.json(
        {
          success: false,
          error: "You are already a participant in this group",
        },
        { status: 400 }
      )
    }

    // Check credit score requirement
    const creditRequirement = parseFloat(tanda.creditRequirement || "0")
    if (creditRequirement > 0) {
      try {
        // Call credit.cash API
        const creditResponse = await fetch(
          `https://credit.cash/api/borrower/${body.userAddress}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        )

        if (!creditResponse.ok) {
          return NextResponse.json(
            {
              success: false,
              error: "Failed to fetch credit score. Please try again later.",
            },
            { status: 500 }
          )
        }

        const creditData = await creditResponse.json()
        
        // Extract credit score from response
        // Try multiple possible field names
        const userCreditScore = creditData.creditScore || 
                                creditData.score || 
                                creditData.credit_score || 
                                creditData.data?.creditScore ||
                                creditData.data?.score ||
                                0

        // If credit score is 0 or undefined, treat as insufficient
        if (!userCreditScore || userCreditScore < creditRequirement) {
          return NextResponse.json(
            {
              success: false,
              error: `Credit score requirement not met. Required: ${creditRequirement}, Your score: ${userCreditScore || 'N/A'}`,
              creditScoreInsufficient: true,
              userCreditScore: userCreditScore || 0,
              requiredCreditScore: creditRequirement,
            },
            { status: 403 }
          )
        }
      } catch (error: any) {
        console.error("Error checking credit score:", error)
        return NextResponse.json(
          {
            success: false,
            error: "Failed to verify credit score. Please try again later.",
          },
          { status: 500 }
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

    // Call addParticipant on the Tanda contract
    const txHash = await walletClient.writeContract({
      address: body.tandaAddress as `0x${string}`,
      abi: TandaABI,
      functionName: "addParticipant",
      args: [body.userAddress as `0x${string}`],
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

    // Get user's credit score for average calculation
    let userCreditScore = 0
    try {
      const creditResponse = await fetch(
        `https://credit.cash/api/borrower/${body.userAddress}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      )
      
      if (creditResponse.ok) {
        const creditData = await creditResponse.json()
        userCreditScore = creditData.creditScore || 
                         creditData.score || 
                         creditData.credit_score || 
                         creditData.data?.creditScore ||
                         creditData.data?.score ||
                         0
      }
    } catch (error) {
      console.log('Could not fetch credit score for average calculation:', error)
    }

    // Update local storage - add user to tanda's participants
    await addParticipantToTanda(body.tandaAddress, body.userAddress)
    
    // Recalculate average credit score for the tanda
    const updatedTanda = await getTandaByAddress(body.tandaAddress)
    if (updatedTanda) {
      try {
        const creditScores: number[] = []
        for (const participant of updatedTanda.participants) {
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
            
            let score = 0
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
                score = 0
              } else {
                const parsedScore = typeof rawScore === 'string' ? parseFloat(rawScore) : rawScore
                score = isNaN(parsedScore) ? 0 : parsedScore
              }
            }
            // Always add the score (including 0) to the array for average calculation
            creditScores.push(score)
          } catch (error) {
            console.log(`Could not fetch credit score for ${participant}:`, error)
            // If we can't fetch, count as 0
            creditScores.push(0)
          }
        }
        
        if (creditScores.length > 0) {
          const sum = creditScores.reduce((a, b) => a + b, 0)
          const averageCredit = (sum / creditScores.length).toFixed(2)
          
          // Update average credit in storage
          await updateTandaAverageCredit(body.tandaAddress, averageCredit)
        }
      } catch (error) {
        console.log('Error recalculating average credit score:', error)
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      transactionHash: txHash,
      message: "Successfully joined the group!",
    })
  } catch (error: any) {
    console.error("Error joining Tanda:", error)

    // Handle specific contract errors
    if (error.message?.includes("Already a participant")) {
      return NextResponse.json(
        {
          success: false,
          error: "You are already a participant in this group",
        },
        { status: 400 }
      )
    }

    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to join group",
      },
      { status: 500 }
    )
  }
}

