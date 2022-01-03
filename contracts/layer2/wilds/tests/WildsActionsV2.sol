 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";
import "../WildsCalculate.sol";
import "../../../IEthemerals.sol";


contract WildsActionsV2 is WildsCalculate {
  /*///////////////////////////////////////////////////////////////
                  EVENTS
  //////////////////////////////////////////////////////////////*/
  event LandChange(uint16 id, uint256 timestamp, uint16 baseDefence);
  event Staked(uint16 landId, uint16 tokenId, uint8 stakeAction, bool meral);
  event Unstaked(uint16 tokenId, uint32 rewards);
  event RaidStatusChange(uint16 id, uint8 RaidStatus);
  event DeathKissed(uint16 tokenId, uint16 deathId);
  event Swapped(uint16 tokenId, uint16 swapperId);
  event RaidAction(uint16 toTokenId, uint16 fromTokenId, uint8 actionType);


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


// DEFENDERS ACTIONS 1min cooldown
// block - all warriors - reduce incoming attack by 50%, 12hr cd
// defend - knight, paladin - take damage for another, 12hr cd
// dodge - all rogues - 50% chance to ignore all next damage, 12hr cd

  // [attack, attackAll, magicAttack, speedAttack, enrage, heal, healAll, concentrate]
  function raidAction(uint16 toTokenId, uint16 fromTokenId, uint8 actionType) external {
    Stake storage toStake = stakes[toTokenId];
    Stake storage fromStake = stakes[fromTokenId];
    IEthemerals.Meral memory toMeral = merals.getEthemeral(toTokenId);
    IEthemerals.Meral memory fromMeral = merals.getEthemeral(fromTokenId);

    uint16 maxStamina = 100; // TODO get from inventory
    uint16 staminaCost = staminaCosts[actionType]; // HARDCODED
    uint16 stamina = calculateStamina(fromTokenId);

    require(fromStake.owner == msg.sender, "owner only");
    require(stamina + staminaCost <= maxStamina, 'need stamina');
    require(fromStake.stakeAction == StakeAction.DEFEND || fromStake.stakeAction == StakeAction.ATTACK, "DEFers or ATKers");
    require(fromStake.landId == toStake.landId, "raid group only");
    require(uint16(calculateDamage(fromTokenId)) < fromMeral.score, "alive only");
    // TODO restrict by class

    fromStake.stamina = stamina + staminaCost;
    fromStake.lastAction = block.timestamp;

    if(actionType == 0) {
      toStake.damage -= uint16(calculateDefendedDamage(fromMeral.atk, toMeral.def));
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
      _changeBaseDefence(fromTokenId, false);
    }
    if(actionType == 5) {
      // require(toStake.stakeAction == fromStake.stakeAction, 'allies only');
      toStake.health += uint16(calculateLightMagicDamage(fromMeral.def, fromMeral.spd));
    }
    if(actionType == 6) {
      require(toStake.stakeAction == fromStake.stakeAction, 'allies only');
      _healAll(fromStake, fromMeral.def, fromMeral.spd);
    }
    if(actionType == 7) {
      require(stakes[fromTokenId].stakeAction == StakeAction.DEFEND, "defender only");
      _changeBaseDefence(fromTokenId, true);
    }

    emit RaidAction(toTokenId, fromTokenId, actionType);
  }

  function _attackAll(uint16 _landId, uint16 atk, StakeAction _stakeAction) private {
    uint16[] memory enemies = slots[_landId][_stakeAction];

    for(uint16 i = 0; i < enemies.length; i ++) {
      Stake storage toStake = stakes[enemies[i]];
      IEthemerals.Meral memory toMeral = merals.getEthemeral(enemies[i]);
      toStake.damage += uint16(calculateDefendedDamage(atk, toMeral.def));
    }
  }

  function _healAll(Stake storage fromStake, uint16 def, uint16 spd) private {
    uint16[] memory allies = slots[fromStake.landId][fromStake.stakeAction];

    for(uint16 i = 0; i < allies.length; i ++) {
      Stake storage toStake = stakes[allies[i]];
      toStake.health += uint16(calculateLightMagicDamage(def, spd));
    }
  }

  function _changeBaseDefence(uint16 fromTokenId, bool add) private {
    Land storage _land = landPlots[stakes[fromTokenId].landId];
    uint16 _baseDefence;
    if(add) {
      _baseDefence = _land.baseDefence + 400;
      _land.baseDefence = _baseDefence > 4000 ? 4000 : _baseDefence;
    } else {
      _baseDefence = _land.baseDefence < 800 ? 400 : _land.baseDefence - 400;
      _land.baseDefence = _baseDefence < 1000 ? 1000 : _baseDefence;
    }
    // REGISTER EVENT
    StakeEvent memory _stakeEvent = StakeEvent(block.timestamp, _land.baseDefence);
    stakeEvents[stakes[fromTokenId].landId].push(_stakeEvent);
  }


  /*///////////////////////////////////////////////////////////////
                  PRIVATE VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function calculateDamage(uint16 _tokenId) public view returns (uint256) {
    Stake memory _stake = stakes[_tokenId];
    Land memory _landPlots = landPlots[_stake.landId];
    IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId);
    uint256 damage = _stake.damage;

    // FAST FORWARD TO ENTRY POINT
    if(_stake.stakeAction == StakeAction.DEFEND) {
      for(uint256 i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
        StakeEvent memory _event = stakeEvents[_stake.landId][i];
        damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def, _event.baseDefence);
      }
      // FOR VIEW NEED EXTRA NOW PING
      damage += calculateChange(stakeEvents[_stake.landId][stakeEvents[_stake.landId].length-1].timestamp, block.timestamp, _meral.def, _landPlots.baseDefence);
    }

    // FAST FORWARD TO ENTRY POINT
    if(_stake.stakeAction == StakeAction.BIRTH) {
      for(uint256 i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
        StakeEvent memory _event = stakeEvents[_stake.landId][i];
        damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def + _meral.spd, _event.baseDefence);
      }
      // FOR VIEW NEED EXTRA NOW PING
      damage += calculateChange(stakeEvents[_stake.landId][stakeEvents[_stake.landId].length-1].timestamp, block.timestamp, _meral.def + _meral.spd, _landPlots.baseDefence);
    }

    damage = _stake.health >= damage ? 0 : damage - _stake.health;
    return damage > _meral.score ? _meral.score : damage;
  }

  function calculateStamina(uint16 _tokenId) public view returns(uint16) {
    Stake memory _stake = stakes[_tokenId];
    IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId);

    uint256 change = block.timestamp - _stake.lastAction;
    uint256 scaledSpeed = safeScale(_meral.spd, 1600, 2, 10);
    uint256 gain = change / 3600 * scaledSpeed;

    return uint16(gain > _stake.stamina ? 0 : _stake.stamina - gain);
  }



}