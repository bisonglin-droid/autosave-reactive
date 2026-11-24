// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import { ISystemContract } from "../lib/reactive/src/interfaces/ISystemContract.sol";
import { IReactive } from "../lib/reactive/src/interfaces/IReactive.sol";
import { AbstractReactive } from "../lib/reactive/src/base/AbstractReactive.sol";

/// @title AutoSaveReactive — reactive contract (Reactive Lasna, chain 5318007)
/// @notice "Set It and Forget It" track: a personal auto-save rule that lives
///         on-chain. It subscribes to `Deposit` events from DepositBox on
///         Unichain Sepolia. Whenever a deposit >= threshold arrives, it asks
///         the system contract for a callback to SavingsBoard on Unichain
///         Sepolia, which records the auto-save. No bot, no server, no polling:
///         the rule runs itself for as long as the contract stays funded.
///         Dust deposits below the threshold are seen but ignored (no callback,
///         no wasted gas on the destination chain).
contract AutoSaveReactive is AbstractReactive {
    uint256 public constant ORIGIN_CHAIN_ID = 1301; // Unichain Sepolia
    uint256 public constant DEST_CHAIN_ID = 1301; // Unichain Sepolia
    // keccak256("Deposit(address,uint256,uint256)")
    uint256 public constant DEPOSIT_TOPIC0 =
        uint256(keccak256("Deposit(address,uint256,uint256)"));

    uint64 private constant CALLBACK_GAS_LIMIT = 500000;

    address public immutable originContract; // DepositBox on Unichain Sepolia
    address public owner;
    address public callbackRecipient; // SavingsBoard on Unichain Sepolia
    uint256 public threshold; // minimum deposit (wei) that triggers a callback

    uint256 public reactions; // Deposit events seen
    uint256 public callbacksRequested;
    uint256 public lastAmount;
    address public lastDepositor;

    event ThresholdUpdated(uint256 threshold);
    event RecipientUpdated(address recipient);
    event ReactionSeen(address indexed depositor, uint256 amount, bool triggered);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    /// @param originContract_ DepositBox address on Unichain Sepolia.
    /// @param threshold_ Minimum deposit (wei) that triggers a callback.
    constructor(address originContract_, uint256 threshold_) payable {
        originContract = originContract_;
        threshold = threshold_;
        owner = msg.sender;
        SYSTEM.subscribe(
            ORIGIN_CHAIN_ID,
            originContract_,
            DEPOSIT_TOPIC0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }

    /// @notice Deployment order (per docs): deploy reactive first, then the
    ///         callback contract with this address, then set it here.
    function setRecipient(address recipient_) external onlyOwner {
        callbackRecipient = recipient_;
        emit RecipientUpdated(recipient_);
    }

    function setThreshold(uint256 threshold_) external onlyOwner {
        threshold = threshold_;
        emit ThresholdUpdated(threshold_);
    }

    /// @notice Settles outstanding debt from this contract's own balance.
    function coverDebt() external {
        _coverDebt();
    }

    /// @inheritdoc IReactive
    /// @dev Deposit(address indexed, uint256, uint256) arrives as LOG2:
    ///      topic1 = depositor, data = abi.encode(amount, timestamp).
    ///      Non-matching logs fall through silently (never revert: a revert
    ///      still gets billed).
    function react(LogRecord memory log_) external onlySystem {
        if (log_.topic0 != DEPOSIT_TOPIC0 || log_.opCode != 2) {
            return;
        }
        address depositor = address(uint160(log_.topic1));
        (uint256 amount, ) = abi.decode(log_.data, (uint256, uint256));

        reactions += 1;
        lastAmount = amount;
        lastDepositor = depositor;

        bool triggered = false;
        if (amount >= threshold && callbackRecipient != address(0)) {
            triggered = true;
            callbacksRequested += 1;
            bytes memory payload = abi.encodeWithSignature(
                "onDeposit(address,address,uint256)",
                address(0), // overwritten by the proxy with this contract's address
                depositor,
                amount
            );
            SYSTEM.requestCallbackV_1_0(
                ISystemContract.CallbackConfiguration_V_1_0({
                    chainId: DEST_CHAIN_ID,
                    recipient: callbackRecipient,
                    gasLimit: CALLBACK_GAS_LIMIT,
                    payload: payload
                })
            );
        }
        emit ReactionSeen(depositor, amount, triggered);
    }
}
