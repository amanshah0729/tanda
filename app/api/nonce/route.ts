import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  // Expects only alphanumeric characters
  // The nonce must be at least 8 alphanumeric characters in length
  // Generate a secure random alphanumeric string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let nonce = ''
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // The nonce should be stored somewhere that is not tamperable by the client
  const cookieStore = await cookies()
  cookieStore.set("siwe", nonce, { secure: true, httpOnly: true, sameSite: "lax" })
  return NextResponse.json({ nonce })
}

