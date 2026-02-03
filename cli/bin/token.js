import { ethers } from 'ethers';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Wallet } from './wallet.js';
import { deployToken, executeSwap, getTokenInfo, CONTRACTS } from './contracts.js';

const CONFIG_DIR = join(homedir(), '.gltchlaunch');
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

  async launch({ name, symbol, description, image, website, testnet, simulate }) {
    const signer = this.wallet.getSigner();
    const address = this.wallet.getAddress();
    const useTestnet = testnet || this.testnet;

    let deployed;

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
    } else {
      // Check balance first for real deployment
      const balance = await signer.provider.getBalance(address);
      const minBalance = ethers.parseEther('0.001');
      
      if (balance < minBalance) {
        throw new Error(`Insufficient balance. Need at least 0.001 ETH for gas. Current: ${ethers.formatEther(balance)} ETH`);
      }

      console.log('Deploying token contract...');
      
      // Deploy the token
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
      launchedAt: new Date().toISOString()
    };

    this._saveLaunch(launch);

    // Register with GltchLaunch API
    try {
      await fetch(`${API_BASE}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: deployed.address,
          name,
          symbol,
          description,
          creator: address,
          chainId: launch.chainId
        })
      });
    } catch (error) {
      // API registration is optional - network might not be up yet
      console.log('Note: Could not register with GltchLaunch API (optional)');
    }

    return launch;
  }

  async swap({ tokenAddress, amount, side, memo, slippage = 5 }) {
    const signer = this.wallet.getSigner();
    const useTestnet = this.testnet;
    const contracts = useTestnet ? CONTRACTS.testnet : CONTRACTS;

    // Check balance
    const balance = await signer.provider.getBalance(await signer.getAddress());
    const amountWei = ethers.parseEther(amount.toString());
    
    if (side === 'buy' && balance < amountWei) {
      throw new Error(`Insufficient ETH. Need ${amount} ETH, have ${ethers.formatEther(balance)} ETH`);
    }

    let tokenIn, tokenOut;
    
    if (side === 'buy') {
      // Buy: ETH -> Token
      tokenIn = contracts.WETH;
      tokenOut = tokenAddress;
    } else {
      // Sell: Token -> ETH
      tokenIn = tokenAddress;
      tokenOut = contracts.WETH;
    }

    console.log(`Executing ${side}...`);
    
    const receipt = await executeSwap(
      signer, 
      tokenIn, 
      tokenOut, 
      amount, 
      slippage, 
      useTestnet
    );

    const result = {
      transactionHash: receipt.hash,
      side,
      amountIn: amount,
      tokenAddress,
      network: useTestnet ? 'base-sepolia' : 'base',
      explorer: useTestnet
        ? `https://sepolia.basescan.org/tx/${receipt.hash}`
        : `https://basescan.org/tx/${receipt.hash}`,
      blockNumber: receipt.blockNumber
    };

    if (memo) {
      result.memo = memo;
      // TODO: Encode memo in transaction calldata
    }

    // Log trade to API
    try {
      await fetch(`${API_BASE}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result,
          trader: await signer.getAddress()
        })
      });
    } catch {
      // Optional
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
}
