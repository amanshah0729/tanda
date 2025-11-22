"use client"

import { useState } from "react"
import { MiniKit } from '@worldcoin/minikit-js'

export default function LandingPage() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  
  const signInWithWallet = async () => {
    if (process.env.NEXT_PUBLIC_TESTING === "true") {
      // Simulate auth in testing mode
      localStorage.setItem('world-id-verified', 'true')
      window.location.href = '/homepage'
      return
    }

    if (!MiniKit.isInstalled()) {
      setVerifyError("World ID MiniKit is not installed. Please install the World App.")
      return
    }

    setIsVerifying(true)
    setVerifyError(null)

    try {
      // Get nonce from backend
      const res = await fetch(`/api/nonce`)
      const { nonce } = await res.json()

      // Call walletAuth command
      const { commandPayload: generateMessageResult, finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: nonce,
        requestId: '0',
        expirationTime: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
        statement: 'Sign in to Tanda',
      })

      if (finalPayload.status === 'error') {
        setVerifyError("Authentication was cancelled or failed. Please try again.")
        setIsVerifying(false)
        return
      }

      // Verify the SIWE message on backend
      const response = await fetch('/api/complete-siwe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: finalPayload,
          nonce,
        }),
      })

      const responseJson = await response.json()
      
      if (responseJson.status === 'success' && responseJson.isValid) {
        console.log('Authentication success!')
        localStorage.setItem('world-id-verified', 'true')
        setVerifyError(null)
        window.location.href = '/homepage'
      } else {
        setVerifyError("Authentication failed. Please try again.")
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setVerifyError("An error occurred during authentication. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const words = ['SUSU', 'ROSCA', 'TONDA', 'CHIT', 'ESUSU', 'AYUDA', 'PANDEROS']

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div className="relative w-full h-full flex flex-col items-center px-4 pt-12 md:pt-16">
        {/* Main Tanda Title - At Top */}
        <div className="relative z-10 text-center mb-8 md:mb-12">
          <h1 
            className="text-6xl md:text-8xl font-black text-[#ff1493]"
            style={{
              textShadow: '0 0 15px #ff1493, 0 0 30px #ff1493',
            }}
          >
            TANDA
          </h1>
        </div>

        {/* Animated Words Below TANDA */}
        <div className="flex flex-col items-center gap-3 md:gap-4 mt-4">
          {words.map((word, index) => (
            <div
              key={word}
              className="word-animate text-white font-bold text-xl md:text-2xl opacity-40"
              style={{
                animationDelay: `${0.3 + index * 0.15}s`,
              }}
            >
              {word}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {verifyError && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-900/80 text-red-200 rounded-lg text-sm max-w-xs text-center z-20">
            {verifyError}
          </div>
        )}

        {/* Get Started Button */}
        <div className="absolute bottom-8 left-0 right-0 px-4 z-10">
          <button
            onClick={signInWithWallet}
            disabled={isVerifying}
            className="w-full py-4 px-8 bg-[#ff1493] text-white font-bold text-xl rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow: '0 0 30px #ff1493, 0 0 60px #ff1493, inset 0 0 20px rgba(255, 20, 147, 0.3)',
            }}
          >
            {isVerifying ? "Signing in..." : "Get Started"}
          </button>
        </div>
      </div>
    </div>
  )
}
