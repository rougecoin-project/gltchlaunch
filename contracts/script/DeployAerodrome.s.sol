// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GltchFactoryAerodrome.sol";

/**
 * @title Deploy Aerodrome Factory Script
 * @notice Deploys GltchFactoryAerodrome to Base mainnet
 * @dev Uses Aerodrome DEX for XRGE liquidity pools
 * 
 * Usage:
 *   # Base Mainnet
 *   forge script script/DeployAerodrome.s.sol --rpc-url base --broadcast --verify
 *   
 *   # Dry run (no broadcast)
 *   forge script script/DeployAerodrome.s.sol --rpc-url base
 */
contract DeployAerodromeScript is Script {
    // Base Mainnet addresses
    address constant XRGE = 0x3Eee1FC5c69Ab75E0AB293Bff5Aa7fa634104733;
    address constant AERODROME_ROUTER = 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;
    address constant AERODROME_FACTORY = 0x420DD381b31aEf6683db6B902084cB0FFECe40Da;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Only deploy on Base mainnet (Aerodrome not on testnet)
        require(block.chainid == 8453, "Only Base mainnet supported");

        GltchFactoryAerodrome factory = new GltchFactoryAerodrome(
            XRGE,
            AERODROME_ROUTER,
            AERODROME_FACTORY
        );

        console.log("============================================");
        console.log("GltchFactoryAerodrome deployed to:", address(factory));
        console.log("============================================");
        console.log("XRGE:", XRGE);
        console.log("Aerodrome Router:", AERODROME_ROUTER);
        console.log("Aerodrome Factory:", AERODROME_FACTORY);
        console.log("============================================");

        vm.stopBroadcast();
    }
}
