 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";
import "../WildsCalculate.sol";
import "../IEthemerals.sol";


contract WildsActionsV2 is WildsCalculate {
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
  address public staking;
  address public actions;
  bool public paused;




  // struct RaidActionType {
  //   health:

  // }


// ATTACKER ACTIONS 1min cooldown


// DEFENDERS ACTIONS 1min cooldown
// block - all warriors - reduce incoming attack by 50%, 12hr cd
// defend - knight, paladin - take damage for another, 12hr cd
// dodge - all rogues - 50% chance to ignore all next damage, 12hr cd



  function raidAction(uint16 toTokenId, uint16 fromTokenId, uint8 actionType) external {
    // TODO restrict by class
    // TODO restrict to avoid infinite staking
    // [attack, attackAll, heal, healAll, magicAttack, speedAttack, enrage, concentrate]

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
      // single heal
      // TODO ATTACKERS CANNOT HEAL
      toStake.health += uint16(calculateLightMagicDamage(fromMeral.def, fromMeral.spd));
    }
    if(actionType == 1) {
      _attackAll(fromStake, fromMeral.atk);
    }
    if(actionType == 2) {
      // TEST SWAP ACTION
      toStake.damage += uint16(calculateDefendedDamage(fromMeral.atk, toMeral.def));
    }
    if(actionType == 3) {
      // TODO ATTACKERS CANNOT HEAL
      _healAll(fromStake, fromMeral.def, fromMeral.spd);
    }
    if(actionType == 4) {
      toStake.damage += uint16(calculateDarkMagicDamage(fromMeral.atk, fromMeral.def));
    }
    if(actionType == 5) {
      toStake.damage += uint16(calculateSpdDamage(fromMeral.atk, toMeral.def, fromMeral.spd));
    }
    if(actionType == 6) {
      _enrage(fromTokenId);
    }
    if(actionType == 7) {
      _concentration(fromTokenId);
    }

  }

  function _attackAll(Stake storage fromStake, uint16 atk) internal {
    uint16[] memory defenders = slots[fromStake.landId][StakeAction.DEFEND];

    for(uint16 i = 0; i < defenders.length; i ++) {
      Stake storage toStake = stakes[defenders[i]];
      IEthemerals.Meral memory toMeral = merals.getEthemeral(defenders[i]);
      toStake.damage += uint16(calculateDefendedDamage(atk, toMeral.def));
    }
  }

  function _healAll(Stake storage fromStake, uint16 def, uint16 spd) internal {
    uint16[] memory defenders = slots[fromStake.landId][StakeAction.DEFEND];

    for(uint16 i = 0; i < defenders.length; i ++) {
      Stake storage toStake = stakes[defenders[i]];
      toStake.health += uint16(calculateLightMagicDamage(def, spd));
    }
  }

  function _enrage(uint16 fromTokenId) internal {
    Land storage _land = landPlots[stakes[fromTokenId].landId];
    uint16 _baseDefence = _land.baseDefence - 400;
    _land.baseDefence = _baseDefence < 1000 ? 1000 : _baseDefence;
  }

  function _concentration(uint16 fromTokenId) internal {
    Land storage _land = landPlots[stakes[fromTokenId].landId];
    uint16 _baseDefence = _land.baseDefence + 400;
    _land.baseDefence = _baseDefence > 4000 ? 4000 : _baseDefence;
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