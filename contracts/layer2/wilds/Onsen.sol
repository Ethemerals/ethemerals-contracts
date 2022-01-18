 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "../../interfaces/IERC721.sol";
import "../../interfaces/IMeralManager.sol";

contract Onsen is ERC721Holder {

  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  IMeralManager merals;
  address public admin;

  uint16 public hpMod; // lower = more
  uint16 public xpMod; // lower = more
  uint16 public elfMod; // lower = more

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
    hpMod = 10000;
    xpMod = 7200;
    elfMod = 10000;
  }

  function adminUnstake(uint _Id) external {
    Stake memory _stake = stakes[_Id];
    require(_stake.owner == msg.sender || msg.sender == admin, "owner only");
    merals.transfer(address(this), _stake.owner, _Id);
  }

  function setMods(uint16 _hpMod, uint16 _xpMod, uint16 _elfMod) external {
    require(msg.sender == admin, "admin only");
    hpMod = _hpMod;
    xpMod = _xpMod;
    elfMod = _elfMod;
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
    (uint16 _hpChange, uint32 _xpChange, uint32 _elfChange) = calculateChange(_Id);
    merals.changeHP(_Id, _hpChange, true);
    merals.changeXP(_Id, _xpChange, true);
    merals.changeELF(_Id, _elfChange, true);
  }


  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function calculateChange(uint _Id) public view returns (uint16 hp, uint32 xp, uint32 elf) {
    IMeralManager.Meral memory _meral = merals.getMeralById(_Id); // TODO USE INVENTORY
    uint start = stakes[_Id].timestamp;
    uint end = block.timestamp;
    uint change = end - start;
    uint scaled = safeScale(_meral.spd, 2000, 14, 22);
    uint _hp = (change * scaled) / hpMod;
    uint _xp = change / xpMod;
    uint _elf = change / elfMod;
    return (uint16(_hp), uint32(_xp), uint32(_elf));
  }


  /*///////////////////////////////////////////////////////////////
                  INTERNAL VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function safeScale(uint num, uint inMax, uint outMin, uint outMax) internal pure returns(uint) {
    uint scaled = (num * (outMax - outMin)) / inMax + outMin;
    return scaled > outMax ? outMax : scaled;
  }


}
