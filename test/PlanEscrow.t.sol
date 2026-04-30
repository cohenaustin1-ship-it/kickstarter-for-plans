// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PlanEscrow} from "../contracts/PlanEscrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

contract PlanEscrowTest is Test {
    PlanEscrow esc;
    MockUSDC usdc;
    address organizer = address(0xA1);
    address alice     = address(0xB1);
    address bob       = address(0xB2);

    uint128 constant COST = 300_000_000; // $300 USDC (6 decimals)

    function setUp() public {
        usdc = new MockUSDC();
        esc = new PlanEscrow(IERC20(address(usdc)));

        usdc.mint(alice, 1_000_000_000);
        usdc.mint(bob,   1_000_000_000);
    }

    function _mkPlan(uint64 threshold) internal returns (uint256 id) {
        vm.prank(organizer);
        id = esc.createPlan(COST, threshold, uint64(block.timestamp + 1 days), "Atera", "Dinner");
    }

    function _commit(address who, uint256 id) internal {
        vm.startPrank(who);
        usdc.approve(address(esc), COST);
        esc.commit(id);
        vm.stopPrank();
    }

    function test_HappyPath_Confirmed() public {
        uint256 id = _mkPlan(2);
        _commit(alice, id);
        _commit(bob, id);

        vm.warp(block.timestamp + 2 days);
        esc.finalize(id);

        uint256 before = usdc.balanceOf(organizer);
        vm.prank(organizer);
        esc.claim(id);
        assertEq(usdc.balanceOf(organizer) - before, uint256(COST) * 2);
    }

    function test_FailedPath_Refunds() public {
        uint256 id = _mkPlan(5); // threshold won't be met
        _commit(alice, id);

        vm.warp(block.timestamp + 2 days);
        esc.finalize(id);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        esc.claim(id);
        assertEq(usdc.balanceOf(alice) - before, COST);
    }

    function test_RevertWhen_DoubleClaim() public {
        uint256 id = _mkPlan(5);
        _commit(alice, id);
        vm.warp(block.timestamp + 2 days);
        esc.finalize(id);
        vm.prank(alice);
        esc.claim(id);
        vm.expectRevert(PlanEscrow.AlreadyClaimed.selector);
        vm.prank(alice);
        esc.claim(id);
    }
}
