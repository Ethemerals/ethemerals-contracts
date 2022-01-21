// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "./WildsCalculate.sol";
import "../../interfaces/IMeralManager.sol";

contract Wilds is ERC721Holder, WildsCalculate {
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

  // TODO items and pets contract
  // TODO KICK OUT BIRTHERS AND LOOTERS
  // TODO apply inventory
  // TODO claim rewards,
  // TODO death kiss rewards,
  // TODO honey pot rewards
  // TODO EVENTS

  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  constructor(address meralManagerAddress, address _adminActions, address _staking, address _actions) {
    admin = msg.sender;
    merals = IMeralManager(meralManagerAddress);
    adminActions = _adminActions;
    staking = _staking;
    actions = _actions;

    ItemPool memory loot1 = ItemPool({ cost: 10, drop1: 1, drop2: 2, drop3: 3 });
    ItemPool memory pet1 = ItemPool({ cost: 10, drop1: 1, drop2: 2, drop3: 3 });

    uint timestamp = block.timestamp;
    uint16 baseDefence = 2800; //

    for(uint16 i = 1; i < 7; i ++) {
      landPlots[i] = Land({ remainingELFx: 1000, emissionRate: 10, lastRaid: timestamp, initBaseDefence: baseDefence, baseDefence: baseDefence, lootPool: loot1, petPool: pet1, raidStatus: RaidStatus.DEFAULT });
      emit LandChange(i, timestamp, baseDefence);
    }
  }

  function addLand(
    uint16 id,
    uint8 lootCost,
    uint8 petCost,
    uint8[] calldata lootDrops,
    uint8[] calldata petDrops,
    uint _remainingELFx,
    uint _emissionRate,
    uint16 _baseDefence) external
  {
    require(msg.sender == admin, "admin only");
    require(landPlots[id].emissionRate == 0, "already land");

    Land memory land = Land({
      remainingELFx: _remainingELFx,
      emissionRate: _emissionRate,
      lastRaid: block.timestamp,
      initBaseDefence: _baseDefence,
      baseDefence: _baseDefence,
      lootPool: _addItemPool(lootCost, lootDrops),
      petPool: _addItemPool(petCost, petDrops),
      raidStatus: RaidStatus.DEFAULT
    });
    landPlots[id] = land;

    emit LandChange(id, block.timestamp, _baseDefence);
  }

  function setStaminas(uint8[] calldata _staminaCosts) external {
    require(msg.sender == admin, "admin only");
    staminaCosts = _staminaCosts;
  }

  function editLand(uint16 _landId, uint _remainingELFx, uint _emissionRate, uint16 _initBaseDefence, RaidStatus _raidStatus) external {
    require(msg.sender == admin, "admin only");
    Land storage _land = landPlots[_landId];
    _land.remainingELFx = _remainingELFx;
    _land.emissionRate = _emissionRate;
    _land.initBaseDefence = _initBaseDefence;
    _land.baseDefence = _initBaseDefence;
    _land.raidStatus = _raidStatus;

    emit LandChange(_landId, block.timestamp, _initBaseDefence);
  }

  function emergencyUnstake(uint16 _landId) external {
    require(msg.sender == admin, "admin only");
    bool success;
    bytes memory data;
    (success, data) = adminActions.delegatecall(abi.encodeWithSignature("emergencyUnstake(uint16)", _landId));
    require(success, "need success");
  }

  function setPaused(bool _paused) external {
    require(msg.sender == admin, "admin only");
    paused = _paused;
  }

  function setAdmin(address _admin) external {
    require(msg.sender == admin, "admin only");
    admin = _admin;
  }

  function setAddresses(address _staking, address _actions) external {
    require(msg.sender == admin, "admin only");
    staking = _staking;
    actions = _actions;
  }


  /*///////////////////////////////////////////////////////////////
                  PUBLIC FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  /**
  * @dev Send meral to the wilds
  * Requires at least 1 Defender before any other action
  * Max 5 per action total 20 max slots per land plot
  * If 5 Defenders, plot = RAIDABLE
  * Can only attack if RAIDABLE
  * Once Attacked plot = RAIDING
  */
  function stake(uint16 _landId, uint _Id, StakeAction _action) external {
    require(paused == false, 'paused');
    require(merals.ownerOf(_Id) == msg.sender, "owner only");
    require(landPlots[_landId].remainingELFx > 0, "not land");
    require(slots[_landId][_action].length < 5, "full");

    bool success;
    bytes memory data;

    if(_action == StakeAction.DEFEND) {
      require(landPlots[_landId].raidStatus != RaidStatus.RAIDING, "no reinforcements");
      (success, data) = staking.delegatecall(abi.encodeWithSignature("defend(uint16,uint256)", _landId, _Id));
    }
    if(_action == StakeAction.LOOT) {
      require(slots[_landId][StakeAction.DEFEND].length > 0, "need defender");
      (success, data) = staking.delegatecall(abi.encodeWithSignature("loot(uint16,uint256)", _landId, _Id));
    }
    if(_action == StakeAction.BIRTH) {
      require(slots[_landId][StakeAction.DEFEND].length > 0, "need defender");
      (success, data) = staking.delegatecall(abi.encodeWithSignature("birth(uint16,uint256)", _landId, _Id));
    }
    if(_action == StakeAction.ATTACK) {
      require(landPlots[_landId].raidStatus != RaidStatus.DEFAULT, "not raidable");
      (success, data) = staking.delegatecall(abi.encodeWithSignature("attack(uint16,uint256)", _landId, _Id));
    }

    require(success, "need success");
    merals.transfer(msg.sender, address(this), _Id);

    emit Staked(_landId, _Id, uint8(_action), true);
  }

  /**
  * @dev return meral from the wilds
  * One day cooldown before unstaking
  * Defenders are locked in once raid starts
  * Attackers cannot unstake
  */
  function unstake(uint _Id) external {
    require(paused == false, 'paused');
    Stake memory _stake = stakes[_Id];
    require(_stake.owner == msg.sender || msg.sender == admin, "owner only");
    require(_stake.owner != address(0), "not staked");
    require(block.timestamp - stakeEvents[_stake.landId][_stake.entryPointer].timestamp >= 86400, "cooldown");

    bool success;
    bytes memory data;

    if(_stake.stakeAction == StakeAction.DEFEND) {
      require(landPlots[_stake.landId].raidStatus != RaidStatus.RAIDING, 'in a raid');
      (success, data) = staking.delegatecall(abi.encodeWithSignature("undefend(uint16,uint256)", _stake.landId, _Id));
    }
    if(_stake.stakeAction == StakeAction.LOOT) {
      (success, data) = staking.delegatecall(abi.encodeWithSignature("unloot(uint16,uint256)", _stake.landId, _Id));
    }
    if(_stake.stakeAction == StakeAction.BIRTH) {
      (success, data) = staking.delegatecall(abi.encodeWithSignature("unbirth(uint16,uint256)", _stake.landId, _Id));
    }

    require(success, "need success");
    merals.transfer(address(this), _stake.owner, _Id);
  }

  /**
  * @dev Kick out merals with low health
  * The only way to unstake a Defender once raiding, any Meral can do the kiss
  * Once all Defenders are out, Attackers switch to defenders
  */
  function deathKiss(uint _Id, uint _deathId) external {
    require(paused == false, 'paused');
    bool success;
    bytes memory data;
    (success, data) = staking.delegatecall(abi.encodeWithSignature("deathKiss(uint256,uint256)", _Id, _deathId));

    require(success, "need success");
  }

  /**
  * @dev Swap new defenders
  * Allows successful raiders to switch out their attackers / defenders within 1 day
  */
  function swapDefenders(uint _Id, uint _swapperId) external {
    require(paused == false, 'paused');
    bool success;
    bytes memory data;
    (success, data) = staking.delegatecall(abi.encodeWithSignature("swapDefenders(uint256,uint256)", _Id, _swapperId));

    require(success, "need success");
  }

  /**
  * @dev Raid action allows Merals to attack / defend / heal
  * Parse the action in Actions contract
  */
  function raidAction(uint toId, uint fromId, uint8 actionType) external {
    require(paused == false, 'paused');
    bool success;
    bytes memory data;
    (success, data) = actions.delegatecall(abi.encodeWithSignature("raidAction(uint256,uint256,uint8)", toId, fromId, actionType));

    require(success, "need success");
  }


  /*///////////////////////////////////////////////////////////////
                  PRIVATE INTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _addItemPool(uint8 _cost, uint8[] calldata _drops) private pure returns (ItemPool memory) {
    return ItemPool({cost: _cost, drop1: _drops[0], drop2: _drops[1], drop3: _drops[2]});
  }

  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS DUPLICATES
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

  function calculateStamina(uint _Id) public view returns(uint16) {
    Stake memory _stake = stakes[_Id];
    IMeralManager.Meral memory _meral = merals.getMeralById(_Id);

    uint change = block.timestamp - _stake.lastAction;
    uint scaledSpeed = safeScale(_meral.spd, 1600, 2, 10);
    uint gain = change / 3600 * scaledSpeed;

    return uint16(gain > _stake.stamina ? 0 : _stake.stamina - gain);
  }


  /*///////////////////////////////////////////////////////////////
                  EXTERNAL VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function getSlots(uint16 _landId, StakeAction _action) external view returns (uint[] memory) {
    return slots[_landId][_action];
  }

  function getStakeEvents(uint16 _landId) external view returns (StakeEvent[] memory) {
    return stakeEvents[_landId];
  }

  function getLCP(uint16 _landId, uint _Id) external view returns (uint) {
    if(stakes[_Id].owner != address(0)) {
      StakeEvent memory _stakeEvents = stakeEvents[_landId][stakes[_Id].entryPointer];
      return landClaimPoints[_landId][_Id] + block.timestamp - _stakeEvents.timestamp;
    } else {
      return landClaimPoints[_landId][_Id];
    }
  }

}