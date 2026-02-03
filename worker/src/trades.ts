// In-memory trade store (replace with database in production)
const tradeStore: Trade[] = [];

export interface Trade {
  id: string;
  transactionHash: string;
  tokenAddress: string;
  trader: string;
  side: 'buy' | 'sell';
  amountIn: string;
  memo?: string;
  network: string;
  blockNumber?: number;
  timestamp: string;
}

export const trades = {
  async record(data: Omit<Trade, 'id' | 'timestamp'>): Promise<Trade> {
    const trade: Trade = {
      ...data,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString()
    };
    
    tradeStore.push(trade);
    
    // Keep only last 10000 trades in memory
    if (tradeStore.length > 10000) {
      tradeStore.shift();
    }
    
    return trade;
  },

  async getRecent(tokenAddress?: string, limit: number = 50): Promise<Trade[]> {
    let filtered = tradeStore;
    
    if (tokenAddress) {
      const normalized = tokenAddress.toLowerCase();
      filtered = tradeStore.filter(t => 
        t.tokenAddress.toLowerCase() === normalized
      );
    }
    
    // Return most recent first
    return filtered
      .slice(-limit)
      .reverse();
  },

  async getByTrader(trader: string, limit: number = 50): Promise<Trade[]> {
    const normalized = trader.toLowerCase();
    return tradeStore
      .filter(t => t.trader.toLowerCase() === normalized)
      .slice(-limit)
      .reverse();
  },

  async getVolume24h(tokenAddress: string): Promise<number> {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const normalized = tokenAddress.toLowerCase();
    
    return tradeStore
      .filter(t => 
        t.tokenAddress.toLowerCase() === normalized &&
        new Date(t.timestamp).getTime() > dayAgo
      )
      .reduce((sum, t) => sum + parseFloat(t.amountIn || '0'), 0);
  },

  async count(): Promise<number> {
    return tradeStore.length;
  },

  async getMemosForToken(tokenAddress: string, limit: number = 20): Promise<{ trader: string; memo: string; side: string; timestamp: string }[]> {
    const normalized = tokenAddress.toLowerCase();
    return tradeStore
      .filter(t => 
        t.tokenAddress.toLowerCase() === normalized && 
        t.memo
      )
      .slice(-limit)
      .reverse()
      .map(t => ({
        trader: t.trader,
        memo: t.memo!,
        side: t.side,
        timestamp: t.timestamp
      }));
  }
};
