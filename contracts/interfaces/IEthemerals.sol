// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface IEthemerals {

  function safeTransferFrom(address from, address to, uint256 tokenId) external;
  function ownerOf(uint256 _tokenId) external view returns (address);

}