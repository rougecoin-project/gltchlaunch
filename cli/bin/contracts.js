import { ethers } from 'ethers';

// Base mainnet addresses
export const CONTRACTS = {
  // Uniswap V4 on Base (for Flaunch tokens)
  UNIVERSAL_ROUTER: '0xeb15707b2a2e6e9d21ce131a63eab0b12e43c53e',
  POOL_MANAGER: '0x69160fab481b4d48fd50db4f3064291b5bf49f01',
  V4_POSITION_MANAGER: '0x38a4b6f81ccef15fb3e950f4fcb26b11b6b37f19',
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  
  // Uniswap V3 on Base (legacy)
  UNISWAP_ROUTER: '0x2626664c2603336E57B271c5C0b26F421741e481',
  UNISWAP_QUOTER: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  UNISWAP_FACTORY: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  NONFUNGIBLE_POSITION_MANAGER: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  
  // Aerodrome on Base (for XRGE pairs)
  AERODROME_ROUTER: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
  AERODROME_FACTORY: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
  
  // Base tokens
  WETH: '0x4200000000000000000000000000000000000006',
  XRGE: '0x3Eee1FC5c69Ab75E0AB293Bff5Aa7fa634104733', // Rougecoin on Base
  
  // Legacy aliases for compatibility
  SWAP_ROUTER: '0x2626664c2603336E57B271c5C0b26F421741e481',
  QUOTER: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  FACTORY: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  
  // Base Sepolia testnet
  testnet: {
    UNISWAP_ROUTER: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
    UNISWAP_QUOTER: '0xC5290058841028F1614F3A6F0F5816cAd0df5E27',
    UNISWAP_FACTORY: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    NONFUNGIBLE_POSITION_MANAGER: '0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2',
    // No Aerodrome on testnet
    AERODROME_ROUTER: '0x0000000000000000000000000000000000000000',
    AERODROME_FACTORY: '0x0000000000000000000000000000000000000000',
    WETH: '0x4200000000000000000000000000000000000006',
    XRGE: '0x0000000000000000000000000000000000000000',
    // Legacy
    SWAP_ROUTER: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
    QUOTER: '0xC5290058841028F1614F3A6F0F5816cAd0df5E27',
    FACTORY: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'
  }
};

// Supported base tokens for pairing
export const BASE_TOKENS = {
  ETH: 'WETH',   // Default - pairs with ETH
  XRGE: 'XRGE',  // Rougecoin ecosystem
};

/**
 * Get the base token address for a given base token name
 */
export function getBaseTokenAddress(baseName, testnet = false) {
  const contracts = testnet ? CONTRACTS.testnet : CONTRACTS;
  const tokenKey = BASE_TOKENS[baseName?.toUpperCase()] || 'WETH';
  return contracts[tokenKey];
}

/**
 * Check if base token is native ETH (requires special handling)
 */
export function isNativeETH(baseName) {
  return !baseName || baseName.toUpperCase() === 'ETH' || baseName.toUpperCase() === 'WETH';
}

// Minimal ERC20 ABI
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// Uniswap V3 SwapRouter ABI (minimal)
export const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)'
];

// Uniswap V3 Quoter V2 ABI for getting quotes
export const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// Aerodrome Router ABI (Solidly/Velodrome style)
// Route struct: { from: address, to: address, stable: bool, factory: address }
export const AERODROME_ROUTER_ABI = [
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, (address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) external returns (uint256[] amounts)',
  'function swapExactETHForTokens(uint256 amountOutMin, (address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) external payable returns (uint256[] amounts)',
  'function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, (address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) external returns (uint256[] amounts)',
  'function getAmountsOut(uint256 amountIn, (address from, address to, bool stable, address factory)[] routes) external view returns (uint256[] amounts)',
  'function poolFor(address tokenA, address tokenB, bool stable, address factory) external view returns (address pool)'
];

// Aerodrome Pool ABI
export const AERODROME_POOL_ABI = [
  'function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function stable() external view returns (bool)'
];

// Universal Router ABI (Uniswap V4)
export const UNIVERSAL_ROUTER_ABI = [
  'function execute(bytes commands, bytes[] inputs, uint256 deadline) external payable',
  'function execute(bytes commands, bytes[] inputs) external payable'
];

