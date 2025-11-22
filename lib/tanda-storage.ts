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
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Read all Tandas from JSON file
export async function getAllTandas(): Promise<TandaData[]> {
  try {
    await ensureDataDir()
    const fileContent = await fs.readFile(TANDAS_FILE, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error: any) {
    // File doesn't exist yet, return empty array
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

// Add a new Tanda to the JSON file
export async function addTanda(tanda: TandaData): Promise<void> {
  await ensureDataDir()
  const tandas = await getAllTandas()
  tandas.push(tanda)
  await fs.writeFile(TANDAS_FILE, JSON.stringify(tandas, null, 2), 'utf-8')
}

// Get a specific Tanda by address
export async function getTandaByAddress(address: string): Promise<TandaData | null> {
  const tandas = await getAllTandas()
  return tandas.find(t => t.tandaAddress.toLowerCase() === address.toLowerCase()) || null
}

