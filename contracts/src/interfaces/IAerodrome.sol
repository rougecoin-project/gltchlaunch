// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAerodrome Interfaces
 * @notice Minimal interfaces for Aerodrome DEX integration on Base
 */

interface IAerodromeRouter {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function addLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function getAmountsOut(
        uint256 amountIn,
        Route[] calldata routes
    ) external view returns (uint256[] memory amounts);

    function poolFor(
        address tokenA,
        address tokenB,
        bool stable,
        address factory
    ) external view returns (address pool);

    function factory() external view returns (address);
}

interface IAerodromePoolFactory {
    function createPool(
        address tokenA,
        address tokenB,
        bool stable
    ) external returns (address pool);

    function getPool(
        address tokenA,
        address tokenB,
        bool stable
    ) external view returns (address);

    function isPaused() external view returns (bool);
}

interface IAerodromePool {
    function getReserves() external view returns (
        uint256 reserve0,
        uint256 reserve1,
        uint256 blockTimestampLast
    );

    function token0() external view returns (address);
    function token1() external view returns (address);
    function stable() external view returns (bool);
    function totalSupply() external view returns (uint256);

    function claimFees() external returns (uint256 claimed0, uint256 claimed1);
    function claimable0(address) external view returns (uint256);
    function claimable1(address) external view returns (uint256);
}

interface IAerodromeGauge {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function getReward(address account) external;
    function earned(address account) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}
