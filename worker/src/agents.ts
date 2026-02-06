import { ethers } from 'ethers';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// File-based persistence
const DATA_DIR = process.env.DATA_DIR || './data';
const AGENTS_FILE = join(DATA_DIR, 'agents.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Load existing agents from file
function loadAgents(): Map<string, Agent> {
  if (existsSync(AGENTS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(AGENTS_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    } catch (e) {
      console.error('Failed to load agents:', e);
    }
  }
  return new Map();
}

// Save agents to file
function saveAgents(store: Map<string, Agent>) {
  const data = Object.fromEntries(store);
  writeFileSync(AGENTS_FILE, JSON.stringify(data, null, 2));
}

// Initialize store from file
const agentStore: Map<string, Agent> = loadAgents();

export interface Agent {
  tokenAddress: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  chainId: number;
  registeredAt: string;
  imageIpfs?: string;
  imageUrl?: string;
  
  // Metrics (updated by scoring)
  marketCapETH: string;
  volume24hETH: string;
  holders: number;
  powerScore: number;
  priceChange24h: number;
  
  // Cross-holdings
  crossHoldings: number;
  crossTradeCount: number;
}

// Signature verification for permissionless auth
export function verifySignature(
  tokenAddress: string,
  timestamp: number,
  signature: string,
  expectedSigner: string
): boolean {
  try {
    // Message format that must be signed
    const message = `Register ${tokenAddress.toLowerCase()} to GltchLaunch at ${timestamp}`;
    
    // Recover the signer address
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    // Check if recovered address matches expected signer (case-insensitive)
    const isValid = recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
    
    // Also check timestamp is within 5 minutes
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const isRecent = Math.abs(now - timestamp) < fiveMinutes;
    
    return isValid && isRecent;
  } catch (e) {
    console.error('Signature verification failed:', e);
    return false;
  }
}

// Generate the message that needs to be signed
export function getSignMessage(tokenAddress: string, timestamp: number): string {
  return `Register ${tokenAddress.toLowerCase()} to GltchLaunch at ${timestamp}`;
}

export const agents = {
  async getAll(): Promise<Agent[]> {
    const all = Array.from(agentStore.values());
    // Sort by power score descending
    return all.sort((a, b) => (b.powerScore || 0) - (a.powerScore || 0));
  },

  async getByToken(tokenAddress: string): Promise<Agent | null> {
    const normalized = tokenAddress.toLowerCase();
    for (const [key, agent] of agentStore) {
      if (key.toLowerCase() === normalized) {
        return agent;
      }
    }
    return null;
  },

  async register(data: {
    tokenAddress: string;
    name: string;
    symbol: string;
    description: string;
    creator: string;
    chainId: number;
    imageIpfs?: string;
    imageUrl?: string;
  }): Promise<Agent> {
    const agent: Agent = {
      ...data,
      registeredAt: new Date().toISOString(),
      marketCapETH: '0',
      volume24hETH: '0',
      holders: 1,
      powerScore: 0,
      priceChange24h: 0,
      crossHoldings: 0,
      crossTradeCount: 0
    };
    
    agentStore.set(data.tokenAddress, agent);
    saveAgents(agentStore); // Persist to file
    return agent;
  },

  async update(tokenAddress: string, updates: Partial<Agent>): Promise<Agent | null> {
    const agent = await this.getByToken(tokenAddress);
    if (!agent) return null;
    
    const updated = { ...agent, ...updates };
    agentStore.set(tokenAddress, updated);
    saveAgents(agentStore); // Persist to file
    return updated;
  },

  async getPrice(tokenAddress: string, amount?: string): Promise<{
    tokenAddress: string;
    name: string;
    symbol: string;
    marketCapETH: string;
    priceChange24h: number;
    holders: number;
    volume24hETH: string;
    estimate?: { percentOfMcap: number };
  }> {
    const agent = await this.getByToken(tokenAddress);
    
    if (!agent) {
      return {
        tokenAddress,
        name: 'Unknown',
        symbol: '???',
        marketCapETH: '0',
        priceChange24h: 0,
        holders: 0,
        volume24hETH: '0'
      };
    }
    
    const result: any = {
      tokenAddress: agent.tokenAddress,
      name: agent.name,
      symbol: agent.symbol,
      marketCapETH: agent.marketCapETH,
      priceChange24h: agent.priceChange24h,
      holders: agent.holders,
      volume24hETH: agent.volume24hETH
    };
    
    if (amount) {
      const mcap = parseFloat(agent.marketCapETH) || 1;
      const amountNum = parseFloat(amount);
      result.estimate = {
        percentOfMcap: (amountNum / mcap) * 100
      };
    }
    
    return result;
  },

  async count(): Promise<number> {
    return agentStore.size;
  }
};
