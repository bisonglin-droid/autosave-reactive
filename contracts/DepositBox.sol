// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title DepositBox — origin contract (Unichain Sepolia, chain 1301)
/// @notice Users deposit test ETH here. Each deposit emits `Deposit`, which the
///         reactive contract on Reactive Lasna subscribes to.
///         This is the "event source" leg of the loop.
contract DepositBox {
    event Deposit(address indexed depositor, uint256 amount, uint256 timestamp);
    event Withdrawal(address indexed depositor, uint256 amount);

    mapping(address => uint256) public balances;

    /// @notice Deposit test ETH; emits the event Reactive watches.
    function deposit() external payable {
        require(msg.value > 0, "empty deposit");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value, block.timestamp);
    }

    /// @notice Withdraw your own balance (demo convenience, not part of the loop).
    function withdraw(uint256 amount_) external {
        require(balances[msg.sender] >= amount_, "insufficient balance");
        balances[msg.sender] -= amount_;
        (bool ok, ) = msg.sender.call{value: amount_}("");
        require(ok, "transfer failed");
        emit Withdrawal(msg.sender, amount_);
    }
}
