// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GltchToken
 * @notice ERC-20 token for GLTCH agents with creator fee collection
 * @dev Deployed by GltchFactory for each agent
 */
contract GltchToken is ERC20, Ownable {
    string public description;
    string public imageURI;
    address public creator;
    uint256 public launchedAt;

    event MetadataUpdated(string description, string imageURI);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory description_,
        string memory imageURI_,
        address creator_,
        uint256 initialSupply_
    ) ERC20(name_, symbol_) Ownable(creator_) {
        description = description_;
        imageURI = imageURI_;
        creator = creator_;
        launchedAt = block.timestamp;

        // Mint initial supply to deployer (factory) for distribution
        _mint(msg.sender, initialSupply_);
    }

    /**
     * @notice Update token metadata (only owner)
     */
    function setMetadata(string memory description_, string memory imageURI_) external onlyOwner {
        description = description_;
        imageURI = imageURI_;
        emit MetadataUpdated(description_, imageURI_);
    }

    /**
     * @notice Get full token info
     */
    function getInfo() external view returns (
        string memory name_,
        string memory symbol_,
        string memory description_,
        string memory imageURI_,
        address creator_,
        uint256 totalSupply_,
        uint256 launchedAt_
    ) {
        return (
            name(),
            symbol(),
            description,
            imageURI,
            creator,
            totalSupply(),
            launchedAt
        );
    }
}
