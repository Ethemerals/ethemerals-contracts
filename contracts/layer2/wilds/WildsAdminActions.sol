 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "../../interfaces/IERC721.sol";
import "../../interfaces/IMeralManager.sol";

contract WildsAdminActions {
  /*///////////////////////////////////////////////////////////////
                  EVENTS
  //////////////////////////////////////////////////////////////*/
  event LandChange(uint16 landId, uint timestamp, uint16 baseDefence);
  event Staked(uint16 landId, uint Id, uint8 stakeAction, bool meral);
  event Unstaked(uint Id, uint32 xp);
  event LCPChange(uint16 landId, uint Id, uint change);
  event RaidStatusChange(uint16 landId, uint8 RaidStatus);
  event DeathKissed(uint Id, uint deathId);
  event Swapped(uint Id, uint swapperId);
  event RaidAction(uint toId, uint fromId, uint8 actionType);


  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/
  enum StakeAction {UNSTAKED, DEFEND, LOOT, BIRTH, ATTACK}
  enum RaidStatus {DEFAULT, RAIDABLE, RAIDING}

  // ALL LANDSPLOTS
  mapping (uint16 => Land) public landPlots;
  // MERALS => STAKES
  mapping (uint => Stake) public stakes;
  // LAND PLOTS => MERALS => LCP
  mapping (uint16 => mapping(uint => uint)) private landClaimPoints;
  // land PLOTS => StakeAction Slots => MERALS
  mapping (uint16 => mapping(StakeAction => uint[])) private slots;
  // land PLOTS => StakeEvents
  mapping (uint16 => StakeEvent[]) public stakeEvents;

  // [attack, attackAll, heal, healAll, magicAttack, speedAttack, enrage, concentrate]
  uint8[] public staminaCosts = [30,60,40,90,40,40,50,50];
  uint8 private extraDefBonus = 140; // DAILED already

  struct StakeEvent {
    uint timestamp;
    uint16 baseDefence;
  }

  struct Stake {
    address owner;
    uint lastAction;
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
    uint remainingELFx;
    uint emissionRate; // DEV IMPROVE
    uint lastRaid;
    uint16 initBaseDefence;
    uint16 baseDefence;
    RaidStatus raidStatus; // 0 - default, 1 - raidable, 2 - currently raiding
    ItemPool lootPool;
    ItemPool petPool;
  }

  IMeralManager merals;
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
  function _adminUnstake(uint[] storage _slots) private {
    for(uint i = 0; i < _slots.length; i++) {
      merals.transfer(address(this), stakes[_slots[i]].owner, _slots[i]);
      delete stakes[_slots[i]];

      emit Unstaked(_slots[i], 0);
    }
  }



}