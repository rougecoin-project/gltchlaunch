/**
 * Flaunch SDK Integration
 * Provides V4 swap functionality for Flaunch tokens
 */

import { createFlaunch, createFlaunchCalldata, parseCall } from '@flaunch/sdk';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Get Flaunch SDK instance for read operations
 */
export function createFlaunchReadClient(testnet = false) {
  const chain = testnet ? baseSepolia : base;
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });
  
  return createFlaunch({ publicClient });
}

/**
 * Check if a token is a Flaunch token
 */
export async function isFlaunchToken(tokenAddress, testnet = false) {
  try {
    const flaunch = createFlaunchReadClient(testnet);
    return await flaunch.isValidCoin(tokenAddress);
  } catch (error) {
    return false;
  }
}

/**
 * Get a buy quote for a Flaunch token
 */
export async function getFlaunchBuyQuote(tokenAddress, amountInEth, testnet = false) {
  const flaunch = createFlaunchReadClient(testnet);
  
  try {
    const amountIn = parseEther(amountInEth.toString());
    const amountOut = await flaunch.getBuyQuoteExactInput({
      coinAddress: tokenAddress,
      amountIn
    });
    
    return {
      amountOut,
      amountOutFormatted: formatEther(amountOut),
      dex: 'uniswapV4'
    };
  } catch (error) {
    console.error('Flaunch quote error:', error.message);
    return {
      amountOut: 0n,
      amountOutFormatted: '0',
      dex: 'uniswapV4',
      error: error.message
    };
  }
}

/**
 * Get a sell quote for a Flaunch token
 */
export async function getFlaunchSellQuote(tokenAddress, amountInTokens, testnet = false) {
  const flaunch = createFlaunchReadClient(testnet);
  
  try {
    const amountIn = parseEther(amountInTokens.toString());
    const amountOut = await flaunch.getSellQuoteExactInput({
      coinAddress: tokenAddress,
      amountIn
    });
    
    return {
      amountOut,
      amountOutFormatted: formatEther(amountOut),
      dex: 'uniswapV4'
    };
  } catch (error) {
    console.error('Flaunch quote error:', error.message);
    return {
      amountOut: 0n,
      amountOutFormatted: '0',
      dex: 'uniswapV4',
      error: error.message
    };
  }
}

/**
 * Get coin metadata from Flaunch
 */
export async function getFlaunchCoinMetadata(tokenAddress, testnet = false) {
  const flaunch = createFlaunchReadClient(testnet);
  
  try {
    return await flaunch.getCoinMetadata(tokenAddress);
  } catch (error) {
    return null;
  }
}

/**
 * Get coin price in ETH
 */
export async function getFlaunchCoinPrice(tokenAddress, testnet = false) {
  const flaunch = createFlaunchReadClient(testnet);
  
  try {
    return await flaunch.coinPriceInETH(tokenAddress);
  } catch (error) {
    return null;
  }
}

/**
 * Get coin market cap in USD
 */
export async function getFlaunchMarketCap(tokenAddress, testnet = false) {
  const flaunch = createFlaunchReadClient(testnet);
  
  try {
    return await flaunch.coinMarketCapInUSD({ coinAddress: tokenAddress });
  } catch (error) {
    return null;
  }
}

/**
 * Create a write client for executing swaps
 */
export function createFlaunchWriteClient(privateKey, testnet = false) {
  const chain = testnet ? baseSepolia : base;
  
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });
  
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });
  
  return createFlaunch({ publicClient, walletClient });
}

/**
 * Execute a buy on Flaunch (Uniswap V4)
 */
export async function executeFlaunchBuy(privateKey, tokenAddress, amountInEth, slippage = 5, testnet = false) {
  const flaunch = createFlaunchWriteClient(privateKey, testnet);
  
  try {
    const amountIn = parseEther(amountInEth.toString());
    
    console.log(`Buying ${tokenAddress} with ${amountInEth} ETH via Flaunch...`);
    
    const hash = await flaunch.buyCoin({
      coinAddress: tokenAddress,
      slippagePercent: slippage,
      swapType: 'EXACT_IN',
      amountIn
    });
    
    console.log('Transaction submitted:', hash);
    
    // Wait for confirmation
    const receipt = await flaunch.drift.waitForTransaction({ hash });
    
    return {
      hash,
      status: receipt.status === 'success' ? 1 : 0,
      dex: 'uniswapV4',
      amountIn: amountInEth,
      tokenAddress
    };
  } catch (error) {
    console.error('Flaunch buy error:', error);
    throw error;
  }
}

/**
 * Execute a sell on Flaunch (Uniswap V4)
 * Note: Requires Permit2 signature for gasless approval
 */
export async function executeFlaunchSell(privateKey, tokenAddress, amountInTokens, slippage = 5, testnet = false) {
  const chain = testnet ? baseSepolia : base;
  const flaunch = createFlaunchWriteClient(privateKey, testnet);
  
  try {
    const amountIn = parseEther(amountInTokens.toString());
    
    console.log(`Selling ${amountInTokens} of ${tokenAddress} via Flaunch...`);
    
    // Check Permit2 allowance
    const { allowance } = await flaunch.getPermit2AllowanceAndNonce(tokenAddress);
    
    let permitSingle, signature;
    
    if (allowance < amountIn) {
      console.log('Signing Permit2...');
      const permitData = await flaunch.getPermit2TypedData(tokenAddress);
      permitSingle = permitData.permitSingle;
      
      // Sign the typed data
      const account = privateKeyToAccount(privateKey);
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(),
      });
      
      signature = await walletClient.signTypedData(permitData.typedData);
    }
    
    const hash = await flaunch.sellCoin({
      coinAddress: tokenAddress,
      amountIn,
      slippagePercent: slippage,
      ...(permitSingle && signature ? { permitSingle, signature } : {})
    });
    
    console.log('Transaction submitted:', hash);
    
    // Wait for confirmation
    const receipt = await flaunch.drift.waitForTransaction({ hash });
    
    return {
      hash,
      status: receipt.status === 'success' ? 1 : 0,
      dex: 'uniswapV4',
      amountIn: amountInTokens,
      tokenAddress
    };
  } catch (error) {
    console.error('Flaunch sell error:', error);
    throw error;
  }
}
