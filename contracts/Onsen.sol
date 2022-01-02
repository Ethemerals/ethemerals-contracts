 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./interfaces/interfaces.sol";


contract Onsen is ERC721Holder {

  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  IEthemeralsLike merals;
  address public admin;
  address public meralManager;

  uint16 private scoreMod; // lower = more
  uint16 private rewardsMod; // lower = more

  // MERALS => STAKES
  mapping (uint16 => Stake) public stakes;

  struct Stake {
    address owner;
    uint256 timestamp;
  }

  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  constructor(address _meral, address _meralManager) {
    admin = msg.sender;
    merals = IEthemeralsLike(_meral);
    meralManager = _meralManager;
    scoreMod = 10000;
    rewardsMod = 7200;
  }

  function adminUnstake(uint16 _tokenId) external {
    Stake memory _stake = stakes[_tokenId];
    require(_stake.owner == msg.sender || msg.sender == admin, "owner only");
    merals.safeTransferFrom(address(this), _stake.owner, _tokenId);
  }

  function setMods(uint16 _scoreMod, uint16 _rewardsMod) external {
    require(msg.sender == admin, "admin only");
    scoreMod = _scoreMod;
    rewardsMod = _rewardsMod;
  }

  /*///////////////////////////////////////////////////////////////
                  PUBLIC FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function stake(uint16 _tokenId) external {
    // TODO allow non merals
    merals.safeTransferFrom(msg.sender, address(this), _tokenId);
    stakes[_tokenId] = Stake({owner: msg.sender, timestamp: block.timestamp});
  }

  function unstake(uint16 _tokenId) external {
    Stake memory _stake = stakes[_tokenId];
    require(_stake.owner == msg.sender || msg.sender == admin, "owner only");
    merals.safeTransferFrom(address(this), _stake.owner, _tokenId);

    // CALCULATE CHANGE
    (uint16 _scoreChange, uint32 _rewardsChange) = calculateChange(_tokenId);
    merals.changeScore(_tokenId, _scoreChange, true, _rewardsChange);
  }


  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function calculateChange(uint16 _tokenId) public view returns (uint16 score, uint32 rewards) {
    IEthemeralsLike.Meral memory _meral = merals.getEthemeral(_tokenId); // TODO USE INVENTORY
    uint256 start = stakes[_tokenId].timestamp;
    uint256 end = block.timestamp;
    uint256 change = end - start;
    uint256 scaled = safeScale(_meral.spd, 2000, 14, 22);
    uint256 _score = (change * scaled) / scoreMod;
    uint256 _rewards = change / rewardsMod;
    return (uint16(_score), uint32(_rewards));
  }


  /*///////////////////////////////////////////////////////////////
                  INTERNAL VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function safeScale(uint256 num, uint256 inMax, uint256 outMin, uint256 outMax) internal pure returns(uint256) {
    uint256 scaled = (num * (outMax - outMin)) / inMax + outMin;
    return scaled > outMax ? outMax : scaled;
  }


}
