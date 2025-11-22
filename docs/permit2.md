With permit2
This example demonstrates how to send a transaction using Permit2. You must specify additional configuration options in the Developer Portal (under Configuration → Advanced) to enable a particular token.
Note that Permit2 requires a signature. Our backend automatically replaces the placeholder with the correct signature; you simply need to indicate this using PERMIT2_SIGNATURE_PLACEHOLDER_{index}. The index corresponds to the position of the Permit2 value within the permit2 array.

Copy

Ask AI
export type Permit2 = {
	permitted: {
		token: string
		amount: string | unknown
	}
	spender: string
	nonce: string | unknown
	deadline: string | unknown
}
Send Transaction (Permit2)
ABI
​
Sending the transaction & receiving the response
app/page.tsx

Copy

Ask AI
import Permit2 from '../../abi/Permit2.json'
import { MiniKit } from '@worldcoin/minikit-js'

const onClickUsePermit2 = async () => {
  // Permit2 is valid for max 1 hour
  const permitTransfer = {
    permitted: {
      token: "0x..." // The token I'm sending
      amount: (0.5 * 10 ** 18).toString(),
    },
    nonce: Date.now().toString(),
    deadline: Math.floor((Date.now() + 30 * 60 * 1000) / 1000).toString(),
  };

  const transferDetails = {
    to: address,
    requestedAmount: (0.5 * 10 ** 18).toString(),
  };

  try {
    const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: "0xF0882554ee924278806d708396F1a7975b732522",
          abi: Permit2,
          functionName: 'signatureTransfer',
          args: [
            [
              [
                permitTransfer.permitted.token,
                permitTransfer.permitted.amount,
              ],
              permitTransfer.nonce,
              permitTransfer.deadline,
            ],
            [transferDetails.to, transferDetails.requestedAmount],
            'PERMIT2_SIGNATURE_PLACEHOLDER_0', // Placeholders will automatically be replaced with the correct signature. 
          ],
        },
      ],
      permit2: [
        {
          ...permitTransfer,
          spender: myContractToken,
        }, // If you have more than one permit2 you can add more values here.
      ],
    });
  }
}
ABI:
[
    {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct ISignatureTransfer.TokenPermissions",
            "name": "permitted",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "nonce",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "deadline",
            "type": "uint256"
          }
        ],
        "internalType": "struct ISignatureTransfer.PermitTransferFrom",
        "name": "permitTransferFrom",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "requestedAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct ISignatureTransfer.SignatureTransferDetails",
        "name": "transferDetails",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "signatureTransfer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
]

​
Confirming the transaction
Once the transaction is sent you will receive back a transaction id. You can use this to check the status of the transaction and will also be able to get the transaction hash once the transaction is confirmed.
This requires installing the @worldcoin/minikit-react package.
app/page.tsx

Copy

Ask AI
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'

const [transactionId, setTransactionId] = useState<string>('')

const client = createPublicClient({
  chain: worldchain,
  transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
})

// You can use isSuccess to check if the transaction is mined
const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
  client: client,
  appConfig: {
    app_id: '<app_id>',
  },
  transactionId: transactionId,
})

const sendTransaction = async () => {
  const {commandPayload, finalPayload} = await MiniKit.commandsAsync.sendTransaction({
    // ...
  })

  if (payload.status === 'error') {
    console.error('Error sending transaction', payload)
  } else {
    setTransactionId(payload.transaction_id)
  }
}
​
Success Result on World App
If implemented correctly, the user will see the following drawer on World App.
​
Debugging
Sending transactions can be tricky. If you encounter a simulation_failed error, you will receive a debug_url that allows you to inspect the error in Tenderly. However, when using Permit2, the debug_url won’t be available until your Permit2 signature expires. Therefore, it’s recommended to set a shorter deadline during testing. For details on other types of errors
To get precise debug information, you can fetch debug URLs (Tenderly) using the Get Transaction Debug URL endpoint.
​
Alternative: Verifying the transaction
If you don’t want to use our hook you can choose to query for the hash yourself using this endpoint. Make sure to specify type=transaction in the query string.
Transactions are sent via our relayer currently and so we provide you an internal id rather than a hash in the original response above.
app/confirm-transaction/route.ts

Copy

Ask AI
import { NextRequest, NextResponse } from 'next/server'
import { MiniAppSendTransactionSuccessPayload } from '@worldcoin/minikit-js'

interface IRequestPayload {
	payload: MiniAppSendTransactionSuccessPayload
}

export async function POST(req: NextRequest) {
	const { payload } = (await req.json()) as IRequestPayload

	const response = await fetch(
		`https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${process.env.APP_ID}&type=transaction`,
		{
			method: 'GET',
		}
	)
	const transaction = await response.json()

	return NextResponse.json(transaction)
}
Example response from api call.

Copy

Ask AI
{
    "transactionId": "0xa5b02107433da9e2a450c433560be1db01963a9146c14eed076cbf2c61837d60",
    "transactionHash": "0xa8388148b630b49a3d5a739eaad9e98b5766235cdb21a5ec8d3f89053d982a71",
    "transactionStatus": "failed",
    "miniappId": "app_staging_5748c49d2e6c68849479e0b321bc5257",
    "updatedAt": "2024-09-09T15:18:25.320Z",
    "network": "worldchain",
    "fromWalletAddress": "0x2321401e6a175a7236498ab66f25cd1db4b17558",
    "toContractAddress": "0x2321401e6a175a7236498ab66f25cd1db4b17558"
}
​
Using ETH
This functionality is available from minikit-js 1.6.0 onwards.
Send transaction supports sending to payable functions. Make sure you have ETH in your wallet. For ease of use, we have a simple contract that lets you send ETH by forwarding the value. Forward.sol

Copy

Ask AI
// Sending eth via Forward.sol
const sendTransaction = async () => {
	const payload = await MiniKit.commandsAsync.sendTransaction({
		transaction: [
			{
				address: '0x087d5449a126e4e439495fcBc62A853eB3257936', // Forward.sol
				abi: ForwardABI,
				functionName: 'pay',
				args: ['0x377da9cab87c04a1d6f19d8b4be9aef8df26fcdd'], // To Whom
				value: '0x9184E72A000', // Send 0.00001 ETH hex encoded
			},
		],
	})
}
​
Why Approvals are not supported
Approvals are not supported in order to create a better user experience. Any user transfer of funds will only show one confirmation modal. This is to help cater towards users who are less familiar with the user patterns of crypto.