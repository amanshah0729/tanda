import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const TANDAS_FILE = path.join(DATA_DIR, 'tandas.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

export interface TandaData {
  name: string
  tandaAddress: string
  transactionHash: string
  blockNumber: string
  participants: string[]
  paymentAmount: string
  paymentFrequency: string
  createdAt: string
  isPublic: boolean
  creditRequirement: string
  averageCredit?: string // Average credit score of all participants
}

// Structure for tandas.json: { "tandaAddress": { tanda data without tandaAddress } }
interface TandasData {
  [tandaAddress: string]: Omit<TandaData, 'tandaAddress'>
}

// Structure for users.json: { "users": [{ userAddress: string, tandas: string[] }] }
interface UsersData {
  users: Array<{
    userAddress: string
    tandas: string[]
  }>
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Read tandas.json
async function getTandasData(): Promise<TandasData> {
  try {
    await ensureDataDir()
    const fileContent = await fs.readFile(TANDAS_FILE, 'utf-8')
    const trimmedContent = fileContent.trim()
    if (!trimmedContent) {
      return {}
    }
    const parsed = JSON.parse(trimmedContent)
    return parsed || {}
  } catch (error: any) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      if (error instanceof SyntaxError) {
        await fs.writeFile(TANDAS_FILE, '{}', 'utf-8')
      }
      return {}
    }
    throw error
  }
}

// Read users.json
async function getUsersData(): Promise<UsersData> {
  try {
    await ensureDataDir()
    const fileContent = await fs.readFile(USERS_FILE, 'utf-8')
    const trimmedContent = fileContent.trim()
    if (!trimmedContent) {
      // Write proper structure if file is empty
      await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2), 'utf-8')
      return { users: [] }
    }
    const parsed = JSON.parse(trimmedContent)
    // Ensure the parsed object has a 'users' array
    if (!parsed || !parsed.users || !Array.isArray(parsed.users)) {
      // Fix the file if it has wrong structure
      await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2), 'utf-8')
      return { users: [] }
    }
    return parsed
  } catch (error: any) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      if (error instanceof SyntaxError) {
        await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2), 'utf-8')
      }
      return { users: [] }
    }
    throw error
  }
}

// Get all tandas as TandaData[] (with tandaAddress included)
export async function getAllTandas(): Promise<TandaData[]> {
  const tandasData = await getTandasData()
  const allTandas: TandaData[] = []
  
  for (const tandaAddress in tandasData) {
    allTandas.push({
      ...tandasData[tandaAddress],
      tandaAddress,
    })
  }
  
  return allTandas
}

// Get tandas for a specific user
export async function getTandasByUserAddress(userAddress: string): Promise<TandaData[]> {
  const usersData = await getUsersData()
  const tandasData = await getTandasData()
  const userAddressLower = userAddress.toLowerCase()
  
  // Find user
  const user = usersData.users.find(
    u => u.userAddress.toLowerCase() === userAddressLower
  )
  
  if (!user) {
    return []
  }
  
  // Get tanda data for each tanda address
  const tandas: TandaData[] = []
  for (const tandaAddress of user.tandas) {
    const tandaData = tandasData[tandaAddress.toLowerCase()]
    if (tandaData) {
      tandas.push({
        ...tandaData,
        tandaAddress,
      })
    }
  }
  
  return tandas
}

