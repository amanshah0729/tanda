import { NextRequest, NextResponse } from "next/server"
import { getAllTandas, getTandasByUserAddress, getPublicTandas } from "@/lib/tanda-storage"

export const GET = async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams
    const userAddress = searchParams.get('userAddress')
    const publicOnly = searchParams.get('public') === 'true'

    let tandas

    if (publicOnly) {
      // Get only public tandas (iterates through all users)
      tandas = await getPublicTandas()
    } else if (userAddress) {
      // Get tandas for a specific user
      tandas = await getTandasByUserAddress(userAddress)
    } else {
      // Get all tandas from all users (flattened)
      tandas = await getAllTandas()
    }

    return NextResponse.json({
      success: true,
      tandas,
    })
  } catch (error: any) {
    console.error("Error fetching Tandas:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch Tandas",
      },
      { status: 500 }
    )
  }
}

