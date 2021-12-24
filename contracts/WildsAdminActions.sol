 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";
import "./IEthemerals.sol";


contract WildsAdminActions {
  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/
  enum StakeAction {UNSTAKED, DEFEND, LOOT, BIRTH, ATTACK}
  enum RaidStatus {DEFAULT, RAIDABLE, RAIDING}

  // ALL LANDSPLOTS
  mapping (uint16 => Land) public landPlots;
  // MERALS => STAKES
  mapping (uint16 => Stake) public stakes;
  // LAND PLOTS => MERALS => LCP
  mapping (uint16 => mapping(uint16 => uint256)) private landClaimPoints;
  // land PLOTS => StakeAction Slots => MERALS
  mapping (uint16 => mapping(StakeAction => uint16[])) private slots;
  // land PLOTS => StakeEvents
  mapping (uint16 => StakeEvent[]) public stakeEvents;

  // [attack, attackAll, heal, healAll, magicAttack, speedAttack, enrage, concentrate]
  uint8[] public staminaCosts = [30,60,40,90,40,40,50,50];
  uint8 private extraDefBonus = 140; // DAILED already
  uint16 private baseDefence = 2800; //

  struct StakeEvent {
    uint256 timestamp;
    uint16 baseDefence;
  }

  struct Stake {
    address owner;
    uint256 lastAction;
    uint16 entryPointer;
    uint16 damage;
    uint16 health;
    uint16 stamina;
    uint16 landId;
    StakeAction stakeAction;
  }

  struct ItemPool {
    uint8 cost;
    uint8 drop1;
    uint8 drop2;
    uint8 drop3;
  }

  struct Land {
    uint256 remainingELFx;
    uint256 emissionRate; // DEV IMPROVE
    uint256 lastRaid;
    uint16 initBaseDefence;
    uint16 baseDefence;
    RaidStatus raidStatus; // 0 - default, 1 - raidable, 2 - currently raiding
    ItemPool lootPool;
    ItemPool petPool;
  }

  IEthemerals merals;
  address public admin;
  address public adminActions;
  address public staking;
  address public actions;
  bool public paused;


  function emergencyUnstake(uint16 _landId) external {
    require(msg.sender == admin, "admin only");
    _adminUnstake(slots[_landId][StakeAction.DEFEND]);
    _adminUnstake(slots[_landId][StakeAction.ATTACK]);
    _adminUnstake(slots[_landId][StakeAction.LOOT]);
    _adminUnstake(slots[_landId][StakeAction.BIRTH]);
    delete slots[_landId][StakeAction.DEFEND];
    delete slots[_landId][StakeAction.ATTACK];
    delete slots[_landId][StakeAction.LOOT];
    delete slots[_landId][StakeAction.BIRTH];
    delete stakeEvents[_landId];
  }

  /*///////////////////////////////////////////////////////////////
                  PRIVATE INTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _addItemPool(uint8 _cost, uint8[] calldata _drops) private pure returns (ItemPool memory) {
    return ItemPool({cost: _cost, drop1: _drops[0], drop2: _drops[1], drop3: _drops[2]});
  }

  function _adminUnstake(uint16[] storage _slots) private {
    for(uint16 i = 0; i < _slots.length; i++) {
      merals.safeTransferFrom(address(this), stakes[_slots[i]].owner, _slots[i]);
      delete stakes[_slots[i]];
    }
  }



}