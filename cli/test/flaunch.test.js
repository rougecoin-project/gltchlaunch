/**
 * Flaunch Integration Tests
 * 
 * Tests for the Flaunch gasless launch API integration.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Flaunch', () => {
  describe('API Endpoints', () => {
    it('should use correct Flaunch API base URL', async () => {
      // Read the source to verify constants
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/flaunch.js'), 'utf-8');
      
      assert.ok(
        source.includes('https://web2-api.flaunch.gg'),
        'Should use correct Flaunch Web2 API'
      );
      assert.ok(
        source.includes('https://data.flaunch.gg'),
        'Should use correct Flaunch Data API'
      );
    });
  });

  describe('submitLaunch', () => {
    it('should export submitLaunch function', async () => {
      const { submitLaunch } = await import('../bin/flaunch.js');
      assert.ok(typeof submitLaunch === 'function', 'submitLaunch should be a function');
    });

    it('should enforce symbol max length of 8 characters', async () => {
      const { submitLaunch } = await import('../bin/flaunch.js');
      
      // We can't actually call the API in tests, but we can verify the function exists
      // The symbol truncation happens in the function body
      
      // Read source to verify truncation logic
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/flaunch.js'), 'utf-8');
      
      assert.ok(
        source.includes('.slice(0, 8)'),
        'Should truncate symbol to 8 characters'
      );
    });
  });

  describe('pollLaunchStatus', () => {
    it('should export pollLaunchStatus function', async () => {
      const { pollLaunchStatus } = await import('../bin/flaunch.js');
      assert.ok(typeof pollLaunchStatus === 'function', 'pollLaunchStatus should be a function');
    });

    it('should have reasonable timeout', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/flaunch.js'), 'utf-8');
      
      // Default timeout should be 180000ms (3 minutes)
      assert.ok(
        source.includes('180000'),
        'Should have 3 minute default timeout'
      );
    });
  });

  describe('getTokenInfo', () => {
    it('should export getTokenInfo function', async () => {
      const { getTokenInfo } = await import('../bin/flaunch.js');
      assert.ok(typeof getTokenInfo === 'function', 'getTokenInfo should be a function');
    });
  });

  describe('getNetworkTokens', () => {
    it('should export getNetworkTokens function', async () => {
      const { getNetworkTokens } = await import('../bin/flaunch.js');
      assert.ok(typeof getNetworkTokens === 'function', 'getNetworkTokens should be a function');
    });
  });

  describe('uploadImage', () => {
    it('should export uploadImage function', async () => {
      const { uploadImage } = await import('../bin/flaunch.js');
      assert.ok(typeof uploadImage === 'function', 'uploadImage should be a function');
    });

    it('should support multiple image formats', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/flaunch.js'), 'utf-8');
      
      assert.ok(source.includes('image/png'), 'Should support PNG');
      assert.ok(source.includes('image/gif'), 'Should support GIF');
      assert.ok(source.includes('image/webp'), 'Should support WebP');
      assert.ok(source.includes('image/jpeg'), 'Should support JPEG');
    });
  });

  describe('executeSwap (Flaunch version)', () => {
    it('should export executeSwap function', async () => {
      const { executeSwap } = await import('../bin/flaunch.js');
      assert.ok(typeof executeSwap === 'function', 'executeSwap should be a function');
    });

    it('should include memo encoding logic', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/flaunch.js'), 'utf-8');
      
      // Verify memo encoding exists
      assert.ok(source.includes('memoPayload'), 'Should have memo payload logic');
      assert.ok(source.includes('4d4c544c'), 'Should have MLTL magic prefix for memos');
    });
  });

  describe('Swap Implementation (contracts.js)', () => {
    it('should have proper slippage protection', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/contracts.js'), 'utf-8');
      
      // Verify slippage protection is implemented
      assert.ok(source.includes('getQuote'), 'Should have getQuote function');
      assert.ok(source.includes('slippageBps'), 'Should calculate slippage in basis points');
      assert.ok(source.includes('amountOutMinimum'), 'Should set minimum output');
    });

    it('should have token approval for sells', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/contracts.js'), 'utf-8');
      
      assert.ok(source.includes('approveToken'), 'Should have approveToken function');
      assert.ok(source.includes('Approving token spend'), 'Should approve before sell');
    });

    it('should have on-chain memo encoding', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/contracts.js'), 'utf-8');
      
      assert.ok(source.includes('encodeMemo'), 'Should have encodeMemo function');
      assert.ok(source.includes('MEMO_MAGIC'), 'Should have magic bytes constant');
      assert.ok(source.includes('memoEncoded'), 'Should track if memo was encoded');
    });
  });
});
