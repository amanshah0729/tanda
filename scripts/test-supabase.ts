import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })

import supabase from '../lib/supabase'

async function testSupabase() {
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
  
  const testAddress = '0x1234567890123456789012345678901234567890'
  const testTandas = ['tanda1', 'tanda2']

  const { data, error } = await supabase
    .from('users')
    .upsert({
      userAddress: testAddress,
      tandas: testTandas
    }, {
      onConflict: 'userAddress'
    })

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Success:', data)
  }
}

testSupabase()

