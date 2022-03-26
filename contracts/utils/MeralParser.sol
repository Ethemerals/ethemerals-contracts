 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;


contract MeralParser {

  function getTypeFromId(uint _id) public pure returns (uint) {
    return _id / 1000000;
  }

  function getTokenIdFromId(uint _id) public pure returns (uint) {
    uint _type = getTypeFromId(_id);
    return _id - (_type * 1000000);
  }

  function getIdFromType(uint _type, uint _tokenId) public pure returns (uint) {
    return _tokenId + (_type * 1000000);
  }

}
