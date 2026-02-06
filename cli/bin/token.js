import { ethers } from 'ethers';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Wallet } from './wallet.js';
import { deployToken, getTokenInfo, getTokenBalance, CONTRACTS, executeSwap, getQuote, getBaseTokenAddress, isNativeETH, BASE_TOKENS, executeSwapAerodrome } from './contracts.js';
import { submitLaunch, pollLaunchStatus, uploadImage } from './flaunch.js';
import { 
  isFlaunchToken, 
  getFlaunchBuyQuote, 
  getFlaunchSellQuote, 
  executeFlaunchBuy, 
  executeFlaunchSell,
  getFlaunchCoinPrice
} from './flaunch-sdk.js';

// Support test override via environment variable
const CONFIG_DIR = process.env.GLTCHLAUNCH_CONFIG_DIR || join(homedir(), '.gltchlaunch');
const LAUNCHES_FILE = join(CONFIG_DIR, 'launches.json');

// GltchLaunch API
const API_BASE = process.env.GLTCHLAUNCH_API || 'https://api.gltchlaunch.com';

// Base network config
const BASE_CHAIN_ID = 8453;
const BASE_SEPOLIA_CHAIN_ID = 84532;

export class Token {
  constructor(testnet = false) {
    this.testnet = testnet;
    this.wallet = new Wallet(testnet);
  }

  _loadLaunches() {
    if (!existsSync(LAUNCHES_FILE)) {
      return [];
    }
    try {
      return JSON.parse(readFileSync(LAUNCHES_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }

  _saveLaunch(launch) {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const launches = this._loadLaunches();
    launches.push(launch);
    writeFileSync(LAUNCHES_FILE, JSON.stringify(launches, null, 2));
  }

  async launch({ name, symbol, description, image, website, testnet, simulate, gasless = true, sniperProtection = true }) {
    const address = this.wallet.getAddress();
    const useTestnet = testnet || this.testnet;

    let deployed;
    let imageIpfsHash = null; // Track IPFS hash for saving

    if (simulate) {
      // Simulate deployment without blockchain tx
      console.log('Simulating token deployment (no blockchain tx)...');
      const fakeAddress = ethers.getAddress(
        '0x' + ethers.keccak256(ethers.toUtf8Bytes(name + symbol + Date.now())).slice(2, 42)
      );
      deployed = {
        address: fakeAddress,
        name,
        symbol
      };
    } else if (gasless) {
      // Use Flaunch for gasless launch (recommended)
      console.log('Submitting gasless launch via Flaunch...');
      
      // Upload image if provided
      if (image) {
        try {
          console.log('Uploading image to IPFS...');
          imageIpfsHash = await uploadImage(image);
          console.log(`Image uploaded: ${imageIpfsHash}`);
        } catch (e) {
          console.log('Image upload failed, Flaunch will use default image');
        }
      }

      try {
        const job = await submitLaunch({
          name,
          symbol,
          description: description || `${name} - launched via GLTCH Launch`,
          website: website || '',
          imageIpfs: imageIpfsHash,
          creatorAddress: address,
          testnet: useTestnet,
          sniperProtection // Enable antibot (0.25% wallet cap during fair launch)
        });

        console.log(`Job queued (ID: ${job.jobId}), waiting for deployment...`);
        const result = await pollLaunchStatus(job.jobId);
        console.log(''); // New line after progress
        
        deployed = {
          address: result.tokenAddress,
          name: result.name || name,
          symbol: result.symbol || symbol,
          transactionHash: result.transactionHash,
          flaunchUrl: result.flaunchUrl
        };
      } catch (e) {
        throw new Error(`Flaunch launch failed: ${e.message}`);
      }
    }
    
    if (!simulate && !gasless && !deployed) {
      // Direct deployment (requires gas) - fallback
      const signer = this.wallet.getSigner();
      const balance = await signer.provider.getBalance(address);
      const minBalance = ethers.parseEther('0.001');
      
      if (balance < minBalance) {
        throw new Error(`Insufficient balance. Need at least 0.001 ETH for gas. Current: ${ethers.formatEther(balance)} ETH`);
      }

      console.log('Deploying token contract (direct)...');
      deployed = await deployToken(signer, name, symbol);
    }
    
    const launch = {
      tokenAddress: deployed.address,
      name,
      symbol,
      description: description || '',
      website: website || '',
      creator: address,
      network: useTestnet ? 'base-sepolia' : 'base',
      chainId: useTestnet ? BASE_SEPOLIA_CHAIN_ID : BASE_CHAIN_ID,
      transactionHash: deployed.deployTransaction?.hash || '',
      explorer: useTestnet 
        ? `https://sepolia.basescan.org/token/${deployed.address}`
        : `https://basescan.org/token/${deployed.address}`,
      launchedAt: new Date().toISOString(),
      // Save IPFS hash for image display
      imageIpfs: imageIpfsHash || null,
      imageUrl: imageIpfsHash ? `https://ipfs.io/ipfs/${imageIpfsHash}` : null
    };

    this._saveLaunch(launch);

    // Register with GltchLaunch API (with signature auth)
    try {
      const signer = this.wallet.getSigner();
      const timestamp = Date.now();
      const message = `Register ${deployed.address.toLowerCase()} to GltchLaunch at ${timestamp}`;
      
      // Sign the registration message
      const signature = await signer.signMessage(message);
      
      const response = await fetch(`${API_BASE}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: deployed.address,
          name,
          symbol,
          description,
          creator: address,
          chainId: launch.chainId,
          signature,
          timestamp,
          imageIpfs: imageIpfsHash || null,
          imageUrl: imageIpfsHash ? `https://ipfs.io/ipfs/${imageIpfsHash}` : null
        })
      });
      
      if (response.ok) {
        console.log('✓ Registered with GltchLaunch network');
      } else {
        const data = await response.json();
        console.log(`Note: API registration: ${data.error || 'failed'}`);
      }
    } catch (error) {
      // API registration is optional - network might not be up yet
      console.log('Note: Could not register with GltchLaunch API (optional)');
    }

    return launch;
  }

