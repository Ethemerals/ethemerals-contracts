// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface IEthemerals {

  struct Meral {
    uint16 score;
    uint32 rewards;
    uint16 atk;
    uint16 def;
    uint16 spd;
  }

  function safeTransferFrom(address from, address to, uint tokenId) external;
  function ownerOf(uint _tokenId) external view returns (address);
  function changeScore(uint _tokenId, uint16 offset, bool add, uint32 amount) external;
  function changeRewards(uint _tokenId, uint32 offset, bool add, uint8 action) external;
  function getEthemeral(uint _tokenId) external view returns(Meral memory);
}

interface IEthemeralsOnL2 {

  struct Meral {
    uint16 score;
    uint32 rewards;
    uint16 atk;
    uint16 def;
    uint16 spd;
  }

  function safeTransferFrom(address from, address to, uint tokenId) external;
  function ownerOf(uint _tokenId) external view returns (address);
  function changeScore(uint _tokenId, uint16 offset, bool add, uint32 amount) external;
  function changeRewards(uint _tokenId, uint32 offset, bool add, uint8 action) external;
  function getEthemeral(uint _tokenId) external view returns(Meral memory);
  function exists(uint tokenId) external view returns (bool);
  function migrateMeral(uint _id, address recipient, uint16 _score, uint32 _rewards, uint16 _atk, uint16 _def, uint16 _spd) external;
  function updateMeral(uint _id, address owner, uint16 _score, uint16 _rewards, uint16 _atk, uint16 _def, uint16 _spd) external;
}

interface IERC721 {
    function safeTransferFrom(address from, address to, uint tokenId) external;
    function ownerOf(uint id) external returns (address);
}

interface IMeralManager {

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

  function transfer(address from, address to, uint _id) external;
  function ownerOf(uint _id) external returns (address);
  function changeHP(uint _id, uint16 offset, bool add, uint32 _xp) external;
  function changeXP(uint _id, uint32 offset, bool add) external;
  function changeStats(uint _id, uint16 _atk, uint16 _def, uint16 _spd) external;
  function changeElement(uint _id, uint8 _element) external;
  function getMeralById(uint _id) external view returns (MeralStats memory);
  function getMeral(uint _type, uint _tokenId) external view returns (MeralStats memory);


}