// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface IMeralManager {

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

  function ownerOf(uint _id) external returns (address);
  function transfer(address from, address to, uint _id) external;
  function changeHP(uint _id, uint16 offset, bool add) external;
  function changeXP(uint _id, uint32 offset, bool add) external;
  function changeELF(uint _id, uint32 offset, bool add) external;
  function changeStats(uint _id, uint16 _atk, uint16 _def, uint16 _spd) external;
  function changeMax(uint _id, uint16 _maxHp, uint16 _maxStamina) external;
  function changeElement(uint _id, uint8 _element) external;
  function changeCMID(uint _id, uint32 _cmId) external;
  function getVerifiedOwner(uint _id) external view returns (address);
  function getMeralById(uint _id) external view returns (Meral memory);
  function getMeralByType(uint _type, uint _tokenId) external view returns (Meral memory);
  function getTypeByContract(address contractAddress) external view returns (uint);
  function getMeralByContractAndTokenId(address contractAddress, uint _tokenId) external view returns (Meral memory);
  function registerOGMeral(
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
  ) external;

}