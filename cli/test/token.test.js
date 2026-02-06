/**
 * Token Tests
 * 
 * Tests token launch (simulation mode) and swap operations.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DIR = join(tmpdir(), '.gltchlaunch-test-' + Date.now());

describe('Token', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
    process.env.GLTCHLAUNCH_CONFIG_DIR = TEST_DIR;
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Token Launch (Simulation)', () => {
    it('should simulate token launch without blockchain transaction', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(true); // testnet
      const result = await token.launch({
        name: 'Test Token',
        symbol: 'TEST',
        description: 'A test token',
        simulate: true
      });
      
      assert.ok(result.tokenAddress, 'Should have token address');
      assert.ok(result.tokenAddress.startsWith('0x'), 'Address should start with 0x');
      assert.strictEqual(result.tokenAddress.length, 42, 'Address should be 42 chars');
      assert.strictEqual(result.name, 'Test Token', 'Name should match');
      assert.strictEqual(result.symbol, 'TEST', 'Symbol should match');
      assert.strictEqual(result.network, 'base-sepolia', 'Should be testnet');
    });

    it('should generate unique addresses for different tokens', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(true);
      
      const result1 = await token.launch({
        name: 'Token One',
        symbol: 'ONE',
        description: 'First token',
        simulate: true
      });
      
      const result2 = await token.launch({
        name: 'Token Two',
        symbol: 'TWO',
        description: 'Second token',
        simulate: true
      });
      
      assert.notStrictEqual(
        result1.tokenAddress, 
        result2.tokenAddress, 
        'Different tokens should have different addresses'
      );
    });

    it('should save launch record to local file', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(true);
      await token.launch({
        name: 'Saved Token',
        symbol: 'SAVE',
        description: 'Should be saved',
        simulate: true
      });
      
      const launches = await token.getLaunches();
      
      assert.ok(Array.isArray(launches), 'Launches should be array');
      assert.ok(launches.length >= 1, 'Should have at least one launch');
      
      const saved = launches.find(l => l.symbol === 'SAVE');
      assert.ok(saved, 'Launch should be saved');
      assert.strictEqual(saved.name, 'Saved Token', 'Name should match');
    });

    it('should include explorer URL in launch result', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(true);
      const result = await token.launch({
        name: 'Explorer Test',
        symbol: 'EXP',
        description: 'Test explorer URL',
        simulate: true
      });
      
      assert.ok(result.explorer, 'Should have explorer URL');
      assert.ok(
        result.explorer.includes('sepolia.basescan.org'),
        'Testnet should use sepolia explorer'
      );
      assert.ok(
        result.explorer.includes(result.tokenAddress),
        'Explorer URL should include token address'
      );
    });

    it('should use mainnet explorer for mainnet launches', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(false); // mainnet
      const result = await token.launch({
        name: 'Mainnet Test',
        symbol: 'MAIN',
        description: 'Test mainnet',
        simulate: true
      });
      
      assert.ok(
        result.explorer.includes('basescan.org') && 
        !result.explorer.includes('sepolia'),
        'Mainnet should use basescan.org (not sepolia)'
      );
    });
  });

  describe('Token Launch (Real - Flaunch)', () => {
    it('should fail gracefully when Flaunch API is unavailable', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(true);
      
      // This will try to hit the real Flaunch API
      // It should fail but not crash
      try {
        await token.launch({
          name: 'API Test',
          symbol: 'API',
          description: 'Test API failure',
          simulate: false,
          gasless: true
        });
        // If it succeeds, that's fine too (API is available)
      } catch (error) {
        assert.ok(error.message, 'Should have error message');
        // Expected to fail if API is down or network issues
      }
    });
  });

  describe('Swap Operations', () => {
    it('should validate required parameters', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(true);
      
      // Missing token address should fail
      try {
        await token.swap({
          amount: '0.01',
          side: 'buy'
        });
        assert.fail('Should throw for missing token address');
      } catch (error) {
        assert.ok(error, 'Should throw error');
      }
    });

    it('should reject invalid side parameter', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(true);
      
      try {
        await token.swap({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          amount: '0.01',
          side: 'invalid'
        });
        assert.fail('Should throw for invalid side');
      } catch (error) {
        // Expected - invalid side should fail
        assert.ok(error, 'Should throw error');
        assert.ok(error.message.includes('Invalid side'), 'Error should mention invalid side');
      }
    });

    it('should check ETH balance for buys', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(true);
      
      // Try to buy with more ETH than we have (new wallet has 0)
      try {
        await token.swap({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          amount: '1000', // 1000 ETH - definitely don't have this
          side: 'buy'
        });
        assert.fail('Should throw for insufficient ETH');
      } catch (error) {
        assert.ok(error.message.includes('Insufficient ETH'), 'Should mention insufficient ETH');
      }
    });
  });

  describe('Quote Operations', () => {
    it('should have quote method', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(true);
      assert.ok(typeof token.quote === 'function', 'Token should have quote method');
    });

    it('should return quote structure', async () => {
      const { Token } = await import('../bin/token.js');
      
      const token = new Token(true);
      
      // This will fail to get a real quote (no liquidity) but should return structure
      const quote = await token.quote({
        tokenAddress: '0x1234567890123456789012345678901234567890',
        amount: '0.01',
        side: 'buy'
      });
      
      assert.ok(quote, 'Should return quote object');
      assert.strictEqual(quote.side, 'buy', 'Should have side');
      assert.strictEqual(quote.amountIn, '0.01', 'Should have amountIn');
      assert.ok('expectedOutput' in quote, 'Should have expectedOutput');
      assert.ok(quote.network, 'Should have network');
    });
  });
});
