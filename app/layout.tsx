import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

// <CHANGE> Updated metadata for ChatGPT clone
export const metadata: Metadata = {
  title: "ChatGPT Clone - AI Chat Assistant",
  description: "A mobile-optimized ChatGPT clone powered by AI SDK",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <MiniKitProvider>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
      </MiniKitProvider>
    </html>
  )
}
