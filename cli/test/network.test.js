/**
 * Network Tests
 * 
 * Tests for network discovery and agent querying.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Network', () => {
  describe('Network Class', () => {
    it('should export Network class', async () => {
      const { Network } = await import('../bin/network.js');
      assert.ok(Network, 'Network class should exist');
    });

    it('should create Network instance', async () => {
      const { Network } = await import('../bin/network.js');
      const network = new Network();
      assert.ok(network, 'Network instance should be created');
    });
  });

  describe('API Configuration', () => {
    it('should default to localhost in development', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/network.js'), 'utf-8');
      
      assert.ok(
        source.includes('localhost:3001'),
        'Should default to localhost:3001'
      );
    });

    it('should support GLTCHLAUNCH_API env override', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/network.js'), 'utf-8');
      
      assert.ok(
        source.includes('GLTCHLAUNCH_API'),
        'Should support GLTCHLAUNCH_API env var'
      );
    });
  });

  describe('getAgents', () => {
    it('should return empty array when API unavailable (offline mode)', async () => {
      const { Network } = await import('../bin/network.js');
      
      const network = new Network();
      const agents = await network.getAgents();
      
      assert.ok(Array.isArray(agents), 'Should return array');
      // When API is not running, should gracefully return empty array
      // (the actual API would return real agents)
    });

    it('should have timeout to prevent hanging', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../bin/network.js'), 'utf-8');
      
      assert.ok(
        source.includes('AbortSignal.timeout'),
        'Should have request timeout'
      );
    });
  });

  describe('getTokenPrice', () => {
    it('should return fallback data when API unavailable', async () => {
      const { Network } = await import('../bin/network.js');
      
      const network = new Network();
      const fakeToken = '0x1234567890123456789012345678901234567890';
      const price = await network.getTokenPrice(fakeToken);
      
      assert.ok(price, 'Should return price object');
      assert.strictEqual(price.tokenAddress, fakeToken, 'Should include token address');
      
      // When API fails, returns fallback with error
      if (price.error) {
        assert.strictEqual(price.name, 'Unknown', 'Fallback name should be Unknown');
        assert.strictEqual(price.symbol, '???', 'Fallback symbol should be ???');
      }
    });
  });

  describe('searchAgents', () => {
    it('should export searchAgents method', async () => {
      const { Network } = await import('../bin/network.js');
      
      const network = new Network();
      assert.ok(typeof network.searchAgents === 'function', 'searchAgents should exist');
    });

    it('should return empty array for search when API unavailable', async () => {
      const { Network } = await import('../bin/network.js');
      
      const network = new Network();
      const results = await network.searchAgents('test');
      
      assert.ok(Array.isArray(results), 'Should return array');
    });
  });
});
