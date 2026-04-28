pragma solidity ^0.8.20;

contract Vault {
    address public owner;
    bool public paused;
    mapping(address => uint256) public balances;

    constructor() {
        owner = msg.sender;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "balance");
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        balances[msg.sender] -= amount;
    }

    function emergencyWithdraw(address payable to, uint256 amount) external {
        require(msg.sender == owner, "owner only");
        to.transfer(amount);
    }
}