// V4 Command codes
export const V4_COMMANDS = {
  V4_SWAP: 0x10,
  WRAP_ETH: 0x0b,
  UNWRAP_WETH: 0x0c,
  SWEEP: 0x04
};

// GLTCH memo magic bytes (ASCII: "GLTCH")
export const MEMO_MAGIC = '474c544348';

/**
 * Determine which DEX to use based on base token and token source
 */
export function getDexForBase(baseName, isFlaunchToken = false) {
  // Flaunch tokens use Uniswap V4
  if (isFlaunchToken) {
    return 'uniswapV4';
  }
  // Everything else routes through Aerodrome
  return 'aerodrome';
}

// Simple ERC20 Token bytecode (OpenZeppelin-based)
// This is a minimal token with name, symbol, initial supply to deployer
export const TOKEN_BYTECODE = '0x60806040523480156200001157600080fd5b5060405162000c3838038062000c38833981016040819052620000349162000149565b8282600362000044838262000242565b50600462000053828262000242565b5050506200006833826200007160201b60201c565b5050506200030e565b6001600160a01b038216620000a15760405163ec442f0560e01b8152600060048201526024015b60405180910390fd5b620000af60008383620000b3565b5050565b6001600160a01b038316620000e2578060026000828254620000d691906200030e565b90915550620001569050565b6001600160a01b038316600090815260208190526040902054818110156200013757604051634b6d1b0f60e11b81526001600160a01b03851660048201526024810182905260448101839052606401620000989050565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b038216620001745760028054829003905562000193565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051620001d991815260200190565b60405180910390a3505050565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200020e57600080fd5b81516001600160401b03808211156200022b576200022b620001e6565b604051601f8301601f19908116603f01168101908282118183101715620002565762000256620001e6565b816040528381526020925086838588010111156200027357600080fd5b600091505b8382101562000297578582018301518183018401529082019062000278565b600093810190920192909252949350505050565b600080600060608486031215620002c157600080fd5b83516001600160401b0380821115620002d957600080fd5b620002e787838801620001fc565b94506020860151915080821115620002fe57600080fd5b506200030d86828701620001fc565b925050604084015190509250925092565b808201808211156200034057634e487b7160e01b600052601160045260246000fd5b92915050565b61091a806200035e6000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c80633950935111610071578063395093511461012357806370a082311461013657806395d89b411461015f578063a457c2d714610167578063a9059cbb1461017a578063dd62ed3e1461018d57600080fd5b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100ef57806323b872dd14610101578063313ce56714610114575b600080fd5b6100b66101c6565b6040516100c391906107a5565b60405180910390f35b6100df6100da3660046107f4565b610258565b60405190151581526020016100c3565b6002545b6040519081526020016100c3565b6100df61010f36600461081e565b610272565b604051601281526020016100c3565b6100df6101313660046107f4565b610296565b6100f361014436600461085a565b6001600160a01b031660009081526020819052604090205490565b6100b66102b8565b6100df6101753660046107f4565b6102c7565b6100df6101883660046107f4565b610347565b6100f361019b36600461087c565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6060600380546101d5906108af565b80601f0160208091040260200160405190810160405280929190818152602001828054610201906108af565b801561024e5780601f106102235761010080835404028352916020019161024e565b820191906000526020600020905b81548152906001019060200180831161023157829003601f168201915b5050505050905090565b600033610266818585610355565b60019150505b92915050565b600033610280858285610367565b61028b8585856103e5565b506001949350505050565b6000336102668185856102a9838361019b565b6102b391906108e9565b610355565b6060600480546101d5906108af565b600033816102d5828661019b565b90508381101561033a5760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b60648201526084015b60405180910390fd5b61028b8286868403610355565b6000336102668185856103e5565b6103628383836001610444565b505050565b6001600160a01b0383811660009081526001602090815260408083209386168352929052205460001981146103df57818110156103d05760405163f4d678b860e01b81526001600160a01b03841660048201526024810182905260448101839052606401610331565b6103df84848484036000610444565b50505050565b6001600160a01b03831661040f57604051634b637e8f60e11b815260006004820152602401610331565b6001600160a01b0382166104395760405163ec442f0560e01b815260006004820152602401610331565b610362838383610519565b6001600160a01b03841661046e5760405163e602df0560e01b815260006004820152602401610331565b6001600160a01b0383166104985760405163d92e233d60e01b815260006004820152602401610331565b6001600160a01b0380851660009081526001602090815260408083209387168352929052208290558015610513576001600160a01b0384166000818152600160209081526040808320848452908252808320548484528252918290205482519081529182015291908516917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a35b50505050565b6001600160a01b03831661054457806002600082825461053991906108e9565b909155506105b69050565b6001600160a01b038316600090815260208190526040902054818110156105975760405163391434e360e21b81526001600160a01b03851660048201526024810182905260448101839052606401610331565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b0382166105d2576002805482900390556105f1565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161063691815260200190565b60405180910390a3505050565b6000815180845260005b818110156106695760208185018101518683018201520161064d565b506000602082860101526020601f19601f83011685010191505092915050565b8215158152604060208201526000610a606040830184610643565b949350505050565b6000602082840312156106bc57600080fd5b5035919050565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126106ea57600080fd5b813567ffffffffffffffff80821115610705576107056106c3565b604051601f8301601f19908116603f0116810190828211818310171561072d5761072d6106c3565b8160405283815286602085880101111561074657600080fd5b836020870160208301376000602085830101528094505050505092915050565b60006020828403121561077857600080fd5b813567ffffffffffffffff81111561078f57600080fd5b610a60848285016106d9565b60208152600061026c6020830184610643565b80356001600160a01b03811681146107bf57600080fd5b919050565b600080604083850312156107d757600080fd5b6107e0836107ae565b946020939093013593505050565b6000806040838503121561080157600080fd5b61080a836107ae565b91506108186020840161076a565b90509250929050565b60008060006060848603121561083657600080fd5b61083f846107ae565b925061084d602085016107ae565b9150604084013590509250925092565b60006020828403121561086c57600080fd5b610875826107ae565b9392505050565b6000806040838503121561088f57600080fd5b610898836107ae565b91506108a6602084016107ae565b90509250929050565b600181811c908216806108c357607f821691505b6020821081036108e357634e487b7160e01b600052602260045260246000fd5b50919050565b8082018082111561026c57634e487b7160e01b600052601160045260246000fdfea2646970667358221220';

