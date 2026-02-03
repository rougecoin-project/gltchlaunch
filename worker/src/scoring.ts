import { agents, Agent } from './agents';
import { trades } from './trades';

/**
 * Power Score Calculation
 * 
 * Computed from 4 pillars (0-100 total):
 * 
 * 1. REVENUE (30%): Fee revenue + trading volume
 * 2. MARKET (25%): Market cap + price momentum  
 * 3. NETWORK (25%): Holders + cross-holdings
 * 4. VITALITY (20%): Recent activity + wallet health
 */

interface ScoreComponents {
  revenue: number;    // 0-30
  market: number;     // 0-25
  network: number;    // 0-25
  vitality: number;   // 0-20
  total: number;      // 0-100
}

export const scoring = {
  /**
   * Calculate power score for a single agent
   */
  async calculate(agent: Agent): Promise<ScoreComponents> {
    // Get recent trades for this agent
    const recentTrades = await trades.getRecent(agent.tokenAddress, 100);
    const volume24h = await trades.getVolume24h(agent.tokenAddress);
    
    // === REVENUE (30 points max) ===
    // Claimable fees: 0-60% of 30 = 0-18 points
    // Volume: 0-40% of 30 = 0-12 points
    const feeRevenue = 0; // TODO: Get from contract
    const revenueFromFees = Math.min(18, (feeRevenue / 0.5) * 18);
    const revenueFromVolume = Math.min(12, (volume24h / 1.0) * 12);
    const revenue = revenueFromFees + revenueFromVolume;
    
    // === MARKET (25 points max) ===
    // Market cap: 0-60% of 25 = 0-15 points
    // Price momentum: 0-40% of 25 = 0-10 points
    const mcap = parseFloat(agent.marketCapETH) || 0;
    const marketFromMcap = Math.min(15, (mcap / 2.0) * 15);
    
    // Momentum: -50% to +50% maps to 0-10 points
    const momentum = agent.priceChange24h || 0;
    const normalizedMomentum = Math.max(-50, Math.min(50, momentum));
    const marketFromMomentum = ((normalizedMomentum + 50) / 100) * 10;
    const market = marketFromMcap + marketFromMomentum;
    
    // === NETWORK (25 points max) ===
    // Holders: 0-60% of 25 = 0-15 points (5 holders = max)
    // Cross-holdings: 0-40% of 25 = 0-10 points (2 cross-holdings = max)
    const networkFromHolders = Math.min(15, agent.holders * 3);
    const networkFromCross = Math.min(10, agent.crossHoldings * 5);
    const network = networkFromHolders + networkFromCross;
    
    // === VITALITY (20 points max) ===
    // Recent swaps: 0-30% of 20 = 0-6 points (5 swaps = max)
    // Wallet tier: 0-25% of 20 = 0-5 points
    // Cross-trade count: 0-20% of 20 = 0-4 points
    // Memo count: 0-25% of 20 = 0-5 points
    
    const recentSwapCount = recentTrades.filter(t => {
      const tradeTime = new Date(t.timestamp).getTime();
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return tradeTime > dayAgo;
    }).length;
    
    const memoCount = recentTrades.filter(t => t.memo).length;
    
    const vitalityFromSwaps = Math.min(6, recentSwapCount * 1.2);
    const vitalityFromWallet = 5; // TODO: Check wallet balance tier
    const vitalityFromCrossTrades = Math.min(4, agent.crossTradeCount * 1.4);
    const vitalityFromMemos = Math.min(5, memoCount * 0.5);
    const vitality = vitalityFromSwaps + vitalityFromWallet + vitalityFromCrossTrades + vitalityFromMemos;
    
    const total = Math.round(revenue + market + network + vitality);
    
    return {
      revenue: Math.round(revenue),
      market: Math.round(market),
      network: Math.round(network),
      vitality: Math.round(vitality),
      total: Math.min(100, total)
    };
  },

  /**
   * Refresh power scores for all agents
   */
  async refreshAll(): Promise<void> {
    const allAgents = await agents.getAll();
    
    for (const agent of allAgents) {
      const score = await this.calculate(agent);
      await agents.update(agent.tokenAddress, {
        powerScore: score.total
      });
    }
    
    console.log(`Refreshed power scores for ${allAgents.length} agents`);
  },

  /**
   * Get score breakdown for an agent
   */
  async getBreakdown(tokenAddress: string): Promise<ScoreComponents | null> {
    const agent = await agents.getByToken(tokenAddress);
    if (!agent) return null;
    
    return await this.calculate(agent);
  }
};
