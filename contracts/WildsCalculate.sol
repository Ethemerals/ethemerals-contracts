 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

contract WildsCalculate {

  function calculateChange(uint256 start, uint256 end, uint16 def, uint16 baseDefence) public pure returns (uint256) {
    uint256 change = end - start;
    uint256 scaledDefence = safeScale(def, 1600, 50, 150);
    return (change * 1000) / scaledDefence / baseDefence;
  }

  function calculateDefendedDamage(uint16 atk, uint16 def) public pure returns(uint256) {
    uint256 scaledDamage = safeScale(atk, 1600, 20, 100);
    uint256 scaledDefence = safeScale(def, 1600, 0, 50);
    return scaledDefence > scaledDamage ? 0 : scaledDamage - scaledDefence;
  }

  function calculateLightMagicDamage(uint16 def, uint16 spd) public pure returns(uint256) {
    return safeScale(def, 1600, 0, 100) + safeScale(spd, 1600, 0, 100);
  }

  function calculateDarkMagicDamage(uint16 atk, uint16 def) public pure returns(uint256) {
    return safeScale(atk, 1600, 20, 100) + safeScale(def, 1600, 0, 50);
  }

  function calculateSpdDamage(uint16 atk, uint def, uint spd) public pure returns(uint256) {
    uint256 scaledDamage = safeScale(atk, 1600, 10, 50) + safeScale(spd, 1600, 20, 100);
    uint256 scaledDefence = safeScale(def, 1600, 0, 50);
    return scaledDefence > scaledDamage ? 0 : scaledDamage - scaledDefence;
  }

  function safeScale(uint256 num, uint256 inMax, uint256 outMin, uint256 outMax) public pure returns(uint256) {
    uint256 scaled = (num * (outMax - outMin)) / inMax + outMin;
    return scaled > outMax ? outMax : scaled;
  }

}