// Token factory ABI
export const TOKEN_ABI = [
  'constructor(string memory name_, string memory symbol_, uint256 initialSupply_)',
  ...ERC20_ABI
];

// Deploy a new ERC20 token
export async function deployToken(signer, name, symbol, initialSupply = '1000000000') {
  const factory = new ethers.ContractFactory(
    TOKEN_ABI,
    TOKEN_BYTECODE,
    signer
  );
  
  // Deploy with 1 billion tokens (18 decimals)
  const supply = ethers.parseEther(initialSupply);
  const contract = await factory.deploy(name, symbol, supply);
  await contract.waitForDeployment();
  
  return {
    address: await contract.getAddress(),
    name,
    symbol,
    initialSupply: supply.toString()
  };
}

/**
 * Get a quote for a swap (expected output amount)
 * All quotes go through Aerodrome
 */
export async function getQuote(provider, tokenIn, tokenOut, amountIn, testnet = false, baseToken = 'ETH') {
  // For ETH pairs, use WETH in the quote
  const contracts = testnet ? CONTRACTS.testnet : CONTRACTS;
  const isNativeBase = isNativeETH(baseToken);
  
  // If native ETH, substitute WETH for the quote
  const quoteTokenIn = (isNativeBase && tokenIn === contracts.WETH) ? contracts.WETH : tokenIn;
  const quoteTokenOut = (isNativeBase && tokenOut === contracts.WETH) ? contracts.WETH : tokenOut;
  
  return getQuoteAerodrome(provider, quoteTokenIn, quoteTokenOut, amountIn, testnet);
}

/**
 * Get quote from Uniswap V3
 */
export async function getQuoteUniswap(provider, tokenIn, tokenOut, amountIn, testnet = false) {
  const contracts = testnet ? CONTRACTS.testnet : CONTRACTS;
  const quoter = new ethers.Contract(contracts.UNISWAP_QUOTER, QUOTER_ABI, provider);
  
  const amountInWei = ethers.parseEther(amountIn.toString());
  
  // Try different fee tiers
  const feeTiers = [3000, 10000, 500, 100];
  
  for (const fee of feeTiers) {
    try {
      const params = {
        tokenIn,
        tokenOut,
        amountIn: amountInWei,
        fee,
        sqrtPriceLimitX96: 0
      };
      
      const result = await quoter.quoteExactInputSingle.staticCall(params);
      if (result[0] > 0n) {
        return { amountOut: result[0], fee, dex: 'uniswap' };
      }
    } catch (error) {
      continue;
    }
  }
  
  console.log('Uniswap quote failed: No liquidity pool found');
  return { amountOut: 0n, fee: 3000, dex: 'uniswap' };
}

