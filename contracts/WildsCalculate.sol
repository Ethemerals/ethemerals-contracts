 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

contract WildsCalculate {

  function calculateChange(uint256 start, uint256 end, uint16 _meralDef, uint16 _baseDefence, uint16 _baseDamage) public pure returns (uint256) {
    uint256 change = end - start;
    uint256 scaledDef;

    if(_meralDef > 1000) {
      scaledDef = 1000;
    } else {
      scaledDef = (uint256(_meralDef) * 600) / 2000 + 400;
    }

    return (change - (scaledDef * change / _baseDefence)) / _baseDamage;
  }

  function scaleSafe(uint256 num, uint256 inMax, uint256 outMin, uint256 outMax) internal pure returns(uint256) {
    uint256 scaled = (num * (outMax - outMin)) / inMax + outMin;
    return scaled > outMax ? outMax : scaled;
  }

}
