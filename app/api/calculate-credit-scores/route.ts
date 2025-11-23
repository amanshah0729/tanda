import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { participants } = body

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid participants array",
        },
        { status: 400 }
      )
    }

    // Fetch credit scores through Symbiotic Relay for all participants
    const creditScores: number[] = []
    const relayAttestations: Array<{
      participant: string
      value: number
      proof: string
      signature: string
    }> = []

    for (const participant of participants) {
      try {
        // Step 1: Get attestation from Symbiotic Relay
        // In production, this would call the actual Relay RPC endpoint
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get('origin') || 'http://localhost:3000')
        const relayResponse = await fetch(`${baseUrl}/api/symbiotic/credit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ participantAddress: participant }),
        })

        let creditScore = 0
        let proof = ""
        let signature = ""

        if (relayResponse.ok) {
          const relayData = await relayResponse.json()
          if (relayData.success) {
            creditScore = relayData.value || 0
            proof = relayData.proof || ""
            signature = relayData.signature || ""
            
            relayAttestations.push({
              participant,
              value: creditScore,
              proof,
              signature,
            })
            
            console.log(`✓ Relay attestation for ${participant}: score=${creditScore}, proof=${proof.slice(0, 20)}...`)
          } else {
            // Fallback to direct API if Relay fails
            console.log(`Relay failed for ${participant}, falling back to direct API`)
            const creditResponse = await fetch(
              `https://credit.cash/api/borrower/${participant}`,
              {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                },
              }
            )

            if (creditResponse.ok) {
              const creditData = await creditResponse.json()
              const rawScore = creditData.creditScore || 
                              creditData.score || 
                              creditData.credit_score || 
                              creditData.data?.creditScore ||
                              creditData.data?.score ||
                              null

              if (rawScore === null || rawScore === undefined || rawScore === "N/A" || rawScore === "n/a") {
                creditScore = 0
              } else {
                const parsedScore = typeof rawScore === 'string' ? parseFloat(rawScore) : rawScore
                creditScore = isNaN(parsedScore) ? 0 : parsedScore
              }
            }
          }
        } else {
          // Fallback to direct API if Relay endpoint fails
          console.log(`Relay endpoint failed for ${participant}, falling back to direct API`)
          const creditResponse = await fetch(
            `https://credit.cash/api/borrower/${participant}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            }
          )

          if (creditResponse.ok) {
            const creditData = await creditResponse.json()
            const rawScore = creditData.creditScore || 
                            creditData.score || 
                            creditData.credit_score || 
                            creditData.data?.creditScore ||
                            creditData.data?.score ||
                            null

            if (rawScore === null || rawScore === undefined || rawScore === "N/A" || rawScore === "n/a") {
              creditScore = 0
            } else {
              const parsedScore = typeof rawScore === 'string' ? parseFloat(rawScore) : rawScore
              creditScore = isNaN(parsedScore) ? 0 : parsedScore
            }
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

    // Calculate average credit score
    const averageCreditScore = creditScores.length > 0
      ? creditScores.reduce((a, b) => a + b, 0) / creditScores.length
      : 0

    return NextResponse.json({
      success: true,
      creditScores,
      averageCreditScore: Math.round(averageCreditScore * 100) / 100,
      relayAttestations, // Include Relay attestations for frontend display
    })
  } catch (error: any) {
    console.error("Error calculating credit scores:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to calculate credit scores",
      },
      { status: 500 }
    )
  }
}

