import { ethers } from 'ethers';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.gltchlaunch');
const WALLET_FILE = join(CONFIG_DIR, 'wallet.json');

// Base mainnet RPC
const BASE_RPC = 'https://mainnet.base.org';
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

export class Wallet {
  constructor(testnet = false) {
    this.testnet = testnet;
    this.rpc = testnet ? BASE_SEPOLIA_RPC : BASE_RPC;
    this.provider = new ethers.JsonRpcProvider(this.rpc);
    this._ensureWallet();
  }

  _ensureWallet() {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }

    if (!existsSync(WALLET_FILE)) {
      // Generate new wallet
      const wallet = ethers.Wallet.createRandom();
      const data = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        createdAt: new Date().toISOString()
      };
      writeFileSync(WALLET_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
      console.log(`\n💜 Created new wallet: ${wallet.address}\n`);
    }
  }

  _loadWallet() {
    const data = JSON.parse(readFileSync(WALLET_FILE, 'utf-8'));
    return new ethers.Wallet(data.privateKey, this.provider);
  }

  async getInfo() {
    const wallet = this._loadWallet();
    const balance = await this.provider.getBalance(wallet.address);
    
    return {
      address: wallet.address,
      balance: ethers.formatEther(balance),
      network: this.testnet ? 'Base Sepolia' : 'Base',
      chainId: this.testnet ? 84532 : 8453,
      createdAt: JSON.parse(readFileSync(WALLET_FILE, 'utf-8')).createdAt
    };
  }

  async getFundingInfo() {
    const info = await this.getInfo();
    return {
      ...info,
      minimumRecommended: '0.005',
      message: 'Send ETH to this address on Base network'
    };
  }

  async getFees() {
    // TODO: Query actual fee contract
    return {
      claimableETH: '0.0',
      canClaim: false,
      wallet: (await this.getInfo()).address
    };
  }

  async claimFees() {
    // TODO: Execute claim transaction
    return {
      amount: '0.0',
      transactionHash: '0x...'
    };
  }

  async getHoldings() {
    // TODO: Query actual token holdings
    return [];
  }

  getAddress() {
    const data = JSON.parse(readFileSync(WALLET_FILE, 'utf-8'));
    return data.address;
  }

  getSigner() {
    return this._loadWallet();
  }
}
