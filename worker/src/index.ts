import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { agents } from './agents';
import { trades } from './trades';
import { scoring } from './scoring';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/', (c) => c.json({ 
  name: 'GltchLaunch API',
  version: '0.1.0',
  status: 'ok'
}));

app.get('/health', (c) => c.json({ status: 'healthy' }));

// Agent routes
app.get('/agents', async (c) => {
  const allAgents = await agents.getAll();
  return c.json({
    success: true,
    count: allAgents.length,
    agents: allAgents
  });
});

app.get('/agents/:address', async (c) => {
  const address = c.req.param('address');
  const agent = await agents.getByToken(address);
  
  if (!agent) {
    return c.json({ success: false, error: 'Agent not found' }, 404);
  }
  
  return c.json({ success: true, ...agent });
});

app.post('/agents/register', async (c) => {
  try {
    const body = await c.req.json();
    const { tokenAddress, name, symbol, description, creator, chainId } = body;
    
    if (!tokenAddress || !name || !symbol) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }
    
    const agent = await agents.register({
      tokenAddress,
      name,
      symbol,
      description: description || '',
      creator,
      chainId: chainId || 8453
    });
    
    return c.json({ success: true, agent });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Price routes
app.get('/price', async (c) => {
  const token = c.req.query('token');
  const amount = c.req.query('amount');
  
  if (!token) {
    return c.json({ success: false, error: 'Token address required' }, 400);
  }
  
  const agent = await agents.getByToken(token);
  if (!agent) {
    return c.json({ success: false, error: 'Token not found' }, 404);
  }
  
  const priceInfo = await agents.getPrice(token, amount);
  return c.json({ success: true, ...priceInfo });
});

// Trade routes
app.post('/trades', async (c) => {
  try {
    const body = await c.req.json();
    const trade = await trades.record(body);
    return c.json({ success: true, trade });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get('/trades', async (c) => {
  const token = c.req.query('token');
  const limit = parseInt(c.req.query('limit') || '50');
  
  const allTrades = await trades.getRecent(token, limit);
  return c.json({
    success: true,
    count: allTrades.length,
    trades: allTrades
  });
});

// Leaderboard / Network stats
app.get('/stats', async (c) => {
  const allAgents = await agents.getAll();
  const allTrades = await trades.getRecent(undefined, 1000);
  
  const totalMcap = allAgents.reduce((sum, a) => sum + parseFloat(a.marketCapETH || '0'), 0);
  const totalVolume = allTrades.reduce((sum, t) => sum + parseFloat(t.amountIn || '0'), 0);
  const avgPower = allAgents.length > 0 
    ? allAgents.reduce((sum, a) => sum + (a.powerScore || 0), 0) / allAgents.length 
    : 0;
  
  return c.json({
    success: true,
    agentCount: allAgents.length,
    totalMcapETH: totalMcap.toFixed(4),
    volume24hETH: totalVolume.toFixed(4),
    avgPowerScore: Math.round(avgPower),
    tradeCount: allTrades.length
  });
});

// Power score recalculation
app.post('/scoring/refresh', async (c) => {
  await scoring.refreshAll();
  return c.json({ success: true, message: 'Power scores refreshed' });
});

// Start server
const port = parseInt(process.env.PORT || '3001');

console.log(`
   ██████╗ ██╗  ████████╗ ██████╗██╗  ██╗
  ██╔════╝ ██║  ╚══██╔══╝██╔════╝██║  ██║
  ██║  ███╗██║     ██║   ██║     ███████║
  ██║   ██║██║     ██║   ██║     ██╔══██║
  ╚██████╔╝███████╗██║   ╚██████╗██║  ██║
   ╚═════╝ ╚══════╝╚═╝    ╚═════╝╚═╝  ╚═╝
              A P I

GltchLaunch API running on http://localhost:${port}
`);

serve({ fetch: app.fetch, port });
