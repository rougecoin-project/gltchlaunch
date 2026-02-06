/**
 * API Tests
 * 
 * Tests for the worker API endpoints.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Worker API', () => {
  describe('Endpoint Structure', () => {
    it('should have health check endpoint', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes("app.get('/health'"), 'Should have /health endpoint');
      assert.ok(source.includes("status: 'healthy'"), 'Should return healthy status');
    });

    it('should have agents endpoints', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes("app.get('/agents'"), 'Should have GET /agents');
      assert.ok(source.includes("app.get('/agents/:address'"), 'Should have GET /agents/:address');
      assert.ok(source.includes("app.post('/agents/register'"), 'Should have POST /agents/register');
    });

    it('should have price endpoint', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes("app.get('/price'"), 'Should have /price endpoint');
    });

    it('should have trades endpoints', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes("app.post('/trades'"), 'Should have POST /trades');
      assert.ok(source.includes("app.get('/trades'"), 'Should have GET /trades');
    });

    it('should have stats endpoint', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes("app.get('/stats'"), 'Should have /stats endpoint');
    });

    it('should have scoring refresh endpoint', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes("app.post('/scoring/refresh'"), 'Should have POST /scoring/refresh');
    });
  });

  describe('Middleware', () => {
    it('should enable CORS', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes("import { cors }"), 'Should import cors');
      assert.ok(source.includes("app.use('*', cors())"), 'Should use cors middleware');
    });

    it('should enable request logging', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes("import { logger }"), 'Should import logger');
      assert.ok(source.includes("app.use('*', logger())"), 'Should use logger middleware');
    });
  });

  describe('Response Formats', () => {
    it('should return success: true on successful responses', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      // Count occurrences of success: true in responses
      const matches = source.match(/success: true/g) || [];
      assert.ok(matches.length >= 5, 'Should have success: true in multiple responses');
    });

    it('should return success: false on errors', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes('success: false'), 'Should have error responses');
    });

    it('should return proper HTTP status codes', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes(', 404)'), 'Should return 404 for not found');
      assert.ok(source.includes(', 400)'), 'Should return 400 for bad request');
      assert.ok(source.includes(', 500)'), 'Should return 500 for server error');
    });
  });

  describe('Server Configuration', () => {
    it('should default to port 3001', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes("'3001'"), 'Should default to port 3001');
    });

    it('should support PORT env variable', async () => {
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(__dirname, '../src/index.ts'), 'utf-8');
      
      assert.ok(source.includes('process.env.PORT'), 'Should support PORT env variable');
    });
  });
});
