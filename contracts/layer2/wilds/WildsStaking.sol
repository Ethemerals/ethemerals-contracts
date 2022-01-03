 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";
import "./WildsCalculate.sol";
import "../managers/MeralParser.sol";
import "../interfaces/interfaces.sol";


contract WildsStaking is WildsCalculate, MeralParser {
  // /*///////////////////////////////////////////////////////////////
  //                 EVENTS
  // //////////////////////////////////////////////////////////////*/
  // event LandChange(uint16 landId, uint timestamp, uint16 baseDefence);
  // event Staked(uint16 landId, uint tokenId, uint8 stakeAction, bool meral);
  // event Unstaked(uint tokenId, uint32 rewards);
  // event LCPChange(uint16 landId, uint tokenId, uint change);
  // event RaidStatusChange(uint16 landId, uint8 RaidStatus);
  // event DeathKissed(uint tokenId, uint deathId);
  // event Swapped(uint tokenId, uint swapperId);
  // event RaidAction(uint toTokenId, uint fromTokenId, uint8 actionType);


  // /*///////////////////////////////////////////////////////////////
  //                 STORAGE
  // //////////////////////////////////////////////////////////////*/
  // enum StakeAction {UNSTAKED, DEFEND, LOOT, BIRTH, ATTACK}
  // enum RaidStatus {DEFAULT, RAIDABLE, RAIDING}

  // // ALL LANDSPLOTS
  // mapping (uint16 => Land) public landPlots;
  // // MERALS => STAKES
  // mapping (uint => Stake) public stakes;
  // // LAND PLOTS => MERALS => LCP
  // mapping (uint16 => mapping(uint => uint)) private landClaimPoints;
  // // land PLOTS => StakeAction Slots => MERALS
  // mapping (uint16 => mapping(StakeAction => uint[])) private slots;
  // // land PLOTS => StakeEvents
  // mapping (uint16 => StakeEvent[]) public stakeEvents;

  // // [attack, attackAll, heal, healAll, magicAttack, speedAttack, enrage, concentrate]
  // uint8[] public staminaCosts = [30,60,40,90,40,40,50,50];
  // uint8 private extraDefBonus = 140; // DAILED already

  // struct StakeEvent {
  //   uint timestamp;
  //   uint16 baseDefence;
  // }

  // struct Stake {
  //   address owner;
  //   uint lastAction;
  //   uint16 entryPointer;
  //   uint16 damage;
  //   uint16 health;
  //   uint16 stamina;
  //   uint16 landId;
  //   StakeAction stakeAction;
  // }

  // struct ItemPool {
  //   uint8 cost;
  //   uint8 drop1;
  //   uint8 drop2;
  //   uint8 drop3;
  // }

  // struct Land {
  //   uint remainingELFx;
  //   uint emissionRate; // DEV IMPROVE
  //   uint lastRaid;
  //   uint16 initBaseDefence;
  //   uint16 baseDefence;
  //   RaidStatus raidStatus; // 0 - default, 1 - raidable, 2 - currently raiding
  //   ItemPool lootPool;
  //   ItemPool petPool;
  // }

  // IMeralManager merals;
  // address public admin;
  // address public adminActions;
  // address public staking;
  // address public actions;
  // bool public paused;


  // /*///////////////////////////////////////////////////////////////
  //                 EXTERNAL FUNCTIONS
  // //////////////////////////////////////////////////////////////*/

  // function defend(uint16 _landId, uint _type, uint _tokenId) external {
  //   // ADD TO ACTION SLOTS
  //   slots[_landId][StakeAction.DEFEND].push(_tokenId);
  //   _defenderChange(_landId, _tokenId, block.timestamp, true);

  //   // SET RAIDSTATUS
  //   if(slots[_landId][StakeAction.DEFEND].length == 5) {
  //     landPlots[_landId].raidStatus = RaidStatus.RAIDABLE;
  //     emit RaidStatusChange(_landId, uint8(RaidStatus.RAIDABLE));
  //   }
  //   stakes[_tokenId] = Stake({owner: msg.sender, lastAction: block.timestamp, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, stamina: 0, landId: _landId, stakeAction: StakeAction.DEFEND});
  // }

  // function loot(uint16 _landId, uint _tokenId) external {
  //   slots[_landId][StakeAction.LOOT].push(_tokenId);
  //   stakes[_tokenId] = Stake({owner: msg.sender, lastAction: block.timestamp, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, stamina: 0, landId: _landId, stakeAction: StakeAction.LOOT});
  // }

  // function birth(uint16 _landId, uint _tokenId) external {
  //   slots[_landId][StakeAction.BIRTH].push(_tokenId);
  //   stakes[_tokenId] = Stake({owner: msg.sender, lastAction: block.timestamp, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, stamina: 0, landId: _landId, stakeAction: StakeAction.BIRTH});
  // }

  // function attack(uint16 _landId, uint _tokenId) external {
  //   uint timestamp = block.timestamp;

  //   // ADD TO ACTION SLOTS
  //   slots[_landId][StakeAction.ATTACK].push(_tokenId);
  //   _attackerChange(_landId, _tokenId, timestamp, true);
  //   // SET RAIDSTATUS
  //   if(slots[_landId][StakeAction.ATTACK].length == 1) {
  //     landPlots[_landId].raidStatus = RaidStatus.RAIDING;
  //     emit RaidStatusChange(_landId, uint8(RaidStatus.RAIDING));
  //   }

  //   stakes[_tokenId] = Stake({owner: msg.sender, lastAction: block.timestamp, entryPointer: uint16(stakeEvents[_landId].length - 1), damage: 0, health: 0, stamina: 0, landId: _landId, stakeAction: StakeAction.ATTACK});
  // }

  // function undefend(uint16 _landId, uint _tokenId) external {
  //   uint timestamp = block.timestamp;
  //   _defenderChange(_landId, _tokenId, timestamp, false);
  //   _unstake(_landId, _tokenId, StakeAction.DEFEND);

  //   if(slots[_landId][StakeAction.DEFEND].length == 0) {
  //     // NO DEFENDERS && NOT IN A RAID
  //     _unstakeSlot(_landId, StakeAction.LOOT);
  //     _unstakeSlot(_landId, StakeAction.BIRTH);
  //   }
  //   // SET RAIDSTATUS
  //   if(slots[_landId][StakeAction.DEFEND].length == 4) {
  //     landPlots[_landId].raidStatus = RaidStatus.DEFAULT;
  //     emit RaidStatusChange(_landId, uint8(RaidStatus.DEFAULT));
  //   }

  // }

  // function unloot(uint16 _landId, uint _tokenId) external {
  //   merals.changeHP(uint(_tokenId), uint16(calculateDamage(_tokenId)), false, 0);
  //   _unstake(_landId, _tokenId, StakeAction.LOOT);
  // }

  // function unbirth(uint16 _landId, uint _tokenId) external {
  //   merals.changeHP(uint(_tokenId), uint16(calculateDamage(_tokenId)), false, 0);
  //   _unstake(_landId, _tokenId, StakeAction.BIRTH);
  // }

  // function deathKiss(uint _tokenId, uint16 _deathId) external {
  //   require(_tokenId != _deathId, 'no kiss yourself');
  //   Stake memory _stake = stakes[_tokenId];
  //   uint16 _landId = _stake.landId;
  //   IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId);

  //   uint damage = calculateDamage(_tokenId);

  //   if(_meral.score > damage) {
  //     require(_meral.score - damage <= 25, 'not dead');
  //   }

  //   if(_stake.stakeAction == StakeAction.DEFEND) {
  //     _defenderChange(_landId, _tokenId, block.timestamp, false);
  //   }
  //   if(_stake.stakeAction == StakeAction.ATTACK) {
  //     _attackerChange(_landId, _tokenId, block.timestamp, false);
  //   }

  //   _unstake(_landId, _tokenId, _stake.stakeAction);

  //   if(slots[_landId][StakeAction.DEFEND].length == 0) {
  //     // ATTACKERS WON
  //     _endRaid(_landId);
  //   }

  //   if(slots[_landId][StakeAction.ATTACK].length == 0) {
  //     // DEFENDERS WON
  //     delete slots[_landId][StakeAction.ATTACK];
  //     landPlots[_landId].raidStatus = RaidStatus.DEFAULT;
  //     emit RaidStatusChange(_landId, uint8(RaidStatus.DEFAULT));
  //   }

  //   merals.safeTransferFrom(address(this), _stake.owner, _tokenId);

  //   emit DeathKissed(_tokenId, _deathId);

  //   // TODO GET REWARD TO DEATHID

  // }

  // function swapDefenders(uint _tokenId, uint16 _swapperId) external {
  //   Stake memory _stake = stakes[_tokenId];
  //   require(_stake.owner == msg.sender, 'owner only');
  //   require(_stake.stakeAction == StakeAction.DEFEND, 'not defending');
  //   require(block.timestamp - landPlots[_stake.landId].lastRaid < 86400, 'too late');


  //   _stake.owner = msg.sender;
  //   stakes[_swapperId] = _stake;
  //   uint16[] storage _slots = slots[_stake.landId][_stake.stakeAction];

  //   for(uint i = 0; i < _slots.length; i ++) {
  //     if(_slots[i] == _tokenId) {
  //       _slots[i] == _swapperId;
  //       _gainXP(_tokenId, StakeAction.DEFEND);
  //       emit Swapped(_tokenId, _swapperId);
  //     }
  //   }

  //   delete stakes[_tokenId];
  //   merals.safeTransferFrom(msg.sender, address(this), _swapperId);
  //   merals.safeTransferFrom(address(this), msg.sender, _tokenId);
  // }

  // /*///////////////////////////////////////////////////////////////
  //                 PRIVATE INTERNAL FUNCTIONS
  // //////////////////////////////////////////////////////////////*/

  // function _defenderChange(uint16 _landId, uint _tokenId, uint timestamp, bool add) private {
  //   // ADD or MINUS CONSTANT to global baseDefence
  //   landPlots[_landId].baseDefence = add ? landPlots[_landId].baseDefence + extraDefBonus : landPlots[_landId].baseDefence - extraDefBonus;
  //   _registerEvent(_landId, timestamp);

  //   if(add == false) {
  //     merals.changeHP(uint(_tokenId), uint16(calculateDamage(_tokenId)), false, 0);
  //     // ADD LCP
  //     uint change = timestamp - stakeEvents[_landId][stakes[_tokenId].entryPointer].timestamp;
  //     landClaimPoints[_landId][_tokenId] += change;
  //     emit LCPChange(_landId, _tokenId, change);
  //   }
  // }

  // function _attackerChange(uint16 _landId, uint _tokenId, uint timestamp, bool add) private {
  //   IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId); // TODO USE INVENTORY
  //   uint scaledDamage = safeScale(_meral.atk, 1600, 80, 160);
  //   landPlots[_landId].baseDefence = add ? landPlots[_landId].baseDefence - uint16(scaledDamage) : landPlots[_landId].baseDefence + uint16(scaledDamage);
  //   _registerEvent(_landId, timestamp);
  //   merals.changeHP(uint(_tokenId), uint16(calculateDamage(_tokenId)), false, 0);
  // }

  // function _unstake(uint16 _landId, uint _tokenId, StakeAction _stakeAction) private {
  //   uint16[] storage _slots = slots[_landId][_stakeAction];
  //   for(uint16 i = 0; i < _slots.length; i ++) {
  //     if(_slots[i] == _tokenId) {
  //       _slots[i] = _slots[_slots.length - 1];
  //       _slots.pop();
  //       break;
  //     }
  //   }

  //   _gainXP(_tokenId, _stakeAction);
  // }

  // function _unstakeSlot(uint16 _landId, StakeAction _stakeAction) private {
  //   uint16[] memory _slots = slots[_landId][_stakeAction];
  //   for(uint16 i = 0; i < _slots.length; i ++) {
  //     merals.safeTransferFrom(address(this), stakes[_slots[i]].owner, _slots[i]);
  //     _gainXP(_slots[i], _stakeAction);
  //   }
  //   delete slots[_landId][_stakeAction];
  // }

  // function _endRaid(uint16 _landId) private {
  //   // EMPTY
  //   StakeEvent[] memory _stakeEvents = stakeEvents[_landId];
  //   delete stakeEvents[_landId];

  //   // NEW DEFENDERS
  //   uint timestamp = block.timestamp;
  //   landPlots[_landId].baseDefence = landPlots[_landId].initBaseDefence + uint16(extraDefBonus * slots[_landId][StakeAction.ATTACK].length);
  //   landPlots[_landId].lastRaid = timestamp;
  //   _registerEvent(_landId, timestamp);

  //   for(uint i = 0; i < slots[_landId][StakeAction.ATTACK].length; i ++) {
  //     uint _tokenId = slots[_landId][StakeAction.ATTACK][i];
  //     Stake storage _stake = stakes[_tokenId];
  //     uint XPRewards = (block.timestamp - _stakeEvents[_stake.entryPointer].timestamp) / 3600;
  //     merals.changeRewards(_tokenId, uint32(XPRewards), true, uint8(StakeAction.ATTACK));

  //     _stake.stakeAction = StakeAction.DEFEND;
  //     _stake.entryPointer = 0;

  //     emit Unstaked(_tokenId, uint32(XPRewards));
  //     emit Staked(_landId, _tokenId, uint8(StakeAction.DEFEND), true);
  //   }

  //   slots[_landId][StakeAction.DEFEND] = slots[_landId][StakeAction.ATTACK];
  //   delete slots[_landId][StakeAction.ATTACK];
  //   landPlots[_landId].raidStatus = RaidStatus.DEFAULT;
  //   emit RaidStatusChange(_landId, uint8(RaidStatus.DEFAULT));
  // }

  // function _registerEvent(uint16 _landId, uint timestamp) private {
  //   // CREATE EVENT
  //   StakeEvent memory _stakeEvent = StakeEvent(timestamp, landPlots[_landId].baseDefence);
  //   stakeEvents[_landId].push(_stakeEvent);

  //   emit LandChange(_landId, timestamp, landPlots[_landId].baseDefence);
  // }

  // function _gainXP(uint _tokenId, StakeAction _stakeAction) private {
  //   Stake memory _stake = stakes[_tokenId];
  //   uint XPRewards = (block.timestamp - stakeEvents[_stake.landId][_stake.entryPointer].timestamp) / 3600;
  //   merals.changeRewards(_tokenId, uint32(XPRewards), true, uint8(_stakeAction));
  //   delete stakes[_tokenId];

  //   emit Unstaked(_tokenId, uint32(XPRewards));
  // }


  // /*///////////////////////////////////////////////////////////////
  //                 PRIVATE VIEW FUNCTIONS
  // //////////////////////////////////////////////////////////////*/

  // function calculateDamage(uint _tokenId) public view returns (uint) {
  //   Stake memory _stake = stakes[_tokenId];
  //   Land memory _landPlots = landPlots[_stake.landId];
  //   IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId);
  //   uint damage = _stake.damage;

  //   // FAST FORWARD TO ENTRY POINT
  //   if(_stake.stakeAction == StakeAction.DEFEND) {
  //     for(uint i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
  //       StakeEvent memory _event = stakeEvents[_stake.landId][i];
  //       damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def, _event.baseDefence);
  //     }
  //     // FOR VIEW NEED EXTRA NOW PING
  //     damage += calculateChange(stakeEvents[_stake.landId][stakeEvents[_stake.landId].length-1].timestamp, block.timestamp, _meral.def, _landPlots.baseDefence);
  //   }

  //   // FAST FORWARD TO ENTRY POINT
  //   if(_stake.stakeAction == StakeAction.BIRTH) {
  //     for(uint i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
  //       StakeEvent memory _event = stakeEvents[_stake.landId][i];
  //       damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def + _meral.spd, _event.baseDefence);
  //     }
  //     // FOR VIEW NEED EXTRA NOW PING
  //     damage += calculateChange(stakeEvents[_stake.landId][stakeEvents[_stake.landId].length-1].timestamp, block.timestamp, _meral.def + _meral.spd, _landPlots.baseDefence);
  //   }

  //   damage = _stake.health >= damage ? 0 : damage - _stake.health;
  //   return damage > _meral.score ? _meral.score : damage;
  // }


}