 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "../interfaces/interfaces.sol";

contract Onsen is ERC721Holder {

  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  IMeralManager merals;
  address public admin;

  uint16 private scoreMod; // lower = more
  uint16 private rewardsMod; // lower = more

  // MERALS => STAKES
  mapping (uint => Stake) public stakes;

  struct Stake {
    address owner;
    uint timestamp;
  }

  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  constructor(address _meralManager) {
    admin = msg.sender;
    merals = IMeralManager(_meralManager);
    scoreMod = 10000;
    rewardsMod = 7200;
  }

  function adminUnstake(uint _Id) external {
    Stake memory _stake = stakes[_Id];
    require(_stake.owner == msg.sender || msg.sender == admin, "owner only");
    merals.transfer(address(this), _stake.owner, _Id);
  }

  function setMods(uint16 _scoreMod, uint16 _rewardsMod) external {
    require(msg.sender == admin, "admin only");
    scoreMod = _scoreMod;
    rewardsMod = _rewardsMod;
  }

  function setMeralManager(address _meralManager) external {
    require(msg.sender == admin, "admin only");
    merals = IMeralManager(_meralManager);
  }

  /*///////////////////////////////////////////////////////////////
                  PUBLIC FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function stake(uint _Id) external {
    merals.transfer(msg.sender, address(this), _Id);
    stakes[_Id] = Stake({owner: msg.sender, timestamp: block.timestamp});
  }

  function unstake(uint _Id) external {
    Stake memory _stake = stakes[_Id];
    require(_stake.owner == msg.sender || msg.sender == admin, "owner only");
    merals.transfer(address(this), _stake.owner, _Id);

    // CALCULATE CHANGE
    (uint16 _scoreChange, uint32 _rewardsChange) = calculateChange(_Id);
    merals.changeHP(_Id, _scoreChange, true, _rewardsChange);
  }


  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function calculateChange(uint _Id) public view returns (uint16 score, uint32 rewards) {
    IMeralManager.MeralStats memory _meral = merals.getMeralById(_Id); // TODO USE INVENTORY
    uint start = stakes[_Id].timestamp;
    uint end = block.timestamp;
    uint change = end - start;
    uint scaled = safeScale(_meral.spd, 2000, 14, 22);
    uint _score = (change * scaled) / scoreMod;
    uint _rewards = change / rewardsMod;
    return (uint16(_score), uint32(_rewards));
  }


  /*///////////////////////////////////////////////////////////////
                  INTERNAL VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function safeScale(uint num, uint inMax, uint outMin, uint outMax) internal pure returns(uint) {
    uint scaled = (num * (outMax - outMin)) / inMax + outMin;
    return scaled > outMax ? outMax : scaled;
  }


}
