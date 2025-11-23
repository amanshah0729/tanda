import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const TANDAS_FILE = path.join(DATA_DIR, 'tandas.json')

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
}

// Structure: { "userAddress": [TandaData[]] }
// Each user has access to all tandas where they are a participant
interface TandasByUser {
  [userAddress: string]: TandaData[]
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Read all Tandas organized by participant from JSON file
async function getTandasByUser(): Promise<TandasByUser> {
  try {
    await ensureDataDir()
    const fileContent = await fs.readFile(TANDAS_FILE, 'utf-8')
    
    // Handle empty file or whitespace-only content
    const trimmedContent = fileContent.trim()
    if (!trimmedContent) {
      return {}
    }
    
    const parsed = JSON.parse(trimmedContent)
    
    // Handle migration: if it's an array (old format), convert to new format
    if (Array.isArray(parsed)) {
      // Migrate old format - organize by all participants, not just creator
      const newFormat: TandasByUser = {}
      for (const tanda of parsed) {
        // Add tanda to each participant's list
        if (tanda.participants && Array.isArray(tanda.participants)) {
          for (const participant of tanda.participants) {
            const participantKey = participant.toLowerCase()
            if (!newFormat[participantKey]) {
              newFormat[participantKey] = []
            }
            // Check if tanda already exists for this participant (avoid duplicates)
            const exists = newFormat[participantKey].some(
              t => t.tandaAddress.toLowerCase() === tanda.tandaAddress.toLowerCase()
            )
            if (!exists) {
              newFormat[participantKey].push(tanda)
            }
          }
        }
      }
      // Save migrated format
      await fs.writeFile(TANDAS_FILE, JSON.stringify(newFormat, null, 2), 'utf-8')
      return newFormat
    }
    
    return parsed || {}
  } catch (error: any) {
    // File doesn't exist yet or is invalid, return empty object
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      // If file is invalid JSON, reset it to empty object
      if (error instanceof SyntaxError) {
        await fs.writeFile(TANDAS_FILE, '{}', 'utf-8')
      }
      return {}
    }
    throw error
  }
}

// Read all Tandas from all users (flattened)
export async function getAllTandas(): Promise<TandaData[]> {
  const tandasByUser = await getTandasByUser()
  // Flatten all tandas from all users
  const allTandas: TandaData[] = []
  for (const userAddress in tandasByUser) {
    allTandas.push(...tandasByUser[userAddress])
  }
  return allTandas
}

// Get tandas for a specific user
export async function getTandasByUserAddress(userAddress: string): Promise<TandaData[]> {
  const tandasByUser = await getTandasByUser()
  return tandasByUser[userAddress.toLowerCase()] || []
}

// Add a new Tanda to the JSON file - add it to ALL participants' lists
export async function addTanda(tanda: TandaData, creatorAddress: string): Promise<void> {
  await ensureDataDir()
  const tandasByUser = await getTandasByUser()
  
  // Add tanda to each participant's list
  if (tanda.participants && Array.isArray(tanda.participants)) {
    for (const participant of tanda.participants) {
      const participantKey = participant.toLowerCase()
      if (!tandasByUser[participantKey]) {
        tandasByUser[participantKey] = []
      }
      // Check if tanda already exists (avoid duplicates)
      const exists = tandasByUser[participantKey].some(
        t => t.tandaAddress.toLowerCase() === tanda.tandaAddress.toLowerCase()
      )
      if (!exists) {
        tandasByUser[participantKey].push(tanda)
      }
    }
  }
  
  await fs.writeFile(TANDAS_FILE, JSON.stringify(tandasByUser, null, 2), 'utf-8')
}

// Get a specific Tanda by address (searches across all users)
export async function getTandaByAddress(address: string): Promise<TandaData | null> {
  const tandasByUser = await getTandasByUser()
  
  // Search through all users
  for (const userAddress in tandasByUser) {
    const tanda = tandasByUser[userAddress].find(
      t => t.tandaAddress.toLowerCase() === address.toLowerCase()
    )
    if (tanda) {
      return tanda
    }
  }
  
  return null
}

// Get all public tandas (iterates through all users)
export async function getPublicTandas(): Promise<TandaData[]> {
  const tandasByUser = await getTandasByUser()
  const publicTandas: TandaData[] = []
  
  // Iterate through all users
  for (const userAddress in tandasByUser) {
    const userTandas = tandasByUser[userAddress]
    // Filter for public tandas
    const publicUserTandas = userTandas.filter(t => t.isPublic !== false)
    publicTandas.push(...publicUserTandas)
  }
  
  return publicTandas
}

// Add a participant to a tanda - updates the tanda and adds it to the new participant's list
export async function addParticipantToTanda(tandaAddress: string, participantAddress: string): Promise<void> {
  await ensureDataDir()
  const tandasByUser = await getTandasByUser()
  const participantKey = participantAddress.toLowerCase()
  
  // Find the tanda in any user's list (they all reference the same tanda)
  let foundTanda: TandaData | null = null
  let foundUserKey: string | null = null
  
  for (const userAddress in tandasByUser) {
    const tanda = tandasByUser[userAddress].find(
      t => t.tandaAddress.toLowerCase() === tandaAddress.toLowerCase()
    )
    if (tanda) {
      foundTanda = tanda
      foundUserKey = userAddress
      break
    }
  }
  
  if (!foundTanda) {
    throw new Error("Tanda not found")
  }
  
  // Check if participant already exists in the tanda
  const isAlreadyParticipant = foundTanda.participants.some(
    addr => addr.toLowerCase() === participantKey
  )
  
  if (isAlreadyParticipant) {
    return // Already a participant, nothing to do
  }
  
  // Add participant to the tanda's participants list
  foundTanda.participants.push(participantAddress)
  
  // Update the tanda in ALL users' lists who already have it
  for (const userAddress in tandasByUser) {
    const tandaIndex = tandasByUser[userAddress].findIndex(
      t => t.tandaAddress.toLowerCase() === tandaAddress.toLowerCase()
    )
    if (tandaIndex !== -1) {
      tandasByUser[userAddress][tandaIndex] = foundTanda
    }
  }
  
  // Add the tanda to the new participant's list
  if (!tandasByUser[participantKey]) {
    tandasByUser[participantKey] = []
  }
  
  // Check if tanda already exists in participant's list (shouldn't happen, but safety check)
  const existsInParticipantList = tandasByUser[participantKey].some(
    t => t.tandaAddress.toLowerCase() === tandaAddress.toLowerCase()
  )
  if (!existsInParticipantList) {
    tandasByUser[participantKey].push(foundTanda)
  }
  
  await fs.writeFile(TANDAS_FILE, JSON.stringify(tandasByUser, null, 2), 'utf-8')
}

