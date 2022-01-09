// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface IEthemeralsOnL2 {
  function safeTransferFrom(address from, address to, uint tokenId) external;
  function ownerOf(uint _tokenId) external view returns (address);
  function exists(uint tokenId) external view returns (bool);
}

