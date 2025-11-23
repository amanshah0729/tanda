import { NextRequest, NextResponse } from "next/server"
import { createWalletClient, createPublicClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import TandaArtifact from "@/abi/Tanda.json"

const TandaABI = TandaArtifact.abi
const WORLD_CHAIN_ID = 480

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
    const { tandaAddress } = body

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

    // Check vault balance before claiming
    const vaultBalanceBefore = await publicClient.readContract({
      address: tandaAddress as `0x${string}`,
      abi: TandaABI,
      functionName: "getVaultBalance",
    }) as bigint

    if (vaultBalanceBefore === BigInt(0)) {
      return NextResponse.json(
        {
          success: false,
          error: "Vault is empty - nothing to claim",
        },
        { status: 400 }
      )
    }

    // Get current recipient to see who will receive the funds
    const currentRecipient = await publicClient.readContract({
      address: tandaAddress as `0x${string}`,
      abi: TandaABI,
      functionName: "getCurrentRecipient",
    }) as string

    // Call claim() function on Tanda contract
    // This will send all USDC.e from vault to current recipient and reset cycle
    const txHash = await walletClient.writeContract({
      address: tandaAddress as `0x${string}`,
      abi: TandaABI,
      functionName: "claim",
      args: [],
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

    // Check vault balance after claiming (should be 0)
    const vaultBalanceAfter = await publicClient.readContract({
      address: tandaAddress as `0x${string}`,
      abi: TandaABI,
      functionName: "getVaultBalance",
    }) as bigint

    return NextResponse.json({
      success: true,
      transactionHash: txHash,
      vaultBalanceBefore: vaultBalanceBefore.toString(),
      vaultBalanceAfter: vaultBalanceAfter.toString(),
      claimedAmount: vaultBalanceBefore.toString(),
      recipient: currentRecipient,
      message: `Successfully claimed ${Number(vaultBalanceBefore) / 1e6} USDC.e from vault`,
    })
  } catch (error: any) {
    console.error("Error claiming funds:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to claim funds",
      },
      { status: 500 }
    )
  }
}

