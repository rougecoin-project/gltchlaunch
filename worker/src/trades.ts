import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';

// File-based persistence
const DATA_DIR = process.env.DATA_DIR || './data';
const TRADES_FILE = join(DATA_DIR, 'trades.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Load existing trades from file
function loadTrades(): Trade[] {
  if (existsSync(TRADES_FILE)) {
    try {
      return JSON.parse(readFileSync(TRADES_FILE, 'utf-8'));
    } catch (e) {
      console.error('Failed to load trades:', e);
    }
  }
  return [];
}

// Save trades to file (only keep last 10000)
function saveTrades(trades: Trade[]) {
  const toSave = trades.slice(-10000);
  writeFileSync(TRADES_FILE, JSON.stringify(toSave, null, 2));
}

// Initialize store from file
const tradeStore: Trade[] = loadTrades();

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
  signature?: string; // Optional signature for verification
}

// Verify a trade signature
export function verifyTradeSignature(
  transactionHash: string,
  trader: string,
  signature: string
): boolean {
  try {
    const message = `Log trade ${transactionHash} to GltchLaunch`;
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === trader.toLowerCase();
  } catch (e) {
    return false;
  }
}

export function getTradeSignMessage(transactionHash: string): string {
  return `Log trade ${transactionHash} to GltchLaunch`;
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
    
    // Persist to file
    saveTrades(tradeStore);
    
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
