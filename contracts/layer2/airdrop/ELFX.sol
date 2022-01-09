// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ELFX is Ownable, ERC20Burnable {
    /**
     * @dev there is an initial amount minted for the admin during the deployment.
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialAMount
    ) ERC20(name, symbol) {
        mint(msg.sender, initialAMount);
    }

    /**
     * @dev admin can also mint anytime.
     */
    function mint(address account, uint256 amount) public virtual onlyOwner {
        _mint(account, amount);
    }
}
