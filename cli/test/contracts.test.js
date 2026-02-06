/**
 * Contracts Tests
 * 
 * Tests contract utilities, ABI definitions, and address constants.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ethers } from 'ethers';

describe('Contracts', () => {
  describe('Contract Addresses', () => {
    it('should have valid Base mainnet addresses', async () => {
      const { CONTRACTS } = await import('../bin/contracts.js');
      
      // Validate addresses are proper checksummed Ethereum addresses
      assert.ok(ethers.isAddress(CONTRACTS.SWAP_ROUTER), 'SWAP_ROUTER should be valid address');
      assert.ok(ethers.isAddress(CONTRACTS.QUOTER), 'QUOTER should be valid address');
      assert.ok(ethers.isAddress(CONTRACTS.FACTORY), 'FACTORY should be valid address');
      assert.ok(ethers.isAddress(CONTRACTS.WETH), 'WETH should be valid address');
    });

    it('should have valid Base Sepolia testnet addresses', async () => {
      const { CONTRACTS } = await import('../bin/contracts.js');
      
      assert.ok(ethers.isAddress(CONTRACTS.testnet.SWAP_ROUTER), 'Testnet SWAP_ROUTER should be valid');
      assert.ok(ethers.isAddress(CONTRACTS.testnet.QUOTER), 'Testnet QUOTER should be valid');
      assert.ok(ethers.isAddress(CONTRACTS.testnet.FACTORY), 'Testnet FACTORY should be valid');
      assert.ok(ethers.isAddress(CONTRACTS.testnet.WETH), 'Testnet WETH should be valid');
    });

    it('should use correct WETH address for Base', async () => {
      const { CONTRACTS } = await import('../bin/contracts.js');
      
      // Base uses the same WETH address on mainnet and testnet
      const expectedWETH = '0x4200000000000000000000000000000000000006';
      
      assert.strictEqual(CONTRACTS.WETH, expectedWETH, 'Mainnet WETH should be correct');
      assert.strictEqual(CONTRACTS.testnet.WETH, expectedWETH, 'Testnet WETH should be correct');
    });
  });

  describe('ABI Definitions', () => {
    it('should have valid ERC20 ABI', async () => {
      const { ERC20_ABI } = await import('../bin/contracts.js');
      
      assert.ok(Array.isArray(ERC20_ABI), 'ERC20_ABI should be array');
      assert.ok(ERC20_ABI.length > 0, 'ERC20_ABI should not be empty');
      
      // Check for essential ERC20 functions
      const abiString = ERC20_ABI.join(' ');
      assert.ok(abiString.includes('balanceOf'), 'Should have balanceOf');
      assert.ok(abiString.includes('transfer'), 'Should have transfer');
      assert.ok(abiString.includes('approve'), 'Should have approve');
      assert.ok(abiString.includes('totalSupply'), 'Should have totalSupply');
    });

    it('should have valid SwapRouter ABI', async () => {
      const { SWAP_ROUTER_ABI } = await import('../bin/contracts.js');
      
      assert.ok(Array.isArray(SWAP_ROUTER_ABI), 'SWAP_ROUTER_ABI should be array');
      
      const abiString = SWAP_ROUTER_ABI.join(' ');
      assert.ok(abiString.includes('exactInputSingle'), 'Should have exactInputSingle');
    });
  });

  describe('Token Bytecode', () => {
    it('should have valid bytecode for token deployment', async () => {
      const { TOKEN_BYTECODE } = await import('../bin/contracts.js');
      
      assert.ok(TOKEN_BYTECODE, 'TOKEN_BYTECODE should exist');
      assert.ok(TOKEN_BYTECODE.startsWith('0x'), 'Bytecode should start with 0x');
      assert.ok(TOKEN_BYTECODE.length > 100, 'Bytecode should be substantial');
    });

    it('should be valid hex string', async () => {
      const { TOKEN_BYTECODE } = await import('../bin/contracts.js');
      
      const hexPart = TOKEN_BYTECODE.slice(2); // Remove 0x
      const isValidHex = /^[0-9a-fA-F]+$/.test(hexPart);
      
      assert.ok(isValidHex, 'Bytecode should be valid hex');
    });
  });

  describe('Token Deployment', () => {
    it('should create valid ContractFactory with bytecode', async () => {
      const { TOKEN_ABI, TOKEN_BYTECODE } = await import('../bin/contracts.js');
      
      // This just tests that the factory can be created, not actual deployment
      const factory = new ethers.ContractFactory(TOKEN_ABI, TOKEN_BYTECODE);
      
      assert.ok(factory, 'Factory should be created');
      assert.ok(factory.bytecode, 'Factory should have bytecode');
    });
  });

  describe('getTokenInfo', () => {
    it('should export getTokenInfo function', async () => {
      const { getTokenInfo } = await import('../bin/contracts.js');
      
      assert.ok(typeof getTokenInfo === 'function', 'getTokenInfo should be a function');
    });
  });

  describe('executeSwap', () => {
    it('should export executeSwap function', async () => {
      const { executeSwap } = await import('../bin/contracts.js');
      
      assert.ok(typeof executeSwap === 'function', 'executeSwap should be a function');
    });
  });

  describe('getQuote', () => {
    it('should export getQuote function', async () => {
      const { getQuote } = await import('../bin/contracts.js');
      
      assert.ok(typeof getQuote === 'function', 'getQuote should be a function');
    });
  });

  describe('approveToken', () => {
    it('should export approveToken function', async () => {
      const { approveToken } = await import('../bin/contracts.js');
      
      assert.ok(typeof approveToken === 'function', 'approveToken should be a function');
    });
  });

  describe('Memo Encoding', () => {
    it('should export encodeMemo and decodeMemo functions', async () => {
      const { encodeMemo, decodeMemo, MEMO_MAGIC } = await import('../bin/contracts.js');
      
      assert.ok(typeof encodeMemo === 'function', 'encodeMemo should be a function');
      assert.ok(typeof decodeMemo === 'function', 'decodeMemo should be a function');
      assert.ok(MEMO_MAGIC, 'MEMO_MAGIC should be defined');
    });

    it('should encode and decode memos correctly', async () => {
      const { encodeMemo, decodeMemo } = await import('../bin/contracts.js');
      
      const memo = 'bullish on this project';
      const trader = '0x1234567890123456789012345678901234567890';
      const side = 'buy';
      const token = '0xabcdef1234567890123456789012345678901234';
      
      const encoded = encodeMemo(memo, trader, side, token);
      
      assert.ok(encoded, 'Should return encoded memo');
      assert.ok(encoded.startsWith('474c544348'), 'Should start with GLTCH magic bytes');
      
      // Decode it back
      const decoded = decodeMemo(encoded);
      
      assert.ok(decoded, 'Should decode successfully');
      assert.strictEqual(decoded.m, memo, 'Memo text should match');
      assert.strictEqual(decoded.t, trader, 'Trader should match');
      assert.strictEqual(decoded.s, side, 'Side should match');
      assert.strictEqual(decoded.a, token, 'Token should match');
      assert.ok(decoded.ts, 'Should have timestamp');
    });

    it('should return null for invalid memo data', async () => {
      const { decodeMemo } = await import('../bin/contracts.js');
      
      assert.strictEqual(decodeMemo(null), null, 'Null should return null');
      assert.strictEqual(decodeMemo(''), null, 'Empty string should return null');
      assert.strictEqual(decodeMemo('0x1234'), null, 'Short data should return null');
      assert.strictEqual(decodeMemo('0xdeadbeef'), null, 'Wrong magic should return null');
    });

    it('should return null when no memo provided', async () => {
      const { encodeMemo } = await import('../bin/contracts.js');
      
      const result = encodeMemo(null, '0x...', 'buy', '0x...');
      assert.strictEqual(result, null, 'Should return null for null memo');
    });
  });

  describe('Quoter ABI', () => {
    it('should have Quoter ABI defined', async () => {
      const { QUOTER_ABI } = await import('../bin/contracts.js');
      
      assert.ok(Array.isArray(QUOTER_ABI), 'QUOTER_ABI should be array');
      const abiString = QUOTER_ABI.join(' ');
      assert.ok(abiString.includes('quoteExactInputSingle'), 'Should have quoteExactInputSingle');
    });
  });
});
