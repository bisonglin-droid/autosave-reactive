// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import { IPayable } from "../lib/reactive/src/interfaces/IPayable.sol";
import { AbstractCallback } from "../lib/reactive/src/base/AbstractCallback.sol";

/// @title SavingsBoard — callback contract (Unichain Sepolia, chain 1301)
/// @notice Destination leg of the loop. The Reactive callback proxy calls
///         `onDeposit` after AutoSaveReactive sees a qualifying deposit.
///         Authenticated twice (docs rule): only the callback proxy may call,
///         and the injected sender must be our reactive contract.
///         It records the auto-save per user: total saved + save count, and
///         emits `AutoSaved` as the visible proof the full loop completed.
///         Honest scope: this MVP records the auto-save instruction on-chain.
///         Moving real funds would be a follow-up (vault with custody); the
///         event-driven loop itself — origin event -> react() -> callback ->
///         state change — is fully real.
contract SavingsBoard is AbstractCallback {
    event AutoSaved(
        address indexed depositor,
        uint256 amount,
        uint256 totalSaved,
        uint256 saveCount
    );

    mapping(address => uint256) public totalSaved;
    mapping(address => uint256) public saveCount;
    uint256 public totalAutoSaved;
    uint256 public totalCallbacks;

    constructor(
        IPayable callbackProxy_,
        address callbackSender_
    ) payable AbstractCallback(callbackProxy_, callbackSender_) {}

    /// @notice Called by the Reactive callback proxy on behalf of our
    ///         reactive contract. First arg is overwritten by the proxy with
    ///         the reactive contract's address — that is what we authenticate.
    function onDeposit(
        address reactive_,
        address depositor_,
        uint256 amount_
    ) external onlyServiceProvider onlyCallbackSender(reactive_) {
        totalSaved[depositor_] += amount_;
        saveCount[depositor_] += 1;
        totalAutoSaved += amount_;
        totalCallbacks += 1;
        emit AutoSaved(depositor_, amount_, totalSaved[depositor_], saveCount[depositor_]);
    }

    /// @notice Settles outstanding debt from this contract's own balance.
    function coverDebt() external {
        _coverDebt();
    }
}
