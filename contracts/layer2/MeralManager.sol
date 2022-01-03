
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "../interfaces/interfaces.sol";

contract MeralManager {

  event ChangeHP(uint8 meralType, uint256 tokenId, uint16 hp, bool add, uint32 xp);
  event ChangeXP(uint8 meralType, uint256 tokenId, uint32 xp, bool add);
  event ChangeStats(uint8 meralType, uint256 tokenId, uint16 atk, uint16 def, uint16 spd);
  event ChangeElement(uint8 meralType, uint256 tokenId, uint8 element);
  event InitMeral(uint8 meralType, uint256 tokenId, uint32 xp, uint16 hp, uint16 maxHp, uint16 atk, uint16 def, uint16 spd, uint16 maxStamina, uint8 element, uint8 subclass);
  event AuthChange(address auth, bool add);


  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  // TYPE OF MERAL => INDEX OF MERAL / 0 = Ethemerals, 1 = Monsters
  mapping (uint8 => mapping(uint256 => MeralStats)) public allMerals;

  // include game masters
  mapping(address => bool) public gmAddresses;

  // IERC721 addresses
  mapping(uint8 => address) public meralContracts;

  // IERC721Like public merals;
  address public admin;
  address public register;

  struct MeralStats {
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

  function addMeralContracts(uint8 _type, address _meralAddress) external {
    require(msg.sender == admin, "admin only");
    meralContracts[_type] = _meralAddress;
  }


  /*///////////////////////////////////////////////////////////////
                  GM FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function registerOGMeral(
      uint256 _tokenId,
      uint16 _score,
      uint32 _rewards,
      uint16 _atk,
      uint16 _def,
      uint16 _spd,
      uint8 _element,
      uint8 _subclass
    ) external onlyGM() {

    allMerals[0][_tokenId] = MeralStats(_rewards, _score, 1000, _atk, _def, _spd, 100, _element, _subclass);
    emit InitMeral(0, _tokenId, _rewards, _score, 1000, _atk, _def, _spd, 100, _element, _subclass);
  }

  function transfer(uint8 _type, address from, address to, uint256 tokenId) external {
    IERC721Like merals = IERC721Like(meralContracts[_type]);
    merals.safeTransferFrom(from, to, tokenId);
  }

  // function registerMeral(uint8 _type, uint256 _tokenId) external onlyGM() {

  //   bool success;
  //   bytes memory data;

  //   (success, data) = register.delegatecall(abi.encodeWithSignature("registerMeral(uint8,uint256)", _type, _tokenId));
  //   require(success, "need success");
  // }

  function changeHP(uint8 _type, uint256 _tokenId, uint16 offset, bool add, uint32 xp) external onlyGM() {

    MeralStats storage _meral = allMerals[_type][_tokenId];

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

    emit ChangeHP(_type, _tokenId, newHP, add, _meral.xp);
  }

  function changeXP(uint8 _type, uint256 _tokenId, uint32 offset, bool add) external onlyGM() {
    MeralStats storage _meral = allMerals[_type][_tokenId];

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

    emit ChangeXP(_type, _tokenId, newXP, add);
  }

  function changeStats(uint8 _type, uint256 _tokenId, uint16 _atk, uint16 _def, uint16 _spd) external onlyGM() {
    MeralStats storage _meral = allMerals[_type][_tokenId];
    _meral.atk = _atk;
    _meral.def = _def;
    _meral.spd = _spd;

    emit ChangeStats(_type, _tokenId, _atk, _def, _spd);
  }

  function changeElement(uint8 _type, uint256 _tokenId, uint8 _element) external onlyGM() {
    MeralStats storage _meral = allMerals[_type][_tokenId];
    _meral.element = _element;

    emit ChangeElement(_type, _tokenId, _element);
  }


  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS
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

  function getMeral(uint8 _type, uint256 _tokenId) external view returns (MeralStats memory) {
    return allMerals[_type][_tokenId];
  }


}