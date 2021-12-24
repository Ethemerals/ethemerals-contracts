 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";
import "./WildsCalculate.sol";
import "./IEthemerals.sol";


contract WildsActions is WildsCalculate {
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

  uint8[] public staminaCosts = [30,60,50,100];
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
    uint16 initBaseDamage;
    uint16 baseDefence;
    uint16 baseDamage;
    RaidStatus raidStatus; // 0 - default, 1 - raidable, 2 - currently raiding
    ItemPool lootPool;
    ItemPool petPool;
  }

  IEthemerals merals;
  address public admin;
  address private staking;
  address private actions;




  // struct RaidActionType {
  //   health:

  // }


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
    // TODO restrict by class
    // TODO restrict to avoid infinite staking

    uint16 maxStamina = 100; // TODO get from inventory
    uint16 staminaCost = staminaCosts[actionType]; // HARDCODED
    uint16 stamina = calculateStamina(fromTokenId);
    require(stamina + staminaCost <= maxStamina, 'need stamina');

    Stake storage toStake = stakes[toTokenId];
    Stake storage fromStake = stakes[fromTokenId];
    IEthemerals.Meral memory toMeral = merals.getEthemeral(toTokenId);
    IEthemerals.Meral memory fromMeral = merals.getEthemeral(fromTokenId);

    fromStake.stamina = stamina + staminaCost;
    fromStake.lastAction = block.timestamp;


    if(actionType == 0) {
      // single attack
      toStake.damage += uint16(calculateStatDamage(fromMeral.atk, toMeral.def));
    }
    if(actionType == 1) {
      _attackAll(fromStake, fromMeral.atk);
    }
    if(actionType == 2) {
      // single heal
      // ATTACKERS CANNOT HEAL
      toStake.health += uint16(calculateLightMagicDamage(fromMeral.def, toMeral.spd));
    }
    if(actionType == 3) {
      // ATTACKERS CANNOT HEAL
      _healAll(fromStake, fromMeral.def, fromMeral.spd);
    }

  }

  function _attackAll(Stake storage fromStake, uint16 atk) internal {
    uint16[] memory defenders = slots[fromStake.landId][StakeAction.DEFEND];

    for(uint16 i = 0; i < defenders.length; i ++) {
      Stake storage toStake = stakes[defenders[i]];
      IEthemerals.Meral memory toMeral = merals.getEthemeral(defenders[i]);
      toStake.damage += uint16(calculateStatDamage(atk, toMeral.def));
    }
  }

  function _healAll(Stake storage fromStake, uint16 def, uint16 spd) internal {
    uint16[] memory defenders = slots[fromStake.landId][StakeAction.DEFEND];

    for(uint16 i = 0; i < defenders.length; i ++) {
      Stake storage toStake = stakes[defenders[i]];
      toStake.health += uint16(calculateLightMagicDamage(def, spd));
    }
  }

  function _concentration(uint16 fromTokenId, uint8 actionType) internal {

  }

  function calculateStamina(uint16 _tokenId) internal view returns(uint16) {
    Stake memory _stake = stakes[_tokenId];
    IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId);

    uint256 change = block.timestamp - _stake.lastAction;
    uint256 scaledSpeed = safeScale(_meral.spd, 1600, 2, 10);
    uint256 gain = change / 3600 * scaledSpeed;

    return uint16(gain > _stake.stamina ? 0 : _stake.stamina - gain);
  }



}