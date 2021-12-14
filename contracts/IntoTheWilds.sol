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

  mapping(uint8 => Land) public landPlots;
  mapping(uint16 => mapping(uint16 => uint16)) public landClaimPoints;
  mapping(uint256 => uint16[]) private defenders;
  mapping(uint256 => uint16[]) private attackers;
  mapping(uint256 => uint16[]) private looters;
  mapping(uint256 => uint16[]) private birthers;

  enum Actions { DEFEND, ATTACK, LOOT, BIRTH, UNSTAKED }

  struct Stake {
    address owner;
    uint8 landId;
    uint88 timestamp;
    Actions action;
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
                  INTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _addItemPool(uint8 _cost, uint8 _drop1, uint8 _drop2, uint8 _drop3) internal pure returns (ItemPool memory) {
    return ItemPool({cost: _cost, drop1: _drop1, drop2: _drop2, drop3: _drop3});
  }

}