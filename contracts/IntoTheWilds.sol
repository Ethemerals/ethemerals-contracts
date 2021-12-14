// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "./IEthemerals.sol";


contract IntoTheWilds {

  address public admin;

  IEthemerals Merals;

  mapping (uint256 => Land) private landPlots;
    // mapping (uint256 => Loot);

  struct LootPool {
    uint16 cost;
    uint16[] lootType;
    uint16[] DropRate;
  }

  struct PetPool {
    uint16 drainRate;
    uint16[] petType;
    uint16[] DropRate;
  }

  struct Land {
    mapping(uint16 => uint16) landClaimPoints;
    uint16 remainingELFx;
    uint16 emissionRate; // DEV IMPROVE
    LootPool lootPool;
    PetPool petPool;
  }

  // enum Actions { DEFEND, ATTACK, LOOT, BIRTH }

  // struct Action {
  //   address owner;
  //   uint88 timestamp;
  //   Actions action;
  // }


  // CREATE INITIAL PLOTS
  constructor(address meralAddress) {
      admin = msg.sender;
      Merals = IEthemerals(meralAddress);

  }




}