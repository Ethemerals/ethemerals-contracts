
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "../interfaces/interfaces.sol";

contract MeralRegister {

  event ChangeHP(uint8 meralType, uint256 tokenId, uint16 hp, bool add, uint32 xp);
  event ChangeXP(uint8 meralType, uint256 tokenId, uint32 xp, bool add);
  event ChangeStats(uint8 meralType, uint256 tokenId, uint16 atk, uint16 def, uint16 spd);
  event ChangeElement(uint8 meralType, uint256 tokenId, uint8 element);
  event InitMeral(uint8 meralType, uint256 tokenId, uint32 xp, uint16 hp, uint16 maxHp, uint16 atk, uint16 def, uint16 spd, uint16 maxStamina, uint8 element, uint8 class);
  event AuthChange(address auth, bool add);


  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  // TYPE OF MERAL => INDEX OF MERAL / 0 = Ethemerals, 1 = Monsters
  mapping (uint8 => MeralStats[]) public allMerals;

  // include game masters
  mapping(address => bool) public gmAddresses;

  IERC721Like public merals;
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
    uint8 class;
  }


  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/


  /*///////////////////////////////////////////////////////////////
                  GM FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  // function registerMeral(uint8 _type, uint256 _tokenId) external {
  //   require(gmAddresses[msg.sender], "gm only");


  //   if(_type == 0) {

  //   }
  //   (success, data) = register.delegatecall(abi.encodeWithSignature("registerMeral(uint8,uint256)", _type, _tokenId));
  //   require(success, "need success");
  // }



  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/



}