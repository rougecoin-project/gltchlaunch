/**
 * Flaunch Integration
 * 
 * Flaunch provides gasless token launches on Base.
 * https://flaunch.gg
 * https://docs.flaunch.gg/for-builders/references/api
 * 
 * The token launches are free - Flaunch takes fees from trading.
 */

import { ethers } from 'ethers';

// Flaunch Web2 API endpoint
const FLAUNCH_API = 'https://web2-api.flaunch.gg';

// Flaunch RESTful Data API (for querying token data)
// See: https://docs.flaunch.gg/for-builders/references/restful-data-api
const FLAUNCH_DATA_API = 'https://data.flaunch.gg';

/**
 * Submit a gasless token launch to Flaunch
 */
export async function submitLaunch({
  name,
  symbol,
  description,
  website,
  imageIpfs,
  creatorAddress,
  testnet = false,
  sniperProtection = true,
  marketCap,
  creatorFeeSplit
}) {
  const network = testnet ? 'base-sepolia' : 'base';
  const endpoint = `${FLAUNCH_API}/api/v1/${network}/launch-memecoin`;

  const body = {
    name,
    symbol: symbol.toUpperCase().slice(0, 8), // Max 8 chars
    description,
    creatorAddress,
    websiteUrl: website || '',
    sniperProtection, // Enable antibot protection (0.25% wallet cap during fair launch)
  };

  // If we have an IPFS hash, use it; otherwise Flaunch will use a default
  if (imageIpfs) {
    body.imageIpfs = imageIpfs;
  }

  // Optional: Custom market cap (default is $10k = 10000000000)
  if (marketCap) {
    body.marketCap = marketCap.toString();
  }

  // Optional: Creator fee split in basis points (default 8000 = 80%)
  if (creatorFeeSplit) {
    body.creatorFeeSplit = creatorFeeSplit.toString();
  }

  console.log('Submitting to Flaunch API...');
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Flaunch API error');
  }

  return {
    jobId: data.jobId,
    queuePosition: data.queueStatus?.position || 0,
    estimatedWait: data.queueStatus?.estimatedWaitSeconds || 60
  };
}

/**
 * Poll for launch completion
 */
export async function pollLaunchStatus(jobId, maxWaitMs = 180000) {
  const startTime = Date.now();
  const pollInterval = 3000; // 3 seconds between polls

  console.log(`Waiting for launch (job ${jobId})...`);

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`${FLAUNCH_API}/api/v1/launch-status/${jobId}`);
      const data = await response.json();

      if (!data.success && data.error === 'Job not found') {
        // Job might not be registered yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      if (data.state === 'completed') {
        const tokenAddress = data.collectionToken?.address;
        return {
          success: true,
          tokenAddress,
          transactionHash: data.transactionHash,
          name: data.collectionToken?.name,
          symbol: data.collectionToken?.symbol,
          creator: data.collectionToken?.creator,
          explorer: `https://basescan.org/token/${tokenAddress}`,
          flaunchUrl: `https://flaunch.gg/base/coin/${tokenAddress}`
        };
      }

      if (data.state === 'failed') {
        throw new Error(data.error || 'Launch failed');
      }

      // Still waiting or active
      const status = data.state === 'active' ? 'Processing...' : `Queue position: ${data.queuePosition}`;
      process.stdout.write(`\r${status}     `);

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      if (error.message.includes('Launch failed')) throw error;
      // Network error, retry
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('Launch timed out after 3 minutes');
}

/**
 * Get token info from Flaunch data API
 */
export async function getTokenInfo(tokenAddress, testnet = false) {
  const network = testnet ? 'base-sepolia' : 'base';
  const response = await fetch(
    `${FLAUNCH_DATA_API}/token/${network}/${tokenAddress}`
  );

  if (!response.ok) {
    return null;
  }

  return await response.json();
}

/**
 * Get all tokens (network discovery)
 */
export async function getNetworkTokens(testnet = false, limit = 100) {
  const network = testnet ? 'base-sepolia' : 'base';
  const response = await fetch(
    `${FLAUNCH_DATA_API}/tokens/${network}?limit=${limit}&sort=power`
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.tokens || [];
}

/**
 * Upload image to IPFS (via Flaunch)
 * Returns the IPFS hash for use in launch
 */
export async function uploadImage(imagePath) {
  const fs = await import('fs');
  const path = await import('path');
  
  const imageBuffer = fs.default.readFileSync(imagePath);
  
  // Convert to base64 with data URI prefix
  const ext = path.default.extname(imagePath).toLowerCase().replace('.', '');
  const mimeType = ext === 'png' ? 'image/png' : 
                   ext === 'gif' ? 'image/gif' : 
                   ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

  const response = await fetch(`${FLAUNCH_API}/api/v1/upload-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ base64Image })
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Image upload failed');
  }

  return data.ipfsHash;
}

/**
 * Execute a swap via Flaunch/Uniswap
 */
export async function executeSwap({
  signer,
  tokenAddress,
  amount,
  side,
  memo,
  slippage = 5,
  testnet = false
}) {
  // Flaunch uses Uniswap V4 pools
  // The swap goes through their router which handles the fee distribution
  
  const router = testnet
    ? '0x...' // Base Sepolia Flaunch router
    : '0x2626664c2603336E57B271c5C0b26F421741e481'; // Base mainnet Uniswap router

  const WETH = '0x4200000000000000000000000000000000000006';
  
  const amountWei = ethers.parseEther(amount.toString());
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  // Encode memo in calldata if provided
  let extraData = '0x';
  if (memo) {
    const memoPayload = JSON.stringify({
      agent: await signer.getAddress(),
      action: side,
      token: tokenAddress,
      memo,
      ts: Date.now()
    });
    const memoHex = Buffer.from(memoPayload).toString('hex');
    extraData = '4d4c544c' + memoHex; // MLTL magic prefix
  }

  // Build swap transaction
  const swapParams = {
    tokenIn: side === 'buy' ? WETH : tokenAddress,
    tokenOut: side === 'buy' ? tokenAddress : WETH,
    fee: 3000,
    recipient: await signer.getAddress(),
    deadline,
    amountIn: amountWei,
    amountOutMinimum: 0, // TODO: Calculate with slippage
    sqrtPriceLimitX96: 0
  };

  // Execute swap
  // Note: Real implementation would use the Uniswap router contract
  const tx = await signer.sendTransaction({
    to: router,
    value: side === 'buy' ? amountWei : 0,
    data: '0x' // TODO: Encode actual swap calldata
  });

  const receipt = await tx.wait();

  return {
    transactionHash: receipt.hash,
    side,
    amountIn: amount,
    tokenAddress,
    memo,
    explorer: `https://basescan.org/tx/${receipt.hash}`
  };
}
