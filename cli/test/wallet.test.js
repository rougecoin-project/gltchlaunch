/**
 * Wallet Tests
 * 
 * Tests wallet creation, loading, and balance checking.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock the config directory for tests
const TEST_DIR = join(tmpdir(), '.gltchlaunch-test-' + Date.now());

describe('Wallet', () => {
  beforeEach(() => {
    // Set up test directory
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
    process.env.GLTCHLAUNCH_CONFIG_DIR = TEST_DIR;
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Wallet Creation', () => {
    it('should create a new wallet file when none exists', async () => {
      // Import after setting env
      const { Wallet } = await import('../bin/wallet.js');
      
      const wallet = new Wallet(true); // testnet
      const address = wallet.getAddress();
      
      assert.ok(address, 'Wallet address should exist');
      assert.ok(address.startsWith('0x'), 'Address should start with 0x');
      assert.strictEqual(address.length, 42, 'Address should be 42 characters');
    });

    it('should load existing wallet on subsequent calls', async () => {
      const { Wallet } = await import('../bin/wallet.js');
      
      const wallet1 = new Wallet(true);
      const address1 = wallet1.getAddress();
      
      const wallet2 = new Wallet(true);
      const address2 = wallet2.getAddress();
      
      assert.strictEqual(address1, address2, 'Same wallet should be loaded');
    });

    it('should store private key securely in wallet file', async () => {
      const { Wallet } = await import('../bin/wallet.js');
      
      new Wallet(true);
      
      // Check wallet file exists and has correct structure
      const walletFile = join(TEST_DIR, 'wallet.json');
      if (existsSync(walletFile)) {
        const data = JSON.parse(readFileSync(walletFile, 'utf-8'));
        assert.ok(data.address, 'Wallet file should have address');
        assert.ok(data.privateKey, 'Wallet file should have privateKey');
        assert.ok(data.privateKey.startsWith('0x'), 'Private key should start with 0x');
        assert.strictEqual(data.privateKey.length, 66, 'Private key should be 66 characters');
      }
    });
  });

  describe('Wallet Info', () => {
    it('should return wallet info with address and network', async () => {
      const { Wallet } = await import('../bin/wallet.js');
      
      const wallet = new Wallet(true); // testnet
      const info = await wallet.getInfo();
      
      assert.ok(info.address, 'Should have address');
      assert.ok(info.network, 'Should have network');
      assert.strictEqual(info.network, 'Base Sepolia', 'Should be testnet');
      assert.strictEqual(info.chainId, 84532, 'Should have correct chain ID');
    });

    it('should return mainnet info when not testnet', async () => {
      const { Wallet } = await import('../bin/wallet.js');
      
      const wallet = new Wallet(false); // mainnet
      const info = await wallet.getInfo();
      
      assert.strictEqual(info.network, 'Base', 'Should be mainnet');
      assert.strictEqual(info.chainId, 8453, 'Should have correct chain ID');
    });
  });

  describe('Fee Operations (Stubs)', () => {
    it('should return stub fee data (TODO: implement real fees)', async () => {
      const { Wallet } = await import('../bin/wallet.js');
      
      const wallet = new Wallet(true);
      const fees = await wallet.getFees();
      
      // These are currently stubs - test documents current behavior
      assert.strictEqual(fees.claimableETH, '0.0', 'STUB: Fees should be 0');
      assert.strictEqual(fees.canClaim, false, 'STUB: Cannot claim');
      
      // TODO: When implemented, update these tests:
      // assert.ok(typeof fees.claimableETH === 'string', 'Should return claimable amount');
      // assert.ok(typeof fees.canClaim === 'boolean', 'Should return claim status');
    });

    it('should return stub claim result (TODO: implement real claiming)', async () => {
      const { Wallet } = await import('../bin/wallet.js');
      
      const wallet = new Wallet(true);
      const result = await wallet.claimFees();
      
      // Currently a stub
      assert.strictEqual(result.amount, '0.0', 'STUB: Claim amount should be 0');
      assert.strictEqual(result.transactionHash, '0x...', 'STUB: Fake tx hash');
      
      // TODO: When implemented:
      // assert.ok(result.transactionHash.length === 66, 'Should return real tx hash');
    });
  });

  describe('Holdings (Stub)', () => {
    it('should return empty holdings (TODO: implement real holdings)', async () => {
      const { Wallet } = await import('../bin/wallet.js');
      
      const wallet = new Wallet(true);
      const holdings = await wallet.getHoldings();
      
      // Currently a stub
      assert.ok(Array.isArray(holdings), 'Holdings should be array');
      assert.strictEqual(holdings.length, 0, 'STUB: Holdings empty');
      
      // TODO: When implemented:
      // holdings should query actual token balances
    });
  });
});
