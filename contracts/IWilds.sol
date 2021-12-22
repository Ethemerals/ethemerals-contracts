// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface IWilds {

  enum Action {UNSTAKED, DEFEND, LOOT, BIRTH, ATTACK}
  enum RaidStatus {DEFAULT, RAIDABLE, RAIDING}

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

}