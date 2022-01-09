
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "hardhat/console.sol";
import "../../utils/MeralParser.sol";
import "../../interfaces/IERC721.sol";

contract MeralManager is ERC721Holder, MeralParser {

  event ChangeHP(uint meralType, uint tokenId, uint16 hp, bool add, uint32 xp);
  event ChangeXP(uint meralType, uint tokenId, uint32 xp, bool add);
  event ChangeStats(uint meralType, uint tokenId, uint16 atk, uint16 def, uint16 spd);
  event ChangeElement(uint meralType, uint tokenId, uint8 element);
  event InitMeral(uint meralType, uint tokenId, uint32 xp, uint16 hp, uint16 maxHp, uint16 atk, uint16 def, uint16 spd, uint16 maxStamina, uint8 element, uint8 subclass);
  event AuthChange(address auth, bool add);


  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  /**
    * @dev Storage of all Meral IDs
    * Use MeralParser to parse Type and Token ID from IDs, max 100,000 in a type
    * Ethemeral Merals = 0, Monster Merals = 1 etc etc
    * Front end must call correct ID
    */
  mapping(uint => Meral) public allMerals;

  // include game masters
  mapping(address => bool) public gmAddresses;

  // TYPE to IERC721 addresses
  mapping(uint => address) public meralContracts;

  // IERC721 public merals;
  address public admin;
  address public register;

  struct Meral {
    uint32 xp;
    uint16 hp;
    uint16 maxHp;
    uint16 atk;
    uint16 def;
    uint16 spd;
    uint16 maxStamina;
    uint8 element;
    uint8 subclass;
  }


  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  constructor(address _register) {
    admin = msg.sender;
    register = _register;
  }

  function setAdmin(address _admin) external {
    require(msg.sender == admin, "admin only");
    admin = _admin;
  }

  function setRegister(address _register) external {
    require(msg.sender == admin, "admin only");
    register = _register;
  }

  function addGM(address _gm, bool add) external {
    require(msg.sender == admin, "admin only");
    gmAddresses[_gm] = add;
    emit AuthChange(_gm, add);
  }

  function addMeralContracts(uint _type, address _meralAddress) external {
    require(msg.sender == admin, "admin only");
    meralContracts[_type] = _meralAddress;
  }


  /*///////////////////////////////////////////////////////////////
                  GM FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function registerOGMeral(
    uint _tokenId,
    uint16 _score,
    uint32 _rewards,
    uint16 _atk,
    uint16 _def,
    uint16 _spd,
    uint8 _element,
    uint8 _subclass
  ) external onlyGM {
    allMerals[getIdFromType(1, _tokenId)] = Meral(_rewards, _score, 1000, _atk, _def, _spd, 100, _element, _subclass);
    emit InitMeral(1, _tokenId, _rewards, _score, 1000, _atk, _def, _spd, 100, _element, _subclass);
  }

  function transfer(address from, address to, uint _id) external onlyGM {
    IERC721 meralsAddress = IERC721(meralContracts[getTypeFromId(_id)]);
    meralsAddress.safeTransferFrom(from, to, getTokenIdFromId(_id));
  }

  function releaseFromPortal(address to, uint _id) external onlyGM {
    IERC721 meralsAddress = IERC721(meralContracts[getTypeFromId(_id)]);
    meralsAddress.safeTransferFrom(address(this), to, getTokenIdFromId(_id));
  }

  function returnToPortal(uint _id) external onlyGM {
    IERC721 meralsAddress = IERC721(meralContracts[getTypeFromId(_id)]);
    uint _tokenId = getTokenIdFromId(_id);
    address _owner = meralsAddress.ownerOf(_tokenId);
    meralsAddress.safeTransferFrom(_owner, address(this), _tokenId);
  }

  function ownerOf(uint _id) external returns (address) {
    IERC721 meralsAddress = IERC721(meralContracts[getTypeFromId(_id)]);
    return meralsAddress.ownerOf(getTokenIdFromId(_id));
  }

  // function registerMeral(uint _type, uint _tokenId) external onlyGM() {

  //   bool success;
  //   bytes memory data;

  //   (success, data) = register.delegatecall(abi.encodeWithSignature("registerMeral(uint16,uint)", _type, _tokenId));
  //   require(success, "need success");
  // }

  function changeHP(uint _id, uint16 offset, bool add, uint32 xp) external onlyGM {
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

    if(xp > 0) {
      uint32 sumXP = _meral.xp + xp;
      _meral.xp = sumXP > 100000 ? 100000 : sumXP;
    }

    emit ChangeHP(getTypeFromId(_id), getTokenIdFromId(_id), newHP, add, _meral.xp);
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

    emit ChangeXP(getTypeFromId(_id), getTokenIdFromId(_id), newXP, add);
  }

  function changeStats(uint _id, uint16 _atk, uint16 _def, uint16 _spd) external onlyGM {
    Meral storage _meral = allMerals[_id];
    _meral.atk = _atk;
    _meral.def = _def;
    _meral.spd = _spd;

    emit ChangeStats(getTypeFromId(_id), getTokenIdFromId(_id), _atk, _def, _spd);
  }

  function changeElement(uint _id, uint8 _element) external onlyGM {
    Meral storage _meral = allMerals[_id];
    _meral.element = _element;

    emit ChangeElement(getTypeFromId(_id), getTokenIdFromId(_id), _element);
  }


  /*///////////////////////////////////////////////////////////////
                  MODIFIERS
  //////////////////////////////////////////////////////////////*/

  /**
  * @dev Throws if called by any account other than the escrow contract.
  */
  modifier onlyGM() {
    require(gmAddresses[msg.sender], "gm only");
    _;
  }


  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  // INTERNAL ID
  function getMeralById(uint _id) external view returns (Meral memory) {
    return allMerals[_id];
  }

  // CONTRACT TYPE & TOKENID
  function getMeral(uint _type, uint _tokenId) external view returns (Meral memory) {
    return allMerals[getIdFromType(_type, _tokenId)];
  }






}