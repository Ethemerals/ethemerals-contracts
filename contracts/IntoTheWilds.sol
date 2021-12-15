// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./IEthemerals.sol";

contract IntoTheWilds is ERC721Holder {

  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  address public admin;

  IEthemerals Merals;

  // ALL LANDSPLOTS
  mapping (uint256 => Land) public landPlots;

  // LAND PLOTS => MERALS => LCP
  mapping (uint256 => mapping(uint16 => uint16)) private landClaimPoints;

  // land PLOTS => ACTION SLOTS => MERALS
  mapping (uint256 => mapping(uint8 => uint16[])) private slots;



  uint public value;

  // TOKENID => STAKES
  mapping (uint256 => Stake) private stakes;

  // ACTIONS 0 - UNSTAKED, 1 - DEFEND, 2 - ATTACK, 3 - LOOT, 4 - BIRTH

  struct Stake {
    address owner;
    uint256 timestamp;
    uint256 landId;
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

  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  constructor(address meralAddress) {

    admin = msg.sender;
    Merals = IEthemerals(meralAddress);

    ItemPool memory loot1 = ItemPool({ cost: 10, drop1: 1, drop2: 2, drop3: 3 });
    ItemPool memory pet1 = ItemPool({ cost: 10, drop1: 1, drop2: 2, drop3: 3 });

    Land memory land1 = Land({ remainingELFx: 1000, emissionRate: 10, lootPool: loot1, petPool: pet1 });
    Land memory land2 = Land({ remainingELFx: 1000, emissionRate: 10, lootPool: loot1, petPool: pet1 });
    Land memory land3 = Land({ remainingELFx: 1000, emissionRate: 10, lootPool: loot1, petPool: pet1 });
    Land memory land4 = Land({ remainingELFx: 1000, emissionRate: 10, lootPool: loot1, petPool: pet1 });
    Land memory land5 = Land({ remainingELFx: 1000, emissionRate: 10, lootPool: loot1, petPool: pet1 });
    Land memory land6 = Land({ remainingELFx: 1000, emissionRate: 10, lootPool: loot1, petPool: pet1 });

    landPlots[1] = land1;
    landPlots[2] = land2;
    landPlots[3] = land3;
    landPlots[4] = land4;
    landPlots[5] = land5;
    landPlots[6] = land6;

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

  /*///////////////////////////////////////////////////////////////
                  PUBLIC FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function stake(uint256 _landId, uint256 _tokenId, uint8 _action ) external {
    require(stakes[_tokenId].owner == address(0), "already staked");

    stakes[_tokenId] = Stake(msg.sender, block.timestamp, _landId, _action);
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

  function unstake(uint256 _tokenId) external {
    Stake memory _stake = stakes[_tokenId];

    _removeFromSlot(_stake.landId, _tokenId, _stake.action);
    _deleteStake(_tokenId);
  }


  /*///////////////////////////////////////////////////////////////
                  INTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _addToSlot(uint256 _landId, uint256 _tokenId, uint8 _action) internal {
    uint16[] storage _actionSlots = slots[_landId][_action];
    _actionSlots.push(uint16(_tokenId));
  }

  function _removeFromSlot(uint256 _landId, uint256 _tokenId, uint8 _action) internal {
    uint16[] memory _slots = slots[_landId][_action];
    uint16[] memory shiftedActionSlots = new uint16[](_slots.length - 1);

    uint j;
    for(uint256 i = 0; i < _slots.length; i ++) {
      if(_slots[i] != _tokenId) {
        shiftedActionSlots[j] = _slots[i];
      }
    }

    slots[_landId][_action] = shiftedActionSlots;
  }

  function _addItemPool(uint8 _cost, uint8 _drop1, uint8 _drop2, uint8 _drop3) internal pure returns (ItemPool memory) {
    return ItemPool({cost: _cost, drop1: _drop1, drop2: _drop2, drop3: _drop3});
  }

  function _deleteStake(uint256 _tokenId) internal {
    delete stakes[_tokenId];
  }

  /*///////////////////////////////////////////////////////////////
                  VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/
  function getStake(uint256 _tokenId) external view returns (Stake memory) {
    return stakes[_tokenId];
  }

  function getSlots(uint256 _landId, uint8 _action) external view returns (uint16[] memory) {
    return slots[_landId][_action];
  }


}