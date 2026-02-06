// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GltchFactory.sol";
import "../src/GltchToken.sol";

/**
 * @title GltchFactory Tests
 * @notice Unit tests for the GLTCH token factory
 */
contract GltchFactoryTest is Test {
    GltchFactory public factory;
    
    // Mock addresses
    address public xrge;
    address public positionManager;
    address public uniswapFactory;
    
    address public creator = address(0x1234);
    
    function setUp() public {
        // Deploy mock tokens for testing
        xrge = address(new MockERC20("Rougecoin", "XRGE"));
        positionManager = address(new MockPositionManager());
        uniswapFactory = address(0x3333);
        
        // Deploy factory
        factory = new GltchFactory(xrge, positionManager, uniswapFactory);
        
        // Fund creator with XRGE
        MockERC20(xrge).mint(creator, 1_000_000 ether);
    }

    function test_FactoryDeployment() public view {
        assertEq(factory.xrge(), xrge);
        assertEq(factory.positionManager(), positionManager);
        assertEq(factory.totalTokens(), 0);
    }

    function test_RevertOnInvalidAddresses() public {
        vm.expectRevert(GltchFactory.InvalidAddress.selector);
        new GltchFactory(address(0), positionManager, uniswapFactory);
    }

    function test_TokenDeployment() public {
        // This tests just the token, not the full launch (which needs real Uniswap)
        GltchToken token = new GltchToken(
            "Test Agent",
            "TEST",
            "A test GLTCH agent",
            "ipfs://test",
            creator,
            1_000_000_000 ether
        );

        assertEq(token.name(), "Test Agent");
        assertEq(token.symbol(), "TEST");
        assertEq(token.description(), "A test GLTCH agent");
        assertEq(token.creator(), creator);
        assertEq(token.balanceOf(creator), 1_000_000_000 ether);
    }

    function test_TokenMetadataUpdate() public {
        GltchToken token = new GltchToken(
            "Test Agent",
            "TEST",
            "Original description",
            "ipfs://original",
            creator,
            1_000_000_000 ether
        );

        // Only owner can update
        vm.prank(creator);
        token.setMetadata("New description", "ipfs://new");

        assertEq(token.description(), "New description");
        assertEq(token.imageURI(), "ipfs://new");
    }

    function test_TokenMetadataUpdateRevertNonOwner() public {
        GltchToken token = new GltchToken(
            "Test Agent",
            "TEST",
            "Original",
            "ipfs://test",
            creator,
            1_000_000_000 ether
        );

        // Non-owner should revert
        vm.prank(address(0x9999));
        vm.expectRevert();
        token.setMetadata("Hacked", "ipfs://hacked");
    }

    function test_TokenGetInfo() public {
        GltchToken token = new GltchToken(
            "Info Test",
            "INFO",
            "Test description",
            "ipfs://info",
            creator,
            500_000_000 ether
        );

        (
            string memory name,
            string memory symbol,
            string memory description,
            string memory imageURI,
            address tokenCreator,
            uint256 totalSupply,
            uint256 launchedAt
        ) = token.getInfo();

        assertEq(name, "Info Test");
        assertEq(symbol, "INFO");
        assertEq(description, "Test description");
        assertEq(imageURI, "ipfs://info");
        assertEq(tokenCreator, creator);
        assertEq(totalSupply, 500_000_000 ether);
        assertGt(launchedAt, 0);
    }

    function test_CreatorTokensTracking() public view {
        // Initially empty
        address[] memory tokens = factory.getCreatorTokens(creator);
        assertEq(tokens.length, 0);
    }
}

// ============ Mock Contracts ============

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

contract MockPositionManager {
    uint256 public nextTokenId = 1;

    function createAndInitializePoolIfNecessary(
        address,
        address,
        uint24,
        uint160
    ) external pure returns (address) {
        return address(0x5555); // Mock pool address
    }

    function mint(INonfungiblePositionManager.MintParams calldata)
        external
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        tokenId = nextTokenId++;
        liquidity = 1000;
        amount0 = 1000;
        amount1 = 1000;
    }

    function collect(INonfungiblePositionManager.CollectParams calldata)
        external
        pure
        returns (uint256 amount0, uint256 amount1)
    {
        return (100, 100);
    }
}
