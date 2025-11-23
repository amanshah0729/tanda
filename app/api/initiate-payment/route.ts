import { NextRequest, NextResponse } from 'next/server'
import { privateKeyToAccount } from "viem/accounts"

export async function POST(req: NextRequest) {
  try {
    const privateKey = process.env.WLD_PRIVATE_KEY
    if (!privateKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Generate reference ID
    const uuid = crypto.randomUUID().replace(/-/g, '')

    // Get backend wallet address
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    const backendWalletAddress = account.address

    // TODO: Store the reference ID in your database with tandaAddress and userAddress for verification later

    return NextResponse.json({ 
      id: uuid,
      backendWalletAddress 
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

