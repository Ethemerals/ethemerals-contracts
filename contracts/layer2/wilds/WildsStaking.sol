 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "./WildsCalculate.sol";
import "../../interfaces/IERC721.sol";
import "../../interfaces/IMeralManager.sol";

contract WildsStaking is WildsCalculate {
  /*///////////////////////////////////////////////////////////////
                  EVENTS
  //////////////////////////////////////////////////////////////*/
  event LandChange(uint16 landId, uint timestamp, uint16 baseDefence);
  event Staked(uint16 landId, uint Id, uint8 stakeAction, bool meral);
  event Unstaked(uint Id, uint32 xp);
  event LCPChange(uint16 landId, uint Id, uint change);
  event RaidStatusChange(uint16 landId, uint8 RaidStatus);
  event DeathKissed(uint Id, uint deathId);
  event Swapped(uint Id, uint swapperId);
  event RaidAction(uint toId, uint fromId, uint8 actionType);


  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/
  enum StakeAction {UNSTAKED, DEFEND, LOOT, BIRTH, ATTACK}
  enum RaidStatus {DEFAULT, RAIDABLE, RAIDING}

  // ALL LANDSPLOTS
  mapping (uint16 => Land) public landPlots;
  // MERALS => STAKES
  mapping (uint => Stake) public stakes;
  // LAND PLOTS => MERALS => LCP
  mapping (uint16 => mapping(uint => uint)) private landClaimPoints;
  // land PLOTS => StakeAction Slots => MERALS
  mapping (uint16 => mapping(StakeAction => uint[])) private slots;
  // land PLOTS => StakeEvents
  mapping (uint16 => StakeEvent[]) public stakeEvents;

  // [attack, attackAll, heal, healAll, magicAttack, speedAttack, enrage, concentrate]
  uint8[] public staminaCosts = [30,60,40,90,40,40,50,50];
  uint8 private extraDefBonus = 140; // DAILED already

  struct StakeEvent {
    uint timestamp;
    uint16 baseDefence;
  }

  struct Stake {
    address owner;
    uint lastAction;
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
    uint remainingELFx;
    uint emissionRate; // DEV IMPROVE
    uint lastRaid;
    uint16 initBaseDefence;
    uint16 baseDefence;
    RaidStatus raidStatus; // 0 - default, 1 - raidable, 2 - currently raiding
    ItemPool lootPool;
    ItemPool petPool;
  }

  IMeralManager merals;
  address public admin;
  address public adminActions;
  address public staking;
  address public actions;
  bool public paused;


  /*///////////////////////////////////////////////////////////////
                  EXTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function defend(uint16 _landId, uint _id) external {
    // ADD TO ACTION SLOTS
    slots[_landId][StakeAction.DEFEND].push(_id);

    _defenderChange(_landId, _id, block.timestamp, true);

    // SET RAIDSTATUS
    if(slots[_landId][StakeAction.DEFEND].length == 5) {
      landPlots[_landId].raidStatus = RaidStatus.RAIDABLE;
      emit RaidStatusChange(_landId, uint8(RaidStatus.RAIDABLE));
    }
    stakes[_id] = Stake({owner: msg.sender, lastAction: block.timestamp, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, stamina: 0, landId: _landId, stakeAction: StakeAction.DEFEND});
  }

  function loot(uint16 _landId, uint _id) external {
    slots[_landId][StakeAction.LOOT].push(_id);
    stakes[_id] = Stake({owner: msg.sender, lastAction: block.timestamp, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, stamina: 0, landId: _landId, stakeAction: StakeAction.LOOT});
  }

  function birth(uint16 _landId, uint _id) external {
    slots[_landId][StakeAction.BIRTH].push(_id);
    stakes[_id] = Stake({owner: msg.sender, lastAction: block.timestamp, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, stamina: 0, landId: _landId, stakeAction: StakeAction.BIRTH});
  }

  function attack(uint16 _landId, uint _id) external {
    uint timestamp = block.timestamp;

    // ADD TO ACTION SLOTS
    slots[_landId][StakeAction.ATTACK].push(_id);
    _attackerChange(_landId, _id, timestamp, true);

    // SET RAIDSTATUS
    landPlots[_landId].raidStatus = RaidStatus.RAIDING;
    emit RaidStatusChange(_landId, uint8(RaidStatus.RAIDING));

    stakes[_id] = Stake({owner: msg.sender, lastAction: block.timestamp, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, stamina: 0, landId: _landId, stakeAction: StakeAction.ATTACK});
  }

  function undefend(uint16 _landId, uint _id) external {
    uint timestamp = block.timestamp;
    _defenderChange(_landId, _id, timestamp, false);
    _unstake(_landId, _id, StakeAction.DEFEND);

    if(slots[_landId][StakeAction.DEFEND].length == 0) {
      // NO DEFENDERS && NOT IN A RAID
      _unstakeSlot(_landId, StakeAction.LOOT);
      _unstakeSlot(_landId, StakeAction.BIRTH);
    }
    // SET RAIDSTATUS
    if(slots[_landId][StakeAction.DEFEND].length == 4) {
      landPlots[_landId].raidStatus = RaidStatus.DEFAULT;
      emit RaidStatusChange(_landId, uint8(RaidStatus.DEFAULT));
    }

  }

  function unloot(uint16 _landId, uint _id) external {
    merals.changeHP(uint(_id), uint16(calculateDamage(_id)), false, 0);
    _unstake(_landId, _id, StakeAction.LOOT);
  }

  function unbirth(uint16 _landId, uint _id) external {
    merals.changeHP(uint(_id), uint16(calculateDamage(_id)), false, 0);
    _unstake(_landId, _id, StakeAction.BIRTH);
  }

  function deathKiss(uint _id, uint _deathId) external {
    require(_id != _deathId, 'no kiss yourself');
    Stake memory _stake = stakes[_id];
    uint16 _landId = _stake.landId;
    IMeralManager.Meral memory _meral = merals.getMeralById(_id);

    uint damage = calculateDamage(_id);

    if(_meral.hp > damage) {
      require(_meral.hp - damage <= 25, 'not dead');
    }

    if(_stake.stakeAction == StakeAction.DEFEND) {
      _defenderChange(_landId, _id, block.timestamp, false);
    }
    if(_stake.stakeAction == StakeAction.ATTACK) {
      _attackerChange(_landId, _id, block.timestamp, false);
    }

    _unstake(_landId, _id, _stake.stakeAction);

    if(slots[_landId][StakeAction.DEFEND].length == 0) {
      // ATTACKERS WON
      _endRaid(_landId);
    }

    if(slots[_landId][StakeAction.ATTACK].length == 0) {
      // DEFENDERS WON
      delete slots[_landId][StakeAction.ATTACK];
      landPlots[_landId].raidStatus = RaidStatus.DEFAULT;
      emit RaidStatusChange(_landId, uint8(RaidStatus.DEFAULT));
    }

    merals.transfer(address(this), _stake.owner, _id);

    emit DeathKissed(_id, _deathId);

    // TODO GET REWARD TO DEATHID

  }

  function swapDefenders(uint _id, uint _swapperId) external {
    Stake memory _stake = stakes[_id];
    require(_stake.owner == msg.sender, 'owner only');
    require(_stake.stakeAction == StakeAction.DEFEND, 'not defending');
    require(block.timestamp - landPlots[_stake.landId].lastRaid < 86400, 'too late');


    _stake.owner = msg.sender;
    stakes[_swapperId] = _stake;
    uint[] storage _slots = slots[_stake.landId][_stake.stakeAction];

    for(uint i = 0; i < _slots.length; i ++) {
      if(_slots[i] == _id) {
        _slots[i] == _swapperId;
        _gainXP(_id);
        emit Swapped(_id, _swapperId);
      }
    }

    delete stakes[_id];
    merals.transfer(msg.sender, address(this), _swapperId);
    merals.transfer(address(this), msg.sender, _id);
  }

  /*///////////////////////////////////////////////////////////////
                  PRIVATE INTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _defenderChange(uint16 _landId, uint _id, uint timestamp, bool add) private {
    // ADD or MINUS CONSTANT to global baseDefence
    landPlots[_landId].baseDefence = add ? landPlots[_landId].baseDefence + extraDefBonus : landPlots[_landId].baseDefence - extraDefBonus;
    _registerEvent(_landId, timestamp);

    if(!add) {
      merals.changeHP(_id, uint16(calculateDamage(_id)), false, 0);
      // ADD LCP
      uint change = timestamp - stakeEvents[_landId][stakes[_id].entryPointer].timestamp;
      landClaimPoints[_landId][_id] += change;
      emit LCPChange(_landId, _id, change);
    }
  }

  function _attackerChange(uint16 _landId, uint _id, uint timestamp, bool add) private {
    IMeralManager.Meral memory _meral = merals.getMeralById(_id); // TODO USE INVENTORY
    uint scaledDamage = safeScale(_meral.atk, 1600, 80, 160);
    landPlots[_landId].baseDefence = add ? landPlots[_landId].baseDefence - uint16(scaledDamage) : landPlots[_landId].baseDefence + uint16(scaledDamage);
    _registerEvent(_landId, timestamp);
    if(!add) {
      merals.changeHP(uint(_id), uint16(calculateDamage(_id)), false, 0);
    }
  }

  function _unstake(uint16 _landId, uint _id, StakeAction _stakeAction) private {
    uint[] storage _slots = slots[_landId][_stakeAction];
    for(uint i = 0; i < _slots.length; i ++) {
      if(_slots[i] == _id) {
        _slots[i] = _slots[_slots.length - 1];
        _slots.pop();
        break;
      }
    }

    _gainXP(_id);
  }

  function _unstakeSlot(uint16 _landId, StakeAction _stakeAction) private {
    uint[] memory _slots = slots[_landId][_stakeAction];
    for(uint i = 0; i < _slots.length; i ++) {
      merals.transfer(address(this), stakes[_slots[i]].owner, _slots[i]);
      _gainXP(_slots[i]);
    }
    delete slots[_landId][_stakeAction];
  }

  function _endRaid(uint16 _landId) private {
    // EMPTY
    StakeEvent[] memory _stakeEvents = stakeEvents[_landId];
    delete stakeEvents[_landId];

    // NEW DEFENDERS
    uint timestamp = block.timestamp;
    landPlots[_landId].baseDefence = landPlots[_landId].initBaseDefence + uint16(extraDefBonus * slots[_landId][StakeAction.ATTACK].length);
    landPlots[_landId].lastRaid = timestamp;
    _registerEvent(_landId, timestamp);

    for(uint i = 0; i < slots[_landId][StakeAction.ATTACK].length; i ++) {
      uint _id = slots[_landId][StakeAction.ATTACK][i];
      Stake storage _stake = stakes[_id];
      // DUPLICATED
      uint _xp = (block.timestamp - _stakeEvents[_stake.entryPointer].timestamp) / 3600;
      merals.changeXP(_id, uint32(_xp), true);

      _stake.stakeAction = StakeAction.DEFEND;
      _stake.entryPointer = 0;

      emit Unstaked(_id, uint32(_xp));
      emit Staked(_landId, _id, uint8(StakeAction.DEFEND), true);
    }

    slots[_landId][StakeAction.DEFEND] = slots[_landId][StakeAction.ATTACK];
    delete slots[_landId][StakeAction.ATTACK];
    landPlots[_landId].raidStatus = RaidStatus.DEFAULT;
    emit RaidStatusChange(_landId, uint8(RaidStatus.DEFAULT));
  }

  function _registerEvent(uint16 _landId, uint timestamp) private {
    // CREATE EVENT
    StakeEvent memory _stakeEvent = StakeEvent(timestamp, landPlots[_landId].baseDefence);
    stakeEvents[_landId].push(_stakeEvent);

    emit LandChange(_landId, timestamp, landPlots[_landId].baseDefence);
  }

  function _gainXP(uint _id) private {
    Stake memory _stake = stakes[_id];
    uint _xp = (block.timestamp - stakeEvents[_stake.landId][_stake.entryPointer].timestamp) / 3600;
    merals.changeXP(_id, uint32(_xp), true);
    delete stakes[_id];

    emit Unstaked(_id, uint32(_xp));
  }


  /*///////////////////////////////////////////////////////////////
                  PRIVATE VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function calculateDamage(uint _Id) public view returns (uint) {
    Stake memory _stake = stakes[_Id];
    Land memory _landPlots = landPlots[_stake.landId];
    IMeralManager.Meral memory _meral = merals.getMeralById(_Id);
    uint damage = _stake.damage;

    // FAST FORWARD TO ENTRY POINT
    if(_stake.stakeAction == StakeAction.DEFEND) {
      for(uint i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
        StakeEvent memory _event = stakeEvents[_stake.landId][i];
        damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def, _event.baseDefence);
      }
      // FOR VIEW NEED EXTRA NOW PING
      damage += calculateChange(stakeEvents[_stake.landId][stakeEvents[_stake.landId].length-1].timestamp, block.timestamp, _meral.def, _landPlots.baseDefence);
    }

    // FAST FORWARD TO ENTRY POINT
    if(_stake.stakeAction == StakeAction.BIRTH) {
      for(uint i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
        StakeEvent memory _event = stakeEvents[_stake.landId][i];
        damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def + _meral.spd, _event.baseDefence);
      }
      // FOR VIEW NEED EXTRA NOW PING
      damage += calculateChange(stakeEvents[_stake.landId][stakeEvents[_stake.landId].length-1].timestamp, block.timestamp, _meral.def + _meral.spd, _landPlots.baseDefence);
    }

    damage = _stake.health >= damage ? 0 : damage - _stake.health;
    return damage > _meral.hp ? _meral.hp : damage;
  }


}