// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PlanEscrow
/// @notice On-chain group commitment + escrow for real-world events.
///         Organizers set a cost, attendee threshold, and deadline.
///         Committers lock USDC. After the deadline, anyone can finalize:
///         - threshold met  -> Confirmed, organizer can claim the pool
///         - threshold miss -> Failed,    each committer can claim a refund
contract PlanEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State { Pending, Confirmed, Failed }

    struct Plan {
        address organizer;
        uint128 costPerHead;     // in USDC (6 decimals)
        uint64  threshold;
        uint64  deadline;        // unix seconds
        State   state;
        string  title;
        string  description;
    }

    IERC20 public immutable usdc;

    uint256 public nextPlanId = 1;
    mapping(uint256 => Plan)                              public plans;
    mapping(uint256 => address[])                         private _committers;
    mapping(uint256 => mapping(address => bool))          public hasCommitted;
    mapping(uint256 => mapping(address => bool))          public hasClaimed;

    // --- Events --------------------------------------------------------
    event PlanCreated(
        uint256 indexed planId,
        address indexed organizer,
        uint128 costPerHead,
        uint64 threshold,
        uint64 deadline,
        string title
    );
    event Committed(uint256 indexed planId, address indexed committer);
    event Finalized(uint256 indexed planId, State state, uint256 totalCommitters);
    event Claimed(uint256 indexed planId, address indexed claimer, uint256 amount);

    // --- Errors --------------------------------------------------------
    error InvalidCost();
    error InvalidThreshold();
    error InvalidDeadline();
    error PlanNotPending();
    error DeadlinePassed();
    error DeadlineNotReached();
    error AlreadyCommitted();
    error NotCommitter();
    error NotOrganizer();
    error AlreadyClaimed();
    error NotFinalized();

    constructor(IERC20 _usdc) {
        usdc = _usdc;
    }

    // --- Reads ---------------------------------------------------------
    function committers(uint256 planId) external view returns (address[] memory) {
        return _committers[planId];
    }

    function committerCount(uint256 planId) external view returns (uint256) {
        return _committers[planId].length;
    }

    // --- Writes --------------------------------------------------------

    /// @notice Create a new plan. Anyone can call.
    function createPlan(
        uint128 costPerHead,
        uint64 threshold,
        uint64 deadline,
        string calldata title,
        string calldata description
    ) external returns (uint256 planId) {
        if (costPerHead == 0) revert InvalidCost();
        if (threshold == 0) revert InvalidThreshold();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        planId = nextPlanId++;
        plans[planId] = Plan({
            organizer: msg.sender,
            costPerHead: costPerHead,
            threshold: threshold,
            deadline: deadline,
            state: State.Pending,
            title: title,
            description: description
        });

        emit PlanCreated(planId, msg.sender, costPerHead, threshold, deadline, title);
    }

    /// @notice Commit to a plan. Caller must have approved `costPerHead` USDC first.
    function commit(uint256 planId) external nonReentrant {
        Plan storage p = plans[planId];
        if (p.state != State.Pending) revert PlanNotPending();
        if (block.timestamp >= p.deadline) revert DeadlinePassed();
        if (hasCommitted[planId][msg.sender]) revert AlreadyCommitted();

        hasCommitted[planId][msg.sender] = true;
        _committers[planId].push(msg.sender);

        usdc.safeTransferFrom(msg.sender, address(this), p.costPerHead);

        emit Committed(planId, msg.sender);
    }

    /// @notice Anyone can finalize after the deadline.
    function finalize(uint256 planId) external {
        Plan storage p = plans[planId];
        if (p.state != State.Pending) revert PlanNotPending();
        if (block.timestamp < p.deadline) revert DeadlineNotReached();

        uint256 count = _committers[planId].length;
        p.state = count >= p.threshold ? State.Confirmed : State.Failed;

        emit Finalized(planId, p.state, count);
    }

    /// @notice Confirmed -> organizer claims the pool.
    ///         Failed    -> each committer claims their refund.
    function claim(uint256 planId) external nonReentrant {
        Plan storage p = plans[planId];
        if (p.state == State.Pending) revert NotFinalized();
        if (hasClaimed[planId][msg.sender]) revert AlreadyClaimed();

        uint256 amount;
        if (p.state == State.Confirmed) {
            if (msg.sender != p.organizer) revert NotOrganizer();
            amount = uint256(p.costPerHead) * _committers[planId].length;
        } else {
            // Failed
            if (!hasCommitted[planId][msg.sender]) revert NotCommitter();
            amount = p.costPerHead;
        }

        hasClaimed[planId][msg.sender] = true;
        usdc.safeTransfer(msg.sender, amount);

        emit Claimed(planId, msg.sender, amount);
    }
}