  async swap({ tokenAddress, amount, side, memo, slippage = 5, base = 'ETH' }) {
    const signer = this.wallet.getSigner();
    const useTestnet = this.testnet;
    const contracts = useTestnet ? CONTRACTS.testnet : CONTRACTS;
    const walletAddress = await signer.getAddress();

    // Validate side
    if (side !== 'buy' && side !== 'sell') {
      throw new Error(`Invalid side: ${side}. Must be 'buy' or 'sell'`);
    }

    // Validate base token
    const baseUpper = base.toUpperCase();
    if (!BASE_TOKENS[baseUpper]) {
      throw new Error(`Invalid base token: ${base}. Supported: ${Object.keys(BASE_TOKENS).join(', ')}`);
    }

    const baseTokenAddress = getBaseTokenAddress(base, useTestnet);
    const isNative = isNativeETH(base);

    // Check balances
    const ethBalance = await signer.provider.getBalance(walletAddress);
    const amountWei = ethers.parseEther(amount.toString());
    
    if (side === 'buy') {
      if (isNative) {
        // Buying with ETH: need ETH
        if (ethBalance < amountWei) {
          throw new Error(`Insufficient ETH. Need ${amount} ETH, have ${ethers.formatEther(ethBalance)} ETH`);
        }
      } else {
        // Buying with XRGE: need XRGE tokens
        const baseBalance = await getTokenBalance(signer.provider, baseTokenAddress, walletAddress);
        const baseBalanceNum = parseFloat(baseBalance);
        const amountNum = parseFloat(amount);
        
        if (baseBalanceNum < amountNum) {
          throw new Error(`Insufficient ${base}. Need ${amount}, have ${baseBalance}`);
        }
        
        // Also need some ETH for gas
        const minGas = ethers.parseEther('0.0005');
        if (ethBalance < minGas) {
          throw new Error(`Insufficient ETH for gas. Need at least 0.0005 ETH`);
        }
      }
    } else {
      // Selling: need tokens
      const tokenBalance = await getTokenBalance(signer.provider, tokenAddress, walletAddress);
      const tokenBalanceNum = parseFloat(tokenBalance);
      const amountNum = parseFloat(amount);
      
      if (tokenBalanceNum < amountNum) {
        throw new Error(`Insufficient token balance. Need ${amount}, have ${tokenBalance}`);
      }
      
      // Also need some ETH for gas
      const minGas = ethers.parseEther('0.0005');
      if (ethBalance < minGas) {
        throw new Error(`Insufficient ETH for gas. Need at least 0.0005 ETH`);
      }
    }

    let tokenIn, tokenOut;
    
    if (side === 'buy') {
      // Buy: Base -> Token
      tokenIn = baseTokenAddress;
      tokenOut = tokenAddress;
    } else {
      // Sell: Token -> Base
      tokenIn = tokenAddress;
      tokenOut = baseTokenAddress;
    }

    console.log(`Executing ${side} (${base} pair)...`);
    
    // Get private key for Flaunch SDK
    const privateKey = this.wallet._getPrivateKey();
    
    let receipt;
    
    // For ETH pairs, check if it's a Flaunch token and use their SDK
    if (isNativeETH(base)) {
      // Check if this is a Flaunch token (Uniswap V4)
      const isFlaunch = await isFlaunchToken(tokenAddress, useTestnet);
      
      if (isFlaunch) {
        console.log('Detected Flaunch token - using Uniswap V4...');
        
        if (side === 'buy') {
          receipt = await executeFlaunchBuy(privateKey, tokenAddress, amount, slippage, useTestnet);
        } else {
          receipt = await executeFlaunchSell(privateKey, tokenAddress, amount, slippage, useTestnet);
        }
      } else {
        // Non-Flaunch token - use Aerodrome
        console.log('Using Aerodrome...');
        receipt = await executeSwapAerodrome(
          signer, 
          tokenIn, 
          tokenOut, 
          amount, 
          slippage, 
          useTestnet,
          memo,
          base
        );
      }
    } else {
      // XRGE pairs - use Aerodrome directly
      receipt = await executeSwap(
        signer, 
        tokenIn, 
        tokenOut, 
        amount, 
        slippage, 
        useTestnet,
        memo,
        base
      );
    }

    const result = {
      transactionHash: receipt.hash,
      side,
      amountIn: amount,
      tokenAddress,
      baseToken: base,
      network: useTestnet ? 'base-sepolia' : 'base',
      explorer: useTestnet
        ? `https://sepolia.basescan.org/tx/${receipt.hash}`
        : `https://basescan.org/tx/${receipt.hash}`,
      blockNumber: receipt.blockNumber,
      slippage: `${slippage}%`
    };

    // Add DEX info
    if (receipt.dex) {
      result.dex = receipt.dex;
    }

    // Add quote info if available
    if (receipt.expectedOutput) {
      result.expectedOutput = receipt.expectedOutput;
      result.minOutput = receipt.amountOutMinimum;
    }

    // Add pool info (differs by DEX)
    if (receipt.dex === 'aerodrome' && receipt.poolType) {
      result.poolType = receipt.poolType;
    } else if (receipt.poolFee) {
      result.poolFee = `${receipt.poolFee / 10000}%`;
    }

    if (memo) {
      result.memo = memo;
      result.memoOnChain = receipt.memoEncoded || false;
    }

    // Log trade to API (with signature for verification)
    try {
      const tradeMessage = `Log trade ${receipt.hash} to GltchLaunch`;
      const tradeSignature = await signer.signMessage(tradeMessage);
      
      await fetch(`${API_BASE}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result,
          trader: walletAddress,
          signature: tradeSignature
        })
      });
    } catch {
      // Optional - API might not be running
    }

    return result;
  }

  /**
   * Get a price quote for a swap without executing
   */
  async quote({ tokenAddress, amount, side, base = 'ETH' }) {
    const signer = this.wallet.getSigner();
    const useTestnet = this.testnet;

    // Validate base token
    const baseUpper = base.toUpperCase();
    if (!BASE_TOKENS[baseUpper]) {
      throw new Error(`Invalid base token: ${base}. Supported: ${Object.keys(BASE_TOKENS).join(', ')}`);
    }

    const baseTokenAddress = getBaseTokenAddress(base, useTestnet);

    // For ETH pairs, check if it's a Flaunch token first
    if (isNativeETH(base)) {
      const isFlaunch = await isFlaunchToken(tokenAddress, useTestnet);
      
      if (isFlaunch) {
        console.log('Flaunch token detected - using V4 quote...');
        
        let quoteResult;
        if (side === 'buy') {
          quoteResult = await getFlaunchBuyQuote(tokenAddress, amount, useTestnet);
        } else {
          quoteResult = await getFlaunchSellQuote(tokenAddress, amount, useTestnet);
        }
        
        // Also get current price
        const priceETH = await getFlaunchCoinPrice(tokenAddress, useTestnet);
        
        return {
          side,
          amountIn: amount,
          expectedOutput: quoteResult.amountOutFormatted,
          tokenAddress,
          baseToken: base,
          dex: 'uniswapV4',
          priceETH: priceETH || 'N/A',
          network: useTestnet ? 'base-sepolia' : 'base'
        };
      }
    }

    // Default: use Aerodrome quotes
    let tokenIn, tokenOut;
    
    if (side === 'buy') {
      tokenIn = baseTokenAddress;
      tokenOut = tokenAddress;
    } else {
      tokenIn = tokenAddress;
      tokenOut = baseTokenAddress;
    }

    const quoteResult = await getQuote(signer.provider, tokenIn, tokenOut, amount, useTestnet, base);
    
    const result = {
      side,
      amountIn: amount,
      expectedOutput: quoteResult.amountOut > 0n ? ethers.formatEther(quoteResult.amountOut) : '0',
      tokenAddress,
      baseToken: base,
      dex: quoteResult.dex || 'aerodrome',
      network: useTestnet ? 'base-sepolia' : 'base'
    };

    // Add DEX-specific info
    if (quoteResult.dex === 'aerodrome') {
      result.poolType = quoteResult.stable ? 'stable' : 'volatile';
    } else if (quoteResult.fee) {
      result.poolFee = `${quoteResult.fee / 10000}%`;
    }

    return result;
  }

  async getLaunches() {
    return this._loadLaunches();
  }

  async getTokenInfo(tokenAddress) {
    const provider = this.wallet._loadWallet().provider;
    return await getTokenInfo(provider, tokenAddress);
  }

  /**
   * Buy XRGE with ETH via Aerodrome
   */
  async buyXRGE({ amount, slippage = 5 }) {
    const signer = this.wallet.getSigner();
    const useTestnet = this.testnet;
    const contracts = useTestnet ? CONTRACTS.testnet : CONTRACTS;
    const walletAddress = await signer.getAddress();

    // Check ETH balance
    const ethBalance = await signer.provider.getBalance(walletAddress);
    const amountWei = ethers.parseEther(amount.toString());
    
    if (ethBalance < amountWei) {
      throw new Error(`Insufficient ETH. Need ${amount} ETH, have ${ethers.formatEther(ethBalance)} ETH`);
    }

    if (contracts.XRGE === '0x0000000000000000000000000000000000000000') {
      throw new Error('XRGE not available on testnet');
    }

    console.log('Swapping ETH for XRGE on Aerodrome...');

    // Execute swap: WETH -> XRGE
    const receipt = await executeSwapAerodrome(
      signer,
      contracts.WETH,
      contracts.XRGE,
      amount,
      slippage,
      useTestnet,
      null, // no memo
      'ETH'
    );

    return {
      transactionHash: receipt.hash,
      amountIn: amount,
      expectedOutput: receipt.expectedOutput || 'N/A',
      dex: 'aerodrome',
      network: useTestnet ? 'base-sepolia' : 'base',
      explorer: useTestnet
        ? `https://sepolia.basescan.org/tx/${receipt.hash}`
        : `https://basescan.org/tx/${receipt.hash}`
    };
  }

  /**
   * Sell XRGE for ETH via Aerodrome
   */
  async sellXRGE({ amount, slippage = 5 }) {
    const signer = this.wallet.getSigner();
    const useTestnet = this.testnet;
    const contracts = useTestnet ? CONTRACTS.testnet : CONTRACTS;
    const walletAddress = await signer.getAddress();

    if (contracts.XRGE === '0x0000000000000000000000000000000000000000') {
      throw new Error('XRGE not available on testnet');
    }

    // Check XRGE balance
    const xrgeBalance = await getTokenBalance(signer.provider, contracts.XRGE, walletAddress);
    const xrgeBalanceNum = parseFloat(xrgeBalance);
    const amountNum = parseFloat(amount);
    
    if (xrgeBalanceNum < amountNum) {
      throw new Error(`Insufficient XRGE. Need ${amount}, have ${xrgeBalance}`);
    }

    // Check ETH for gas
    const ethBalance = await signer.provider.getBalance(walletAddress);
    const minGas = ethers.parseEther('0.0005');
    if (ethBalance < minGas) {
      throw new Error('Insufficient ETH for gas. Need at least 0.0005 ETH');
    }

    console.log('Swapping XRGE for ETH on Aerodrome...');

    // Execute swap: XRGE -> WETH
    const receipt = await executeSwapAerodrome(
      signer,
      contracts.XRGE,
      contracts.WETH,
      amount,
      slippage,
      useTestnet,
      null, // no memo
      'XRGE'
    );

    return {
      transactionHash: receipt.hash,
      amountIn: amount,
      expectedOutput: receipt.expectedOutput || 'N/A',
      dex: 'aerodrome',
      network: useTestnet ? 'base-sepolia' : 'base',
      explorer: useTestnet
        ? `https://sepolia.basescan.org/tx/${receipt.hash}`
        : `https://basescan.org/tx/${receipt.hash}`
    };
  }

  /**
   * Get XRGE balance and info
   */
  async getXRGEInfo() {
    const signer = this.wallet.getSigner();
    const useTestnet = this.testnet;
    const contracts = useTestnet ? CONTRACTS.testnet : CONTRACTS;
    const walletAddress = await signer.getAddress();

    if (contracts.XRGE === '0x0000000000000000000000000000000000000000') {
      return {
        address: 'N/A',
        balance: '0',
        priceETH: null,
        error: 'XRGE not available on testnet'
      };
    }

    const balance = await getTokenBalance(signer.provider, contracts.XRGE, walletAddress);
    
    // Try to get price quote (1 ETH worth of XRGE)
    let priceETH = null;
    try {
      const quoteResult = await getQuote(
        signer.provider,
        contracts.WETH,
        contracts.XRGE,
        '1', // 1 ETH
        useTestnet,
        'ETH'
      );
      if (quoteResult.amountOut > 0n) {
        // Price is 1 ETH / amount of XRGE you get
        const xrgePerEth = parseFloat(ethers.formatEther(quoteResult.amountOut));
        priceETH = (1 / xrgePerEth).toFixed(8);
      }
    } catch (e) {
      // Quote failed, no price available
    }

    return {
      address: contracts.XRGE,
      symbol: 'XRGE',
      name: 'Rougecoin',
      balance,
      priceETH,
      dex: 'Aerodrome'
    };
  }
}
