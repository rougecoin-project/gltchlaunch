import { ethers } from 'ethers';

// GltchLaunch API endpoint - defaults to local dev, can override with env
const API_BASE = process.env.GLTCHLAUNCH_API || 'http://localhost:3001';

export class Network {
  constructor() {
    this.apiBase = API_BASE;
  }

  async getAgents() {
    try {
      const response = await fetch(`${this.apiBase}/agents`, {
        signal: AbortSignal.timeout(5000)
      });
      const data = await response.json();
      return data.agents || [];
    } catch (error) {
      // Fallback: return empty or mock if API not available
      console.log('Note: API not available, using offline mode');
      return [];
    }
  }

  async getTokenPrice(tokenAddress, amount = null) {
    try {
      const url = amount 
        ? `${this.apiBase}/price?token=${tokenAddress}&amount=${amount}`
        : `${this.apiBase}/price?token=${tokenAddress}`;
      
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      return {
        tokenAddress,
        name: 'Unknown',
        symbol: '???',
        marketCapETH: '0',
        priceChange24h: 0,
        holders: 0,
        error: error.message
      };
    }
  }

  async getAgentByToken(tokenAddress) {
    const agents = await this.getAgents();
    return agents.find(a => a.tokenAddress.toLowerCase() === tokenAddress.toLowerCase());
  }

  async searchAgents(query) {
    const agents = await this.getAgents();
    const q = query.toLowerCase();
    return agents.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.symbol.toLowerCase().includes(q)
    );
  }
}
