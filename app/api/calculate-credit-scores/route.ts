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

    // Fetch credit scores for all participants
    const creditScores: number[] = []
    for (const participant of participants) {
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

    // Calculate average credit score
    const averageCreditScore = creditScores.length > 0
      ? creditScores.reduce((a, b) => a + b, 0) / creditScores.length
      : 0

    return NextResponse.json({
      success: true,
      creditScores,
      averageCreditScore: Math.round(averageCreditScore * 100) / 100,
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

