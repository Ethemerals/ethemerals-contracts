// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./WildsCalculate.sol";
import "./IEthemerals.sol";


contract Wilds is ERC721Holder, WildsCalculate {
  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/
  enum StakeAction {UNSTAKED, DEFEND, LOOT, BIRTH, ATTACK}
  enum RaidStatus {DEFAULT, RAIDABLE, RAIDING}

  // ALL LANDSPLOTS
  mapping (uint16 => Land) public landPlots;
  // MERALS => STAKES
  mapping (uint16 => Stake) public stakes;

  // LAND PLOTS => MERALS => LCP
  mapping (uint16 => mapping(uint16 => uint256)) private landClaimPoints;

  // land PLOTS => StakeAction Slots => MERALS
  mapping (uint16 => mapping(StakeAction => uint16[])) private slots;

  // land PLOTS => StakeEvents
  mapping (uint16 => StakeEvent[]) public stakeEvents;

  // [attack, attackAll, heal, healAll, magicAttack, speedAttack, enrage, concentrate]
  uint8[] public staminaCosts = [30,60,40,90,40,40,50,50];
  uint8 private extraDefBonus = 140; // DAILED already
  uint16 private baseDefence = 2800; //

  struct StakeEvent {
    uint256 timestamp;
    uint16 baseDefence;
  }

  struct Stake {
    address owner;
    uint256 lastAction;
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
    uint256 remainingELFx;
    uint256 emissionRate; // DEV IMPROVE
    uint256 lastRaid;
    uint16 initBaseDefence;
    uint16 baseDefence;
    RaidStatus raidStatus; // 0 - default, 1 - raidable, 2 - currently raiding
    ItemPool lootPool;
    ItemPool petPool;
  }

  IEthemerals merals;
  address public admin;
  address private staking;
  address private actions;


  // TODO no defenders, dmg, apply inventory external damage function
  // TODO claim rewards, death kiss rewards, honey pot rewards
  // TODO stamina
  // TODO experience gain (ELF)
  // TODO looters and birthers,

  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  constructor(address meralAddress, address _staking, address _actions) {

    admin = msg.sender;
    merals = IEthemerals(meralAddress);
    staking = _staking;
    actions = _actions;

    ItemPool memory loot1 = ItemPool({ cost: 10, drop1: 1, drop2: 2, drop3: 3 });
    ItemPool memory pet1 = ItemPool({ cost: 10, drop1: 1, drop2: 2, drop3: 3 });

    uint256 timestamp = block.timestamp;

    for(uint16 i = 1; i < 7; i ++) {
      landPlots[i] = Land({ remainingELFx: 1000, emissionRate: 10, lastRaid: timestamp, initBaseDefence: baseDefence, baseDefence: baseDefence, lootPool: loot1, petPool: pet1, raidStatus: RaidStatus.DEFAULT });
    }

  }

  function addLand(
    uint8 id,
    uint8 lootCost,
    uint8 petCost,
    uint8[] calldata lootDrops,
    uint8[] calldata petDrops,
    uint256 _remainingELFx,
    uint256 _emissionRate,
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
  }

  function setStaminas(uint8[] calldata _staminaCosts) external {
    require(msg.sender == admin, "admin only");
    staminaCosts = _staminaCosts;
  }

  /*///////////////////////////////////////////////////////////////
                  PUBLIC FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  /**
  * @dev Send meral to the wilds
  * Requires at least 1 Defender before any other action
  * Max 5 per action total 20 max slots
  * If 5 Defenders, plot = RAIDABLE
  * Can only attack if RAIDABLE
  * Once Attacked plot = RAIDING
  */
  function stake(uint16 _landId, uint16 _tokenId, StakeAction _action) external {
    require(merals.ownerOf(_tokenId) == msg.sender, "owner only");
    require(landPlots[_landId].remainingELFx > 0, "not land");
    require(slots[_landId][_action].length < 5, "full");

    bool success;
    bytes memory data;

    if(_action == StakeAction.DEFEND) {
      require(landPlots[_landId].raidStatus != RaidStatus.RAIDING, "no reinforcements");
      (success, data) = staking.delegatecall(abi.encodeWithSignature("defend(uint16,uint16)", _landId, _tokenId));
    }
    if(_action == StakeAction.ATTACK) {
      require(landPlots[_landId].raidStatus != RaidStatus.DEFAULT, "not raidable");
      (success, data) = staking.delegatecall(abi.encodeWithSignature("attack(uint16,uint16)", _landId, _tokenId));
    }
    if(_action == StakeAction.LOOT) {
      require(slots[_landId][StakeAction.DEFEND].length > 0, "need defender");
      // TODO
    }
    if(_action == StakeAction.BIRTH) {
      require(slots[_landId][StakeAction.DEFEND].length > 0, "need defender");
      // TODO
    }

    require(success, "need success");
    merals.safeTransferFrom(msg.sender, address(this), _tokenId);
  }

  /**
  * @dev return meral from the wilds
  * One day cooldown before unstaking
  * Defenders are locked in once raid starts
  * Attackers cannot unstake
  */
  function unstake(uint16 _tokenId) external {
    Stake memory _stake = stakes[_tokenId];
    require(_stake.owner == msg.sender || msg.sender == admin, "owner only");
    require(_stake.owner != address(0), "not staked");
    require(block.timestamp - stakeEvents[_stake.landId][_stake.entryPointer].timestamp >= 86400, "cooldown");

    bool success;
    bytes memory data;

    if(_stake.stakeAction == StakeAction.DEFEND) {
      require(landPlots[_stake.landId].raidStatus != RaidStatus.RAIDING, 'in a raid');
      (success, data) = staking.delegatecall(abi.encodeWithSignature("undefend(uint16,uint16,uint16)", _stake.landId, _tokenId, _stake.entryPointer));
    }
    if(_stake.stakeAction == StakeAction.LOOT) {
      // LOOT
      // TODO
    }
    if(_stake.stakeAction == StakeAction.BIRTH) {
      // BIRTH
      // TODO
    }

    require(success, "need success");
    merals.safeTransferFrom(address(this), _stake.owner, _tokenId);
  }

  /**
  * @dev Kick out defender
  * The only way to unstake a Defender, any Meral can do the kiss
  * Once all Defenders are out, Attackers switch to defenders
  */
  function deathKiss(uint16 _tokenId, uint16 _deathId) external {
    bool success;
    bytes memory data;
    address owner = stakes[_tokenId].owner;

    if(stakes[_tokenId].stakeAction == StakeAction.DEFEND) {
      (success, data) = staking.delegatecall(abi.encodeWithSignature("deathKiss(uint16,uint16)", _tokenId, _deathId));
    }

    require(success, "need success");
    merals.safeTransferFrom(address(this), owner, _tokenId);
  }

  /**
  * @dev Swap new defenders
  * Allows successful raiders to switch out their attackers / defenders
  */
  function swapDefenders(uint16 _tokenId, uint16 _swapperId) external {
    // require(_stake.action == StakeAction.DEFEND, 'not defending'); // TODO NEED TO TEST

    bool success;
    bytes memory data;
    (success, data) = staking.delegatecall(abi.encodeWithSignature("swapDefenders(uint16,uint16)", _tokenId, _swapperId));

    require(success, "need success");
    merals.safeTransferFrom(msg.sender, address(this), _swapperId);
    merals.safeTransferFrom(address(this), msg.sender, _tokenId);
  }

  /**
  * @dev Raid action allows Merals to attack / defend / heal
  * Parse the action in Actions contract
  */
  function raidAction(uint16 toTokenId, uint16 fromTokenId, uint8 actionType) external {
    require(stakes[toTokenId].stakeAction == StakeAction.DEFEND, "defender only");
    require(stakes[fromTokenId].owner == msg.sender, "owner only");
    require(stakes[fromTokenId].landId == stakes[toTokenId].landId, "raid group only");
    require(uint16(calculateDamage(fromTokenId)) < merals.getEthemeral(fromTokenId).score, "alive only");

    bool success;
    bytes memory data;
    (success, data) = actions.delegatecall(abi.encodeWithSignature("raidAction(uint16,uint16,uint8)", toTokenId, fromTokenId, actionType));

    require(success, "need success");
  }


  /*///////////////////////////////////////////////////////////////
                  PRIVATE INTERNAL FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _addItemPool(uint8 _cost, uint8[] calldata _drops) private pure returns (ItemPool memory) {
    return ItemPool({cost: _cost, drop1: _drops[0], drop2: _drops[1], drop3: _drops[2]});
  }


  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function calculateDamage(uint16 _tokenId) public view returns (uint256) {
    Stake memory _stake = stakes[_tokenId];
    Land memory _landPlots = landPlots[_stake.landId];
    IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId);
    uint256 damage = _stake.damage;

    // FAST FORWARD TO ENTRY POINT
    if(_stake.stakeAction == StakeAction.DEFEND) {
      for(uint256 i = _stake.entryPointer; i < stakeEvents[_stake.landId].length - 1; i ++) {
        StakeEvent memory _event = stakeEvents[_stake.landId][i];
        damage += calculateChange(_event.timestamp, stakeEvents[_stake.landId][i+1].timestamp, _meral.def, _event.baseDefence);
      }
      // FOR VIEW NEED EXTRA NOW PING
      damage += calculateChange(stakeEvents[_stake.landId][stakeEvents[_stake.landId].length-1].timestamp, block.timestamp, _meral.def, _landPlots.baseDefence);
    }

    damage = _stake.health >= damage ? 0 : damage - _stake.health;
    return damage > _meral.score ? _meral.score : damage;
  }

  function calculateStamina(uint16 _tokenId) external view returns(uint16) {
    Stake memory _stake = stakes[_tokenId];
    IEthemerals.Meral memory _meral = merals.getEthemeral(_tokenId);

    uint256 change = block.timestamp - _stake.lastAction;
    uint256 scaledSpeed = safeScale(_meral.spd, 1600, 2, 10);
    uint256 gain = change / 3600 * scaledSpeed;

    return uint16(gain > _stake.stamina ? 0 : _stake.stamina - gain);
  }


  /*///////////////////////////////////////////////////////////////
                  EXTERNAL VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function getStake(uint16 _tokenId) external view returns (Stake memory) {
    return stakes[_tokenId];
  }

  function getSlots(uint16 _landId, StakeAction _action) external view returns (uint16[] memory) {
    return slots[_landId][_action];
  }

  function getStakeEvent(uint16 _landId, uint256 _index) external view returns (StakeEvent memory) {
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