// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";


import "./WildsCalculate.sol";
import "../interfaces/interfaces.sol";
import "../interfaces/IMeralManager.sol";

contract WildsActions is WildsCalculate {
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


// DEFENDERS ACTIONS 1min cooldown
// block - all warriors - reduce incoming attack by 50%, 12hr cd
// defend - knight, paladin - take damage for another, 12hr cd
// dodge - all rogues - 50% chance to ignore all next damage, 12hr cd


  function raidAction(uint toId, uint fromId, uint8 actionType) external {
    Stake storage toStake = stakes[toId];
    Stake storage fromStake = stakes[fromId];
    IMeralManager.Meral memory toMeral = merals.getMeralById(toId);
    IMeralManager.Meral memory fromMeral = merals.getMeralById(fromId);

    uint16 maxStamina = fromMeral.maxStamina;
    uint16 staminaCost = staminaCosts[actionType]; // HARDCODED
    uint16 stamina = calculateStamina(fromId);

    require(fromStake.owner == msg.sender, "owner only");
    require(stamina + staminaCost <= maxStamina, 'need stamina');
    require(fromStake.stakeAction == StakeAction.DEFEND || fromStake.stakeAction == StakeAction.ATTACK, "DEFers or ATKers");
    require(fromStake.landId == toStake.landId, "raid group only");
    require(calculateDamage(fromId) < fromMeral.hp, "alive only");
    // TODO restrict by class

    fromStake.stamina = stamina + staminaCost;
    fromStake.lastAction = block.timestamp;

    // [attack, attackAll, magicAttack, speedAttack, enrage, heal, healAll, concentrate]
    if(actionType == 0) {
      toStake.damage += uint16(calculateDefendedDamage(fromMeral.atk, toMeral.def));
    }
    if(actionType == 1) {
      _attackAll(toStake.landId, fromMeral.atk, toStake.stakeAction);
    }
    if(actionType == 2) {
      toStake.damage += uint16(calculateDarkMagicDamage(fromMeral.atk, fromMeral.def));
    }
    if(actionType == 3) {
      toStake.damage += uint16(calculateSpdDamage(fromMeral.atk, toMeral.def, fromMeral.spd));
    }
    if(actionType == 4) {
      _changeBaseDefence(fromId, false);
    }
    if(actionType == 5) {
      require(toStake.stakeAction == fromStake.stakeAction, 'allies only');
      toStake.health += uint16(calculateLightMagicDamage(fromMeral.def, fromMeral.spd));
    }
    if(actionType == 6) {
      require(toStake.stakeAction == fromStake.stakeAction, 'allies only');
      _healAll(fromStake, fromMeral.def, fromMeral.spd);
    }
    if(actionType == 7) {
      require(stakes[fromId].stakeAction == StakeAction.DEFEND, "defender only");
      _changeBaseDefence(fromId, true);
    }

    emit RaidAction(toId, fromId, actionType);
  }

  function _attackAll(uint16 _landId, uint16 atk, StakeAction _stakeAction) private {
    uint[] memory enemies = slots[_landId][_stakeAction];

    for(uint i = 0; i < enemies.length; i ++) {
      Stake storage toStake = stakes[enemies[i]];
      IMeralManager.Meral memory _toMeral = merals.getMeralById(enemies[i]);
      toStake.damage += uint16(calculateDefendedDamage(atk, _toMeral.def));
    }
  }

  function _healAll(Stake storage fromStake, uint16 def, uint16 spd) private {
    uint[] memory allies = slots[fromStake.landId][fromStake.stakeAction];

    for(uint i = 0; i < allies.length; i ++) {
      Stake storage toStake = stakes[allies[i]];
      toStake.health += uint16(calculateLightMagicDamage(def, spd));
    }
  }

  function _changeBaseDefence(uint fromId, bool add) private {
    uint16 _landId = stakes[fromId].landId;
    Land storage _land = landPlots[_landId];
    uint16 _baseDefence;
    if(add) {
      _baseDefence = _land.baseDefence + 400;
      _land.baseDefence = _baseDefence > 4000 ? 4000 : _baseDefence;
    } else {
      _baseDefence = _land.baseDefence < 1000 ? 400 : _land.baseDefence - 400;
      _land.baseDefence = _baseDefence < 2000 ? 2000 : _baseDefence;
    }
    // REGISTER EVENT
    StakeEvent memory _stakeEvent = StakeEvent(block.timestamp, _land.baseDefence);
    stakeEvents[_landId].push(_stakeEvent);
    emit LandChange(_landId, block.timestamp, _land.baseDefence);
  }


  /*///////////////////////////////////////////////////////////////
                  PRIVATE VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function calculateDamage(uint _Id) public view returns (uint) {
    Stake memory _stake = stakes[_Id];
    Land memory _landPlots = landPlots[_stake.landId];
    IMeralManager.Meral memory _meral = merals.getMeralById(_Id);
    uint damage = _stake.damage;

    // FAST FORWARD TO ENTRY POINT
    if(_stake.stakeAction == StakeAction.DEFEND) {
      for(uint i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
        StakeEvent memory _event = stakeEvents[_stake.landId][i];
        damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def, _event.baseDefence);
      }
      // FOR VIEW NEED EXTRA NOW PING
      damage += calculateChange(stakeEvents[_stake.landId][stakeEvents[_stake.landId].length-1].timestamp, block.timestamp, _meral.def, _landPlots.baseDefence);
    }

    // FAST FORWARD TO ENTRY POINT
    if(_stake.stakeAction == StakeAction.BIRTH) {
      for(uint i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
        StakeEvent memory _event = stakeEvents[_stake.landId][i];
        damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def + _meral.spd, _event.baseDefence);
      }
      // FOR VIEW NEED EXTRA NOW PING
      damage += calculateChange(stakeEvents[_stake.landId][stakeEvents[_stake.landId].length-1].timestamp, block.timestamp, _meral.def + _meral.spd, _landPlots.baseDefence);
    }

    damage = _stake.health >= damage ? 0 : damage - _stake.health;
    return damage > _meral.hp ? _meral.hp : damage;
  }

  function calculateStamina(uint _Id) public view returns(uint16) {
    Stake memory _stake = stakes[_Id];
    IMeralManager.Meral memory _meral = merals.getMeralById(_Id);

    uint change = block.timestamp - _stake.lastAction;
    uint scaledSpeed = safeScale(_meral.spd, 1600, 2, 10);
    uint gain = change / 3600 * scaledSpeed;

    return uint16(gain > _stake.stamina ? 0 : _stake.stamina - gain);
  }


}