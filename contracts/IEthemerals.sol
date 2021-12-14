// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;
interface IEthemerals {

  struct Meral {
    uint16 score;
    uint32 rewards;
    uint16 atk;
    uint16 def;
    uint16 spd;
  }

  function safeTransferFrom(address from, address to, uint256 tokenId) external;
  function ownerOf(uint256 _tokenId) external view returns (address);
  function totalSupply() external view returns (uint256);
  function changeScore(uint _tokenId, uint16 offset, bool add, uint32 amount) external;
  function changeRewards(uint _tokenId, uint32 offset, bool add, uint8 action) external;
  function getEthemeral(uint _tokenId) external view returns(Meral memory);
}