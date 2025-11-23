async function testClaim() {
  const TANDA_ADDRESS = "0x198CD5582C3855a8aaF831A4165f3AB3C11e5fE9"

  try {
    console.log(`Claiming funds from Tanda: ${TANDA_ADDRESS}`)
    
    const response = await fetch('http://localhost:3000/api/test-claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tandaAddress: TANDA_ADDRESS,
      }),
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Claim successful!')
      console.log('Transaction Hash:', result.transactionHash)
      console.log('Vault Balance Before:', result.vaultBalanceBefore)
      console.log('Vault Balance After:', result.vaultBalanceAfter)
      console.log('Claimed Amount:', result.claimedAmount)
      console.log('Recipient:', result.recipient)
      console.log('Message:', result.message)
    } else {
      console.error('❌ Claim failed:', result.error)
      if (result.message) {
        console.error('Details:', result.message)
      }
    }
  } catch (error: any) {
    console.error('Error calling claim API:', error.message)
  }
}

testClaim()

