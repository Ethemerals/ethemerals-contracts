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

  // MERALS => STAKES
  mapping (uint16 => Stake) private stakes;

  struct Stake {
    address owner;
    uint256 timestamp;
    uint256 damage;
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
    ItemPool lootPool;
    ItemPool petPool;
  }

  uint8 public maxSlots = 5; // number of action slots per land
  uint16 public defBonus = 1800; // lower = more bonus applied - min 1100
  uint16 public ambientDamageRate = 500; // lower = more damage applied

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

    landPlots[1] = Land({ remainingELFx: 1000, emissionRate: 10, lootPool: loot1, petPool: pet1 });
    landPlots[2] = Land({ remainingELFx: 1200, emissionRate: 10, lootPool: loot1, petPool: pet1 });
    landPlots[3] = Land({ remainingELFx: 1400, emissionRate: 10, lootPool: loot1, petPool: pet1 });
    landPlots[4] = Land({ remainingELFx: 1600, emissionRate: 10, lootPool: loot1, petPool: pet1 });
    landPlots[5] = Land({ remainingELFx: 1800, emissionRate: 10, lootPool: loot1, petPool: pet1 });
    landPlots[6] = Land({ remainingELFx: 2000, emissionRate: 10, lootPool: loot1, petPool: pet1 });

  }

  function addLand(
    uint8 id,
    uint8 lootCost,
    uint8 lootDrop1,
    uint8 lootDrop2,
    uint8 lootDrop3,
    uint8 petCost,
    uint8 petDrop1,
    uint8 petDrop2,
    uint8 petDrop3,
    uint256 _remainingELFx,
    uint256 _emissionRate) external
  {
    require(msg.sender == admin, "admin only");

    Land memory land = Land({
      remainingELFx: _remainingELFx,
      emissionRate: _emissionRate,
      lootPool: _addItemPool(lootCost, lootDrop1, lootDrop2, lootDrop3),
      petPool: _addItemPool(petCost, petDrop1, petDrop2, petDrop3)
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
    stakes[_tokenId] = Stake(msg.sender, block.timestamp, 0, _landId, _action);
    _addToSlot(_landId, _tokenId, _action);

    if(_action == 1) {
      // DEFEND
    }
    if(_action == 2) {
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
    require(stakes[_tokenId].owner == msg.sender || msg.sender == admin, "owner only");
    require(block.timestamp - stakes[_tokenId].timestamp >= 3600, "cooldown");
    Stake memory _stake = stakes[_tokenId];
    meralsContract.safeTransferFrom(address(this), _stake.owner, _tokenId);

    // NO NEED TO CLAIM
    _removeFromSlot(_stake.landId, _tokenId, _stake.action);


    if(_stake.action == 1) {
      uint256 change = block.timestamp - _stake.timestamp;
      landClaimPoints[_stake.landId][_tokenId] += change;
      _changeHealth(_tokenId, change, _stake.damage);
    }

    _deleteStake(_tokenId);
  }


  /*///////////////////////////////////////////////////////////////
                  INTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/


  function _changeHealth(uint16 _tokenId, uint256 change, uint256 damage) internal {
    IEthemerals.Meral memory _meral = meralsContract.getEthemeral(_tokenId);

    change = (change - (_meral.def * change / defBonus)) / ambientDamageRate;
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

  function _addItemPool(uint8 _cost, uint8 _drop1, uint8 _drop2, uint8 _drop3) internal pure returns (ItemPool memory) {
    return ItemPool({cost: _cost, drop1: _drop1, drop2: _drop2, drop3: _drop3});
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

  function getLCP(uint16 _landId, uint16 _tokenId) external view returns (uint256) {
    return landClaimPoints[_landId][_tokenId];
  }

  function calculateLCP(uint16 _landId, uint16 _tokenId) external view returns (uint256) {
    Stake memory _stake = stakes[_tokenId];
    if(_stake.timestamp > 0) {
      return landClaimPoints[_landId][_tokenId] + block.timestamp - _stake.timestamp;
    } else {
      return landClaimPoints[_landId][_tokenId];
    }
  }

  function calculateHealth(uint16 _tokenId) public view returns (uint16) {
    Stake memory _stake = stakes[_tokenId];
    IEthemerals.Meral memory _meral = meralsContract.getEthemeral(_tokenId);

    if(_stake.timestamp > 0) {
      uint256 change = block.timestamp - _stake.timestamp;
      console.log(change);
      change = (change - (_meral.def * change / defBonus)) / ambientDamageRate;
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