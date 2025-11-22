import { NextResponse } from "next/server"
import { getAllTandas } from "@/lib/tanda-storage"

export const GET = async () => {
  try {
    const tandas = await getAllTandas()
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

