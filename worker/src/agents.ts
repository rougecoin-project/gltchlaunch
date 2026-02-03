import { ethers } from 'ethers';

// In-memory store (replace with database in production)
const agentStore: Map<string, Agent> = new Map();

export interface Agent {
  tokenAddress: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  chainId: number;
  registeredAt: string;
  
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
    return agent;
  },

  async update(tokenAddress: string, updates: Partial<Agent>): Promise<Agent | null> {
    const agent = await this.getByToken(tokenAddress);
    if (!agent) return null;
    
    const updated = { ...agent, ...updates };
    agentStore.set(tokenAddress, updated);
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
