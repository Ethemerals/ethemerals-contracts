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

  // ACTIONS 0 - UNSTAKED, 1 - DEFEND, 2 - ATTACK, 3 - LOOT, 4 - BIRTH
  // land PLOTS => ACTION SLOTS => MERALS
  mapping (uint16 => mapping(uint8 => uint16[])) private slots;
// land PLOTS => TIMESTAMP => EVENTS
  mapping (uint16 => mapping(uint256 => StakeEvent)) private stakeEvents;

  // MERALS => STAKES
  mapping (uint16 => Stake) private stakes;



  struct StakeEvent {
    uint16 defBonus;
    uint16 damageRate;
  }

  struct Stake {
    address owner;
    uint256[] timestamps;
    uint256 damage;
    uint256 health;
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
    uint16 defBonus;
    uint16 damageRate;
    ItemPool lootPool;
    ItemPool petPool;
  }

  uint8 public maxSlots = 5; // number of action slots per land
  // uint16 public defBonus = 1800; // lower = more bonus applied - min 1100
  // uint16 public damageRate = 600; // lower = more damage applied

  uint public value;

  // DEFEENDER drainRate equal across all
  // DEFENDERS earn ELFx / drain ELFx, more defenders, more drain

  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  constructor(address meralAddress) {

    admin = msg.sender;
    meralsContract = IEthemerals(meralAddress);

    ItemPool memory loot1 = ItemPool({ cost: 10, drop1: 1, drop2: 2, drop3: 3 });
    ItemPool memory pet1 = ItemPool({ cost: 10, drop1: 1, drop2: 2, drop3: 3 });

    landPlots[1] = Land({ remainingELFx: 1000, emissionRate: 10, defBonus: 1800, damageRate: 600, lootPool: loot1, petPool: pet1 });
    landPlots[2] = Land({ remainingELFx: 1000, emissionRate: 10, defBonus: 1800, damageRate: 600, lootPool: loot1, petPool: pet1 });
    landPlots[3] = Land({ remainingELFx: 1000, emissionRate: 10, defBonus: 1800, damageRate: 600, lootPool: loot1, petPool: pet1 });
    landPlots[4] = Land({ remainingELFx: 1000, emissionRate: 10, defBonus: 1800, damageRate: 600, lootPool: loot1, petPool: pet1 });
    landPlots[5] = Land({ remainingELFx: 1000, emissionRate: 10, defBonus: 1800, damageRate: 600, lootPool: loot1, petPool: pet1 });
    landPlots[6] = Land({ remainingELFx: 1000, emissionRate: 10, defBonus: 1800, damageRate: 600, lootPool: loot1, petPool: pet1 });

  }

  function addLand(
    uint8 id,
    uint8 lootCost,
    uint8 petCost,
    uint8[] calldata lootDrops,
    uint8[] calldata petDrops,
    uint256 _remainingELFx,
    uint256 _emissionRate,
    uint16 _defBonus,
    uint16 _damageRate) external
  {
    require(msg.sender == admin, "admin only");
    require(landPlots[id].emissionRate == 0, "already land");

    Land memory land = Land({
      remainingELFx: _remainingELFx,
      emissionRate: _emissionRate,
      defBonus: _defBonus,
      damageRate: _damageRate,
      lootPool: _addItemPool(lootCost, lootDrops),
      petPool: _addItemPool(petCost, petDrops)
    });
    landPlots[id] = land;
  }

  function setMaxSlots(uint8 _slots) external {
    require(msg.sender == admin, "admin only");
    maxSlots = _slots;
  }

  /*///////////////////////////////////////////////////////////////
                  PUBLIC FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function stake(uint16 _landId, uint16 _tokenId, uint8 _action ) external {
    require(stakes[_tokenId].owner == address(0), "already staked");
    require(landPlots[_landId].remainingELFx > 0, "not land");
    require(_action > 0 && _action < 5, "not action");
    require(slots[_landId][_action].length < maxSlots, "full");

    if(_action != 1) {
      require(slots[_landId][1].length > 0, "need defender");
    }

    meralsContract.safeTransferFrom(msg.sender, address(this), _tokenId);
    _addToSlot(_landId, _tokenId, _action);

    uint256 timestamp = block.timestamp;
    uint256[] memory _timestamps = new uint256[](1);
    _timestamps[0] = timestamp;

    if(_action == 1) {
      // ADD DEFENDER BONUS arbitary 100 per each defender
      landPlots[_landId].defBonus -= 100;

      // REGISTER EVENT to other defenders
      for(uint256 i = 0; i < slots[_landId][_action].length; i ++) {
        stakes[slots[_landId][_action][i]].timestamps.push(timestamp);
      }

      // CREATE EVENT
      stakeEvents[_landId][timestamp] = StakeEvent(landPlots[_landId].defBonus, landPlots[_landId].damageRate);

      // FINALLY CREATE STAKE
      stakes[_tokenId] = Stake({owner: msg.sender, timestamps: _timestamps, damage: 0, health: 0, landId: _landId, action: _action});
    }

    if(_action == 2) {
      // _changeAmbientDamage(_tokenId, _landId, true);
      // ATTACK
    }
    if(_action == 3) {
      // LOOT
    }
    if(_action == 4) {
      // BIRTH
    }

  }


  function unstake(uint16 _tokenId) external {
    require(stakes[_tokenId].owner == msg.sender || msg.sender == admin, "admin only");
    require(stakes[_tokenId].owner != address(0), "not staked");
    require(block.timestamp - stakes[_tokenId].timestamps[0] >= 86400, "cooldown");
    Stake memory _stake = stakes[_tokenId];
    Land storage _land = landPlots[_stake.landId];
    meralsContract.safeTransferFrom(address(this), _stake.owner, _tokenId);

    // NO NEED TO CLAIM
    uint16 _landId = _stake.landId;
    uint8 _action = _stake.action;
    uint256 timestamp = block.timestamp;

    _removeFromSlot(_landId, _tokenId, _action);

    if(_stake.action == 1) {
      // REMOVE DEFENDER BONUS
      _land.defBonus += 100;

      // REGISTER EVENT to other defenders
      for(uint256 i = 0; i < slots[_landId][_action].length; i ++) {
        stakes[slots[_landId][_action][i]].timestamps.push(timestamp);
      }

      // CREATE EVENT
      stakeEvents[_landId][timestamp] = StakeEvent(landPlots[_landId].defBonus, landPlots[_landId].damageRate);

      uint256 change = block.timestamp - _stake.timestamps[0];
      landClaimPoints[_stake.landId][_tokenId] += change;
      _changeHealth(_tokenId, change, _stake.landId, _stake.damage);


    }

    _deleteStake(_tokenId);
  }


  /*///////////////////////////////////////////////////////////////
                  INTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _changeAmbientDamage(uint16 _tokenId, uint16 _landId, bool add) internal {
    Land storage _land = landPlots[_landId];
    IEthemerals.Meral memory _meral = meralsContract.getEthemeral(_tokenId);

    // uint256 change = (change - (_meral.atk * change / _land.defBonus)) / _land.damageRate;
    // change += damage;
  }

  function _changeHealth(uint16 _tokenId, uint256 change, uint16 _landId, uint256 damage) internal {
    Land memory _land = landPlots[_landId];
    IEthemerals.Meral memory _meral = meralsContract.getEthemeral(_tokenId);

    change = (change - (_meral.def * change / _land.defBonus)) / _land.damageRate;
    change += damage;

    if(change > _meral.score) {
      meralsContract.changeScore(uint256(_tokenId), 1000, false, 0);
    } else {
      meralsContract.changeScore(uint256(_tokenId), uint16(change), false, 0);
    }
  }

  function _addToSlot(uint16 _landId, uint16 _tokenId, uint8 _action) internal {
    uint16[] storage _actionSlots = slots[_landId][_action];
    _actionSlots.push(_tokenId);
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

  function _deleteStake(uint16 _tokenId) internal {
    delete stakes[_tokenId];
  }

  function _addItemPool(uint8 _cost, uint8[] calldata _drops) internal pure returns (ItemPool memory) {
    return ItemPool({cost: _cost, drop1: _drops[0], drop2: _drops[1], drop3: _drops[2]});
  }

  /*///////////////////////////////////////////////////////////////
                  VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/
  function getStake(uint16 _tokenId) external view returns (Stake memory) {
    return stakes[_tokenId];
  }

  function getSlots(uint16 _landId, uint8 _action) external view returns (uint16[] memory) {
    return slots[_landId][_action];
  }

  function getStakeEvents(uint16 _landId, uint256 _stakeEvent) external view returns (StakeEvent memory) {
    return stakeEvents[_landId][_stakeEvent];
  }

  function getLCP(uint16 _landId, uint16 _tokenId) external view returns (uint256) {
    return landClaimPoints[_landId][_tokenId];
  }

  function calculateLCP(uint16 _landId, uint16 _tokenId) external view returns (uint256) {
    Stake memory _stake = stakes[_tokenId];
    if(_stake.owner != address(0) && _stake.timestamps[0] > 0) {
      return landClaimPoints[_landId][_tokenId] + block.timestamp - _stake.timestamps[0];
    } else {
      return landClaimPoints[_landId][_tokenId];
    }
  }

  function calculateHealth(uint16 _tokenId) public view returns (uint16) {
    Stake memory _stake = stakes[_tokenId];
    Land memory _land = landPlots[_stake.landId];
    IEthemerals.Meral memory _meral = meralsContract.getEthemeral(_tokenId);

    if(_stake.owner != address(0) && _stake.timestamps[0] > 0) {
      uint256 change = block.timestamp - _stake.timestamps[0];
      change = (change - (_meral.def * change / _land.defBonus)) / _land.damageRate;
      change += _stake.damage;

      if(change > _meral.score) {
        return 0;
      }

      return _meral.score - uint16(change);
    } else {
      return _meral.score;
    }
  }

}