/**
 * Get quote from Aerodrome
 */
export async function getQuoteAerodrome(provider, tokenIn, tokenOut, amountIn, testnet = false) {
  const contracts = testnet ? CONTRACTS.testnet : CONTRACTS;
  
  if (contracts.AERODROME_ROUTER === '0x0000000000000000000000000000000000000000') {
    console.log('Aerodrome not available on testnet');
    return { amountOut: 0n, stable: false, dex: 'aerodrome' };
  }
  
  const router = new ethers.Contract(contracts.AERODROME_ROUTER, AERODROME_ROUTER_ABI, provider);
  const amountInWei = ethers.parseEther(amountIn.toString());
  
  // Try both stable and volatile pools
  const poolTypes = [false, true]; // volatile first (more common for tokens)
  
  for (const stable of poolTypes) {
    try {
      const routes = [{
        from: tokenIn,
        to: tokenOut,
        stable: stable,
        factory: contracts.AERODROME_FACTORY
      }];
      
      const amounts = await router.getAmountsOut(amountInWei, routes);
      if (amounts[1] > 0n) {
        console.log(`Found Aerodrome ${stable ? 'stable' : 'volatile'} pool`);
        return { amountOut: amounts[1], stable, dex: 'aerodrome' };
      }
    } catch (error) {
      // Try next pool type
      continue;
    }
  }
  
  console.log('Aerodrome quote failed: No liquidity pool found');
  return { amountOut: 0n, stable: false, dex: 'aerodrome' };
}

/**
 * Encode a memo into hex for on-chain storage
 * Format: GLTCH magic bytes + JSON payload
 */
export function encodeMemo(memo, trader, side, tokenAddress) {
  if (!memo) return null;
  
  const payload = JSON.stringify({
    m: memo,           // memo text
    t: trader,         // trader address
    s: side,           // 'buy' or 'sell'
    a: tokenAddress,   // token being traded
    ts: Date.now()     // timestamp
  });
  
  // Convert to hex: magic bytes + payload
  const payloadHex = Buffer.from(payload, 'utf8').toString('hex');
  return MEMO_MAGIC + payloadHex;
}

/**
 * Decode a memo from transaction data
 */
