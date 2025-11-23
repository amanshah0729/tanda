import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, createPublicClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import TandaArtifact from "@/abi/Tanda.json"
import { MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js'

const TandaABI = TandaArtifact.abi
const USDC_ADDRESS = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1" as `0x${string}`
const WORLD_CHAIN_ID = 480

// Simple ERC20 ABI
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json()
    const { payload, tandaAddress, userAddress } = body

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing payment payload",
        },
        { status: 400 }
      )
    }

    if (!tandaAddress || !userAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing tandaAddress or userAddress",
        },
        { status: 400 }
      )
    }

    // TODO: Verify payment using Developer Portal API
    // For now, we'll trust the payment was successful

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

    // Get payment amount from Tanda contract
    const tanda = await publicClient.readContract({
      address: tandaAddress as `0x${string}`,
      abi: TandaABI,
      functionName: "paymentAmount",
    }) as bigint

    // Check backend wallet has received the USDC
    const backendBalance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    }) as bigint

    if (backendBalance < tanda) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient USDC in backend wallet. Has ${Number(backendBalance) / 1e6}, needs ${Number(tanda) / 1e6}`,
        },
        { status: 400 }
      )
    }

    // Transfer USDC from backend wallet to Tanda contract
    const transferTxHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [tandaAddress as `0x${string}`, tanda],
    })

    // Wait for transfer to complete
    await publicClient.waitForTransactionReceipt({ hash: transferTxHash })

    // Call payAfterPermit2 to mark user as paid
    const payTxHash = await walletClient.writeContract({
      address: tandaAddress as `0x${string}`,
      abi: TandaABI,
      functionName: "payAfterPermit2",
      args: [userAddress as `0x${string}`],
    })

    // Wait for payment confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: payTxHash })

    if (receipt.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: "Payment confirmation failed",
          transactionHash: payTxHash,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      transactionHash: payTxHash,
      message: "Payment processed successfully",
    })
  } catch (error: any) {
    console.error("Error confirming payment:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to confirm payment",
      },
      { status: 500 }
    )
  }
}

