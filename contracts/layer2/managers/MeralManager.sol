
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./Ownable.sol";
import "../../utils/MeralParser.sol";

contract MeralManager is ERC721, Ownable, MeralParser {

  event ContractRegistered(address contractAddress, uint meralType);
  event ChangeHP(uint id, uint16 hp, bool add);
  event ChangeXP(uint id, uint32 xp, bool add);
  event ChangeELF(uint id, uint32 elf, bool add);
  event ChangeStats(uint id, uint16 atk, uint16 def, uint16 spd);
  event ChangeMax(uint id, uint16 maxHp, uint16 maxStamina);
  event ChangeElement(uint id, uint8 element);
  event ChangeCMID(uint id, uint32 cmId);
  event InitMeral(uint meralType, uint tokenId, uint32 cmId, uint32 elf, uint16 hp, uint16 atk, uint16 def, uint16 spd, uint8 element, uint8 subclass, address owner);
  event AuthChange(address auth, bool add);
  event MeralStatusChange(uint id, uint8 status);
  event MeralOwnerChange(uint id, address newOwner);

  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  /**
    * @dev Storage of all Meral IDs
    * Use MeralParser to parse Type and Token ID from IDs, max 1,000,000 in a type
    * Ethemeral Merals = 0, Monster Merals = 1 etc etc
    * Front end must call correct ID
    */
  mapping(uint => Meral) public allMerals;

  /**
    * @dev Storage of all Meral Owners
    * Allows owner transfer / active or not / checks / admin approve
    */
  mapping(uint => address) public meralOwners;

  // TYPE to IERC721 addresses
  mapping(uint => address) public meralContracts;

  // addresses to type
  mapping(address => uint) public meralType;

  // include game masters
  mapping(address => bool) public gmAddresses;

  // include validators
  mapping(address => bool) public validatorsAddresses;

  // contract address counter
  uint public typeCounter;

  // STATUS: 0=new, 1=pending, 2=approved
  struct Meral {
    uint32 cmId;
    uint32 elf;
    uint32 xp;
    uint16 hp;
    uint16 maxHp;
    uint16 atk;
    uint16 def;
    uint16 spd;
    uint16 maxStamina;
    uint8 element;
    uint8 subclass;
    uint8 status;
  }

  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/
  constructor() ERC721("Proxy Ethemerals", "MERALS") {}

  function addGM(address _gm, bool add) external onlyOwner {
    gmAddresses[_gm] = add;
    emit AuthChange(_gm, add);
  }

  function addValidators(address _validators, bool add) external onlyOwner {
    validatorsAddresses[_validators] = add;
    emit AuthChange(_validators, add);
  }

  /**
    * @dev User registers contract address
    */
  function registerContract(address contractAddress) external onlyValidators {
    require(meralType[contractAddress] == 0, 'already registered');
    typeCounter++;
    meralType[contractAddress] = typeCounter;
    meralContracts[typeCounter] = contractAddress; // TODO maybe redundent
    emit ContractRegistered(contractAddress, typeCounter);
  }

  /*///////////////////////////////////////////////////////////////
                  VALIDATORS FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function mintMeral(uint _id) external onlyValidators {
    require(allMerals[_id].status == 1, 'need pending');
    _safeMint(meralOwners[_id], _id);
    allMerals[_id].status = 2;
  }

  // Revert Meral to blank state, eg if stats are not in range
  function revertMeral(uint _id) external onlyValidators {
    require(allMerals[_id].status == 1, 'need pending');
    allMerals[_id].status = 0;
    emit MeralStatusChange(_id, 0);
  }

  // Set owner, requested by user or bot to verify ownership on L1
  function changeMeralOwnership(uint _id, address newOwner) external onlyValidators {
    meralOwners[_id] = newOwner;
    emit MeralOwnerChange(_id, newOwner);
  }

  /*///////////////////////////////////////////////////////////////
                  GM FUNCTIONS
  //////////////////////////////////////////////////////////////*/


  function transfer(address from, address to, uint _id) external onlyGM {
    safeTransferFrom(from, to, _id);
  }


  function changeHP(uint _id, uint16 offset, bool add) external onlyGM {
    Meral storage _meral = allMerals[_id];

    uint16 _HP = _meral.hp;
    uint16 newHP;

    // safe
    if (add) {
      uint16 sum = _HP + offset;
      newHP = sum > _meral.maxHp ? _meral.maxHp : sum;
    } else {
      if (_HP <= offset) {
        newHP = 0;
      } else {
        newHP = _HP - offset;
      }
    }

    _meral.hp = newHP;

    emit ChangeHP(_id, newHP, add);
  }

  function changeXP(uint _id, uint32 offset, bool add) external onlyGM {
    Meral storage _meral = allMerals[_id];

    uint32 _XP = _meral.xp;
    uint32 newXP;

    // safe
    if (add) {
      uint32 sum = _XP + offset;
      newXP = sum > 100000 ? 100000 : sum;
    } else {
      if (_XP <= offset) {
        newXP = 0;
      } else {
        newXP = _XP - offset;
      }
    }

    _meral.xp = newXP;

    emit ChangeXP(_id, newXP, add);
  }

  function changeELF(uint _id, uint32 offset, bool add) external onlyGM {
    Meral storage _meral = allMerals[_id];

    uint _ELF = uint32(_meral.elf);
    uint newELF;

    // safe
    if (add) {
      uint sum = _ELF + offset;
      newELF = sum > 1000000 ? 1000000 : sum;
    } else {
      if (_ELF <= offset) {
        newELF = 0;
      } else {
        newELF = _ELF - offset;
      }
    }

    _meral.elf = uint32(newELF);

    emit ChangeELF(_id, uint32(newELF), add);
  }

  function changeStats(uint _id, uint16 _atk, uint16 _def, uint16 _spd) external onlyGM {
    Meral storage _meral = allMerals[_id];
    _meral.atk = _atk;
    _meral.def = _def;
    _meral.spd = _spd;

    emit ChangeStats(_id, _atk, _def, _spd);
  }

  function changeMax(uint _id, uint16 _maxHp, uint16 _maxStamina) external onlyGM {
    Meral storage _meral = allMerals[_id];
    if(_maxHp > 0) {
      _meral.maxHp = _maxHp;
    }
    if(_maxStamina > 0) {
      _meral.maxStamina = _maxStamina;
    }
    emit ChangeMax(_id, _maxHp, _maxStamina);
  }

  function changeElement(uint _id, uint8 _element) external onlyGM {
    Meral storage _meral = allMerals[_id];
    _meral.element = _element;

    emit ChangeElement(_id, _element);
  }

  function changeCMID(uint _id, uint32 _cmId) external onlyGM {
    Meral storage _meral = allMerals[_id];
    _meral.cmId = _cmId;

    emit ChangeCMID(_id, _cmId);
  }


  /*///////////////////////////////////////////////////////////////
                  PUBLIC
  //////////////////////////////////////////////////////////////*/

  /**
    * @dev User registers Meral AND stats
    * Meral stats will be verified by node backend and released if accurate
    */
  function registerMeral(
    address contractAddress,
    uint _tokenId,
    uint32 _cmId,
    uint32 _elf,
    uint16 _hp,
    uint16 _atk,
    uint16 _def,
    uint16 _spd,
    uint8 _element,
    uint8 _subclass
  ) external {
    uint _type = meralType[contractAddress];
    require(meralType[contractAddress] != 0, 'no contract');

    uint meralId = getIdFromType(_type, _tokenId);
    require(allMerals[meralId].status == 0, 'already registered');

    allMerals[meralId] = Meral(_cmId, _elf, 0, _hp, 1000, _atk, _def, _spd, 100, _element, _subclass, 1);
    meralOwners[meralId] = msg.sender;
    emit InitMeral(_type, _tokenId, _cmId, _elf, _hp, _atk, _def, _spd, _element, _subclass, msg.sender);
  }


  function burn(uint256 _id) external {
    require(_isApprovedOrOwner(_msgSender(), _id), "not approved");
    allMerals[_id].status = 0;
    _burn(_id);
  }

  /*///////////////////////////////////////////////////////////////
                  OVERRIDES
  //////////////////////////////////////////////////////////////*/

  /**
    * @dev See {IERC721-isApprovedForAll}.
    * White list for game masters and auction house
    * On by default Opposite of mainnet
    */
  function isApprovedForAll(address _owner, address _operator)
    public
    view
    override
    returns (bool)
  {
    if (gmAddresses[_operator] || validatorsAddresses[_operator]) {
      return true;
    }

    return super.isApprovedForAll(_owner, _operator);
  }


  /*///////////////////////////////////////////////////////////////
                  MODIFIERS
  //////////////////////////////////////////////////////////////*/

  /**
  * @dev Throws if called by any account other than the game master contract.
  */
  modifier onlyGM() {
    require(gmAddresses[msg.sender], "gm only");
    _;
  }

  modifier onlyValidators() {
    require(validatorsAddresses[msg.sender], "validators only");
    _;
  }


  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/
  // TODO
  function getVerifiedOwner(uint _id) external view returns (address) {
    return meralOwners[_id];
  }

  // INTERNAL ID
  function getMeralById(uint _id) external view returns (Meral memory) {
    return allMerals[_id];
  }

  // TYPE & TOKENID
  function getMeralByType(uint _type, uint _tokenId) external view returns (Meral memory) {
    return allMerals[getIdFromType(_type, _tokenId)];
  }

  function getTypeByContract(address contractAddress) external view returns (uint) {
    return meralType[contractAddress];
  }

  function getMeralByContractAndTokenId(address contractAddress, uint _tokenId) external view returns (Meral memory) {
    return allMerals[getIdFromType(meralType[contractAddress], _tokenId)];
  }

  function exists(uint256 id) public view returns (bool) {
    return super._exists(id);
  }


}