// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface IERC721 {
    function safeTransferFrom(address from, address to, uint tokenId) external;
    function ownerOf(uint id) external returns (address);
}

