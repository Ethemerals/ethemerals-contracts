 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";
import "./IEthemerals.sol";


contract WildStaking {

  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  address public admin;

  IEthemerals merals;
  enum Action {UNSTAKED, DEFEND, LOOT, BIRTH, ATTACK}
  enum RaidStatus {DEFAULT, RAIDABLE, RAIDING}

  // ALL LANDSPLOTS
  mapping (uint16 => Land) public landPlots;
  // MERALS => STAKES
  mapping (uint16 => Stake) public stakes;

  // LAND PLOTS => MERALS => LCP
  mapping (uint16 => mapping(uint16 => uint256)) private landClaimPoints;

  // land PLOTS => ACTION SLOTS => MERALS
  mapping (uint16 => mapping(Action => uint16[])) private slots;

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
    uint16 landId;
    Action action;
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
    uint16 initBaseDamage;
    uint16 baseDefence;
    uint16 baseDamage;
    RaidStatus raidStatus; // 0 - default, 1 - raidable, 2 - currently raiding
    ItemPool lootPool;
    ItemPool petPool;
  }

  function defend(uint16 _landId, uint16 _tokenId) public {
    uint256 timestamp = block.timestamp;

    // ADD TO ACTION SLOTS
    slots[_landId][Action.DEFEND].push(_tokenId);
    _defenderChange(_landId, timestamp, true);

    // SET RAIDSTATUS
    if(slots[_landId][Action.DEFEND].length == 5) {
      landPlots[_landId].raidStatus = RaidStatus.RAIDABLE;
    }

    stakes[_tokenId] = Stake({owner: msg.sender, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, landId: _landId, action: Action.DEFEND});
  }

  function attack(uint16 _landId, uint16 _tokenId) public {
    uint256 timestamp = block.timestamp;

    // ADD TO ACTION SLOTS
    slots[_landId][Action.ATTACK].push(_tokenId);
    _attackerChange(_landId, _tokenId, timestamp, true);
    // SET RAIDSTATUS
    if(slots[_landId][Action.ATTACK].length == 1) {
      landPlots[_landId].raidStatus = RaidStatus.RAIDING;
    }

    stakes[_tokenId] = Stake({owner: msg.sender, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, landId: _landId, action: Action.ATTACK});
  }

  function undefend(uint16 _landId, uint16 _tokenId, uint16 _entryPointer) public {
    // TODO NEED TO CLAIM?
    uint256 timestamp = block.timestamp;
    _defenderChange(_landId, timestamp, false);
    _reduceHealth(_tokenId);

    // ADD LCP
    uint256 change = timestamp - stakeEvents[_landId][_entryPointer].timestamp;
    landClaimPoints[_landId][_tokenId] += change;

    _removeFromSlot(_landId, _tokenId, Action.DEFEND);
    delete stakes[_tokenId];

    if(slots[_landId][Action.DEFEND].length == 0) {
      delete stakeEvents[_landId];
      // TODO What about the looters and birthers?
    }
    // SET RAIDSTATUS
    if(slots[_landId][Action.DEFEND].length == 4) {
      landPlots[_landId].raidStatus = RaidStatus.DEFAULT;
    }
  }

  function deathKiss(uint16 _tokenId, uint16 _deathId) public {
    require(_tokenId != _deathId, 'no kiss yourself');
    Stake memory _stake = stakes[_tokenId];
    require(landPlots[_stake.landId].raidStatus == RaidStatus.RAIDING && _stake.action == Action.DEFEND, "not raiding");
    IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId);
    uint256 damage = calculateDamage(_tokenId);

    if(_meral.score > damage) { // safe
      if(stakes[_deathId].owner == msg.sender && stakes[_deathId].landId == _stake.landId) {
        require(_meral.score - damage <= 50, 'not dead');
      } else {
        require(_meral.score - damage <= 25, 'not really dead');
      }
    }

    uint256 timestamp = block.timestamp;
    _defenderChange(_stake.landId, timestamp, false);
    _reduceHealth(_tokenId);
    // ADD LCP
    uint256 change = timestamp - stakeEvents[_stake.landId][_stake.entryPointer].timestamp;
    landClaimPoints[_stake.landId][_tokenId] += change;

    _removeFromSlot(_stake.landId, _tokenId, _stake.action);
    delete stakes[_tokenId];

    if(slots[_stake.landId][Action.DEFEND].length == 0) {
      _endRaid(_stake.landId);
    }

    // TODO GET REWARD

  }

  function swapDefenders(uint16 _tokenId, uint16 _swapperId) public {
    Stake memory _stake = stakes[_tokenId];
    require(block.timestamp - landPlots[_stake.landId].lastRaid < 86400, 'too late');
    require(_stake.owner == msg.sender, 'owner only');

    stakes[_swapperId] = Stake({owner: msg.sender, entryPointer: _stake.entryPointer, damage: _stake.damage, health: _stake.health, landId: _stake.landId, action: _stake.action});
    uint16[] storage _slots = slots[_stake.landId][_stake.action];

    for(uint256 i = 0; i < _slots.length; i ++) {
      if(_slots[i] == _tokenId) {
        _slots[i] == _swapperId;
      }
    }

    delete stakes[_tokenId];
  }

  /*///////////////////////////////////////////////////////////////
                  PRIVATE INTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/
  function _defenderChange(uint16 _landId, uint256 timestamp, bool staked) private {
    // ADD or MINUS CONSTANT to global baseDefence
    if(staked) {
      landPlots[_landId].baseDefence -= extraDefBonus;
    } else {
      landPlots[_landId].baseDefence += extraDefBonus;
    }
    _registerEvent(_landId, timestamp);
  }

  function _attackerChange(uint16 _landId, uint16 _tokenId, uint256 timestamp, bool staked) private {
    IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId); // TODO USE INVENTORY

    uint256 scaledDamage;
    if(_meral.atk > 1600) {
      scaledDamage = 118;
    } else {
      scaledDamage = (uint256(_meral.atk) * 58) / 1600 + 60;
    }

    // ADD or MINUS variable ATK damage to global baseDamage
    if(staked) {
      landPlots[_landId].baseDamage -= uint16(scaledDamage);
    } else {
      landPlots[_landId].baseDamage += uint16(scaledDamage);
    }
    _registerEvent(_landId, timestamp);
  }

  function _removeFromSlot(uint16 _landId, uint16 _tokenId, Action _action) private {
    uint16[] storage _slots = slots[_landId][_action];

    for(uint16 i = 0; i < _slots.length; i ++) {
      if(_slots[i] == _tokenId) {
        _slots[i] = _slots[_slots.length - 1];
        _slots.pop();
        break;
      }
    }
  }

  function _registerEvent(uint16 _landId, uint256 timestamp) private {
    // CREATE EVENT
    StakeEvent memory _stakeEvent = StakeEvent(timestamp, landPlots[_landId].baseDefence, landPlots[_landId].baseDamage);
    stakeEvents[_landId].push(_stakeEvent);
  }

  function _reduceHealth(uint16 _tokenId) private {
    Stake memory _stake = stakes[_tokenId];
    IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId);
    uint256 damage = _stake.damage;

    // FAST FORWARD TO ENTRY POINT
    for(uint256 i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
      StakeEvent memory _event = stakeEvents[_stake.landId][i];
      damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def, _event.baseDefence, _event.baseDamage);
    }

    if(_stake.health >= damage) {
      return;
    }

    damage -= _stake.health;

    if(damage > _meral.score) {
      merals.changeScore(uint256(_tokenId), 1000, false, 0); // DEAD!!
    } else {
      merals.changeScore(uint256(_tokenId), uint16(damage), false, 0);
    }
  }

  function _endRaid(uint16 _landId) private {
    // EMPTY
    delete stakeEvents[_landId];

    // NEW DEFENDERS
    uint256 timestamp = block.timestamp;
    landPlots[_landId].baseDefence -= extraDefBonus * uint16(slots[_landId][Action.ATTACK].length);
    landPlots[_landId].baseDamage = landPlots[_landId].initBaseDamage;
    landPlots[_landId].lastRaid = timestamp;
    _registerEvent(_landId, timestamp);

    for(uint256 i = 0; i < slots[_landId][Action.ATTACK].length; i ++) {
      stakes[slots[_landId][Action.ATTACK][i]].action = Action.DEFEND;
      stakes[slots[_landId][Action.ATTACK][i]].entryPointer = 0;
    }

    slots[_landId][Action.DEFEND] = slots[_landId][Action.ATTACK];
    delete slots[_landId][Action.ATTACK];
    landPlots[_landId].raidStatus = RaidStatus.DEFAULT;

  }

  /*///////////////////////////////////////////////////////////////
                  INTERNAL VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function calculateDamage(uint16 _tokenId) internal view returns (uint256) {
    Stake memory _stake = stakes[_tokenId];
    Land memory _landPlots = landPlots[_stake.landId];
    IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId);
    uint256 damage = _stake.damage;

    // FAST FORWARD TO ENTRY POINT
    for(uint256 i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
      StakeEvent memory _event = stakeEvents[_stake.landId][i];
      damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def, _event.baseDefence, _event.baseDamage);
    }

    // FOR VIEW NEED EXTRA NOW PING
    damage += calculateChange(stakeEvents[_stake.landId][stakeEvents[_stake.landId].length-1].timestamp, block.timestamp, _meral.def, _landPlots.baseDefence, _landPlots.baseDamage);

    if(_stake.health >= damage) {
      return 0;
    }

    damage -= _stake.health;

    if(damage > _meral.score) {
      return 1000;
    } else {
      return damage;
    }
  }

  function calculateChange(uint256 start, uint256 end, uint16 _meralDef, uint16 _baseDefence, uint16 _baseDamage) internal pure returns (uint256) {
    uint256 change = end - start;
    uint256 scaledDef;

    if(_meralDef > 1000) {
      scaledDef = 1000;
    } else {
      scaledDef = (uint256(_meralDef) * 600) / 2000 + 400;
    }

    return (change - (scaledDef * change / _baseDefence)) / _baseDamage;
  }

}