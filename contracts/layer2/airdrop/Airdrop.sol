// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Airdrop is Ownable {
    IERC20 public token;

    constructor(address _token) {
        token = IERC20(_token);
    }

    /**
     * @dev it transfers the amountPerAddress to each address in the _to array.
     * the size of the array has to be chosen carefully otherwise the transaction will overshoot the gas limit.
     */
    function distribute(address[] calldata _to, uint256 amountPerAddress)
        external
        onlyOwner
    {
        require(
            token.balanceOf(msg.sender) >= amountPerAddress * _to.length,
            "Admin does not have enough tokens to distribute"
        );
        for (uint256 i = 0; i < _to.length; i++) {
            require(
                token.transferFrom(msg.sender, _to[i], amountPerAddress),
                "Token transfer failed"
            );
        }
    }
}
