// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./GltchToken.sol";
import "./interfaces/IAerodrome.sol";

/**
 * @title GltchFactoryAerodrome
 * @notice Factory for deploying GLTCH agent tokens with Aerodrome liquidity (XRGE pairs)
 * @dev Creates volatile pools on Aerodrome DEX - pairs agent tokens with XRGE
 */
contract GltchFactoryAerodrome {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice XRGE token address (Rougecoin)
    address public immutable xrge;

    /// @notice Aerodrome Router
    IAerodromeRouter public immutable router;

    /// @notice Aerodrome Pool Factory
    IAerodromePoolFactory public immutable poolFactory;

    /// @notice Default token supply (1 billion with 18 decimals)
    uint256 public constant DEFAULT_SUPPLY = 1_000_000_000 * 10**18;

    /// @notice All launched tokens
    address[] public launchedTokens;

    /// @notice Token address => creator address
    mapping(address => address) public tokenCreator;

    /// @notice Token address => pool address
    mapping(address => address) public tokenPool;

    /// @notice Token address => LP token balance held by factory
    mapping(address => uint256) public tokenLpBalance;

    /// @notice Creator address => list of created tokens
    mapping(address => address[]) public creatorTokens;

    // ============ Events ============

    event TokenLaunched(
        address indexed token,
        address indexed pool,
        address indexed creator,
        string name,
        string symbol,
        uint256 tokenAmount,
        uint256 xrgeAmount
    );

    event FeesCollected(
        address indexed token,
        address indexed collector,
        uint256 xrgeAmount,
        uint256 tokenAmount
    );

    event LiquidityAdded(
        address indexed token,
        uint256 tokenAmount,
        uint256 xrgeAmount,
        uint256 lpReceived
    );

    // ============ Constructor ============

    constructor(
        address xrge_,
        address router_,
        address poolFactory_
    ) {
        require(xrge_ != address(0), "Invalid XRGE address");
        require(router_ != address(0), "Invalid router address");
        require(poolFactory_ != address(0), "Invalid factory address");

        xrge = xrge_;
        router = IAerodromeRouter(router_);
        poolFactory = IAerodromePoolFactory(poolFactory_);
    }

    // ============ Launch Functions ============

    /**
     * @notice Launch a new agent token with XRGE liquidity on Aerodrome
     * @param name Token name
     * @param symbol Token symbol
     * @param description Token description
     * @param imageURI Token image URI
     * @param tokenAmount Amount of new tokens to add as liquidity (from total supply)
     * @param xrgeAmount Amount of XRGE to pair (transferred from sender)
     * @return token The deployed token address
     * @return pool The Aerodrome pool address
     */
    function launch(
        string memory name,
        string memory symbol,
        string memory description,
        string memory imageURI,
        uint256 tokenAmount,
        uint256 xrgeAmount
    ) external returns (address token, address pool) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        require(tokenAmount > 0, "Token amount must be > 0");
        require(xrgeAmount > 0, "XRGE amount must be > 0");

        // Deploy the token - mints DEFAULT_SUPPLY to this factory
        GltchToken newToken = new GltchToken(
            name,
            symbol,
            description,
            imageURI,
            msg.sender,
            DEFAULT_SUPPLY
        );
        token = address(newToken);

        // Transfer XRGE from creator
        IERC20(xrge).safeTransferFrom(msg.sender, address(this), xrgeAmount);

        // Create pool and add liquidity
        pool = _createPoolAndAddLiquidity(token, tokenAmount, xrgeAmount);

        // Transfer remaining tokens to creator
        uint256 remainingTokens = DEFAULT_SUPPLY - tokenAmount;
        if (remainingTokens > 0) {
            IERC20(token).safeTransfer(msg.sender, remainingTokens);
        }

        // Record launch info
        launchedTokens.push(token);
        tokenCreator[token] = msg.sender;
        tokenPool[token] = pool;
        creatorTokens[msg.sender].push(token);

        emit TokenLaunched(
            token,
            pool,
            msg.sender,
            name,
            symbol,
            tokenAmount,
            xrgeAmount
        );
    }

    /**
     * @notice Simple launch with default liquidity split (50% to pool)
     * @param name Token name
     * @param symbol Token symbol
     * @param xrgeAmount Amount of XRGE to pair
     */
    function launchSimple(
        string memory name,
        string memory symbol,
        uint256 xrgeAmount
    ) external returns (address token, address pool) {
        // 50% of supply goes to liquidity
        uint256 tokenAmount = DEFAULT_SUPPLY / 2;

        // Inline launch logic for gas savings
        GltchToken newToken = new GltchToken(
            name,
            symbol,
            "",
            "",
            msg.sender,
            DEFAULT_SUPPLY
        );
        token = address(newToken);

        IERC20(xrge).safeTransferFrom(msg.sender, address(this), xrgeAmount);

        pool = _createPoolAndAddLiquidity(token, tokenAmount, xrgeAmount);

        // Transfer remaining tokens to creator
        IERC20(token).safeTransfer(msg.sender, tokenAmount);

        launchedTokens.push(token);
        tokenCreator[token] = msg.sender;
        tokenPool[token] = pool;
        creatorTokens[msg.sender].push(token);

        emit TokenLaunched(
            token,
            pool,
            msg.sender,
            name,
            symbol,
            tokenAmount,
            xrgeAmount
        );
    }

    // ============ Liquidity Management ============

    /**
     * @notice Add more liquidity to an existing token's pool
     * @param token Token address
     * @param tokenAmount Amount of tokens to add
     * @param xrgeAmount Amount of XRGE to add
     */
    function addLiquidity(
        address token,
        uint256 tokenAmount,
        uint256 xrgeAmount
    ) external {
        require(tokenPool[token] != address(0), "Token not launched via factory");

        // Transfer tokens from sender
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);
        IERC20(xrge).safeTransferFrom(msg.sender, address(this), xrgeAmount);

        // Approve router
        IERC20(token).approve(address(router), tokenAmount);
        IERC20(xrge).approve(address(router), xrgeAmount);

        // Add liquidity (volatile pool)
        (uint256 actualToken, uint256 actualXrge, uint256 liquidity) = router.addLiquidity(
            token,
            xrge,
            false, // volatile
            tokenAmount,
            xrgeAmount,
            0, // accept any ratio
            0,
            address(this),
            block.timestamp + 300
        );

        tokenLpBalance[token] += liquidity;

        // Refund unused tokens
        if (tokenAmount > actualToken) {
            IERC20(token).safeTransfer(msg.sender, tokenAmount - actualToken);
        }
        if (xrgeAmount > actualXrge) {
            IERC20(xrge).safeTransfer(msg.sender, xrgeAmount - actualXrge);
        }

        emit LiquidityAdded(token, actualToken, actualXrge, liquidity);
    }

    /**
     * @notice Collect trading fees from a pool (only creator)
     * @param token Token address
     */
    function collectFees(address token) external {
        require(tokenCreator[token] == msg.sender, "Not token creator");
        address pool = tokenPool[token];
        require(pool != address(0), "Pool not found");

        IAerodromePool aeroPool = IAerodromePool(pool);
        (uint256 claimed0, uint256 claimed1) = aeroPool.claimFees();

        // Determine which is XRGE and which is token
        address token0 = aeroPool.token0();
        uint256 xrgeAmount;
        uint256 tokenAmount;

        if (token0 == xrge) {
            xrgeAmount = claimed0;
            tokenAmount = claimed1;
        } else {
            xrgeAmount = claimed1;
            tokenAmount = claimed0;
        }

        // Transfer fees to creator
        if (xrgeAmount > 0) {
            IERC20(xrge).safeTransfer(msg.sender, xrgeAmount);
        }
        if (tokenAmount > 0) {
            IERC20(token).safeTransfer(msg.sender, tokenAmount);
        }

        emit FeesCollected(token, msg.sender, xrgeAmount, tokenAmount);
    }

    // ============ View Functions ============

    /**
     * @notice Get pending fees for a token
     */
    function pendingFees(address token) external view returns (uint256 xrgeAmount, uint256 tokenAmount) {
        address pool = tokenPool[token];
        if (pool == address(0)) return (0, 0);

        IAerodromePool aeroPool = IAerodromePool(pool);
        address token0 = aeroPool.token0();

        uint256 pending0 = aeroPool.claimable0(address(this));
        uint256 pending1 = aeroPool.claimable1(address(this));

        if (token0 == xrge) {
            xrgeAmount = pending0;
            tokenAmount = pending1;
        } else {
            xrgeAmount = pending1;
            tokenAmount = pending0;
        }
    }

    /**
     * @notice Get pool reserves for a token
     */
    function getPoolReserves(address token) external view returns (
        uint256 xrgeReserve,
        uint256 tokenReserve
    ) {
        address pool = tokenPool[token];
        if (pool == address(0)) return (0, 0);

        IAerodromePool aeroPool = IAerodromePool(pool);
        (uint256 reserve0, uint256 reserve1,) = aeroPool.getReserves();
        address token0 = aeroPool.token0();

        if (token0 == xrge) {
            xrgeReserve = reserve0;
            tokenReserve = reserve1;
        } else {
            xrgeReserve = reserve1;
            tokenReserve = reserve0;
        }
    }

    /**
     * @notice Get all tokens launched via this factory
     */
    function getAllTokens() external view returns (address[] memory) {
        return launchedTokens;
    }

    /**
     * @notice Get tokens created by a specific address
     */
    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }

    /**
     * @notice Get total number of launched tokens
     */
    function totalTokens() external view returns (uint256) {
        return launchedTokens.length;
    }

    /**
     * @notice Get full token info including pool
     */
    function getTokenInfo(address token) external view returns (
        string memory name,
        string memory symbol,
        string memory description,
        address creator,
        address pool,
        uint256 totalSupply
    ) {
        require(tokenCreator[token] != address(0), "Token not found");

        GltchToken t = GltchToken(token);
        (name, symbol, description, creator,,) = t.getInfo();
        pool = tokenPool[token];
        totalSupply = t.totalSupply();
    }

    // ============ Internal Functions ============

    function _createPoolAndAddLiquidity(
        address token,
        uint256 tokenAmount,
        uint256 xrgeAmount
    ) internal returns (address pool) {
        // Get or create pool
        pool = poolFactory.getPool(token, xrge, false);
        if (pool == address(0)) {
            pool = poolFactory.createPool(token, xrge, false);
        }

        // Approve router
        IERC20(token).approve(address(router), tokenAmount);
        IERC20(xrge).approve(address(router), xrgeAmount);

        // Add liquidity
        (,, uint256 liquidity) = router.addLiquidity(
            token,
            xrge,
            false, // volatile pool (not stable)
            tokenAmount,
            xrgeAmount,
            0, // Accept any ratio (new pool)
            0,
            address(this),
            block.timestamp + 300 // 5 min deadline
        );

        tokenLpBalance[token] = liquidity;
    }
}
