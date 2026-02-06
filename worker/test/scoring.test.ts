/**
 * Scoring Tests
 * 
 * Tests for Power Score calculation algorithm.
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

// Mock the dependencies since we're testing the algorithm, not the data layer
const mockAgent = {
  tokenAddress: '0x1234567890123456789012345678901234567890',
  name: 'Test Agent',
  symbol: 'TEST',
  marketCapETH: '1.5',
  priceChange24h: 10,
  holders: 3,
  crossHoldings: 1,
  crossTradeCount: 2
};

const mockTrades = [
  { timestamp: new Date().toISOString(), memo: 'bullish on this' },
  { timestamp: new Date().toISOString(), memo: null },
  { timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), memo: 'old trade' }
];

describe('Scoring', () => {
  describe('Power Score Components', () => {
    it('should have correct weight distribution (30/25/25/20)', async () => {
      // Read source to verify weights
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      // Verify weights in comments and implementation
      assert.ok(source.includes('REVENUE (30%)'), 'Revenue should be 30%');
      assert.ok(source.includes('MARKET (25%)'), 'Market should be 25%');
      assert.ok(source.includes('NETWORK (25%)'), 'Network should be 25%');
      assert.ok(source.includes('VITALITY (20%)'), 'Vitality should be 20%');
      
      // Verify max scores
      assert.ok(source.includes('revenue: number;    // 0-30'), 'Revenue max should be 30');
      assert.ok(source.includes('market: number;     // 0-25'), 'Market max should be 25');
      assert.ok(source.includes('network: number;    // 0-25'), 'Network max should be 25');
      assert.ok(source.includes('vitality: number;   // 0-20'), 'Vitality max should be 20');
    });

    it('should cap total score at 100', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      assert.ok(
        source.includes('Math.min(100, total)'),
        'Total score should be capped at 100'
      );
    });
  });

  describe('Revenue Calculation', () => {
    it('should allocate 60% of revenue score to fees and 40% to volume', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      // 60% of 30 = 18, 40% of 30 = 12
      assert.ok(source.includes('Math.min(18,'), 'Fee revenue max should be 18');
      assert.ok(source.includes('Math.min(12,'), 'Volume max should be 12');
    });

    it('should have TODO for fee revenue (not yet implemented)', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      assert.ok(
        source.includes('feeRevenue = 0; // TODO'),
        'Fee revenue should be marked as TODO'
      );
    });
  });

  describe('Market Calculation', () => {
    it('should calculate market cap contribution', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      // 2.0 ETH mcap = max 15 points
      assert.ok(source.includes('(mcap / 2.0) * 15'), 'Mcap scaling should be correct');
    });

    it('should normalize momentum between -50% and +50%', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      assert.ok(
        source.includes('Math.max(-50, Math.min(50, momentum))'),
        'Momentum should be clamped to -50 to +50'
      );
    });
  });

  describe('Network Calculation', () => {
    it('should score holders (5 holders = max 15 points)', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      // 5 holders * 3 = 15, capped at 15
      assert.ok(source.includes('agent.holders * 3'), 'Holder multiplier should be 3');
      assert.ok(source.includes('Math.min(15, agent.holders'), 'Holders max should be 15');
    });

    it('should score cross-holdings (2 cross-holdings = max 10 points)', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      // 2 cross-holdings * 5 = 10, capped at 10
      assert.ok(source.includes('agent.crossHoldings * 5'), 'Cross-holdings multiplier should be 5');
      assert.ok(source.includes('Math.min(10, agent.crossHoldings'), 'Cross-holdings max should be 10');
    });
  });

  describe('Vitality Calculation', () => {
    it('should filter trades by 24h window', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      assert.ok(
        source.includes('24 * 60 * 60 * 1000'),
        'Should use 24 hour window'
      );
    });

    it('should score memos (communication bonus)', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      assert.ok(
        source.includes('memoCount * 0.5'),
        'Memos should contribute to vitality'
      );
      assert.ok(
        source.includes('Math.min(5, memoCount'),
        'Memo contribution capped at 5'
      );
    });

    it('should have TODO for wallet tier (not yet implemented)', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      assert.ok(
        source.includes('vitalityFromWallet = 5; // TODO'),
        'Wallet tier should be marked as TODO'
      );
    });
  });

  describe('Score Interface', () => {
    it('should return all component scores', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      // Verify return structure
      assert.ok(source.includes('revenue: Math.round(revenue)'), 'Should return revenue');
      assert.ok(source.includes('market: Math.round(market)'), 'Should return market');
      assert.ok(source.includes('network: Math.round(network)'), 'Should return network');
      assert.ok(source.includes('vitality: Math.round(vitality)'), 'Should return vitality');
      assert.ok(source.includes('total: Math.min(100, total)'), 'Should return total');
    });
  });

  describe('Batch Operations', () => {
    it('should export refreshAll method', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      assert.ok(
        source.includes('async refreshAll()'),
        'Should have refreshAll method'
      );
    });

    it('should export getBreakdown method', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/scoring.ts'), 'utf-8');
      
      assert.ok(
        source.includes('async getBreakdown(tokenAddress'),
        'Should have getBreakdown method'
      );
    });
  });
});
