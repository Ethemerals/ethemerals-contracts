// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./IEthemerals.sol";

contract IntoTheWilds is ERC721Holder {

  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  address public admin;

  IEthemerals meralsContract;

  // ALL LANDSPLOTS
  mapping (uint16 => Land) public landPlots;

  // LAND PLOTS => MERALS => LCP
  mapping (uint16 => mapping(uint16 => uint256)) private landClaimPoints;

  // ACTIONS 0 - UNSTAKED, 1 - DEFEND, 2 - LOOT, 3 - BIRTH, 4 - ATTACK,
  // land PLOTS => ACTION SLOTS => MERALS
  mapping (uint16 => mapping(uint8 => uint16[])) private slots;
  // land PLOTS => TIMESTAMP => EVENTS
  // mapping (uint16 => mapping(uint256 => StakeEvent)) private stakeEvents;

  // land PLOTS => StakeEvents
  mapping (uint16 => StakeEvent[]) private stakeEvents;

  // MERALS => STAKES
  mapping (uint16 => Stake) private stakes;


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
    uint8 action;
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
    uint16 baseDefence;
    uint16 baseDamage;
    uint8 raidStatus; // 0 - default, 1 - raidable, 2 - currently raiding
    ItemPool lootPool;
    ItemPool petPool;
  }

  uint8 private extraDefBonus = 120; // DAILED already
  uint16 private baseDefence = 2000; // DAILED already, lower = more bonus applied - range 1200-2000
  uint16 private baseDamage = 600; // DAILED already, lower = more damage applied - range 50-600

  uint public value;

  // TODO no defenders, apply element bonus, dmg, apply inventory external damage function
  // TODO require owenrs of defenders not to be attackers and vise versa

  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  constructor(address meralAddress) {

    admin = msg.sender;
    meralsContract = IEthemerals(meralAddress);

    ItemPool memory loot1 = ItemPool({ cost: 10, drop1: 1, drop2: 2, drop3: 3 });
    ItemPool memory pet1 = ItemPool({ cost: 10, drop1: 1, drop2: 2, drop3: 3 });

    landPlots[1] = Land({ remainingELFx: 1000, emissionRate: 10, baseDefence: baseDefence, baseDamage: baseDamage, lootPool: loot1, petPool: pet1, raidStatus: 0 });
    landPlots[2] = Land({ remainingELFx: 1000, emissionRate: 10, baseDefence: baseDefence, baseDamage: baseDamage, lootPool: loot1, petPool: pet1, raidStatus: 0 });
    landPlots[3] = Land({ remainingELFx: 1000, emissionRate: 10, baseDefence: baseDefence, baseDamage: baseDamage, lootPool: loot1, petPool: pet1, raidStatus: 0 });
    landPlots[4] = Land({ remainingELFx: 1000, emissionRate: 10, baseDefence: baseDefence, baseDamage: baseDamage, lootPool: loot1, petPool: pet1, raidStatus: 0 });
    landPlots[5] = Land({ remainingELFx: 1000, emissionRate: 10, baseDefence: baseDefence, baseDamage: baseDamage, lootPool: loot1, petPool: pet1, raidStatus: 0 });
    landPlots[6] = Land({ remainingELFx: 1000, emissionRate: 10, baseDefence: baseDefence, baseDamage: baseDamage, lootPool: loot1, petPool: pet1, raidStatus: 0 });

  }

  function addLand(
    uint8 id,
    uint8 lootCost,
    uint8 petCost,
    uint8[] calldata lootDrops,
    uint8[] calldata petDrops,
    uint256 _remainingELFx,
    uint256 _emissionRate,
    uint16 _baseDefence,
    uint16 _baseDamage) external
  {
    require(msg.sender == admin, "admin only");
    require(landPlots[id].emissionRate == 0, "already land");

    Land memory land = Land({
      remainingELFx: _remainingELFx,
      emissionRate: _emissionRate,
      baseDefence: _baseDefence,
      baseDamage: _baseDamage,
      lootPool: _addItemPool(lootCost, lootDrops),
      petPool: _addItemPool(petCost, petDrops),
      raidStatus: 0
    });
    landPlots[id] = land;
  }

  /*///////////////////////////////////////////////////////////////
                  PUBLIC FUNCTIONS
  //////////////////////////////////////////////////////////////*/
  function stake(uint16 _landId, uint16 _tokenId, uint8 _action ) external {
    require(stakes[_tokenId].owner == address(0), "already staked");
    require(landPlots[_landId].remainingELFx > 0, "not land");
    require(_action > 0 && _action < 5, "not action");
    require(slots[_landId][_action].length < 5, "full");

    if(_action == 2 || _action == 3) {
      require(slots[_landId][1].length > 0, "need defender");
    }
    if(_action == 4) {
      require(landPlots[_landId].raidStatus > 0, "not raidable");
    }
    if(_action == 1) {
      require(landPlots[_landId].raidStatus < 2, "no reinforcements");
    }

    meralsContract.safeTransferFrom(msg.sender, address(this), _tokenId);
    uint256 timestamp = block.timestamp;

    // ADD TO ACTION SLOTS
    slots[_landId][_action].push(_tokenId);

    if(_action == 1) {
      _defenderChange(_landId, timestamp, true);

      // SET RAIDSTATUS
      if(slots[_landId][1].length == 5) {
        landPlots[_landId].raidStatus = 1;
      }
    }

    if(_action == 2) {
      // LOOT
    }

    if(_action == 3) {
      // BIRTH
    }
    if(_action == 4) {
      // SET RAIDSTATUS
      if(slots[_landId][4].length == 1) {
        landPlots[_landId].raidStatus = 2;
      }
      _attackerChange(_landId, _tokenId, timestamp, true);
    }

    // ADD STAKES
    stakes[_tokenId] = Stake({owner: msg.sender, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, landId: _landId, action: _action});
  }

  function unstake(uint16 _tokenId) external {
    Stake memory _stake = stakes[_tokenId];
    require(_stake.owner == msg.sender || msg.sender == admin, "admin only");
    require(_stake.owner != address(0), "not staked");
    require(block.timestamp - stakeEvents[_stake.landId][_stake.entryPointer].timestamp >= 86400, "cooldown");
    if(_stake.action == 1) {
      require(landPlots[_stake.landId].raidStatus < 2, 'in a raid');
    }

    meralsContract.safeTransferFrom(address(this), _stake.owner, _tokenId);

    // NO NEED TO CLAIM TODO
    uint256 timestamp = block.timestamp;

    if(_stake.action == 1) {
      _defenderChange(_stake.landId, timestamp, false);
      _reduceHealth(_tokenId);

      // ADD LCP
      uint256 change = timestamp - stakeEvents[_stake.landId][_stake.entryPointer].timestamp;
      landClaimPoints[_stake.landId][_tokenId] += change;
    }
    if(_stake.action == 2) {
      // LOOT
    }
    if(_stake.action == 3) {
      // BIRTH
    }
    if(_stake.action == 4) {
      _attackerChange(_stake.landId, _tokenId, timestamp, false);
    }

    _removeFromSlot(_stake.landId, _tokenId, _stake.action);
    _deleteStake(_tokenId);

    if(_stake.action == 1) {
      if(slots[_stake.landId][1].length == 0) {
        // TODO if last defender
        _noDefenders(_stake.landId);
      }
      // SET RAIDSTATUS
      if(slots[_stake.landId][1].length == 4) {
        landPlots[_stake.landId].raidStatus = 0;
      }
    }

    // SET RAIDSTATUS
    if(_stake.action == 4 && slots[_stake.landId][4].length == 0) {
      landPlots[_stake.landId].raidStatus = 0;
    }

  }

  function deathKiss(uint16 _tokenId, uint16 _deathId) external {
    require(_tokenId != _deathId, 'cannot kiss yourself');
    Stake memory _stake = stakes[_tokenId];
    require(_stake.action == 1, "not staked");
    IEthemerals.Meral memory _meral = meralsContract.getEthemeral(_tokenId);
    uint256 damage = calculateHealth(_tokenId);
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
    _deleteStake(_tokenId);

    if(slots[_stake.landId][1].length == 0) {
      // TODO if RAIDENDED
      _noDefenders(_stake.landId);
      landPlots[_stake.landId].raidStatus = 0;
    }

  }




  /*///////////////////////////////////////////////////////////////
                  INTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _attackerChange(uint16 _landId, uint16 _tokenId, uint256 timestamp, bool staked) internal {
    IEthemerals.Meral memory _meral = meralsContract.getEthemeral(_tokenId); // TODO USE INVENTORY

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

  function _defenderChange(uint16 _landId, uint256 timestamp, bool staked) internal {
    // ADD or MINUS CONSTANT to global baseDefence
    if(staked) {
      landPlots[_landId].baseDefence -= extraDefBonus;
    } else {
      landPlots[_landId].baseDefence += extraDefBonus;
    }
    _registerEvent(_landId, timestamp);
  }

  function _registerEvent(uint16 _landId, uint256 timestamp) internal {
    // CREATE EVENT
    StakeEvent memory _stakeEvent = StakeEvent(timestamp, landPlots[_landId].baseDefence, landPlots[_landId].baseDamage);
    stakeEvents[_landId].push(_stakeEvent);
  }

  function _reduceHealth(uint16 _tokenId) internal {
    Stake memory _stake = stakes[_tokenId];
    IEthemerals.Meral memory _meral = meralsContract.getEthemeral(_tokenId);
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
      meralsContract.changeScore(uint256(_tokenId), 1000, false, 0); // DEAD!!
    } else {
      meralsContract.changeScore(uint256(_tokenId), uint16(damage), false, 0);
    }
  }

  function _removeFromSlot(uint16 _landId, uint16 _tokenId, uint8 _action) internal {
    uint16[] memory _slots = slots[_landId][_action];
    uint16[] memory shiftedActionSlots = new uint16[](_slots.length - 1);

    uint j;
    for(uint256 i = 0; i < _slots.length; i ++) {
      if(_slots[i] != _tokenId) {
        shiftedActionSlots[j] = _slots[i];
        j++;
      }
    }
    slots[_landId][_action] = shiftedActionSlots;
  }

  function _noDefenders(uint16 _landId) internal {
    delete stakeEvents[_landId];

    // deleteStake
    // reset slots
    // transfer merals
    // unstake
  }

  function _deleteStake(uint16 _tokenId) internal {
    delete stakes[_tokenId];
  }

  function _addItemPool(uint8 _cost, uint8[] calldata _drops) internal pure returns (ItemPool memory) {
    return ItemPool({cost: _cost, drop1: _drops[0], drop2: _drops[1], drop3: _drops[2]});
  }


  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function calculateHealth(uint16 _tokenId) public view returns (uint256) {
    Stake memory _stake = stakes[_tokenId];
    Land memory _landPlots = landPlots[_stake.landId];
    IEthemerals.Meral memory _meral = meralsContract.getEthemeral(_tokenId);
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

  function calculateChange(uint256 start, uint256 end, uint16 _meralDef, uint16 _baseDefence, uint16 _baseDamage) public pure returns (uint256) {
    uint256 change = end - start;
    uint256 scaledDef;

    if(_meralDef > 1000) {
      scaledDef = 1000;
    } else {
      scaledDef = (uint256(_meralDef) * 600) / 2000 + 400;
    }

    return (change - (scaledDef * change / _baseDefence)) / _baseDamage;
  }


  /*///////////////////////////////////////////////////////////////
                  EXTERNAL VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function getStake(uint16 _tokenId) external view returns (Stake memory) {
    return stakes[_tokenId];
  }

  function getSlots(uint16 _landId, uint8 _action) external view returns (uint16[] memory) {
    return slots[_landId][_action];
  }

  function getStakeEvents(uint16 _landId, uint256 _index) external view returns (StakeEvent memory) {
    return stakeEvents[_landId][_index];
  }

  function getLCP(uint16 _landId, uint16 _tokenId) external view returns (uint256) {
    return landClaimPoints[_landId][_tokenId];
  }

  function calculateLCP(uint16 _landId, uint16 _tokenId) external view returns (uint256) {
    Stake memory _stake = stakes[_tokenId];
    StakeEvent memory _stakeEvents = stakeEvents[_landId][_stake.entryPointer];
    if(_stake.owner != address(0)) {
      return landClaimPoints[_landId][_tokenId] + block.timestamp - _stakeEvents.timestamp;
    } else {
      return landClaimPoints[_landId][_tokenId];
    }
  }

}