// Add a new Tanda - saves to tandas.json and updates users.json
export async function addTanda(tanda: TandaData, creatorAddress: string): Promise<void> {
  await ensureDataDir()
  const tandasData = await getTandasData()
  const usersData = await getUsersData()
  
  const tandaAddressLower = tanda.tandaAddress.toLowerCase()
  
  // Save tanda data to tandas.json (without tandaAddress field)
  const { tandaAddress, ...tandaDataWithoutAddress } = tanda
  tandasData[tandaAddressLower] = tandaDataWithoutAddress
  await fs.writeFile(TANDAS_FILE, JSON.stringify(tandasData, null, 2), 'utf-8')
  
  // Update users.json - add tanda address to creator
  const creatorLower = creatorAddress.toLowerCase()
  let creatorUser = usersData.users.find(
    u => u.userAddress.toLowerCase() === creatorLower
  )
  
  if (!creatorUser) {
    // Create new user entry for creator
    creatorUser = {
      userAddress: creatorAddress,
      tandas: [],
    }
    usersData.users.push(creatorUser)
  }
  
  // Add tanda address to creator's tandas if not already present
  if (!creatorUser.tandas.some(addr => addr.toLowerCase() === tandaAddressLower)) {
    creatorUser.tandas.push(tanda.tandaAddress)
  }
  
  // For each participant, ensure they exist in users.json and add tanda to their list
  for (const participant of tanda.participants) {
    const participantLower = participant.toLowerCase()
    let participantUser = usersData.users.find(
      u => u.userAddress.toLowerCase() === participantLower
    )
    
    if (!participantUser) {
      // Create new user entry for participant
      participantUser = {
        userAddress: participant,
        tandas: [],
      }
      usersData.users.push(participantUser)
    }
    
    // Add tanda address to participant's tandas if not already present
    if (!participantUser.tandas.some(addr => addr.toLowerCase() === tandaAddressLower)) {
      participantUser.tandas.push(tanda.tandaAddress)
    }
  }
  
  await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf-8')
}

// Get a specific Tanda by address
export async function getTandaByAddress(address: string): Promise<TandaData | null> {
  const tandasData = await getTandasData()
  const tandaData = tandasData[address.toLowerCase()]
  
  if (!tandaData) {
    return null
  }
  
  return {
    ...tandaData,
    tandaAddress: address,
  }
}

// Get all public tandas
export async function getPublicTandas(): Promise<TandaData[]> {
  const tandasData = await getTandasData()
  const publicTandas: TandaData[] = []
  
  for (const tandaAddress in tandasData) {
    const tandaData = tandasData[tandaAddress]
    if (tandaData.isPublic !== false) {
      publicTandas.push({
        ...tandaData,
        tandaAddress,
      })
    }
  }
  
  return publicTandas
}

// Add a participant to a tanda - updates the tanda and adds it to the new participant's list
export async function addParticipantToTanda(tandaAddress: string, participantAddress: string): Promise<void> {
  await ensureDataDir()
  const tandasData = await getTandasData()
  const usersData = await getUsersData()
  
  const tandaAddressLower = tandaAddress.toLowerCase()
  const tandaData = tandasData[tandaAddressLower]
  
  if (!tandaData) {
    throw new Error("Tanda not found")
  }
  
  const participantLower = participantAddress.toLowerCase()
  
  // Check if participant already exists in the tanda
  const isAlreadyParticipant = tandaData.participants.some(
    addr => addr.toLowerCase() === participantLower
  )
  
  if (isAlreadyParticipant) {
    return // Already a participant, nothing to do
  }
  
  // Add participant to the tanda's participants list
  tandaData.participants.push(participantAddress)
  tandasData[tandaAddressLower] = tandaData
  await fs.writeFile(TANDAS_FILE, JSON.stringify(tandasData, null, 2), 'utf-8')
  
  // Update users.json - ensure participant exists and add tanda to their list
  let participantUser = usersData.users.find(
    u => u.userAddress.toLowerCase() === participantLower
  )
  
  if (!participantUser) {
    // Create new user entry for participant
    participantUser = {
      userAddress: participantAddress,
      tandas: [],
    }
    usersData.users.push(participantUser)
  }
  
  // Add tanda address to participant's tandas if not already present
  if (!participantUser.tandas.some(addr => addr.toLowerCase() === tandaAddressLower)) {
    participantUser.tandas.push(tandaAddress)
  }
  
  await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf-8')
}

// Update average credit score for a tanda
export async function updateTandaAverageCredit(tandaAddress: string, averageCredit: string): Promise<void> {
  await ensureDataDir()
  const tandasData = await getTandasData()
  const tandaAddressLower = tandaAddress.toLowerCase()
  
  if (!tandasData[tandaAddressLower]) {
    throw new Error("Tanda not found")
  }
  
  tandasData[tandaAddressLower].averageCredit = averageCredit
  await fs.writeFile(TANDAS_FILE, JSON.stringify(tandasData, null, 2), 'utf-8')
}
