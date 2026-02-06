import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { agents, verifySignature, getSignMessage } from './agents';
import { trades, verifyTradeSignature, getTradeSignMessage } from './trades';
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
    const { tokenAddress, name, symbol, description, creator, chainId, signature, timestamp, imageIpfs, imageUrl } = body;
    
    if (!tokenAddress || !name || !symbol) {
      return c.json({ success: false, error: 'Missing required fields: tokenAddress, name, symbol' }, 400);
    }
    
    if (!creator) {
      return c.json({ success: false, error: 'Missing required field: creator' }, 400);
    }
    
    if (!signature || !timestamp) {
      return c.json({ success: false, error: 'Missing required fields: signature, timestamp. Sign the message to prove wallet ownership.' }, 400);
    }
    
    // Verify the signature
    const isValid = verifySignature(tokenAddress, timestamp, signature, creator);
    
    if (!isValid) {
      return c.json({ 
        success: false, 
        error: 'Invalid signature or expired timestamp. Sign this message: ' + getSignMessage(tokenAddress, timestamp)
      }, 401);
    }
    
    // Check if agent already exists
    const existing = await agents.getByToken(tokenAddress);
    if (existing) {
      return c.json({ success: false, error: 'Agent already registered' }, 409);
    }
    
    const agent = await agents.register({
      tokenAddress,
      name,
      symbol,
      description: description || '',
      creator,
      chainId: chainId || 8453,
      imageIpfs,
      imageUrl
    });
    
    console.log(`✓ Agent registered: ${name} (${symbol}) by ${creator}`);
    return c.json({ success: true, agent });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get the message format for signing (useful for clients)
app.get('/agents/sign-message', (c) => {
  const tokenAddress = c.req.query('tokenAddress');
  const timestamp = Date.now();
  
  if (!tokenAddress) {
    return c.json({ success: false, error: 'tokenAddress query param required' }, 400);
  }
  
  const message = getSignMessage(tokenAddress, timestamp);
  
  return c.json({
    success: true,
    message,
    timestamp,
    instructions: 'Sign this message with your wallet, then POST to /agents/register with the signature'
  });
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
    const { transactionHash, trader, signature, ...rest } = body;
    
    if (!transactionHash || !trader) {
      return c.json({ success: false, error: 'Missing required fields: transactionHash, trader' }, 400);
    }
    
    // Signature verification is optional but recommended
    // Without signature, trade is recorded but marked as unverified
    let verified = false;
    if (signature) {
      verified = verifyTradeSignature(transactionHash, trader, signature);
      if (!verified) {
        return c.json({ 
          success: false, 
          error: 'Invalid signature. Sign this message: ' + getTradeSignMessage(transactionHash)
        }, 401);
      }
    }
    
    const trade = await trades.record({
      transactionHash,
      trader,
      ...rest,
      signature: verified ? signature : undefined
    });
    
    console.log(`${verified ? '✓' : '○'} Trade logged: ${rest.side} ${rest.tokenAddress?.slice(0, 10)}... by ${trader.slice(0, 10)}...`);
    return c.json({ success: true, trade, verified });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get the message format for signing trades
app.get('/trades/sign-message', (c) => {
  const transactionHash = c.req.query('txHash');
  
  if (!transactionHash) {
    return c.json({ success: false, error: 'txHash query param required' }, 400);
  }
  
  return c.json({
    success: true,
    message: getTradeSignMessage(transactionHash),
    instructions: 'Sign this message to verify your trade ownership'
  });
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
