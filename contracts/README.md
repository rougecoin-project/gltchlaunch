# GLTCH Contracts

Smart contracts for the GLTCH agent token ecosystem on Base.

## Overview

| Contract | Description |
|----------|-------------|
| `GltchToken.sol` | ERC-20 token for GLTCH agents with metadata |
| `GltchFactory.sol` | Factory for Uniswap V3 pools (ETH pairs) |
| `GltchFactoryAerodrome.sol` | Factory for Aerodrome pools (XRGE pairs) - **Recommended** |

## Architecture

```
Creator calls launch()
        │
        ▼
┌─────────────────────────────────────────┐
│       GltchFactoryAerodrome             │
│                                         │
│  1. Deploy GltchToken                   │
│  2. Transfer XRGE from creator          │
│  3. Create Aerodrome pool (XRGE/TOKEN)  │
│  4. Add liquidity (volatile pool)       │
│  5. Hold LP tokens for fee claims       │
│                                         │
└─────────────────────────────────────────┘
        │
        ▼
   Token tradeable on Aerodrome
   Creator can collect trading fees
```

### Why Aerodrome?

- **Your liquidity lives there** - XRGE is primarily traded on Aerodrome
- **Lower fees** - 0.3% vs 1% on many Uniswap V3 pools
- **Fee distribution** - Trading fees claimable by token creators
- **Base native** - Aerodrome is the largest DEX on Base

## Deployment

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
```

### Deploy to Base Mainnet (Aerodrome - Recommended)

```bash
# Set environment
export PRIVATE_KEY=your_private_key
export BASE_RPC_URL=https://mainnet.base.org
export BASESCAN_API_KEY=your_api_key

# Deploy Aerodrome factory (for XRGE pairs)
forge script script/DeployAerodrome.s.sol --rpc-url base --broadcast --verify
```

### Deploy Uniswap V3 Factory (Alternative)

```bash
# For ETH pairs instead of XRGE
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
```

### Deploy to Base Sepolia (Testnet)

```bash
# Aerodrome not available on testnet
# Use Uniswap factory with test token
export TEST_XRGE=0x...your_test_token...

forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
```

## Usage

### Launch a Token

```solidity
// Approve XRGE spend first
IERC20(xrge).approve(factory, xrgeLiquidity);

// Launch with custom liquidity
(address token, address pool) = factory.launch(
    "My Agent",           // name
    "MAGENT",             // symbol
    "An AI agent",        // description
    "ipfs://...",         // image URI
    1000 ether,           // XRGE for liquidity
    10_000_000 ether      // tokens for liquidity (1% of supply)
);

// Or use simple launch (1% of supply, just specify XRGE)
(token, pool) = factory.launchSimple(
    "My Agent",
    "MAGENT", 
    "An AI agent",
    "ipfs://...",
    1000 ether            // XRGE for liquidity
);
```

### Collect Trading Fees

```solidity
// Only the token creator can collect
(uint256 xrgeFees, uint256 tokenFees) = factory.collectFees(tokenAddress);
```

### Query Tokens

```solidity
// Get all tokens
uint256 count = factory.totalTokens();
address token = factory.allTokens(0);

// Get creator's tokens
address[] memory myTokens = factory.getCreatorTokens(msg.sender);

// Get launch info
GltchFactory.LaunchInfo memory info = factory.getLaunchInfo(tokenAddress);
```

## Contract Addresses

### Base Mainnet

| Contract | Address |
|----------|---------|
| XRGE | `0x3Eee1FC5c69Ab75E0AB293Bff5Aa7fa634104733` |
| WETH | `0x4200000000000000000000000000000000000006` |
| GltchFactoryAerodrome | *Deploy to get address* |

### Aerodrome (All Trading)

| Contract | Address |
|----------|---------|
| Router | `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43` |
| Pool Factory | `0x420DD381b31aEf6683db6B902084cB0FFECe40Da` |

## Testing

```bash
forge test -vvv
```

## Gas Estimates

| Operation | Estimated Gas | Cost @ 0.001 gwei |
|-----------|---------------|-------------------|
| Deploy Factory | ~2,500,000 | ~$0.05 |
| Launch Token | ~800,000 | ~$0.02 |
| Collect Fees | ~100,000 | ~$0.002 |

*Base has very low gas costs*

## Security Considerations

1. **LP Position Custody**: The factory holds LP positions. Only the original creator can collect fees.
2. **Full Range Liquidity**: Tokens use full-range positions, which is capital inefficient but simpler.
3. **No Upgradability**: Contracts are immutable once deployed.
4. **Audit Recommended**: For production use, get a security audit.

## License

MIT
