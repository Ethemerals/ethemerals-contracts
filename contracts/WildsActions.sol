 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";
import "./IEthemerals.sol";

contract WildsActions {
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

  uint8 private extraDefBonus = 120; // DAILED already
  uint16 private baseDefence = 2000; // DAILED already, lower = more bonus applied - range 1200-2000
  uint16 private baseDamage = 600; // DAILED already, lower = more damage applied - range 50-600

  struct StakeEvent {
    uint256 timestamp;
    uint16 baseDefence;
    uint16 baseDamage;
  }

  struct Stake {
    address owner;
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
    uint16 initBaseDamage;
    uint16 baseDefence;
    uint16 baseDamage;
    RaidStatus raidStatus; // 0 - default, 1 - raidable, 2 - currently raiding
    ItemPool lootPool;
    ItemPool petPool;
  }


  IEthemerals merals;

  // struct RaidAction


// ATTACKER ACTIONS 1min cooldown
// attack - all classes - single target attack 20 points
// arcane - all mages - single high damage target attack 20 points
// aoe - berserker, summoner, dark knight, druid - damage to all - 40 points
// backstab - all rogues - single target attack higher crit chance - 20 points
// focus - all rogues and mages - increase damage stats - 80 points
// enrage - berserker, summoner - increase constant damage to all defenders by 10% - 60 points

// DEFENDERS ACTIONS 1min cooldown
// block - all warriors - reduce incoming attack by 50%, 12hr cd
// defend - knight, paladin - take damage for another, 12hr cd
// dodge - all rogues - 50% chance to ignore all next damage, 12hr cd
// meditate - monk, cleric - increase defence stat by 20%
// concentration aura - paladin, knight, dark knight, monk - increase defence bonus to all by 10% 48hr cd
// healing wave - paladin, cleric, druid - heals all defenders, 24hr cd
// single heal - druid, cleric, monk, 8hr cd


  function raidAction(uint16 toTokenId, uint16 fromTokenId, uint8 actionType) external {
    Stake storage toStake = stakes[toTokenId];
    toStake.health = 100;

    // if(actionType == 1) {

    // }





  }

  function doAction(uint8 actionType) private {

  }


}