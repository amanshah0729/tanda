async function testDeposit() {
  const TANDA_ADDRESS = "0x043AC12bB9506639aD81456bceaa20226DEAA38b"

  const AMOUNT = "0.05" // USDC

  try {
    console.log(`Depositing ${AMOUNT} USDC to Tanda: ${TANDA_ADDRESS}`)
    
    const response = await fetch('http://localhost:3000/api/test-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tandaAddress: TANDA_ADDRESS,
        amount: AMOUNT,
      }),
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Deposit successful!')
      console.log('Transaction Hash:', result.transactionHash)
      console.log('Vault Balance:', result.vaultBalance)
      console.log('Deposited Amount:', result.depositedAmount)
      console.log('Message:', result.message)
    } else {
      console.error('❌ Deposit failed:', result.error)
      if (result.message) {
        console.error('Details:', result.message)
      }
    }
  } catch (error: any) {
    console.error('Error calling deposit API:', error.message)
  }
}

testDeposit()

