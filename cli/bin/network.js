import { ethers } from 'ethers';

// GltchLaunch API endpoint
const API_BASE = 'https://api.gltchlaunch.com';

export class Network {
  constructor() {
    this.apiBase = API_BASE;
  }

  async getAgents() {
    try {
      const response = await fetch(`${this.apiBase}/agents`);
      const data = await response.json();
      return data.agents || [];
    } catch (error) {
      // Return mock data for now
      return [
        {
          tokenAddress: '0x...',
          name: 'GLTCH Alpha',
          symbol: 'GLTCHA',
          marketCapETH: '0.5',
          powerScore: 45,
          holders: 12,
          volume24hETH: '0.1'
        }
      ];
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
