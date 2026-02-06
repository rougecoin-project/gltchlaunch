// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GltchFactory.sol";

/**
 * @title Deploy Script
 * @notice Deploys GltchFactory to Base mainnet or testnet
 * 
 * Usage:
 *   # Testnet (Base Sepolia)
 *   forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
 * 
 *   # Mainnet
 *   forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
 */
contract DeployScript is Script {
    // Base Mainnet addresses
    address constant XRGE_MAINNET = 0x3Eee1FC5c69Ab75E0AB293Bff5Aa7fa634104733;
    address constant POSITION_MANAGER_MAINNET = 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1;
    address constant UNISWAP_FACTORY_MAINNET = 0x33128a8fC17869897dcE68Ed026d694621f6FDfD;

    // Base Sepolia addresses (testnet)
    address constant POSITION_MANAGER_SEPOLIA = 0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2;
    address constant UNISWAP_FACTORY_SEPOLIA = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Detect network by chain ID
        uint256 chainId = block.chainid;
        
        GltchFactory factory;
        
        if (chainId == 8453) {
            // Base Mainnet
            factory = new GltchFactory(
                XRGE_MAINNET,
                POSITION_MANAGER_MAINNET,
                UNISWAP_FACTORY_MAINNET
            );
            console.log("Deployed GltchFactory to Base Mainnet:", address(factory));
        } else if (chainId == 84532) {
            // Base Sepolia - need a test XRGE or use WETH
            // For testnet, you might want to deploy a mock XRGE first
            address testXrge = vm.envOr("TEST_XRGE", address(0));
            require(testXrge != address(0), "Set TEST_XRGE env var for testnet");
            
            factory = new GltchFactory(
                testXrge,
                POSITION_MANAGER_SEPOLIA,
                UNISWAP_FACTORY_SEPOLIA
            );
            console.log("Deployed GltchFactory to Base Sepolia:", address(factory));
        } else {
            revert("Unsupported chain");
        }

        vm.stopBroadcast();
    }
}