export function decodeMemo(data) {
  if (!data || data.length < 10) return null;
  
  // Remove 0x prefix if present
  const hex = data.startsWith('0x') ? data.slice(2) : data;
  
  // Check for GLTCH magic bytes
  if (!hex.startsWith(MEMO_MAGIC)) return null;
  
  try {
    const payloadHex = hex.slice(MEMO_MAGIC.length);
    const payload = Buffer.from(payloadHex, 'hex').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Approve token spending for the router
 */
export async function approveToken(signer, tokenAddress, spender, amount, testnet = false) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const amountWei = ethers.parseEther(amount.toString());
  
  // Check current allowance
  const currentAllowance = await token.allowance(await signer.getAddress(), spender);
  
  if (currentAllowance >= amountWei) {
    return { approved: true, existing: true };
  }
  
  // Approve max uint256 to avoid repeated approvals
  const maxApproval = ethers.MaxUint256;
  const tx = await token.approve(spender, maxApproval);
  const receipt = await tx.wait();
  
  return { 
    approved: true, 
    existing: false,
    transactionHash: receipt.hash 
  };
}

/**
 * Execute a swap with proper slippage protection
 * Routes to appropriate DEX: Uniswap V3 for ETH, Aerodrome for XRGE
 */
export async function executeSwap(signer, tokenIn, tokenOut, amountIn, slippage = 5, testnet = false, memo = null, baseToken = 'ETH') {
  const dex = getDexForBase(baseToken);
  
  if (dex === 'aerodrome') {
    return executeSwapAerodrome(signer, tokenIn, tokenOut, amountIn, slippage, testnet, memo, baseToken);
  } else {
    return executeSwapUniswap(signer, tokenIn, tokenOut, amountIn, slippage, testnet, memo, baseToken);
  }
}

/**
 * Execute swap on Uniswap V3 (for ETH pairs)
 */
export async function executeSwapUniswap(signer, tokenIn, tokenOut, amountIn, slippage = 5, testnet = false, memo = null, baseToken = 'ETH') {
  const contracts = testnet ? CONTRACTS.testnet : CONTRACTS;
  const router = new ethers.Contract(contracts.UNISWAP_ROUTER, SWAP_ROUTER_ABI, signer);
  const walletAddress = await signer.getAddress();
  
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountInWei = ethers.parseEther(amountIn.toString());
  
  const isNativeBase = isNativeETH(baseToken);
  const isBuyingToken = tokenIn === contracts.WETH || tokenIn === contracts.XRGE;
  
  // Approve if needed
  if (!isNativeBase || !isBuyingToken) {
    console.log('Approving token spend...');
    await approveToken(signer, tokenIn, contracts.UNISWAP_ROUTER, amountIn, testnet);
  }
  
  // Get quote
  console.log('Getting Uniswap quote...');
  const quoteResult = await getQuoteUniswap(signer.provider, tokenIn, tokenOut, amountIn, testnet);
  const expectedOutput = quoteResult.amountOut;
  const poolFee = quoteResult.fee;
  
  // Calculate minimum output
  let amountOutMinimum = 0n;
  if (expectedOutput > 0n) {
    const slippageBps = BigInt(Math.floor(slippage * 100));
    amountOutMinimum = expectedOutput - (expectedOutput * slippageBps / 10000n);
    console.log(`Expected: ${ethers.formatEther(expectedOutput)}, Min (${slippage}% slippage): ${ethers.formatEther(amountOutMinimum)}`);
  } else {
    console.log('Warning: Could not get quote, proceeding without slippage protection');
  }
  
  const params = {
    tokenIn,
    tokenOut,
    fee: poolFee,
    recipient: walletAddress,
    deadline,
    amountIn: amountInWei,
    amountOutMinimum,
    sqrtPriceLimitX96: 0
  };
  
  // Encode memo
  let memoData = null;
  if (memo) {
    const side = isBuyingToken ? 'buy' : 'sell';
    memoData = encodeMemo(memo, walletAddress, side, isBuyingToken ? tokenOut : tokenIn);
  }
  
  const txOptions = {
    value: (isNativeBase && isBuyingToken) ? amountInWei : 0n
  };
  
  let tx;
  if (memoData) {
    const swapCalldata = router.interface.encodeFunctionData('exactInputSingle', [params]);
    const multicallData = router.interface.encodeFunctionData('multicall', [deadline, [swapCalldata]]);
    tx = await signer.sendTransaction({
      to: contracts.UNISWAP_ROUTER,
      data: multicallData + memoData,
      ...txOptions
    });
  } else {
    tx = await router.exactInputSingle(params, txOptions);
  }
  
  const receipt = await tx.wait();
  
  return {
    ...receipt,
    expectedOutput: expectedOutput > 0n ? ethers.formatEther(expectedOutput) : null,
    amountOutMinimum: amountOutMinimum > 0n ? ethers.formatEther(amountOutMinimum) : null,
    poolFee,
    baseToken,
    dex: 'uniswap',
    memoEncoded: !!memoData
  };
}

/**
 * Execute swap on Aerodrome (for all pairs - ETH and XRGE)
 */
export async function executeSwapAerodrome(signer, tokenIn, tokenOut, amountIn, slippage = 5, testnet = false, memo = null, baseToken = 'ETH') {
  const contracts = testnet ? CONTRACTS.testnet : CONTRACTS;
  
  if (contracts.AERODROME_ROUTER === '0x0000000000000000000000000000000000000000') {
    throw new Error('Aerodrome not available on testnet');
  }
  
  const router = new ethers.Contract(contracts.AERODROME_ROUTER, AERODROME_ROUTER_ABI, signer);
  const walletAddress = await signer.getAddress();
  
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountInWei = ethers.parseEther(amountIn.toString());
  
  // Determine swap type
  const isNativeBase = isNativeETH(baseToken);
  const baseTokenAddress = getBaseTokenAddress(baseToken, testnet);
  const isBuyingToken = tokenIn === baseTokenAddress || tokenIn === contracts.WETH;
  const useNativeETH = isNativeBase && isBuyingToken; // Only use native ETH when buying with ETH
  const sellToNativeETH = isNativeBase && !isBuyingToken; // Selling token for ETH
  
  // For native ETH buys, use WETH in the route but send ETH
  const routeTokenIn = useNativeETH ? contracts.WETH : tokenIn;
  const routeTokenOut = sellToNativeETH ? contracts.WETH : tokenOut;
  
  // Approve if not using native ETH for input
  if (!useNativeETH) {
    console.log('Approving token spend for Aerodrome...');
    await approveToken(signer, tokenIn, contracts.AERODROME_ROUTER, amountIn, testnet);
  }
  
  // Get quote
  console.log('Getting Aerodrome quote...');
  const quoteResult = await getQuoteAerodrome(signer.provider, routeTokenIn, routeTokenOut, amountIn, testnet);
  const expectedOutput = quoteResult.amountOut;
  const isStable = quoteResult.stable;
  
  // Calculate minimum output
  let amountOutMinimum = 0n;
  if (expectedOutput > 0n) {
    const slippageBps = BigInt(Math.floor(slippage * 100));
    amountOutMinimum = expectedOutput - (expectedOutput * slippageBps / 10000n);
    console.log(`Expected: ${ethers.formatEther(expectedOutput)}, Min (${slippage}% slippage): ${ethers.formatEther(amountOutMinimum)}`);
    console.log(`Using ${isStable ? 'stable' : 'volatile'} pool`);
  } else {
    console.log('Warning: Could not get quote, proceeding without slippage protection');
  }
  
  // Build route
  const routes = [{
    from: routeTokenIn,
    to: routeTokenOut,
    stable: isStable,
    factory: contracts.AERODROME_FACTORY
  }];
  
  // Encode memo
  let memoData = null;
  if (memo) {
    const side = isBuyingToken ? 'buy' : 'sell';
    memoData = encodeMemo(memo, walletAddress, side, isBuyingToken ? tokenOut : tokenIn);
  }
  
  // Execute swap based on type
  let tx;
  
  if (useNativeETH) {
    // Buy tokens with native ETH
    if (memoData) {
      const swapCalldata = router.interface.encodeFunctionData('swapExactETHForTokens', [
        amountOutMinimum,
        routes,
        walletAddress,
        deadline
      ]);
      tx = await signer.sendTransaction({
        to: contracts.AERODROME_ROUTER,
        data: swapCalldata + memoData,
        value: amountInWei
      });
    } else {
      tx = await router.swapExactETHForTokens(
        amountOutMinimum,
        routes,
        walletAddress,
        deadline,
        { value: amountInWei }
      );
    }
  } else if (sellToNativeETH) {
    // Sell tokens for native ETH
    if (memoData) {
      const swapCalldata = router.interface.encodeFunctionData('swapExactTokensForETH', [
        amountInWei,
        amountOutMinimum,
        routes,
        walletAddress,
        deadline
      ]);
      tx = await signer.sendTransaction({
        to: contracts.AERODROME_ROUTER,
        data: swapCalldata + memoData
      });
    } else {
      tx = await router.swapExactTokensForETH(
        amountInWei,
        amountOutMinimum,
        routes,
        walletAddress,
        deadline
      );
    }
  } else {
    // ERC-20 to ERC-20 (e.g., XRGE pairs)
    if (memoData) {
      const swapCalldata = router.interface.encodeFunctionData('swapExactTokensForTokens', [
        amountInWei,
        amountOutMinimum,
        routes,
        walletAddress,
        deadline
      ]);
      tx = await signer.sendTransaction({
        to: contracts.AERODROME_ROUTER,
        data: swapCalldata + memoData
      });
    } else {
      tx = await router.swapExactTokensForTokens(
        amountInWei,
        amountOutMinimum,
        routes,
        walletAddress,
        deadline
      );
    }
  }
  
  const receipt = await tx.wait();
  
  return {
    ...receipt,
    expectedOutput: expectedOutput > 0n ? ethers.formatEther(expectedOutput) : null,
    amountOutMinimum: amountOutMinimum > 0n ? ethers.formatEther(amountOutMinimum) : null,
    poolType: isStable ? 'stable' : 'volatile',
    baseToken,
    dex: 'aerodrome',
    memoEncoded: !!memoData
  };
}

/**
 * Execute swap on Uniswap V4 via Universal Router (for Flaunch tokens)
 */
export async function executeSwapV4(signer, tokenAddress, amountIn, side, slippage = 5, testnet = false, memo = null) {
  const contracts = testnet ? CONTRACTS.testnet : CONTRACTS;
  
  if (!contracts.UNIVERSAL_ROUTER || contracts.UNIVERSAL_ROUTER === '0x0000000000000000000000000000000000000000') {
    throw new Error('Uniswap V4 not available on testnet');
  }
  
  const walletAddress = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountInWei = ethers.parseEther(amountIn.toString());
  
  const isBuy = side === 'buy';
  
  // For V4 swaps, we need to construct the pool key
  // Flaunch tokens are paired with ETH in V4 pools
  // Currency0 is always the lower address, Currency1 is higher
  const currency0 = contracts.WETH.toLowerCase() < tokenAddress.toLowerCase() ? contracts.WETH : tokenAddress;
  const currency1 = contracts.WETH.toLowerCase() < tokenAddress.toLowerCase() ? tokenAddress : contracts.WETH;
  const zeroForOne = isBuy ? (currency0 === contracts.WETH) : (currency0 === tokenAddress);
  
  // Pool key for Flaunch tokens (default fee tier)
  const poolKey = {
    currency0,
    currency1,
    fee: 10000, // 1% - common for new tokens
    tickSpacing: 200,
    hooks: '0x0000000000000000000000000000000000000000'
  };
  
  // Encode the V4_SWAP command
  // Command: 0x10 = V4_SWAP
  const commands = '0x0b10'; // WRAP_ETH + V4_SWAP for buys
  
  // Encode pool key
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  
  // For exact input swap
  const swapParams = abiCoder.encode(
    ['tuple(address,address,uint24,int24,address)', 'bool', 'int256', 'uint160', 'bytes'],
    [
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      zeroForOne,
      amountInWei, // positive for exact input
      0n, // sqrtPriceLimitX96 (0 = no limit)
      '0x' // hookData
    ]
  );
  
  // Wrap ETH input for buys
  const wrapInput = abiCoder.encode(['address', 'uint256'], [contracts.UNIVERSAL_ROUTER, amountInWei]);
  
  const inputs = isBuy ? [wrapInput, swapParams] : [swapParams];
  
  // Execute via Universal Router
  const router = new ethers.Contract(contracts.UNIVERSAL_ROUTER, UNIVERSAL_ROUTER_ABI, signer);
  
  console.log('Executing V4 swap via Universal Router...');
  
  let tx;
  try {
    tx = await router['execute(bytes,bytes[],uint256)'](
      commands,
      inputs,
      deadline,
      { value: isBuy ? amountInWei : 0n }
    );
  } catch (error) {
    // Try alternate method signature
    tx = await router['execute(bytes,bytes[])'](
      commands,
      inputs,
      { value: isBuy ? amountInWei : 0n }
    );
  }
  
  const receipt = await tx.wait();
  
  return {
    ...receipt,
    side,
    amountIn,
    tokenAddress,
    dex: 'uniswapV4',
    memoEncoded: !!memo
  };
}

/**
 * Try V4 swap first, fall back to Aerodrome
 */
export async function executeSwapWithFallback(signer, tokenAddress, amountIn, side, slippage = 5, testnet = false, memo = null, baseToken = 'ETH') {
  const contracts = testnet ? CONTRACTS.testnet : CONTRACTS;
  const WETH = contracts.WETH;
  
  const isBuy = side === 'buy';
  const tokenIn = isBuy ? WETH : tokenAddress;
  const tokenOut = isBuy ? tokenAddress : WETH;
  
  // Try V4 first (for Flaunch tokens)
  try {
    console.log('Trying Uniswap V4 (Flaunch)...');
    return await executeSwapV4(signer, tokenAddress, amountIn, side, slippage, testnet, memo);
  } catch (v4Error) {
    console.log('V4 failed, trying Aerodrome...');
    // Fall back to Aerodrome
    return await executeSwapAerodrome(signer, tokenIn, tokenOut, amountIn, slippage, testnet, memo, baseToken);
  }
}

// Get token info
export async function getTokenInfo(provider, tokenAddress) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply()
  ]);
  
  return { name, symbol, decimals, totalSupply: totalSupply.toString() };
}

// Get token balance
export async function getTokenBalance(provider, tokenAddress, walletAddress) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const balance = await token.balanceOf(walletAddress);
  return ethers.formatEther(balance);
}
