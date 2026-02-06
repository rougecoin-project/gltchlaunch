// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GltchToken.sol";
import "./interfaces/IUniswapV3.sol";

/**
 * @title GltchFactory
 * @notice Factory for deploying GLTCH agent tokens with automatic XRGE liquidity pools
 * @dev Creates ERC-20 tokens and initializes Uniswap V3 pools with XRGE as base pair
 */
contract GltchFactory {
    // ============ Constants ============
    
    /// @notice Default initial supply (1 billion tokens with 18 decimals)
    uint256 public constant DEFAULT_SUPPLY = 1_000_000_000 ether;
    
    /// @notice Minimum liquidity to add (prevents dust attacks)
    uint256 public constant MIN_LIQUIDITY = 1000;

    /// @notice Default fee tier for pools (1% = 10000)
    uint24 public constant DEFAULT_FEE = 10000;

    // ============ State ============
    
    /// @notice XRGE token address (Rougecoin)
    address public immutable xrge;
    
    /// @notice Uniswap V3 NonfungiblePositionManager
    address public immutable positionManager;
    
    /// @notice Uniswap V3 Factory
    address public immutable uniswapFactory;

    /// @notice Fee recipient for protocol fees (optional)
    address public feeRecipient;
    
    /// @notice Protocol fee in basis points (e.g., 100 = 1%)
    uint256 public protocolFeeBps;

    /// @notice All launched tokens
    address[] public allTokens;
    
    /// @notice Token address => Launch info
    mapping(address => LaunchInfo) public launches;
    
    /// @notice Creator address => their tokens
    mapping(address => address[]) public creatorTokens;

    struct LaunchInfo {
        address token;
        address creator;
        address pool;
        uint256 positionId;
        uint256 launchedAt;
        uint256 initialXrge;
        uint256 initialTokens;
    }

    // ============ Events ============
    
    event TokenLaunched(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        address pool,
        uint256 positionId
    );

    event LiquidityAdded(
        address indexed token,
        address indexed pool,
        uint256 xrgeAmount,
        uint256 tokenAmount,
        uint256 positionId
    );

    event FeesCollected(
        address indexed token,
        address indexed creator,
        uint256 xrgeAmount,
        uint256 tokenAmount
    );

    // ============ Errors ============
    
    error InvalidAddress();
    error InsufficientLiquidity();
    error NotCreator();
    error PoolExists();

    // ============ Constructor ============
    
    constructor(
        address xrge_,
        address positionManager_,
        address uniswapFactory_
    ) {
        if (xrge_ == address(0) || positionManager_ == address(0) || uniswapFactory_ == address(0)) {
            revert InvalidAddress();
        }
        
        xrge = xrge_;
        positionManager = positionManager_;
        uniswapFactory = uniswapFactory_;
    }

    // ============ Launch Functions ============
    
    /**
     * @notice Launch a new GLTCH agent token with XRGE liquidity pool
     * @param name Token name
     * @param symbol Token symbol (max 8 chars recommended)
     * @param description Agent description
     * @param imageURI IPFS or HTTP URI for token image
     * @param xrgeLiquidity Amount of XRGE to add as initial liquidity
     * @param tokenLiquidity Amount of tokens to add as initial liquidity
     * @return token The deployed token address
     * @return pool The created Uniswap pool address
     */
    function launch(
        string memory name,
        string memory symbol,
        string memory description,
        string memory imageURI,
        uint256 xrgeLiquidity,
        uint256 tokenLiquidity
    ) external returns (address token, address pool) {
        if (xrgeLiquidity < MIN_LIQUIDITY || tokenLiquidity < MIN_LIQUIDITY) {
            revert InsufficientLiquidity();
        }

        // Deploy token
        GltchToken newToken = new GltchToken(
            name,
            symbol,
            description,
            imageURI,
            msg.sender,
            DEFAULT_SUPPLY
        );
        token = address(newToken);

        // Transfer XRGE from creator for liquidity
        IERC20(xrge).transferFrom(msg.sender, address(this), xrgeLiquidity);

        // Transfer tokens from creator (they received full supply)
        IERC20(token).transferFrom(msg.sender, address(this), tokenLiquidity);

        // Create pool and add liquidity
        (pool, uint256 positionId) = _createPoolAndAddLiquidity(
            token,
            xrgeLiquidity,
            tokenLiquidity
        );

        // Record launch
        launches[token] = LaunchInfo({
            token: token,
            creator: msg.sender,
            pool: pool,
            positionId: positionId,
            launchedAt: block.timestamp,
            initialXrge: xrgeLiquidity,
            initialTokens: tokenLiquidity
        });

        allTokens.push(token);
        creatorTokens[msg.sender].push(token);

        emit TokenLaunched(token, msg.sender, name, symbol, pool, positionId);

        return (token, pool);
    }

    /**
     * @notice Launch with default liquidity amounts
     * @dev Uses 1% of supply for liquidity
     */
    function launchSimple(
        string memory name,
        string memory symbol,
        string memory description,
        string memory imageURI,
        uint256 xrgeLiquidity
    ) external returns (address token, address pool) {
        // Default: 1% of supply for liquidity
        uint256 tokenLiquidity = DEFAULT_SUPPLY / 100;
        
        return this.launch(name, symbol, description, imageURI, xrgeLiquidity, tokenLiquidity);
    }

    // ============ Fee Collection ============
    
    /**
     * @notice Collect accumulated trading fees from a pool position
     * @param token The token address
     */
    function collectFees(address token) external returns (uint256 xrgeAmount, uint256 tokenAmount) {
        LaunchInfo storage info = launches[token];
        if (info.creator != msg.sender) revert NotCreator();

        // Collect fees from Uniswap position
        INonfungiblePositionManager.CollectParams memory params = INonfungiblePositionManager.CollectParams({
            tokenId: info.positionId,
            recipient: msg.sender,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });

        (uint256 amount0, uint256 amount1) = INonfungiblePositionManager(positionManager).collect(params);

        // Determine which is XRGE vs token based on address ordering
        if (token < xrge) {
            tokenAmount = amount0;
            xrgeAmount = amount1;
        } else {
            xrgeAmount = amount0;
            tokenAmount = amount1;
        }

        emit FeesCollected(token, msg.sender, xrgeAmount, tokenAmount);

        return (xrgeAmount, tokenAmount);
    }

    // ============ View Functions ============
    
    /**
     * @notice Get total number of launched tokens
     */
    function totalTokens() external view returns (uint256) {
        return allTokens.length;
    }

    /**
     * @notice Get tokens launched by a creator
     */
    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }

    /**
     * @notice Get launch info for a token
     */
    function getLaunchInfo(address token) external view returns (LaunchInfo memory) {
        return launches[token];
    }

    // ============ Internal Functions ============
    
    function _createPoolAndAddLiquidity(
        address token,
        uint256 xrgeLiquidity,
        uint256 tokenLiquidity
    ) internal returns (address pool, uint256 positionId) {
        // Sort tokens (Uniswap requires token0 < token1)
        (address token0, address token1) = token < xrge ? (token, xrge) : (xrge, token);
        (uint256 amount0, uint256 amount1) = token < xrge 
            ? (tokenLiquidity, xrgeLiquidity) 
            : (xrgeLiquidity, tokenLiquidity);

        // Approve position manager
        IERC20(token0).approve(positionManager, amount0);
        IERC20(token1).approve(positionManager, amount1);

        // Calculate initial price (sqrt price for Uniswap V3)
        // Price = amount1 / amount0, sqrtPriceX96 = sqrt(price) * 2^96
        uint160 sqrtPriceX96 = _calculateSqrtPriceX96(amount0, amount1);

        // Create and initialize pool
        pool = INonfungiblePositionManager(positionManager).createAndInitializePoolIfNecessary(
            token0,
            token1,
            DEFAULT_FEE,
            sqrtPriceX96
        );

        // Add liquidity with full range (-887220 to 887220 for 1% fee tier)
        INonfungiblePositionManager.MintParams memory mintParams = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: DEFAULT_FEE,
            tickLower: -887200,  // Near minimum tick for 1% fee
            tickUpper: 887200,   // Near maximum tick for 1% fee
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: address(this), // Factory holds the LP position
            deadline: block.timestamp + 300
        });

        (positionId, , , ) = INonfungiblePositionManager(positionManager).mint(mintParams);

        emit LiquidityAdded(token, pool, xrgeLiquidity, tokenLiquidity, positionId);

        return (pool, positionId);
    }

    function _calculateSqrtPriceX96(uint256 amount0, uint256 amount1) internal pure returns (uint160) {
        // sqrtPriceX96 = sqrt(amount1/amount0) * 2^96
        // Using a simplified calculation for full-range liquidity
        uint256 ratioX192 = (amount1 << 192) / amount0;
        uint256 sqrtRatioX96 = _sqrt(ratioX192);
        return uint160(sqrtRatioX96);
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}

// ============ Interfaces ============

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
