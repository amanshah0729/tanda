import { NextRequest, NextResponse } from "next/server"
import { createWalletClient, createPublicClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import TandaArtifact from "@/abi/Tanda.json"

const TandaABI = TandaArtifact.abi
// USDC.e token address on World Chain (ERC20 token, not native ETH)
const USDC_ADDRESS = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1" as `0x${string}`
const WORLD_CHAIN_ID = 480

// Simple ERC20 ABI for transfer
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

export const POST = async (req: NextRequest) => {
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
    const { tandaAddress, amount = "0.01" } = body

    if (!tandaAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing tandaAddress",
        },
        { status: 400 }
      )
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

    // Convert amount to wei (6 decimals for USDC)
    const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e6))

    // Check backend wallet USDC balance
    const backendBalance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    })

    if (backendBalance < amountInWei) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient USDC balance. Backend wallet has ${Number(backendBalance) / 1e6} USDC, needs ${amount} USDC`,
        },
        { status: 400 }
      )
    }

    // Transfer USDC.e (ERC20) directly to Tanda contract (not ETH)
    // This calls the ERC20 transfer function on the USDC token contract
    const txHash = await walletClient.writeContract({
      address: USDC_ADDRESS, // USDC.e token contract address
      abi: ERC20_ABI,
      functionName: "transfer", // ERC20 transfer function
      args: [tandaAddress as `0x${string}`, amountInWei],
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

    // Check new vault balance
    const vaultBalance = await publicClient.readContract({
      address: tandaAddress as `0x${string}`,
      abi: TandaABI,
      functionName: "getVaultBalance",
    }) as bigint

    return NextResponse.json({
      success: true,
      transactionHash: txHash,
      vaultBalance: vaultBalance.toString(),
      depositedAmount: amountInWei.toString(),
      message: `Successfully deposited ${amount} USDC.e to vault`,
    })
  } catch (error: any) {
    console.error("Error depositing funds:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to deposit funds",
      },
      { status: 500 }
    )
  }
}

